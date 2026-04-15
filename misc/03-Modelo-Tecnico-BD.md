# Modelo Técnico — Base de Dados

**Versão:** 1.0
**Data:** 2026-04-13
**Âmbito:** Operações (Bancos & Movimentos, Reconciliação, Contas a Receber, Contas a Pagar) + Definições core
**Fora de âmbito desta versão:** SAF-T, Balancete, Previsão, Dashboard Detalhado, Orçamento

---

## 1. Princípios

Baseado nas convenções do schema já existente em [`ReportsBizzPm/apps/api/prisma/schema.prisma`](D:/BizzPm/Projetos/Software/ReportsBizzPm/apps/api/prisma/schema.prisma):

- **PostgreSQL + Prisma ORM**
- **IDs:** `cuid` (String) em novas tabelas — alinhado com o resto do schema
- **Multi-tenant:** tudo isolado por `clientId` (= empresa). **Nunca** confiar em filtros só no frontend
- **Soft delete:** `deletedAt DateTime?` em entidades principais
- **Audit fields:** `createdAt`, `updatedAt` obrigatórios
- **Naming:** `camelCase` no Prisma; `@@map("snake_case")` para nomes reais das tabelas
- **Dinheiro:** sempre `Decimal(18, 2)` — nunca `Float`
- **Enums:** tipados no schema Prisma (não strings livres)
- **Encriptação:** tokens, credenciais, IBANs completos → AES-256-GCM fora da BD (chave em Vault/KMS)
- **Índices:** todas as FKs + colunas de filtro frequente (`clientId`, `status`, `dueDate`, `date`)
- **Row-level security:** aplicada a nível de BD por `clientId` (defesa em profundidade vs bug aplicacional)
- **Convenção de datas:** `DateTime` armazenado em UTC; interpretação fuso na app
- **Mesma BD** da aplicação `ReportsBizzPm` — este ficheiro adiciona modelos novos num schema lógico separado (`treasury_*`)

## 2. Decisão de reutilização vs criação

| Precisamos de... | Existe? | Decisão |
|---|---|---|
| Utilizadores + auth | `User`, `UserRole`, `AppRole`, `UserClient` | **Reutiliza** — não duplicar |
| Empresa / cliente | `Client` | **Reutiliza** como raiz multi-tenant |
| Credenciais TOConline | `ToconlineConfig` | **Reutiliza** — já tem oauth tokens cifrados |
| Orçamento | `Orcamento`, `OrcamentoLinha` | **Reutiliza** (só leitura, para Dashboard Detalhado — fora desta versão) |
| Plano de contas DRE | `Dre`, `Account`, `ClientAccountMapping` | **Reutiliza** (para Dashboard Detalhado — fora desta versão) |
| Contas bancárias (cache TOConline) | ❌ | **Cria** `treasury_bank_accounts` |
| Movimentos bancários | ❌ | **Cria** `treasury_bank_movements` |
| Categorias tesouraria c/ flag TOConline | ❌ | **Cria** `treasury_categories` |
| Contas a Receber / Pagar (entidade unificada) | Parcial (só cache TOConline existe) | **Cria** `treasury_receivables`, `treasury_payables` |
| Reconciliações N↔N | ❌ | **Cria** `treasury_reconciliations` + join |
| Regras classificação auto | ❌ | **Cria** `treasury_classification_rules` |
| Recorrência | ❌ | **Cria** `treasury_recurrences` + gerador |

**Prefixo `treasury_*`** nos modelos novos para clara separação lógica dentro da BD partilhada e para facilitar mover para schema Postgres dedicado (`treasury.*`) no futuro.

---

## 2.1 Modelos existentes a reutilizar (verbatim do `ReportsBizzPm`)

Os modelos abaixo **já existem** na BD partilhada e são reutilizados por este projeto. **Não devem ser recriados nem alterados.** Estão aqui listados na íntegra para que quem ler este documento sem acesso ao outro projeto perceba as relações e campos disponíveis.

Ficheiro de origem: [`ReportsBizzPm/apps/api/prisma/schema.prisma`](D:/BizzPm/Projetos/Software/ReportsBizzPm/apps/api/prisma/schema.prisma)

### 2.1.1 Enums existentes relevantes

```prisma
enum Role {
  ADMIN
  CLIENT
  CUSTOM
}

enum BalancoTipoEmpresa {
  MICRO               // Microentidade
  NORMAL_PEQUENA      // Normal ou Pequena Entidade
  SETOR_NAO_LUCRATIVO // Setor Não Lucrativo
}

enum ToconlineStatus {
  UNCONFIGURED
  PENDING_AUTH
  ACTIVE
  ERROR
}
```

### 2.1.2 `User` — utilizadores da plataforma

