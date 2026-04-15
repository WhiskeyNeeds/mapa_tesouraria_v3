# Mapa de Tesouraria v3

## Dizem que à terceira é de vez

- Próximo passo: Conquistar o mundo (ou pelo menos terminar o projeto de estágio)

## Stack (versoes exatas)

- Frontend: Next.js App Router 14.2.16
- Linguagem: TypeScript 5.6.3
- UI: Tailwind CSS 3.4.14 + shadcn/ui
- Icons: lucide-react 0.453.0
- Estado: Zustand 5.0.1
- Data fetching: TanStack React Query 5.59.20 + axios 1.7.7
- Forms: react-hook-form 7.53.2 + zod 3.23.8
- Charts: Recharts 2.13.3
- Toasts: Sonner 1.7.0
- Backend: Fastify 4.28.1
- ORM: Prisma 5.22.0
- Base de dados: PostgreSQL
- Auth: JWT custom + useAuthStore (Zustand)

## Estrutura de pastas

```text
apps/
	api/
		prisma/
			schema.prisma
		src/
			lib/
				jwt.ts
			plugins/
				auth.ts
			data/
				mock.ts
			modules/
				auth/routes.ts
				treasury/
					dashboard/routes.ts
					banks/routes.ts
					reconciliation/routes.ts
					receivables/routes.ts
					payables/routes.ts
					settings/routes.ts
					index.ts
			app.ts
			server.ts
	web/
		app/
			globals.css
			layout.tsx
			page.tsx
			providers.tsx
		components/
			dashboard/KpiCard.tsx
			layout/Sidebar.tsx
			layout/TreasuryApp.tsx
			ui/button.tsx
		lib/
			api.ts
			utils.ts
		stores/
			useAuthStore.ts
		next.config.mjs
		tailwind.config.ts
		postcss.config.js
package.json
tsconfig.base.json
```

## Como correr

1. Instalar dependencias:

```bash
npm install
```

2. Subir API:

```bash
npm run dev:api
```

3. Subir frontend:

```bash
npm run dev:web
```

4. Login demo (frontend):

- email: demo@bizzpm.pt
- password: 123456

## Endpoints MVP

- GET /health
- POST /api/v1/auth/login
- GET /api/v1/treasury/dashboard
- GET /api/v1/treasury/banks/accounts
- GET /api/v1/treasury/banks/movements
- GET /api/v1/treasury/receivables
- GET /api/v1/treasury/payables
- GET /api/v1/treasury/settings/categories
- POST /api/v1/treasury/reconciliation/preview

## Nota

Esta versao usa dados mock protegidos por JWT para demonstracao funcional e UX.
Passo seguinte: ligar os modulos treasury ao Prisma Client real e aos servicos TOConline.