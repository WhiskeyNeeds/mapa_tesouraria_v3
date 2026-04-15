# Serviços Existentes a Reutilizar

**Versão:** 1.0
**Data:** 2026-04-13
**Origem:** [`ReportsBizzPm/apps/api/src`](D:/BizzPm/Projetos/Software/ReportsBizzPm/apps/api/src)

Este documento lista os **serviços já implementados** na aplicação `ReportsBizzPm` que a app de tesouraria vai consumir. Está pensado para que quem trabalhe na tesouraria **sem acesso ao código do `ReportsBizzPm`** consiga ver os métodos disponíveis, parâmetros, comportamento e os pontos de integração.

> **Regra de ouro:** **não reescrever** estes serviços. Se a tesouraria precisar de algo extra, **estende** o serviço existente ou cria um wrapper novo dentro do módulo de tesouraria que delega para os existentes.

---

## Stack base (já existente)

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript |
| Web framework | Fastify |
| ORM | Prisma + PostgreSQL |
| Cache / sessões | Redis (ioredis, compatível Upstash via TLS) |
| Auth | JWT (`@fastify/jwt`) + bcryptjs |
| Storage de ficheiros | Cloudflare R2 (S3-compatible) |
| Encriptação at-rest (campos sensíveis) | AES-256-GCM via `plugins/encrypt.ts` |
| Email | Resend (default) ou SMTP via nodemailer |

Todos os serviços listados abaixo são **classes** instanciadas no arranque do servidor (`server.ts`), com `PrismaClient` e/ou `FastifyInstance` injetados via construtor.

---

## Índice