```prisma
model User {
  id               String    @id @default(cuid())
  name             String
  email            String    @unique
  passwordHash     String?   // null até o utilizador definir password via convite
  phone            String?
  isActive         Boolean   @default(true)
  emailConfirmed   Boolean   @default(false)

  // Convite / definição de password / reset
  inviteToken          String?   @unique
  inviteTokenExpiresAt DateTime?
  inviteTokenPurpose   String?   // 'invite' | 'reset'
  passwordSetAt        DateTime? // null = password ainda não definida

  // Odoo integration
  odooEmployeeId   Int?
  odooEmployeeName String?

  // Audit
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime? // soft delete

  // Relations (existentes)
  userRoles        UserRole[]
  userClients      UserClient[]
  // ... outras relações do ReportsBizzPm (taskTimers, tickets, etc.)

  // Relations novas (adicionadas por este projeto)
  // treasuryReceivablesCreated  TreasuryReceivable[]
  // treasuryPayablesCreated     TreasuryPayable[]
  // treasuryBankImportsCreated  TreasuryBankImport[]
  // treasuryReconciliationsCreated  TreasuryReconciliation[]  @relation("ReconciliationsCreated")
  // treasuryReconciliationsReversed TreasuryReconciliation[]  @relation("ReconciliationsReversed")
  // treasuryAuditLogs            TreasuryAuditLog[]

  @@index([email])
  @@index([isActive])
  @@map("users")
}
```

**Campos úteis para tesouraria:** `id`, `name`, `email`, `isActive`, `deletedAt`.

### 2.1.3 `AppRole` + `UserRole` — papéis/RBAC

```prisma
model AppRole {
  id        String     @id @default(cuid())
  name      String     @unique
  level     Int        // 0 = highest privilege (Admin=0)
  createdAt DateTime   @default(now())

  userRoles UserRole[]

  @@map("app_roles")
}

model UserRole {
  userId    String
  roleId    String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      AppRole  @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}
```

**Papéis sugeridos para tesouraria** (a acrescentar via seed, sem alterar o modelo):
- `TREASURY_ADMIN` — cria/edita categorias, reconcilia, muda settings
- `TREASURY_FINANCE` — cria contas a receber/pagar, reconcilia, mas não altera categorias
- `TREASURY_VIEWER` — só leitura

### 2.1.4 `Client` — empresa (raiz multi-tenant)

```prisma
model Client {
  id                 String      @id @default(cuid())
  name               String
  nif                String      @unique  // número fiscal
  isActive           Boolean     @default(true)
  hasBalanco         Boolean     @default(true)
  hasRelatorio       Boolean     @default(true)
  hasOrcamento       Boolean     @default(false)
  hasAnalitica       Boolean     @default(false)
  hasDocumentacao    Boolean     @default(false)
  companyType        BalancoTipoEmpresa @default(MICRO)
  volumeNegocios     Decimal     @default(0) @db.Decimal(18, 2)
  numDocumentos      Int         @default(0)
  numTrabalhadores   Int         @default(0)
  avencaCobrada      Decimal     @default(0) @db.Decimal(18, 2)
  countryCode        String      @default("PT")

  // Dados oficiais (einforma.pt)
  nomeOficial        String?
  cae                String?     @db.VarChar(10)
  caeDescricao       String?     @db.VarChar(300)
  morada             String?
  codigoPostal       String?     @db.VarChar(20)

  // Audit
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  deletedAt          DateTime?

  // Relations (existentes)
  userClients            UserClient[]
  reports                Report[]
  orcamentos             Orcamento[]
  // ... outras (analiticaFiles, areas, costCenters, helpdeskTeams, activities, cfoSessions...)
  toconlineConfig        ToconlineConfig?

  // Relations novas (tesouraria)
  // treasuryCategories     TreasuryCategory[]
  // treasuryBankAccounts   TreasuryBankAccount[]
  // treasuryBankImports    TreasuryBankImport[]
  // treasuryBankMovements  TreasuryBankMovement[]
  // treasuryReceivables    TreasuryReceivable[]
  // treasuryPayables       TreasuryPayable[]
  // treasuryRecurrences    TreasuryRecurrence[]
  // treasuryReconciliations TreasuryReconciliation[]
  // treasuryClassificationRules TreasuryClassificationRule[]
  // treasurySettings       TreasurySettings?
  // treasuryAuditLogs      TreasuryAuditLog[]

  @@index([isActive])
  @@index([nif])
  @@map("clients")
}
```

**Papel desta tabela:** é a **empresa cliente final** da plataforma BizzPm. O seletor de empresa da app de tesouraria (ver wireframes) itera sobre `Client` filtrados por `userClients`. Toda e qualquer tabela `treasury_*` tem um `clientId` que referencia este modelo.

**Não confundir** com o cliente/fornecedor da tesouraria (esse fica gravado como `entityName` / `tocCustomerId` dentro de `TreasuryReceivable`/`TreasuryPayable`).

### 2.1.5 `UserClient` — acesso utilizador ↔ empresa

```prisma
model UserClient {
  userId    String
  clientId  String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@id([userId, clientId])
  @@map("user_clients")
}
```

**Uso em tesouraria:** qualquer query deve filtrar `WHERE clientId IN (SELECT clientId FROM user_clients WHERE userId = :currentUser)` para garantir isolamento multi-empresa. Preferencialmente imposto via **Row-Level Security** do Postgres (ver secção 7).

