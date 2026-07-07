# Sistema Financeiro

Um sistema financeiro completo em português para controle de receitas, despesas, contas a pagar/receber, fluxo de caixa e relatórios.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (porta 8080, proxy em /api)
- `pnpm --filter @workspace/financeiro run dev` — Frontend React/Vite
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — typecheck + build todos os pacotes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks React Query e schemas Zod
- `pnpm --filter @workspace/db run push` — aplicar mudanças no schema do banco (dev)
- Variável obrigatória: `DATABASE_URL` — connection string do PostgreSQL

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Recharts, Wouter, React Query
- API: Express 5 + Pino logging
- DB: PostgreSQL + Drizzle ORM
- Validação: Zod (zod/v4), drizzle-zod
- Codegen: Orval (OpenAPI spec → hooks + schemas)
- Exportação: xlsx (Excel), jspdf + jspdf-autotable (PDF)

## Where things live

- `lib/api-spec/openapi.yaml` — especificação OpenAPI (fonte da verdade)
- `lib/db/src/schema/` — schemas do banco (categorias, contas, transacoes, contasAPagar, contasAReceber)
- `artifacts/api-server/src/routes/` — rotas da API
- `artifacts/financeiro/src/` — frontend React
- `lib/api-client-react/src/generated/` — hooks gerados (não editar manualmente)
- `lib/api-zod/src/generated/` — schemas Zod gerados (não editar manualmente)

## Architecture decisions

- OpenAPI-first: a spec em `lib/api-spec/openapi.yaml` é a fonte da verdade; nunca editar os arquivos gerados
- Datas usam `date(..., { mode: "string" })` no Drizzle para preservar o dia sem shift de timezone
- Campos numéricos monetários são armazenados como `numeric` no PostgreSQL e convertidos via `parseFloat()` nas respostas
- Saldo das contas é recalculado automaticamente ao criar/atualizar/excluir transações confirmadas
- Contas vencidas são auto-marcadas como "vencido" na listagem (antes de aplicar filtros)
- Exportação Excel/PDF é gerada no cliente a partir de dados estruturados retornados pela API

## Product

- **Dashboard**: KPIs do mês atual, variação vs mês anterior, gráfico de barras mensal, pizza por categoria, últimas transações, alertas de vencimento
- **Transações**: CRUD completo, filtros por tipo/categoria/conta/status/período, pesquisa por texto, paginação, exportação Excel/PDF
- **Categorias**: CRUD com cor e ícone, separadas por receita/despesa
- **Contas**: CRUD de contas bancárias/carteiras com saldo calculado automaticamente
- **Contas a Pagar**: listagem com status (pendente/pago/vencido/cancelado), ação de "Pagar" com modal, exportação
- **Contas a Receber**: listagem com status, ação de "Receber" com modal, exportação
- **Fluxo de Caixa**: gráfico de área com saldo acumulado, agrupamento por dia/semana/mês, tabela detalhada

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Ao mudar o tipo/localização de uma transação, o saldo de ambas as contas (antiga e nova) é recalculado
- Os schemas Zod gerados usam `zod.coerce.date()` para campos de data — converter sempre para string YYYY-MM-DD antes de usar no Drizzle com `toDateStr()`
- Rodar `pnpm run typecheck:libs` antes de `pnpm --filter @workspace/api-server run typecheck` se houver mudanças em `lib/db`
- Nunca usar `orderBy(sql\`coluna DESC\`)` com colunas Drizzle — usar `desc(coluna)` do drizzle-orm
