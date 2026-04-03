
## Plano: Rename Processos → Dossier + Módulo Planner

### Fase 1 — Migração DB: Renomear tabela `processos` → `dossiers`

**Migration SQL:**
- Renomear tabela `processos` para `dossiers`
- Atualizar todas as foreign keys, RLS policies, e functions que referenciam `processos`
- Criar tabela `actions` (id, dossier_id, titulo, data, estado, created_at, updated_at)
- RLS policies para `actions` via dossier owner

### Fase 2 — Rename no código frontend

- Atualizar `src/types/index.ts` e `src/types/database.ts` (Processo → Dossier, processos → dossiers)
- Atualizar todas as queries Supabase que referenciam `processos` → `dossiers`
- Renomear ficheiros e componentes:
  - `src/pages/processos/` → `src/pages/dossiers/`
  - `src/hooks/useProcessos.ts` → `src/hooks/useDossiers.ts`
  - `src/components/processos/` → `src/components/dossiers/`
- Atualizar rotas no `App.tsx`: `/processos` → `/dossiers`
- Atualizar labels na UI (sidebar, dashboard, breadcrumbs)

### Fase 3 — Módulo Planner

- Criar hook `useActions.ts` para CRUD de actions
- Criar componente `PlannerOverview` no dashboard (agrupado por Atrasado/Hoje/Próximos/Sem data)
- Dentro de cada dossier: secção "Próxima Ação" + histórico de ações
- Interações: marcar concluída, editar inline, link para dossier

### Notas
- A migration renomeia a tabela mas mantém compatibilidade com RLS existente
- Constraint: máximo 1 ação "ativo" por dossier (via trigger ou app-level)