### 2.1.6 `ToconlineConfig` — credenciais TOConline por empresa

```prisma
model ToconlineConfig {
  id              String          @id @default(cuid())
  clientId        String          @unique
  client          Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)

  oauthUrl        String
  baseUrl         String
  tocClientId     String          // "Identificador" fornecido pelo TOConline
  tocClientSecret String          // Cifrado em AES-256-GCM
  accessToken     String?         // Cifrado em AES-256-GCM
  refreshToken    String?         // Cifrado em AES-256-GCM
  tokenExpiresAt  DateTime?

  status          ToconlineStatus @default(UNCONFIGURED)
  lastError       String?

  // SAF-T portal automation (Playwright)
  saftConnectionActive  Boolean   @default(false)
  saftLastTestAt        DateTime?
  saftLastTestError     String?
  saftLastDownloadAt    DateTime?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@map("toconline_configs")
}
```

**Campos usados pela tesouraria:**
- `tocClientId`, `tocClientSecret` — para obter tokens OAuth
- `accessToken`, `refreshToken`, `tokenExpiresAt` — chamada autenticada à API TOConline
- `baseUrl` — varia por ambiente TOConline
- `status = ACTIVE` obrigatório antes de qualquer POST/GET real

**Todas as escritas no TOConline** (POST recibos, POST pagamentos, POST faturas) partem daqui. O dry-run da reconciliação contorna esta tabela.

**Importante:** `ToconlineConfig.saft*` continua reservado à app de contabilidade — a tesouraria **não toca** nestes campos.

---

**Regra prática:** qualquer código da app de tesouraria que precise de um `clientId` valida primeiro que o utilizador atual tem acesso via `UserClient`, e qualquer chamada TOConline carrega `ToconlineConfig` pelo `clientId` e decifra os tokens em memória (nunca escreve em claro para logs).

---

## 3. Enums novos

```prisma
enum TreasuryCategoryType {
  REVENUE    // Receita
  EXPENSE    // Despesa
}

enum TreasuryDocOrigin {
  TOCONLINE  // sincroniza com TOConline (flag da categoria)
  LOCAL      // apenas local (salários, rendas, impostos)
}

enum TreasuryDocStatus {
  OPEN       // por receber / por pagar
  PARTIAL    // parcialmente reconciliada
  SETTLED    // totalmente paga/recebida
  VOID       // anulada
}

enum TreasuryMovementStatus {
  UNCLASSIFIED  // sem categoria atribuída
  CLASSIFIED    // com categoria mas sem reconciliação
  PARTIAL       // reconciliado parcialmente
  RECONCILED    // totalmente reconciliado
}

enum TreasuryMovementSource {
  CSV_IMPORT       // import manual CSV
  PDF_IMPORT       // import manual PDF
  OFX_IMPORT       // import manual OFX
  OPEN_BANKING     // v2 — agregador (GoCardless/Tink)
  MANUAL           // criado à mão
}

enum TreasuryRecurrenceFrequency {
  MONTHLY
  QUARTERLY
  SEMIANNUAL
  ANNUAL
  CUSTOM
}

enum TreasuryReconciliationStatus {
  DRAFT       // dry-run, ainda não escreve no TOConline
  CONFIRMED   // confirmada e efetivada
  REVERSED    // desfeita (estornada)
}

enum TreasuryImportStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
  QUARANTINED  // falhou validação de segurança
}
```

---

## 4. Modelos

### 4.1 Categorias de tesouraria

```prisma
model TreasuryCategory {
  id          String                 @id @default(cuid())
  clientId    String
  name        String                 @db.VarChar(120)
  type        TreasuryCategoryType
  launchToc   Boolean                @default(true)   // flag "lança TOConline"

  // Mapeamento para TOConline (só relevante quando launchToc=true)
  tocExpenseCategoryId  String?  // id de /api/expense_categories
  tocTaxDescriptorId    String?  // id de /api/tax_descriptors (IVA)

  color       String?                @db.VarChar(7)   // #RRGGBB (UI)
  icon        String?                @db.VarChar(40)
  isArchived  Boolean                @default(false)

  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt
  deletedAt   DateTime?

  client              Client                      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  receivables         TreasuryReceivable[]
  payables            TreasuryPayable[]
  movements           TreasuryBankMovement[]
  classificationRules TreasuryClassificationRule[]

  @@unique([clientId, name])
  @@index([clientId, type])
  @@index([clientId, launchToc])
  @@map("treasury_categories")
}
```

**Notas:**
- `launchToc` é o flag discutido — define se a operação é criada no TOConline
- `clientId + name` único → impede categorias duplicadas na mesma empresa
- `tocExpenseCategoryId` guarda a correspondência quando `launchToc=true`

---

### 4.2 Contas bancárias (cache + master)