1. [`ToconlineService`](#1-toconlineservice) — integração TOConline (OAuth, faturas)
2. [`AuthService`](#2-authservice) — login, registo, refresh, set/forgot password
3. [`ClientsService`](#3-clientsservice) — gestão de empresas e associações utilizador↔empresa
4. [`UsersService`](#4-usersservice) — gestão de utilizadores e papéis
5. [`sendEmail` / Email Service](#5-emailservice) — envio de emails (Resend/SMTP)
6. [Plugins partilhados](#6-plugins-partilhados) — encrypt, redis, prisma, auth, r2

---

## 1. `ToconlineService`

**Ficheiro:** `src/modules/toconline/toconline.service.ts`
**Construtor:** `new ToconlineService(prisma: PrismaClient)`

**Responsabilidade:** lida com toda a integração OAuth 2.0 com o TOConline para um `clientId` (empresa). Mantém credenciais cifradas em `toconline_configs`. Faz refresh automático do access token quando expira.

### Tipos públicos

```typescript
interface PurchaseDocument {
  id: number
  status: number
  document_type: string
  document_no: string | null
  date: string
  due_date: string
  supplier_id: number
  supplier_business_name: string
  supplier_tax_registration_number: string
  currency_iso_code: string
  gross_total: number
  net_total: number
  tax_payable: number
  pending_total: number
  notes: string
  external_reference: string
  created_at: string
  system_entry_date: string | null
}

interface ToconlineConfigPublic {
  clientId: string
  oauthUrl: string
  baseUrl: string
  tocClientId: string
  status: 'UNCONFIGURED' | 'PENDING_AUTH' | 'ACTIVE' | 'ERROR'
  tokenExpiresAt: string | null
  redirectUri: string
  lastError: string | null
  saftConnectionActive: boolean
  saftLastTestAt: string | null
  saftLastTestError: string | null
  saftLastDownloadAt: string | null
}
```

### Métodos públicos

| Método | Assinatura | Descrição |
|---|---|---|
| `getPublicConfig` | `(clientId: string) => Promise<ToconlineConfigPublic \| null>` | Retorna config sem campos sensíveis (sem tokens nem secret) |
| `saveCredentials` | `(clientId: string, data: { oauthUrl, baseUrl, tocClientId, tocClientSecret }) => Promise<ToconlineConfigPublic>` | Guarda credenciais, cifra o `tocClientSecret`, repõe estado a `UNCONFIGURED` |
| `getAuthUrl` | `(clientId: string, redis) => Promise<string>` | Gera URL OAuth, guarda `state` UUID no Redis (TTL 10 min) e marca config como `PENDING_AUTH` |
| `handleCallback` | `(code: string, state: string, redis) => Promise<void>` | Valida `state`, troca `code` por tokens, cifra-os e marca status como `ACTIVE` |
| `getStatus` | `(clientId: string) => Promise<{ status, tokenExpiresAt }>` | Polling do estado pelo frontend |
| `revokeConfig` | `(clientId: string) => Promise<void>` | Apaga tokens, volta a `UNCONFIGURED` |
| `getPurchaseDocuments` | `(clientId: string, status?: number) => Promise<PurchaseDocument[]>` | Chama `GET /api/v1/commercial_purchases_documents` no TOConline. **Renova o token automaticamente** se receber 401 |
| `testSaftPortal` | `(clientId: string, activate: boolean) => Promise<{ success, companyName?, error? }>` | (SAF-T — não usado pela tesouraria) |
| `deactivateSaftPortal` | `(clientId: string) => Promise<void>` | (SAF-T — não usado pela tesouraria) |
| `downloadSaftFile` | `(clientId: string) => Promise<{ buffer: Buffer; filename: string }>` | (SAF-T — não usado pela tesouraria) |

### Comportamento crítico a saber

1. **Encriptação dos tokens:** `tocClientSecret`, `accessToken` e `refreshToken` são guardados cifrados na BD. **Nunca** logar estes valores ou expô-los na resposta de qualquer endpoint.
2. **Refresh automático:** `getPurchaseDocuments` capta 401, chama o método interno `tryRefreshToken` e retenta. Se o refresh também falhar, atualiza `status='ERROR'` e lança `httpError(401, ...)`.
3. **State OAuth no Redis:** o `state` UUID é guardado em `toconline:state:<uuid>` com TTL 10 min. O callback consome (`del`) ao validar.
4. **Erros lançados:** todos os métodos lançam `Error` com propriedade `statusCode` (helper `httpError`). O Fastify global error handler converte para o status HTTP correto.
5. **`getRedirectUri()`:** lê `process.env.API_URL` para construir `<API>/api/v1/toconline/callback`. Se a tesouraria correr noutro domínio, **continuar a usar o callback do `ReportsBizzPm`** (não duplicar).

### O que falta para a tesouraria (a estender)

O `ToconlineService` atual **só implementa GET de documentos de compra**. A tesouraria precisa de:

- `getSalesDocuments(clientId, filters)` — `GET /api/v1/commercial_sales_documents`
- `createSalesDocument(clientId, payload)` — `POST /api/v1/commercial_sales_documents`
- `createSalesReceipt(clientId, payload)` — `POST /api/v1/commercial_sales_receipts` *(usado na reconciliação de Contas a Receber)*
- `voidSalesReceipt(clientId, id)` — `PATCH .../void`
- `createPurchaseDocument(clientId, payload)` — `POST /api/v1/commercial_purchases_documents`
- `createPurchasePayment(clientId, payload)` — `POST /api/v1/commercial_purchases_payments` *(usado na reconciliação de Contas a Pagar)*
- `getCustomers(clientId)` / `createCustomer(clientId, payload)`
- `getSuppliers(clientId)` / `createSupplier(clientId, payload)`
- `getBankAccounts(clientId)` / `createBankAccount(clientId, payload)`
- `getExpenseCategories(clientId)`
- `getTaxes(clientId)` / `getTaxDescriptors(clientId)`
- `sendDocumentEmail(clientId, docId, payload)` — `PATCH /api/email/document`
- `downloadDocumentPdf(clientId, docId)` — `GET /api/url_for_print/{id}`
- `communicateAtWebservice(clientId, docId)` — `PATCH /api/send_document_at_webservice` *(v2)*

**Padrão a seguir:** cada método novo deve replicar o fluxo de `getPurchaseDocuments`:

1. Carregar `toconline_configs` por `clientId`
2. Validar `status === 'ACTIVE'`
3. Decifrar `accessToken`
4. Chamar a API com `Authorization: Bearer`
5. Em 401, tentar `tryRefreshToken` e retentar
6. Devolver o JSON normalizado

### Endpoints HTTP já expostos (reutilizáveis pelo frontend)

| Método | Path | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/v1/toconline/config/:clientId` | Admin | Ler config pública |
| `PUT` | `/api/v1/toconline/config/:clientId` | Admin | Guardar credenciais |
| `DELETE` | `/api/v1/toconline/config/:clientId` | Admin | Revogar |
| `GET` | `/api/v1/toconline/config/:clientId/status` | JWT | Polling de status |
| `POST` | `/api/v1/toconline/config/:clientId/auth` | Admin | Iniciar OAuth — devolve URL |
| `GET` | `/api/v1/toconline/callback` | Público | Callback OAuth (validado por `state`) |
| `GET` | `/api/v1/toconline/:clientId/purchases` | Acesso ao cliente | Listar compras TOConline |

---

## 2. `AuthService`

**Ficheiro:** `src/modules/auth/auth.service.ts`
**Construtor:** `new AuthService(prisma: PrismaClient, fastify: FastifyInstance)`

**Responsabilidade:** autenticação completa, gestão de tokens JWT (access + refresh com rotação no Redis), set/forgot password com convites por email.

### Tipos públicos

```typescript
interface JwtPayload {
  sub: string                                     // user id
  name: string
  email: string
  roles: Array<{ name: string; level: number }>  // level 0 = Admin
  clientIds: string[]                             // empresas a que tem acesso
  odooEmployeeId: number | null
  type: 'access' | 'refresh'
}

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number  // segundos até o access expirar
}
```

### Métodos públicos

| Método | Assinatura | Descrição |
|---|---|---|
| `login` | `(dto: { email, password }) => Promise<TokenPair>` | Valida credenciais, devolve par de tokens. Lança 401 em credenciais erradas, 403 se email não confirmado |
| `register` | `(dto: { name, email, password, phone? }) => Promise<TokenPair>` | Cria utilizador (sem `emailConfirmed`). Lança 409 se email duplicado |
| `refresh` | `(token: string) => Promise<TokenPair>` | Valida refresh JWT, confirma no Redis, **rotaciona** (revoga o antigo) e emite novo par |
| `logout` | `(userId: string) => Promise<void>` | Apaga refresh token do Redis |
| `setPassword` | `(token: string, password: string) => Promise<TokenPair>` | Aceita inviteToken (válido 72h), define password, ativa conta, emite tokens |
| `forgotPassword` | `(email: string) => Promise<void>` | Gera token, decide entre `invite` ou `reset`, envia email correspondente. **Não revela** se o email existe (sempre 200) |

### Comportamento crítico

1. **Hashing:** `bcrypt` cost 12
2. **JWT:** `JWT_EXPIRES_IN` (default `15m`) + `JWT_REFRESH_EXPIRES_IN` (default `7d`)
3. **Rotação de refresh:** ao usar `refresh`, o token antigo é apagado do Redis (`rt:<userId>`) e um novo é guardado. Se o cliente reusar o antigo → 401
4. **Email não confirmado:** bloqueia login com 403
5. **Convite vs reset:** se `passwordSetAt` é `null` → email "definir password" + token com purpose `'invite'`. Caso contrário → email "reset" com purpose `'reset'`. Token sempre 32 bytes hex, expira em 72h
6. **`buildPayload`** → o JWT inclui `clientIds` (snapshot dos `UserClient`). **Não confiar em `clientIds` para autorização sensível** — re-validar com `prisma.userClient.findMany()` quando crítico, porque o JWT pode estar desatualizado se o admin removeu acessos

### Reutilização pela tesouraria

- O middleware Fastify (`fastify.authenticate`) já existente decora `request.user` com o `JwtPayload` em qualquer rota protegida da tesouraria. Não é preciso código extra.
- Para validar acesso a um `clientId`, há um helper `requireClientAccess` (ver `clients.routes.ts`) que pode ser reutilizado como `onRequest` nas rotas novas

---

## 3. `ClientsService`

**Ficheiro:** `src/modules/clients/clients.service.ts`
**Construtor:** `new ClientsService(prisma: PrismaClient)`

**Responsabilidade:** CRUD de empresas (`Client`), gestão de associações `UserClient`, criação de utilizadores cliente com convite por email.

### Métodos públicos

| Método | Assinatura | Descrição |
|---|---|---|
| `getAll` | `(caller: JwtPayload, query: PaginationQuery) => Promise<PaginatedClients>` | Lista paginada. **Admin vê todos**, outros utilizadores vêem só os seus via `UserClient` (re-consultado na BD para evitar JWT desatualizado) |
| `getById` | `(clientId: string, caller: JwtPayload) => Promise<Client>` | Detalhe. Valida acesso multi-tenant (`assertClientAccess`) |
| `create` | `(data: CreateClientDto, caller: JwtPayload) => Promise<Client>` | Cria cliente; restaura se NIF estava soft-deleted; auto-associa o utilizador criador (se não-Admin) |
| `update` | `(clientId: string, data: UpdateClientDto) => Promise<Client>` | Atualiza, verifica unicidade do NIF |
| `toggleActiveState` | `(clientId: string)` | Ativa/desativa empresa |
| `toggleBalancoState` / `toggleRelatorioState` / `toggleOrcamentoState` / `toggleAnaliticaState` / `toggleDocumentacaoState` | `(clientId: string)` | Toggle dos módulos opcionais |
| `delete` | `(clientId: string)` | Soft delete |
| `getUsers` | `(clientId: string, caller: JwtPayload)` | Lista utilizadores com acesso à empresa |
| `assignUser` | `(clientId: string, userId: string, caller: JwtPayload)` | Associa user. Verifica privilégio do caller (não pode atribuir users com nível ≤ próprio) |
| `removeUser` | `(clientId: string, userId: string, caller: JwtPayload)` | Remove associação |
| `createClientUser` | `(clientId: string, { name, email, phone? })` | Cria user com role Cliente (level 2), gera inviteToken, associa, envia email de convite |

### Helpers usados (mesmo módulo)

- `assertClientAccess(caller, clientId)` — lança 403 se o caller não tem acesso
- `assertExists(clientId)` — lança 404 se cliente não existe ou está soft-deleted
- `serializeClient(client, opts?)` — formatação consistente para o frontend

### Reutilização pela tesouraria

- O **seletor de empresa** no topo da app de tesouraria deve chamar `getAll` (paginação) ou ler `caller.clientIds` do JWT
- Antes de qualquer operação sobre um `clientId`, chamar `assertClientAccess` ou usar `requireClientAccess` no `onRequest`

---

## 4. `UsersService`

**Ficheiro:** `src/modules/users/users.service.ts`
**Construtor:** `new UsersService(prisma: PrismaClient)`

**Responsabilidade:** CRUD de utilizadores, gestão de papéis (`UserRole`) e associações a empresas (`UserClient`).

### Métodos públicos

| Método | Assinatura | Descrição |
|---|---|---|
| `findAll` | `(caller: JwtPayload)` | Lista users. Admin vê todos; restantes filtram pelas suas empresas |
| `findById` | `(id: string)` | Detalhe com roles e clientes |
| `create` | `(dto: CreateUserDto, caller: JwtPayload)` | Cria user, gera inviteToken (72h), atribui roles e empresas, envia email |
| `resendInvite` | `(userId: string) => Promise<void>` | Regenera inviteToken e reenvia email |
| `update` | `(id: string, dto: UpdateUserDto)` | Atualiza dados, roles, empresas |
| `updateMe` | `(userId: string, { name?, phone? })` | Self-update parcial |
| `softDelete` | `(id: string) => Promise<void>` | Soft delete |
| `assignRole` | `(userId: string, roleId: string) => Promise<void>` | Atribui papel |
| `removeRole` | `(userId: string, roleId: string) => Promise<void>` | Remove papel |
| `assignClient` | `(userId: string, clientId: string, caller: JwtPayload) => Promise<void>` | Associa empresa, verifica privilégios |
| `removeClient` | `(userId: string, clientId: string, caller: JwtPayload) => Promise<void>` | Remove associação |
| `changePassword` | `(userId: string, currentPassword: string, newPassword: string)` | Self-service de mudança de password com verificação |

### Reutilização pela tesouraria

- O **separador "Utilizadores"** das Definições da tesouraria delega 100% para este serviço. Não criar tabela própria
- Os **papéis novos da tesouraria** (`TREASURY_ADMIN`, `TREASURY_FINANCE`, `TREASURY_VIEWER`) são linhas em `AppRole` criadas via seed e atribuídas via `assignRole`

---

## 5. Email Service

**Ficheiro:** `src/services/email.service.ts`

**Responsabilidade:** envio de emails, dois fornecedores configuráveis via `EMAIL_PROVIDER`:
- **`resend`** (default) — Resend API, zero dependências extra
- **`smtp`** — nodemailer, compatível Gmail/Mailtrap

### API

```typescript
interface EmailAttachment {
  filename: string
  content: Buffer
  mimeType: string
}

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

interface EmailResult {
  success: boolean
  provider: 'resend' | 'smtp'
  error?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult>
export function getAdminEmails(): string[]  // lê ADMIN_EMAILS env
```

### Variáveis de ambiente

```bash
EMAIL_PROVIDER=resend              # ou "smtp"
EMAIL_FROM=portal@bizzpm.pt
ADMIN_EMAILS=a@x.pt,b@x.pt

# Resend
RESEND_API_KEY=re_...

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
```

### Reutilização pela tesouraria

A tesouraria precisa de enviar emails em vários sítios:
- **Lembretes de cobrança** a clientes em atraso
- **Notificações de saldo baixo** ao utilizador
- **Notificações de consentimento Open Banking** (v2) a expirar
- **Resumo mensal** de tesouraria (v2)

**Padrão:** importar `sendEmail` diretamente, montar HTML inline (ver exemplos em `auth.service.ts`).

---

## 6. Plugins partilhados

### 6.1 `plugins/encrypt.ts` — AES-256-GCM

```typescript
export function encrypt(plaintext: string): string
export function decrypt(combined: string): string
```

- Algoritmo: `aes-256-gcm`
- Chave: `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes). Gerar com `openssl rand -hex 32`
- Formato output: `iv:authTag:ciphertext` (todos hex)
- IV é random por chamada (96-bit)
- `decrypt` lança erro se o `authTag` não bate (deteção de tampering)

**Tudo o que a tesouraria queira cifrar a nível coluna usa estas funções:**
- IBANs completos
- Tokens Open Banking (v2)
- Qualquer outro campo sensível adicionado a `treasury_*`

### 6.2 `plugins/redis.ts` — Redis client

Decora `fastify.redis` com a interface mínima:

```typescript
interface RedisClient {
  get(key: string): Promise<string | null>
  setex(key: string, ttl: number, value: string): Promise<void>
  del(key: string): Promise<void>
}
```

Conexão via `REDIS_URL` (suporta `rediss://` para Upstash com TLS). Fail-fast no arranque, retry com backoff em runtime. Usado para:

- Refresh tokens JWT (`rt:<userId>`)
- State OAuth do TOConline (`toconline:state:<uuid>`)
- Qualquer cache que a tesouraria queira adicionar (ex.: matching sugestions cache)

### 6.3 `plugins/prisma.ts`

Decora `fastify.prisma` com o `PrismaClient` singleton. Toda a tesouraria recebe o mesmo cliente — **não instanciar um novo**.

### 6.4 `plugins/auth.ts`

Decora:
- `fastify.authenticate` — middleware `onRequest` que valida JWT e popula `request.user: JwtPayload`
- `fastify.requireAdmin` — middleware que exige `roles[].level === 0`
- `fastify.requireClientAccess` — middleware que valida `request.params.clientId` contra `request.user.clientIds`

**Padrão de uso nas rotas da tesouraria:**

```typescript
fastify.get('/api/v1/treasury/:clientId/movements', {
  onRequest: [fastify.authenticate, fastify.requireClientAccess]
}, async (request, reply) => {
  // request.user.sub = userId
  // request.params.clientId já validado
})
```

### 6.5 `integrations/r2/` — Cloudflare R2 storage

- Cliente S3-compatible para upload/download de ficheiros
- Usado para SAF-T e ficheiros de balanço atualmente
- A tesouraria vai usar para guardar **ficheiros importados de extratos bancários** (CSV/PDF) com TTL configurável

---

## 7. Regras transversais (a respeitar)

1. **Dependency injection via construtor** — todos os serviços recebem `prisma` (e `fastify` se precisarem de redis/jwt). Nunca importar `new PrismaClient()` diretamente
2. **Errors como `httpError(statusCode, message)`** — helper local em cada serviço. O global error handler converte para HTTP
3. **Logging** via `fastify.log` — nunca `console.log`. Logs em produção vão para o stack centralizado
4. **Nunca logar campos cifrados em claro** — passwords, tokens, secrets, IBANs completos
5. **Multi-tenancy** — cada query filtrada por `clientId`, validado server-side. Nunca confiar no frontend
6. **Soft delete** com `deletedAt` — todas as queries de leitura devem incluir `deletedAt: null` no `where`
7. **TypeScript estrito** — sem `any` excepto em adaptadores de input externo (depois normalizado)

---

## 8. O que falta implementar (resumo do gap para tesouraria)

| Área | Reutiliza | Falta criar |
|---|---|---|
| Auth | `AuthService` completo | — |
| Empresa / RBAC | `ClientsService`, `UsersService` | Seed de papéis `TREASURY_*` |
| TOConline OAuth | `ToconlineService` (config + tokens) | — |
| TOConline GET compras | `getPurchaseDocuments` | — |
| TOConline GET vendas | — | `getSalesDocuments` |
| TOConline POST recibos | — | `createSalesReceipt` |
| TOConline POST pagamentos | — | `createPurchasePayment` |
| TOConline POST faturas venda/compra | — | `createSalesDocument`, `createPurchaseDocument` |
| TOConline customers/suppliers/products/bank_accounts | — | CRUD wrappers |
| TOConline PDF/email/AT | — | `downloadDocumentPdf`, `sendDocumentEmail`, `communicateAtWebservice` |
| Encriptação coluna-a-coluna | `encrypt/decrypt` | — |
| Email | `sendEmail` | Templates próprios da tesouraria |
| Redis | `fastify.redis` | — |
| Storage R2 | integração existente | Usar para imports CSV/PDF com TTL |
| Tabelas BD próprias | (ver `03-Modelo-Tecnico-BD.md`) | Criar todas as `treasury_*` |
| Service de tesouraria | — | `TreasuryBankService`, `TreasuryReceivablesService`, `TreasuryPayablesService`, `TreasuryReconciliationService`, `TreasuryCategoriesService`, `TreasuryRecurrenceService`, `TreasuryClassificationRulesService`, `TreasurySettingsService` |

---

## 9. Próximos passos sugeridos

1. **Estender `ToconlineService`** com os métodos de vendas/recibos/pagamentos/customers/suppliers (manter o padrão de refresh automático)
2. **Criar os módulos `treasury/*`** seguindo a estrutura existente: `treasury/<dominio>/{routes,service,schema}.ts`
3. **Seed dos papéis** `TREASURY_ADMIN`, `TREASURY_FINANCE`, `TREASURY_VIEWER` em `prisma/seed.ts` (com `level` apropriado)
4. **Adicionar middlewares** específicos da tesouraria se necessário (ex.: `requireTreasuryWrite` que cruza role + acesso a empresa)
5. **Reutilizar o `assertClientAccess`** existente — não criar uma versão duplicada para a tesouraria

---

**Documentos relacionados:**
- [`01-Plano-Funcional-Paginas.md`](01-Plano-Funcional-Paginas.md) — funcionalidades por página
- [`02-Plano-Seguranca.md`](02-Plano-Seguranca.md) — controlos de segurança
- [`03-Modelo-Tecnico-BD.md`](03-Modelo-Tecnico-BD.md) — modelo de dados (tabelas existentes + novas)
