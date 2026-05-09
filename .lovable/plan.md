
# Plano — Cobrir lacunas funcionais

Trabalho dividido em 4 fases independentes. Tudo respeita o Neutral Core (`src/components/processos/` intocável) e adiciona-se em pastas próprias.

---

## Fase 1 — Pesquisa e filtros globais

**Listagens alvo:** `DossiersList`, `juridico/JuridicoDashboard`, `canil/CanilDashboard` (animais/reservas), `dev/DevDashboard` (projectos/issues), `Conhecimento`.

Criar componente reutilizável `src/components/filters/ListFilters.tsx`:
- Search input (debounced, 250ms)
- Select de Estado (opções vêm por prop)
- Select de Tipo (opcional, por prop)
- Select de Cliente (lista de `clientes` do user, só em Dossiers)
- Date range (DatePicker shadcn, intervalo `created_at` ou data específica)
- Botão "Limpar"
- Layout colapsável em mobile (Sheet)

Para `DossiersList`:
- Pesquisa cobre `titulo`, `materia` e `cliente.nome` (já é regra na memória).
- Estado: `em_analise`, `concluido`, `arquivado`.
- Tipo: `academico`, `juridico`, etc.
- Tudo aplicado client-side sobre o resultado de `useDossiers` (já carregado), com `useMemo`. Sem alterações de DB.

Para módulos: replicar com selects adequados ao domínio (ex.: `activo/inactivo` em animais, `aberto/em_curso/fechado` em issues).

---

## Fase 2 — CRUD completo (editar / eliminar)

Padrão único reutilizável:
- **Editar**: dialog inline (`EditDossierDialog`, etc.) com mesmos campos do "novo", carregando dados via hook existente. Botão "lápis" em cada card/linha.
- **Eliminar**: `AlertDialog` shadcn com confirmação textual ("Escrever ELIMINAR para confirmar" só em Dossiers; nos restantes basta confirmar).
- Hook genérico `useCrudActions(table)` que devolve `update` e `remove` com toast + invalidação.

Aplicar a:
- Dossiers (`DossiersList` + `DossierDetalhe` header)
- Disciplinas e Tópicos (Conhecimento) — fechar o ciclo CRUD
- Canil: animais, ninhadas, reservas, registos clínicos
- Dev: projectos, issues, ADRs
- Jurídico: processos, prazos, partes, documentos
- Clientes (já existe? confirmar e completar se faltar editar/eliminar)

Cascata: confirmar com aviso de quantos registos dependentes serão removidos (count via query antes de eliminar).

---

## Fase 3 — Ligação Conhecimento ↔ Dossier

Tabela `disciplina_processos` já existe (M:N entre `disciplinas` e `dossiers`).

UI:
1. Em `DossierDetalhe` adicionar nova secção colapsável **"Conhecimento associado"** (ao lado das outras secções).
   - Lista chips de disciplinas associadas, com link para `/conhecimento/:id`.
   - Botão "Associar disciplina" abre `Command` palette (shadcn) com pesquisa em todas as disciplinas do user; selecção cria/remove linha em `disciplina_processos`.
   - Mostrar também tópicos dessas disciplinas (preview), com link directo ao tópico relevante.
2. Em `DisciplinaDetalhe` reforçar a lista de dossiers ligados (já pode existir parcialmente) com botão "Associar dossier" simétrico.

Hook novo: `src/hooks/useDossierDisciplinas.ts` (`list`, `attach`, `detach`).

---

## Fase 4 — UX, Roles e Analytics

### 4a. Loading / erros consistentes
- Criar `src/components/common/QueryState.tsx` com props `loading`, `error`, `empty`, `children`.
  - `loading` → `<Skeleton>` (n linhas configurável).
  - `error` → alerta com `formatDatabaseError` + botão retry.
  - `empty` → mensagem + CTA opcional.
- Substituir os `if (loading) return <p>Carregando...</p>` espalhados.

### 4b. Roles via `workspace_members.role` (sem nova tabela)
- Hook `useWorkspaceRole()` devolve `role` ('owner' | 'admin' | 'editor' | 'viewer') do workspace activo.
  - 'owner' = `workspaces.user_id === auth.uid()`.
- Componente `<RoleGate roles={['owner','admin']}>...</RoleGate>` para esconder botões de escrita/eliminação a `viewer`.
- `AdminRoute` em `src/components/layout/AdminRoute.tsx` que redirecciona para `/dashboard` se role não for owner/admin. Aplicar a futuras rotas `/admin/*` (se existirem rotas admin actuais, embrulhar).
- RLS já está alinhado (migrações anteriores) — apenas reforço no frontend.

### 4c. Dashboard de Analytics
- Nova página `src/pages/Analytics.tsx` em `/dashboard/analytics`.
- Widgets com `recharts`:
  - Dossiers por estado (PieChart)
  - Dossiers criados nos últimos 6 meses (BarChart)
  - Top 5 disciplinas mais referenciadas (count via `disciplina_processos`)
  - Acções no planner por estado (Stacked bar)
  - Por workspace activo: contadores rápidos do módulo (ex.: nº reservas activas, issues abertos).
- Link no menu lateral.

---

## Detalhes técnicos

```text
src/
├─ components/
│  ├─ filters/ListFilters.tsx          (Fase 1)
│  ├─ common/QueryState.tsx            (Fase 4a)
│  ├─ common/ConfirmDeleteDialog.tsx   (Fase 2)
│  ├─ common/RoleGate.tsx              (Fase 4b)
│  ├─ dossiers/EditDossierDialog.tsx   (Fase 2)
│  ├─ dossiers/DisciplinasSection.tsx  (Fase 3)
│  └─ layout/AdminRoute.tsx            (Fase 4b)
├─ hooks/
│  ├─ useCrudActions.ts                (Fase 2)
│  ├─ useDossierDisciplinas.ts         (Fase 3)
│  ├─ useWorkspaceRole.ts              (Fase 4b)
│  └─ useDossierFilters.ts             (Fase 1)
└─ pages/
   └─ Analytics.tsx                    (Fase 4c)
```

Sem migrações de DB nesta fase — todas as tabelas e RLS necessárias já existem. Tudo client-side com hooks existentes + novos.

## Ordem sugerida de implementação
1. Fase 1 (filtros) — entrega visível rápida.
2. Fase 2 (CRUD) — fecha ciclos.
3. Fase 3 (Conhecimento↔Dossier) — valor central do produto.
4. Fase 4 (UX/Roles/Analytics) — polimento.