```prisma
model TreasuryBankAccount {
  id             String    @id @default(cuid())
  clientId       String

  name           String    @db.VarChar(120)
  bankName       String?   @db.VarChar(80)         // "Millennium BCP", "CGD"...
  currency       String    @default("EUR") @db.VarChar(3)

  // IBAN encriptado + últimos 4 em claro para display
  ibanEnc        String?                            // AES-256-GCM (chave em KMS)
  ibanLast4      String?   @db.VarChar(4)

  // Saldos
  openingBalance Decimal   @default(0) @db.Decimal(18, 2)  // quando conta é criada
  currentBalance Decimal   @default(0) @db.Decimal(18, 2)  // denormalizado (recalc via trigger/job)

  // Alertas
  minBalance     Decimal?  @db.Decimal(18, 2)      // saldo mínimo de segurança

  // Ligação TOConline (master)
  tocBankAccountId  String?                         // id de /api/bank_accounts
  tocSyncedAt       DateTime?

  isActive       Boolean   @default(true)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  client    Client                 @relation(fields: [clientId], references: [id], onDelete: Cascade)
  movements TreasuryBankMovement[]
  imports   TreasuryBankImport[]

  @@unique([clientId, tocBankAccountId])
  @@index([clientId, isActive])
  @@map("treasury_bank_accounts")
}
```

**Notas:**
- `ibanEnc` cifrado em repouso; `ibanLast4` é o que aparece mascarado no UI
- `currentBalance` é denormalizado (performance) — recalculado por trigger ou job após inserção/reconciliação
- `tocBankAccountId` opcional porque pode existir uma conta só local (offline)

---

### 4.3 Imports bancários

```prisma
model TreasuryBankImport {
  id                String                @id @default(cuid())
  clientId          String
  bankAccountId     String

  source            TreasuryMovementSource
  originalFileName  String?
  storageKey        String?              // R2/S3 key (UE)
  fileSha256        String?  @db.VarChar(64)  // deteção de re-upload do mesmo ficheiro
  fileSize          Int?
  mimeType          String?  @db.VarChar(80)

  status            TreasuryImportStatus @default(PENDING)
  rowsTotal         Int      @default(0)
  rowsImported      Int      @default(0)
  rowsDuplicated    Int      @default(0)
  rowsFailed        Int      @default(0)
  errorMessage      String?

  startedAt         DateTime?
  completedAt       DateTime?

  createdById       String                // utilizador que fez o upload
  createdAt         DateTime  @default(now())

  client      Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  bankAccount TreasuryBankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  createdBy   User                @relation(fields: [createdById], references: [id])

  movements   TreasuryBankMovement[]

  @@index([clientId, bankAccountId, createdAt(sort: Desc)])
  @@index([fileSha256])
  @@map("treasury_bank_imports")
}
```

**Notas:**
- `fileSha256` permite avisar se o mesmo ficheiro já foi importado
- `storageKey` aponta para o ficheiro **encriptado e com TTL** (cumpre política de retenção)
- `status` permite fluxo assíncrono (fila de processamento)

---

### 4.4 Movimentos bancários

```prisma
model TreasuryBankMovement {
  id              String                 @id @default(cuid())
  clientId        String
  bankAccountId   String

  date            DateTime               // data valor
  bookingDate     DateTime?              // data lançamento
  amount          Decimal                @db.Decimal(18, 2)   // +ve = entrada, -ve = saída
  currency        String                 @default("EUR") @db.VarChar(3)
  balanceAfter    Decimal?               @db.Decimal(18, 2)   // se disponível no extrato
  description     String                 @db.VarChar(500)
  normalizedDesc  String?                @db.VarChar(500)     // limpa e normalizada para matching
  counterpartName String?                @db.VarChar(200)
  counterpartIban String?                @db.VarChar(50)      // se vem do OFX/Open Banking

  categoryId      String?                // classificação de tesouraria (opcional)

  // Origem e deduplicação
  source          TreasuryMovementSource
  importId        String?
  dedupeHash      String  @db.VarChar(64)  // SHA-256(data|valor|desc|conta)

  // Estado
  status          TreasuryMovementStatus @default(UNCLASSIFIED)
  reconciledAmount Decimal @default(0) @db.Decimal(18, 2)   // quanto já foi reconciliado

  externalRef     String?                @db.VarChar(120)    // referência do extrato bancário

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  client       Client                       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  bankAccount  TreasuryBankAccount          @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  category     TreasuryCategory?            @relation(fields: [categoryId], references: [id])
  import       TreasuryBankImport?          @relation(fields: [importId], references: [id], onDelete: SetNull)
  reconciliationLinks TreasuryReconciliationMovement[]

  @@unique([clientId, dedupeHash])          // impede duplicados no mesmo cliente
  @@index([clientId, bankAccountId, date(sort: Desc)])
  @@index([clientId, status])
  @@index([clientId, categoryId])
  @@map("treasury_bank_movements")
}
```

