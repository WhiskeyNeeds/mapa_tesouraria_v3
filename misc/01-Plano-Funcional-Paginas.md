# Plano Funcional — Mapa de Tesouraria

**Versão:** 1.1
**Data:** 2026-04-11
**Referências:**
- Repositório inspiração: [cash-flow-compass-main](https://github.com/Rikas98/cash-flow-compass-main/)
- Produto de referência: [Agicap](https://agicap.com/en/)
- API fiscal: TOConline Open API v1.0.0

---

## Arquitetura de dados (resumo)

Três fontes, **uma BD partilhada** com a aplicação de contabilidade/SAF-T existente:

| Fonte | O que fornece | Como entra |
|---|---|---|
| **TOConline API** | Clientes, fornecedores, faturas venda/compra, recibos, pagamentos, produtos, contas bancárias (master), taxas, categorias despesa (read-only) | Sync por polling, cache em tabelas partilhadas |
| **App de contabilidade (mesma BD)** | SAF-T importado, Balancete, Orçamento | Leitura direta das tabelas partilhadas |
| **App Tesouraria (escreve)** | Movimentos bancários importados, reconciliações, fluxos recorrentes, cenários, categorias tesouraria, alertas | Escrita direta nas tabelas partilhadas |

**Zero lacunas bloqueantes.** Duas pendências não-bloqueantes:
1. Confirmar com cliente o uso exato do Balancete no Dashboard Detalhado
2. Decidir que bancos PT são suportados no parser CSV/PDF do MVP

---

## Conceitos transversais (v1.1)

### Flag `lança_toconline` nas categorias
Cada categoria criada em Definições tem um flag **"Lança no TOConline"** (true/false):
- **true:** operações com esta categoria são criadas no TOConline (faturas de venda/compra, recibos, pagamentos). Ex.: "Vendas produtos", "Compra materiais", "Comunicações"
- **false:** operações ficam apenas na BD local, **não sincronizam**. Ex.: "Salários", "Rendas", "Leasings", "IRS retenções"

Isto substitui a antiga página "Outros Fluxos": o que antes era um fluxo sem documento passa a ser uma Conta a Pagar/Receber comum com categoria `lança_toconline = false`.

Na UI: operações locais aparecem misturadas com as do TOConline mas marcadas com um **ícone discreto** (ex.: ponto cinza ou etiqueta "local") para distinção visual.

### Recorrência nas Contas a Receber/Pagar
Ao criar uma Conta a Receber ou Conta a Pagar, é possível marcar como **recorrente**:
- Frequência: Mensal / Trimestral / Semestral / Anual / Personalizada
- Data início, data fim (ou nº ocorrências)
- O sistema gera automaticamente as próximas ocorrências que alimentam a Previsão

Nas listagens há um filtro "Recorrentes" para ver apenas estas.

### Reconciliação N↔N (v1.1)

A reconciliação suporta **multi-seleção em ambos os lados**: o utilizador seleciona 1 ou mais movimentos bancários pendentes **e** 1 ou mais faturas (de venda e/ou de compra), e clica em "Reconciliar seleção". Um modal de confirmação abre e mostra como vai ficar a distribuição; se for necessário confirmar valores por fatura (caso 1↔N ou N↔N), é nesse modal que o utilizador ajusta.

**Quatro combinações possíveis:**

| Caso | Descrição | Tratamento no modal |
|---|---|---|
| **1 ↔ 1** | Um movimento corresponde exatamente a uma fatura | Confirmação direta, valor fixo |
| **1 ↔ N** | Um movimento único reparte-se por várias faturas | Utilizador distribui o valor do movimento pelas faturas, cada input pré-preenchido com o pendente |
| **N ↔ 1** | Vários movimentos (parcelas) amortizam uma única fatura | Total dos movimentos é aplicado à fatura (cap no pendente da fatura) |
| **N ↔ N** | Vários movimentos cobrem várias faturas | Sistema sugere distribuição (greedy por pendente); utilizador ajusta se necessário |

**Regras invariantes (aplicam-se sempre):**
- `valor_atribuído_a_cada_fatura ≤ valor_pendente_dessa_fatura` (o pendente = valor da fatura − já recebido/pago anteriormente)
- `Σ(movimentos selecionados) == Σ(valores atribuídos às faturas)` (balanço fechado)
- **Sentido único por reconciliação:** uma seleção tem de ser ou totalmente "entrada" (movimentos positivos + faturas de venda) ou totalmente "saída" (movimentos negativos + faturas de compra). Nunca mistura.
- A UI **trava ativamente** o universo de seleção: assim que o utilizador escolhe o primeiro item (movimento ou fatura), todos os itens do sentido oposto ficam desativados em ambas as colunas. Para mudar de sentido, o utilizador limpa a seleção.

**Ao confirmar o modal:**
- Para cada fatura envolvida:
  - Se categoria `lança_toconline=true`:
    - **Fatura de venda** → `POST /api/v1/commercial_sales_receipts` com o valor atribuído
    - **Fatura de compra** → `POST /api/v1/commercial_purchases_payments` com o valor atribuído
  - Se `lança_toconline=false`: nada é enviado ao TOConline, reconciliação só local
- Todos os movimentos + faturas envolvidos são ligados entre si em `reconciliations` (tabela de ligação N↔N)
- Movimentos marcados como reconciliados
- Faturas atualizam o valor pago/recebido acumulado; mudam para "Paga"/"Recebida" quando o total for atingido

**Modo dry-run:** o modal mostra "Pré-visualização — nenhum recibo/pagamento será criado neste modo" e o confirmar apenas grava localmente sem chamar o TOConline.

**Desfazer reconciliação:** disponível no histórico. Estorna recibos/pagamentos no TOConline (se não for dry-run) e repõe movimentos + faturas como pendentes.

---

## Índice de páginas

1. Autenticação
2. Dashboard — Visão Geral
3. Dashboard Detalhado
4. Previsão
5. Bancos & Movimentos
6. Reconciliação
7. **Contas a Receber** *(antes: Faturação & Recebimentos)*
8. **Contas a Pagar** *(antes: Compras & Pagamentos)*
9. ~~Outros Fluxos~~ *(removida — ver conceito "Flag lança_toconline" acima)*
10. Definições
11. Ajuda
12. NotFound

---

## 1. Autenticação (`/auth`)

**Propósito:** entrada na app. Login, registo, recuperação de password, seleção de empresa (multi-empresa).

**Fontes de dados:**
- BD partilhada: `users`, `companies`, `user_companies`
- Credenciais API TOConline guardadas por empresa (encriptadas)

**Funcionalidades MVP:**
- Login email/password
- Recuperação de password por email (token único, expira)
- Seletor de empresa ao entrar (se utilizador tem acesso a várias)
- Logout

**Funcionalidades v2:**
- 2FA obrigatório (TOTP)
- SSO Google / Microsoft
- Gestão de sessões ativas (ver dispositivos ligados)

---

## 2. Dashboard — Visão Geral (`/`)

**Propósito:** ecrã inicial. Resposta em 5 segundos a *"tenho dinheiro para o que vem aí?"*. Visão executiva.

**Fontes de dados:**
- **Saldo bancário e evolução** → `bank_movements` (BD local, importados)
- **A Receber** → faturas de venda TOConline sincronizadas
- **A Pagar** → faturas de compra TOConline sincronizadas
- **Top clientes/fornecedores** → cruzamento faturas × entidades
- **Alertas** → tabela `alerts` + regras configuráveis
- **Orçamento (widget opcional)** → tabela orçamento da outra app

**Funcionalidades MVP:**
- KPIs: Saldo Total, Caixa Disponível (Saldo − Pagamentos 30d), A Receber, A Pagar
- Gráfico evolução do saldo (últimos N dias)
- Gráfico entradas vs saídas
- Top 5 clientes a receber
- Top 5 fornecedores a pagar
- Cards por conta bancária (saldo + última atualização)
- Lista de alertas (saldo baixo, faturas vencidas, pagamentos iminentes)
- Filtro temporal: 30 / 60 / 90 dias, este mês, este trimestre

**Funcionalidades v2:**
- Widget "próximos 7 dias" — mini-calendário de movimentos previstos
- Exportar snapshot em PDF
- Personalização de widgets (arrastar/ocultar)

---

## 3. Dashboard Detalhado (`/dashboard-detalhado`)

**Propósito:** análise financeira profunda. Ecrã do CFO/contabilista. Cruza tesouraria (real + previsto), contabilidade (balancete) e orçamento.

**Fontes de dados:**
- **Real** → TOConline (faturas) + `bank_movements` (local)
- **Previsto** → motor de previsão próprio (ver página 4)
- **Orçamento** → tabela da outra app
- **Balancete** → tabela da outra app *(uso exato a confirmar com cliente)*
- **Categorias** → `/api/expense_categories` TOConline (read-only) + `treasury_categories` (local)

**Funcionalidades MVP:**
- Cabeçalho com filtros: ano, modo (Real / Previsto / Ambos)
- KPI Summary anual
- Tabela de Ativos Líquidos (contas bancárias + caixa)
- **Tabela Cash Flow mensal** (estilo Agicap): linhas = categorias, colunas = meses
- Tabela de Receitas detalhada (por categoria / cliente)
- Tabela de Despesas detalhada (por categoria / fornecedor)
- Burn Rate Chart
- Runway Simulator (meses de autonomia ao ritmo atual)

**Funcionalidades v2:**
- Toggle "Comparar com Orçamento" (coluna Real × Orçamento × Desvio)
- Toggle "Comparar com Balancete"
- Drill-down: clicar numa célula → transações/documentos que a compõem
- Comparação ano anterior lado a lado
- Export Excel/PDF

---

## 4. Previsão (`/previsao`)

**Propósito:** projetar saldo de tesouraria (30/60/90 dias, até 12 meses). Identificar rupturas antes de acontecerem. **Core diferenciador da app.**

**Fontes de dados:**
- **Saldo inicial** → último saldo em `bank_movements`
- **Entradas previstas** → faturas venda TOConline não-recebidas com `dueDate` futuro
- **Saídas previstas** → faturas compra TOConline não-pagas com `dueDate` futuro
- **Fluxos recorrentes** → tabela `recurring_flows` (rendas, salários, leasings, impostos)
- **Orçamento** → tabela da outra app, como baseline de cenário

**Funcionalidades MVP:**
- **Cenários:** Base / Conservador / Otimista
  - Parâmetros por cenário: probabilidade recebimento, atraso médio pagamento
- Gráfico de área: evolução do saldo projetado dia a dia
- Linha de referência: saldo mínimo de segurança (configurável)
- Alertas quando projeção cruza limite crítico
- Vista diária + mensal até 90 dias

**Funcionalidades v2:**
- **Cenário Orçamento** (usa valores da outra app)
- **Cenários Personalizados** guardáveis por utilizador
- **Rolling forecast 13 semanas** (vista semanal)
- Vista mensal até 12 meses
- Edição inline: override manual com justificação
- Comparação entre cenários lado a lado
- Export PDF/Excel

---

## 5. Bancos & Movimentos (`/bancos`)

**Propósito:** fonte de verdade dos saldos. Onde os movimentos bancários reais entram na app.

**Fontes de dados:**
- **Contas bancárias (master)** → `GET /api/bank_accounts` TOConline
- **Movimentos** → tabela `bank_movements` local (import CSV/PDF; v2 Open Banking)

**Funcionalidades MVP:**
- Cards por conta bancária (saldo atual calculado, última atualização)
- Tabela de movimentos filtrável por conta / data / estado
- Estados: por classificar / classificado / reconciliado
- **Import CSV** com parsers por banco PT (a priorizar: CGD, Millennium, Santander, BPI, Novobanco, Montepio)
- Deteção de duplicados (hash por data + valor + descrição + conta)
- Criar nova conta bancária (sincroniza com TOConline via `POST /api/bank_accounts`)
- Classificação manual de movimentos (categoria tesouraria)
- Exportar movimentos

**Funcionalidades v2:**
- **Import PDF** (extração de tabelas — definir bancos suportados)
- **Regras de classificação automática** ("todo o movimento de X → categoria Y")
- **Open Banking** (SIBS API Market / GoCardless Bank Account Data)
- Reclassificação em massa

---

## 6. Reconciliação (`/reconciliacao`) — **diferencial chave**

**Propósito:** casar movimentos bancários com faturas. Fecha o ciclo contabilístico no TOConline automaticamente. Suporta relações N↔N (ver conceito transversal).

**Fontes de dados:**
- **Movimentos pendentes** → `bank_movements` não-reconciliados
- **Documentos a receber** → faturas venda TOConline + contas a receber locais (não totalmente recebidas)
- **Documentos a pagar** → faturas compra TOConline + contas a pagar locais (não totalmente pagas)

**Funcionalidades MVP:**

### Vista principal — multi-seleção em ambos os lados
- **Duas colunas** lado a lado:
  - Esquerda: **movimentos bancários pendentes**, cada linha com checkbox
  - Direita: **faturas pendentes** (mistas: contas a receber + contas a pagar), cada linha com checkbox
- **Filtros independentes** em cada coluna: data, entidade, valor, conta bancária, sentido (entrada/saída), origem (TOConline/local), categoria
- Ícone discreto nos documentos locais (categoria `lança_toconline=false`)
- **Barra flutuante no rodapé** (aparece quando há seleção): "3 movimentos · 2 faturas · Σ mov: 20.000€ · Σ pendente: 23.900€"
- Botão **"Reconciliar seleção"** na barra flutuante

### Fluxo de reconciliação

1. Utilizador seleciona **N movimentos** (checkboxes)
2. Utilizador seleciona **N faturas** (checkboxes) — pode misturar receber e pagar
3. Clica em **Reconciliar seleção** na barra flutuante
4. **Abre modal de confirmação** com:
   - **Lado esquerdo:** resumo dos movimentos selecionados (leitura, com data, conta, descrição, valor)
   - **Lado direito:** faturas envolvidas, cada uma com input editável de "valor a dar baixa"
   - Pré-preenchimento dos valores (consoante o caso):
     - **1↔1:** valor fixo igual ao movimento (ou ao pendente se menor)
     - **1↔N:** greedy — enche a primeira fatura até ao pendente, passa à seguinte, até esgotar o movimento
     - **N↔1:** total dos movimentos é aplicado à fatura única (capped no pendente)
     - **N↔N:** distribuição greedy automática; utilizador pode ajustar
   - **Barra de validação em tempo real:** "Atribuído: X€ · Movimentos: Y€ · **Falta: Z€**"
   - Pré-visualização textual: "Serão criados **2 recibos + 1 pagamento** no TOConline" (ou "Operação apenas local" se todas as faturas envolvidas forem locais)
5. Botão **Confirmar** fica ativo apenas quando:
   - `Falta == 0`
   - Todos os valores por fatura respeitam `≤ pendente`
   - Sentido dos movimentos bate com o tipo das faturas

### Efeito ao confirmar
Para cada fatura envolvida:
- **Se categoria `lança_toconline=true`:**
  - **Fatura de venda** → `POST /api/v1/commercial_sales_receipts` com o valor atribuído
  - **Fatura de compra** → `POST /api/v1/commercial_purchases_payments` com o valor atribuído
- **Se categoria `lança_toconline=false`:**
  - Nada é enviado ao TOConline
  - Fatura marcada como reconciliada localmente

Em todos os casos:
- Grava ligações em `reconciliations` (tabela N↔N entre `bank_movements` e `receivables/payables`)
- Atualiza valor pago/recebido acumulado em cada fatura
- Se total atingido → fatura passa a "Paga" / "Recebida"
- Movimentos passam a `reconciled`

### Modo dry-run
Nas primeiras semanas (configurável em Definições → Integrações):
- O modal mostra "Pré-visualização — nenhum recibo/pagamento será criado neste modo"
- Ao confirmar, apenas grava localmente sem chamar o TOConline
- Permite validação humana do fluxo antes de ativar escrita real

### Histórico e auditoria
- Lista de reconciliações por utilizador e data
- Detalhe: [movimentos] → [faturas] → [recibos/pagamentos TOConline]
- Possibilidade de **desfazer** (com estorno no TOConline se escrita real)

**Funcionalidades v2:**
- **Matching automático** por valor + data (±N dias) + referência/entidade
- Sugestões inteligentes ordenadas por confiança (> 95% auto, 70-95% sugere, < 70% ignora)
- Reconciliação inversa (1 fatura grande ↔ N movimentos ao longo do tempo) — o fluxo é o mesmo, seleção começa na fatura
- Regras de auto-matching configuráveis por entidade

---

## 7. Contas a Receber (`/contas-a-receber`)

**Propósito:** gestão unificada de contas a receber de clientes. Inclui faturas de venda emitidas no TOConline **e** entradas recorrentes/locais (categoria `lança_toconline = false`, ex.: subaluguer, rendas recebidas).

**Fontes de dados:**
- Faturas de venda TOConline (`GET /api/v1/commercial_sales_documents`)
- Contas a receber locais na BD partilhada (categorias não-TOConline)

**Funcionalidades MVP:**

### Listagem
- Tabela com: nº documento, cliente/entidade, categoria, data, vencimento, valor, **valor pendente**, estado
- Filtros: estado (a receber / parcial / recebido / vencido), cliente, categoria, data
- Filtro "**Recorrentes**" — mostra apenas linhas com recorrência ativa
- Filtro "**Origem**" — TOConline / Local / Todos
- Ícone discreto ao lado das linhas locais
- KPIs: Total a receber, nº vencidas, DSO médio, Recebido no mês
- **Aging buckets** 0-30 / 31-60 / 61-90 / 90+

### Criação
- **Nova conta a receber** → formulário:
  - Cliente (dropdown do TOConline ou criar novo)
  - Categoria (herda flag `lança_toconline`)
  - Data documento, vencimento, valor
  - Descrição/referência
  - **Recorrente?** Se sim: frequência, início, fim/ocorrências
- Se categoria `lança_toconline = true` → cria fatura no TOConline (`POST /commercial_sales_documents`)
- Se categoria `lança_toconline = false` → grava apenas local

### Ações por linha
- Descarregar PDF (apenas TOConline) (`GET /api/url_for_print/{id}`)
- Enviar por email (apenas TOConline) (`PATCH /api/email/document`)
- **Ir para reconciliação** (pré-seleciona a fatura)
- Editar recorrência (apenas para recorrentes)
- Anular

**Funcionalidades v2:**
- Comunicar à AT (`PATCH /api/send_document_at_webservice`)
- Follow-up automático de cobrança (clientes em atraso)
- DSO por cliente
- Templates de fatura personalizáveis
- Valor indexado ao IPC em recorrências (ex.: rendas)

---

## 8. Contas a Pagar (`/contas-a-pagar`)

**Propósito:** gestão unificada de contas a pagar a fornecedores. Inclui faturas de compra TOConline **e** saídas recorrentes/locais (salários, rendas, leasings, IRS, seguros).

**Fontes de dados:**
- Faturas de compra TOConline (`GET /api/v1/commercial_purchases_documents`)
- Contas a pagar locais na BD partilhada (categorias não-TOConline)

**Funcionalidades MVP:**

### Listagem
- Tabela com: nº documento, fornecedor/entidade, categoria, vencimento, valor, **valor pendente**, estado
- Filtros: estado (por pagar / parcial / pago / vencido), fornecedor, categoria, data
- Filtro "**Recorrentes**" — mostra apenas recorrentes ativas
- Filtro "**Origem**" — TOConline / Local / Todos
- Ícone discreto nas linhas locais
- KPIs: Total a pagar, nº vencidas, DPO médio, Pago no mês

### Criação
- **Nova conta a pagar** → formulário:
  - Fornecedor (dropdown TOConline ou criar novo)
  - Categoria (herda flag `lança_toconline`)
  - Data documento, vencimento, valor
  - Descrição/referência
  - **Recorrente?** Se sim: frequência, início, fim/ocorrências
- Se categoria `lança_toconline = true` → cria documento compra no TOConline (`POST /commercial_purchases_documents`)
- Se categoria `lança_toconline = false` → grava apenas local (ex.: salários)

### Ações por linha
- Descarregar PDF (apenas TOConline)
- **Ir para reconciliação**
- Editar recorrência
- Anular

**Funcionalidades v2:**
- **Agendamento de pagamentos** (calendário semanal)
- **Priorização automática** ("o que pagar se só tiver X€ disponível")
- **Workflow de aprovações multi-nível** (segregação de funções)
- DPO por fornecedor
- Importação em massa de recorrências (ex.: carregar folha de salários)

---

## 10. Definições (`/definicoes`)

**Propósito:** configuração da app. Organizada em separadores.

**Separadores:**

### Empresa
- Nome, NIF, morada, logo
- Dados fiscais
- Moeda base

### Utilizadores
- Gerir acessos da equipa
- Papéis: Admin / Financeiro / Consulta / Contabilista externo
- Convites por email
- Desativar conta
- *(v2)* Log de acessos por utilizador

### Categorias
- **Categorias de Despesa TOConline** (read-only, via `/api/expense_categories`) — referência
- **Categorias de Tesouraria** (próprias, editáveis) — usadas em CR, CP, classificação de movimentos e cash flow
- **Cada categoria tem flag "Lança no TOConline" (true/false)**
  - `true`: operações com esta categoria geram documentos no TOConline e as reconciliações emitem recibos/pagamentos
  - `false`: operações ficam apenas na BD local (salários, rendas, leasings, IRS, etc.)
- Tipo: Receita / Despesa
- Mapping entre categoria de tesouraria e categoria TOConline (quando `lança_toconline = true`)

### Notificações
- Preferências de alertas (saldo baixo, vencimentos, rupturas previstas)
- Canais: email, in-app, *(v2)* push

### Integrações
- **TOConline:** credenciais API por empresa, estado da sincronização, último sync, forçar sync
- **Parsers bancários:** bancos ativos para import CSV/PDF
- **Open Banking** *(v2)*

### Regras
- Regras de classificação automática (entidade → categoria)
- Saldo mínimo de segurança por conta bancária (alimenta alertas)
- Limites de aprovação por papel *(v2)*

### Auditoria *(v2)*
- Histórico de alterações sensíveis
- Exportar logs

---

## 11. Ajuda (`/ajuda`)

**Propósito:** base de conhecimento e suporte.

**Funcionalidades MVP:**
- Pesquisa de artigos
- Categorias: Primeiros Passos, Reconciliação, Previsão, Import Bancário
- Contacto de suporte (email)

**Funcionalidades v2:**
- Chat de suporte in-app
- Vídeos tutoriais
- Changelog
- FAQ

---

## 12. NotFound (`/404`)

Página de erro simples. Sem lógica funcional.

---

## Matriz de cobertura final

| Página | TOConline | BD partilhada (contabilidade) | BD partilhada (tesouraria) | Estado |
|---|---|---|---|---|
| 1 Auth | — | users, companies | credenciais API (encriptadas) | ✅ |
| 2 Dashboard | faturas | orçamento (widget v2) | bank_movements, alerts | ✅ |
| 3 Dashboard Detalhado | faturas, categorias | orçamento, balancete | movimentos, categorias TES | ✅ |
| 4 Previsão | faturas pendentes | orçamento (baseline) | receivables, payables, scenarios, bank_movements | ✅ |
| 5 Bancos | contas bancárias | — | bank_movements (import) | ✅ |
| 6 Reconciliação | faturas + escrita **N recibos/pagamentos** | — | reconciliations (N↔N) | ✅ |
| 7 Contas a Receber | faturas venda (`lança_toconline=true`) | — | receivables locais (`lança_toconline=false`) | ✅ |
| 8 Contas a Pagar | faturas compra (`lança_toconline=true`) | — | payables locais (`lança_toconline=false`) | ✅ |
| ~~9 Outros Fluxos~~ | — | — | ~~substituído pelo flag de categoria~~ | ❌ removido |
| 10 Definições | categorias despesa (read) | users | categorias (c/ flag), tudo o resto | ✅ |
| 11 Ajuda | — | — | estática | ✅ |

---

## Proposta de faseamento

### MVP (v1) — o essencial que entrega valor
- Auth básica + RBAC
- Dashboard Visão Geral
- Bancos & Movimentos (import CSV dos 3-4 bancos mais usados pelos clientes)
- **Contas a Receber** (listar, criar, PDF, email, recorrência, locais vs TOConline)
- **Contas a Pagar** (listar, criar, pagar, recorrência, locais vs TOConline)
- **Reconciliação N↔N** (1 movimento → N faturas com valor parcial por fatura; dry-run)
- **Categorias com flag `lança_toconline`**
- Previsão com 3 cenários fixos
- Definições essenciais (empresa, utilizadores, categorias c/ flag, TOConline)
- Dashboard Detalhado básico (sem orçamento/balancete)

### v2 — diferenciação
- Matching automático de reconciliação
- Dashboard Detalhado completo (orçamento + balancete)
- Previsão avançada (cenários personalizados, 13 semanas, 12 meses)
- Agendamento/priorização de pagamentos
- Import PDF bancário
- 2FA
- Follow-up automático cobranças
- Comunicação AT

### v3 — escala
- Open Banking (substitui import CSV)
- Workflow de aprovações
- Multi-moeda avançada
- Relatórios personalizáveis
- API pública

---

## Próximos passos

1. **Validar este plano com o cliente** — cortar/adicionar funcionalidades
2. **Confirmar uso do Balancete** no Dashboard Detalhado
3. **Listar bancos PT prioritários** para parsers CSV
4. **Levantamento técnico** — modelo de dados, stack, fluxos de sincronização
5. Ver documento `02-Plano-Seguranca.md` para os requisitos de segurança que devem acompanhar cada fase