**Notas:**
- `dedupeHash` + `@@unique([clientId, dedupeHash])` = não há duplicados por cliente
- `reconciledAmount` permite saber quanto do movimento já está comprometido com faturas (suporta split parcial do movimento em reconciliações futuras)
- `status = PARTIAL` quando `reconciledAmount > 0 && < |amount|`
- `status = RECONCILED` quando `reconciledAmount == |amount|`
- `normalizedDesc` é o campo usado por regras de classificação e matching (lowercase, sem acentos, trim)
- Não há relação direta a faturas — a relação vive em `treasury_reconciliation_movements` (join N↔N)

---

### 4.5 Contas a Receber

```prisma
model TreasuryReceivable {
  id             String             @id @default(cuid())
  clientId       String
  categoryId     String

  // Entidade (cliente)
  entityName     String             @db.VarChar(200)
  entityNif      String?            @db.VarChar(20)
  tocCustomerId  String?                            // id de /api/customers (quando existe)

  // Documento
  reference      String             @db.VarChar(80)   // Nº do documento (fatura)
  description    String?            @db.VarChar(500)
  documentDate   DateTime
  dueDate        DateTime

  // Valores
  currency       String             @default("EUR") @db.VarChar(3)
  totalAmount    Decimal            @db.Decimal(18, 2)
  receivedAmount Decimal            @default(0) @db.Decimal(18, 2)  // acumulado de reconciliações
  pendingAmount  Decimal            @db.Decimal(18, 2)              // = total − received (denormalizado)

  status         TreasuryDocStatus  @default(OPEN)
  origin         TreasuryDocOrigin                                  // herdado da categoria ao criar

  // TOConline
  tocSalesDocId  String?                                            // id de /api/v1/commercial_sales_documents
  tocSyncedAt    DateTime?
  tocSyncError   String?

  // Recorrência
  recurrenceId   String?
  parentId       String?                                            // para ocorrências geradas de uma recorrência

  createdById    String
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?

  client              Client                               @relation(fields: [clientId], references: [id], onDelete: Cascade)
  category            TreasuryCategory                     @relation(fields: [categoryId], references: [id])
  recurrence          TreasuryRecurrence?                  @relation(fields: [recurrenceId], references: [id])
  parent              TreasuryReceivable?                  @relation("ReceivableChildren", fields: [parentId], references: [id])
  children            TreasuryReceivable[]                 @relation("ReceivableChildren")
  reconciliationLinks TreasuryReconciliationReceivable[]
  createdBy           User                                 @relation(fields: [createdById], references: [id])

  @@unique([clientId, reference])  // evita duplicação dentro do mesmo cliente
  @@index([clientId, status, dueDate])
  @@index([clientId, categoryId])
  @@index([clientId, origin])
  @@index([tocSalesDocId])
  @@map("treasury_receivables")
}
```

---

### 4.6 Contas a Pagar

```prisma
model TreasuryPayable {
  id             String             @id @default(cuid())
  clientId       String
  categoryId     String

  // Entidade (fornecedor)
  entityName     String             @db.VarChar(200)
  entityNif      String?            @db.VarChar(20)
  tocSupplierId  String?                                            // id de /api/suppliers

  // Documento
  reference      String             @db.VarChar(80)
  description    String?            @db.VarChar(500)
  documentDate   DateTime
  dueDate        DateTime

  // Valores
  currency       String             @default("EUR") @db.VarChar(3)
  totalAmount    Decimal            @db.Decimal(18, 2)
  paidAmount     Decimal            @default(0) @db.Decimal(18, 2)
  pendingAmount  Decimal            @db.Decimal(18, 2)              // denormalizado

  status         TreasuryDocStatus  @default(OPEN)
  origin         TreasuryDocOrigin

  // TOConline
  tocPurchasesDocId String?                                         // id de /api/v1/commercial_purchases_documents
  tocSyncedAt    DateTime?
  tocSyncError   String?

  // Recorrência
  recurrenceId   String?
  parentId       String?

  createdById    String
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?

  client              Client                            @relation(fields: [clientId], references: [id], onDelete: Cascade)
  category            TreasuryCategory                  @relation(fields: [categoryId], references: [id])
  recurrence          TreasuryRecurrence?               @relation(fields: [recurrenceId], references: [id])
  parent              TreasuryPayable?                  @relation("PayableChildren", fields: [parentId], references: [id])
  children            TreasuryPayable[]                 @relation("PayableChildren")
  reconciliationLinks TreasuryReconciliationPayable[]
  createdBy           User                              @relation(fields: [createdById], references: [id])

  @@unique([clientId, reference])
  @@index([clientId, status, dueDate])
  @@index([clientId, categoryId])
  @@index([clientId, origin])
  @@index([tocPurchasesDocId])
  @@map("treasury_payables")
}
```

**Notas (comuns CR e CP):**
- `pendingAmount` é denormalizado mas obrigatório — é a coluna usada em listagens, dashboards, reconciliação. Deve ser atualizada por trigger/service após cada reconciliação
- `origin` é copiado da categoria no momento da criação (snapshot) para que mudanças futuras no flag da categoria não re-escrevam retrospetivamente
- `parentId` + `recurrenceId` permitem ver o histórico de uma série recorrente
- `reference` único por `clientId` previne reimport do mesmo doc TOConline duas vezes

---

### 4.7 Recorrência

```prisma
model TreasuryRecurrence {
  id          String                       @id @default(cuid())
  clientId    String

  frequency   TreasuryRecurrenceFrequency
  startDate   DateTime                      // primeira ocorrência
  endDate     DateTime?                     // null = sem fim
  occurrences Int?                          // alternativa: nº total

  // Customização (se frequency=CUSTOM)
  customRrule String?                       // regra RFC 5545 (opcional, v2)

  // Próxima geração
  nextRunAt   DateTime?                     // próxima data em que o job gera ocorrência
  lastRunAt   DateTime?

  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client                @relation(fields: [clientId], references: [id], onDelete: Cascade)
  receivables TreasuryReceivable[]
  payables    TreasuryPayable[]

  @@index([clientId, isActive, nextRunAt])
  @@map("treasury_recurrences")
}
```

**Notas:**
- Um job agendado (ex.: cron nightly) corre a query `SELECT * FROM treasury_recurrences WHERE isActive AND nextRunAt <= now()` e gera as próximas instâncias em `treasury_receivables` ou `treasury_payables` conforme o tipo do registo-mãe
- A instância filha guarda `parentId` + `recurrenceId` para rastreio
- Se `launchToc=true` no momento da geração, também é criada no TOConline

---

### 4.8 Reconciliação (N↔N) — núcleo do diferencial

O modelo é composto por **1 cabeçalho + 3 tabelas de ligação**. Uma reconciliação agrega N movimentos com N faturas (CR ou CP).

```prisma
model TreasuryReconciliation {
  id           String                        @id @default(cuid())
  clientId     String

  status       TreasuryReconciliationStatus  @default(DRAFT)
  direction    TreasuryCategoryType          // REVENUE (entradas) ou EXPENSE (saídas)
  isDryRun     Boolean                       @default(true)

  // Totais (denormalizados para auditoria)
  totalMovements    Decimal  @db.Decimal(18, 2)
  totalAllocated    Decimal  @db.Decimal(18, 2)

  // TOConline — resultado agregado
  tocReceiptsCreated  Int    @default(0)     // Nº recibos criados
  tocPaymentsCreated  Int    @default(0)     // Nº pagamentos criados
  tocFirstError       String?

  // Reversão
  reversedAt    DateTime?
  reversedById  String?
  reversedReason String?

  createdById   String
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  client        Client                             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdBy     User                               @relation("ReconciliationsCreated", fields: [createdById], references: [id])
  reversedBy    User?                              @relation("ReconciliationsReversed", fields: [reversedById], references: [id])

  movements     TreasuryReconciliationMovement[]
  receivables   TreasuryReconciliationReceivable[]
  payables      TreasuryReconciliationPayable[]

  @@index([clientId, status, createdAt(sort: Desc)])
  @@index([clientId, createdById])
  @@map("treasury_reconciliations")
}

// Ligação reconciliação ↔ movimento (N)
model TreasuryReconciliationMovement {
  id               String  @id @default(cuid())
  reconciliationId String
  movementId       String
  amount           Decimal @db.Decimal(18, 2)   // quanto do movimento entra nesta reconciliação

  reconciliation TreasuryReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
  movement       TreasuryBankMovement   @relation(fields: [movementId], references: [id], onDelete: Restrict)

  @@unique([reconciliationId, movementId])
  @@index([movementId])
  @@map("treasury_reconciliation_movements")
}

// Ligação reconciliação ↔ receivable (N) com valor atribuído
model TreasuryReconciliationReceivable {
  id               String  @id @default(cuid())
  reconciliationId String
  receivableId     String
  amountAllocated  Decimal @db.Decimal(18, 2)

  // Resultado TOConline
  tocReceiptId     String?   // id de /api/v1/commercial_sales_receipts
  tocCreatedAt     DateTime?
  tocError         String?

  reconciliation TreasuryReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
  receivable     TreasuryReceivable     @relation(fields: [receivableId], references: [id], onDelete: Restrict)

  @@unique([reconciliationId, receivableId])
  @@index([receivableId])
  @@index([tocReceiptId])
  @@map("treasury_reconciliation_receivables")
}

// Ligação reconciliação ↔ payable (N) com valor atribuído
model TreasuryReconciliationPayable {
  id               String  @id @default(cuid())
  reconciliationId String
  payableId        String
  amountAllocated  Decimal @db.Decimal(18, 2)

  // Resultado TOConline
  tocPaymentId     String?   // id de /api/v1/commercial_purchases_payments
  tocCreatedAt     DateTime?
  tocError         String?

  reconciliation TreasuryReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
  payable        TreasuryPayable        @relation(fields: [payableId], references: [id], onDelete: Restrict)

  @@unique([reconciliationId, payableId])
  @@index([payableId])
  @@index([tocPaymentId])
  @@map("treasury_reconciliation_payables")
}
```

**Invariantes a garantir (validação aplicacional + trigger):**

1. `SUM(reconciliation_movements.amount) == SUM(reconciliation_receivables.amountAllocated) + SUM(reconciliation_payables.amountAllocated)`
2. Para cada receivable: `amountAllocated ≤ receivable.pendingAmount` no momento da confirmação
3. Para cada payable: `amountAllocated ≤ payable.pendingAmount` no momento da confirmação
4. Sentido único: `direction=REVENUE` → movimentos positivos + só receivables; `direction=EXPENSE` → movimentos negativos + só payables
5. `onDelete: Restrict` nos movimentos/docs impede apagar algo que está em reconciliação ativa

**Efeito de `status = CONFIRMED`:**
- Atualizar `receivedAmount`/`paidAmount` das faturas envolvidas
- Atualizar `reconciledAmount` dos movimentos envolvidos
- Recalcular `status` das faturas (OPEN/PARTIAL/SETTLED)
- Recalcular `status` dos movimentos (CLASSIFIED/PARTIAL/RECONCILED)
- Se `isDryRun = false`: chamar TOConline e gravar `tocReceiptId`/`tocPaymentId` em cada linha
- Se qualquer chamada TOConline falhar: marcar `tocError` na linha respetiva; a reconciliação mantém-se `CONFIRMED` mas exibe aviso (retry manual)

**Efeito de `status = REVERSED`:**
- Reverter as mesmas colunas
- Se havia escrita real no TOConline: anular recibos/pagamentos via API (quando suportado) ou marcar para tratamento manual

---

### 4.9 Regras de classificação automática

```prisma
model TreasuryClassificationRule {
  id          String    @id @default(cuid())
  clientId    String

  // Matching
  matchField  String    @db.VarChar(20)     // "description" | "counterpart" | "iban"
  matchOp     String    @db.VarChar(20)     // "equals" | "contains" | "regex" | "startsWith"
  matchValue  String    @db.VarChar(500)
  amountMin   Decimal?  @db.Decimal(18, 2)
  amountMax   Decimal?  @db.Decimal(18, 2)
  direction   TreasuryCategoryType?         // REVENUE | EXPENSE | null (qualquer)

  // Ação
  categoryId  String
  priority    Int       @default(100)       // menor = avaliada primeiro
  isActive    Boolean   @default(true)

  hits        Int       @default(0)         // contador de quantas vezes bateu
  lastHitAt   DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  client   Client           @relation(fields: [clientId], references: [id], onDelete: Cascade)
  category TreasuryCategory @relation(fields: [categoryId], references: [id])

  @@index([clientId, isActive, priority])
  @@map("treasury_classification_rules")
}
```

**Notas:**
- Aplicada no momento do import de movimentos
- Ordem por `priority`, para-no-primeiro-match
- `hits` permite mostrar ao utilizador regras mortas (nunca bateram)

---

### 4.10 Preferências de tesouraria por cliente

Definições globais por empresa — um único registo por cliente.

```prisma
model TreasurySettings {
  id                    String   @id @default(cuid())
  clientId              String   @unique

  // Reconciliação
  reconciliationDryRun  Boolean  @default(true)   // dry-run global
  autoMatchEnabled      Boolean  @default(false)
  autoMatchThreshold    Decimal  @default(0.95) @db.Decimal(3, 2)  // confiança mínima

  // Alertas
  lowBalanceEnabled     Boolean  @default(true)
  lowBalanceChannels    String[]                      // ["email", "inapp"]

  // Retenção
  importFileRetentionDays  Int   @default(30)

  // Sincronização TOConline (frequência polling)
  syncIntervalMinutes   Int      @default(15)
  lastFullSyncAt        DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@map("treasury_settings")
}
```

---

### 4.11 Audit log específico de tesouraria

Complementa o `AppLog` geral existente — foca-se em ações **financeiras** que têm de ser auditáveis (requisito do plano de segurança).

```prisma
model TreasuryAuditLog {
  id          String   @id @default(cuid())
  clientId    String
  userId      String?
  action      String   @db.VarChar(80)      // "reconciliation.confirm", "receivable.create", "movement.classify", "import.upload"...
  entityType  String   @db.VarChar(40)      // "Reconciliation", "Receivable", "BankMovement"...
  entityId    String?  @db.VarChar(40)
  payload     Json?                          // diff do que mudou (sem dados sensíveis)
  ipAddress   String?  @db.VarChar(45)
  userAgent   String?  @db.VarChar(500)

  createdAt   DateTime @default(now())

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id])

  @@index([clientId, createdAt(sort: Desc)])
  @@index([clientId, action])
  @@index([entityType, entityId])
  @@map("treasury_audit_logs")
}
```

---

## 5. Diagrama de relações

```
Client (existente)
 ├── TreasuryCategory (clientId) ─┐
 ├── TreasuryBankAccount (clientId)
 │    └── TreasuryBankMovement (bankAccountId)
 │         ├── TreasuryCategory (categoryId) ◄┘
 │         └── TreasuryBankImport (importId)
 ├── TreasuryReceivable (clientId) ─── TreasuryCategory
 │    └── TreasuryRecurrence (recurrenceId, opcional)
 ├── TreasuryPayable (clientId) ────── TreasuryCategory
 │    └── TreasuryRecurrence (recurrenceId, opcional)
 ├── TreasuryReconciliation (clientId)
 │    ├── TreasuryReconciliationMovement   ─── TreasuryBankMovement
 │    ├── TreasuryReconciliationReceivable ─── TreasuryReceivable
 │    └── TreasuryReconciliationPayable    ─── TreasuryPayable
 ├── TreasuryClassificationRule (clientId)
 ├── TreasurySettings (clientId, 1:1)
 └── TreasuryAuditLog (clientId)

User (existente)
 ├── TreasuryBankImport.createdBy
 ├── TreasuryReceivable.createdBy
 ├── TreasuryPayable.createdBy
 ├── TreasuryReconciliation.createdBy / reversedBy
 └── TreasuryAuditLog.user

ToconlineConfig (existente, por Client) — reutilizada
```

---

## 6. Índices críticos (resumo)

| Tabela | Índices |
|---|---|
| `treasury_bank_movements` | `(clientId, bankAccountId, date DESC)`, `(clientId, status)`, `@@unique(clientId, dedupeHash)` |
| `treasury_receivables` | `(clientId, status, dueDate)`, `(clientId, categoryId)`, `@@unique(clientId, reference)` |
| `treasury_payables` | `(clientId, status, dueDate)`, `(clientId, categoryId)`, `@@unique(clientId, reference)` |
| `treasury_reconciliations` | `(clientId, status, createdAt DESC)` |
| `treasury_categories` | `@@unique(clientId, name)`, `(clientId, launchToc)` |
| `treasury_classification_rules` | `(clientId, isActive, priority)` |
| `treasury_audit_logs` | `(clientId, createdAt DESC)`, `(entityType, entityId)` |

---

## 7. Triggers e constraints a nível BD

Para além das validações na app, recomenda-se aplicar a nível Postgres:

1. **Row-level security (RLS)** — `ENABLE ROW LEVEL SECURITY` em todas as tabelas `treasury_*`, com policy `clientId = current_setting('app.current_client_id')::text`. A app define esta variável em cada conexão
2. **CHECK constraints:**
   - `treasury_bank_movements.reconciledAmount BETWEEN 0 AND ABS(amount)`
   - `treasury_receivables.receivedAmount BETWEEN 0 AND totalAmount`
   - `treasury_receivables.pendingAmount = totalAmount - receivedAmount`
   - `treasury_payables.paidAmount BETWEEN 0 AND totalAmount`
   - `treasury_payables.pendingAmount = totalAmount - paidAmount`
   - `treasury_reconciliation_receivables.amountAllocated > 0`
   - `treasury_reconciliation_payables.amountAllocated > 0`
3. **Triggers:**
   - Trigger `AFTER INSERT/UPDATE/DELETE` em `treasury_reconciliation_movements` → recalcular `bank_movements.reconciledAmount` + `status`
   - Trigger `AFTER INSERT/UPDATE/DELETE` em `treasury_reconciliation_receivables` → recalcular `receivables.receivedAmount` + `pendingAmount` + `status`
   - Trigger equivalente para `payables`
   - Trigger `AFTER INSERT/UPDATE` em `treasury_bank_movements` → recalcular `bank_accounts.currentBalance`

Alternativa: fazer estes recálculos em **transação** no código da aplicação, sem triggers. Prós: mais testável; contras: perde-se rede de segurança se outro serviço tocar na BD. Recomendação: fazer na app **E** adicionar constraints CHECK + RLS a nível BD.

---

## 8. O que fica para depois (v2+)

- `treasury_forecast_scenarios` e `treasury_forecast_lines` — motor de previsão
- Integração Open Banking — adicionar `externalConsentId`, `tokenExpiresAt`, `providerName` em `TreasuryBankAccount`
- `treasury_payment_schedule` — priorização/workflow de aprovações de pagamentos
- `treasury_alerts` — alertas configuráveis (saldo baixo, vencimentos, rupturas previstas)
- `treasury_dashboard_cache` — snapshots pré-agregados para performance do Dashboard
- Integração SAF-T e Balancete (já existem tabelas relacionadas na app de contabilidade, serão consumidas por `@@unique(clientId, year)` e similar)

---

## 9. Próximos passos

1. **Validar este modelo** com os pontos do plano funcional v1.1
2. **Criar migration inicial** num ficheiro `.prisma` novo deste projeto (separado do `ReportsBizzPm`) para testar localmente sem tocar no schema produção
3. **Seed de dados demo** — categorias básicas (Vendas, Compras, Salários, Rendas, Impostos) com flags corretas
4. **Testar invariantes** — especialmente o N↔N da reconciliação — com testes de integração antes de ligar ao TOConline
5. **Merge futuro** — quando o modelo estabilizar, migrar as tabelas `treasury_*` para o `schema.prisma` principal do `ReportsBizzPm` e fazer migration conjunta
