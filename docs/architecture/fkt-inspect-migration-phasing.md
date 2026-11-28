# FKT Inspect — plano de migrações físicas por fases

**Estado:** especificação técnica preparatória; ainda não é uma migração executável aprovada.  
**Data:** 28/11/2026  
**Projecto Supabase:** `gllrqrqonwuacjxbtgnp` (único projecto FKT).

## 1. Estado real confirmado

A consulta ao projecto remoto confirmou:

- O Core já tem `public.workspaces` e `public.workspace_members`.
- `workspaces.modulo` continua limitado a `juridico`, `canil`, `dev`, `obras`; ainda não aceita `inspect`.
- `workspace_members` tem `UNIQUE(workspace_id,user_id)`, não unicidade global de `user_id`.
- As funções `private.workspace_can_read(uuid)`, `private.workspace_can_write(uuid)`, `private.workspace_is_owner(uuid)` e `private.workspace_role_for_current_user(uuid)` existem e são executáveis por `authenticated`.
- `workspace_can_write` aceita os papéis Core `owner`, `admin` e `editor`; `workspace_can_read` aceita qualquer membro autorizado.
- Não existem tabelas Inspect na BD remota e as migrações Inspect actualmente presentes no repositório não constam do histórico remoto.

Esta confirmação é apenas leitura. Não foi executado DDL nem aplicada qualquer migração remota.

## 2. Sequência de migrações

### Fase 1 — entidades-base e isolamento por defeito

Objectivo: criar organização Inspect, clientes e estabelecimentos, sem permitir acesso durante a fase intermédia.

Inclui:
1. Criar/assegurar o schema `private` e revogar acesso público.
2. Alterar `workspaces_modulo_check` para acrescentar `inspect`, preservando os quatro valores existentes.
3. Criar `inspect_organisations` com relação 1:1 ao workspace.
4. Criar `inspect_clients` e `inspect_establishments`, ambos scoped pela organização.
5. Adicionar constraints, índices, autoria e timestamps.
6. Criar trigger de autoria server-side.
7. Aplicar imediatamente `REVOKE` de `PUBLIC`, `anon` e `authenticated` nas novas tabelas e activar RLS sem policies. Assim, nenhuma janela entre migrações expõe dados.

Critérios:
- Uma organização por workspace.
- Organização com `organisation_type IN ('consultant','operator','hybrid')`.
- Nomes não vazios e estados validados por CHECK.
- FKs com `ON DELETE RESTRICT` para preservar histórico.
- Não permitir alterar `workspace_id` de uma organização após criação.
- Nenhum acesso `anon` ou `authenticated` até à fase de permissões.

### Fase 2 — relações temporais cliente/estabelecimento

Objectivo: registar a carteira sem misturar tenants nem reescrever histórico.

Inclui:
1. Criar `inspect_client_establishments`.
2. FKs compostas para garantir que cliente e estabelecimento pertencem à mesma organização.
3. CHECK de período `valid_until IS NULL OR valid_until > valid_from`.
4. Índices para pesquisa por cliente e estabelecimento/período.
5. Trigger que impede sobreposição de intervalos para a mesma organização/cliente/estabelecimento, serializando concorrência com advisory transaction lock.
6. Impedir reescrita dos campos históricos; terminar relação apenas preenchendo `valid_until`.
7. RLS activa e privilégios revogados até à fase 3.

Critérios:
- Nenhuma relação cruza organizações.
- Intervalos são semiabertos `[valid_from, valid_until)`.
- Não há sobreposição, incluindo em inserções concorrentes.
- Uma relação terminada não pode ser reaberta nem alterada.

### Fase 3 — permissões, RLS e GRANT explícitos

Objectivo: abrir apenas o acesso necessário ao fluxo de carteira.

Helpers Core confirmados no remoto:
- `private.workspace_can_read(workspace_id)`
- `private.workspace_can_write(workspace_id)`
- `private.workspace_is_owner(workspace_id)`

Políticas previstas:
- `inspect_organisations SELECT`: `workspace_can_read`.
- `inspect_organisations INSERT`: `workspace_is_owner` e workspace com `modulo='inspect'`.
- `inspect_organisations UPDATE`: owner do workspace, sem permitir alterar `workspace_id`.
- `inspect_clients`, `inspect_establishments` e relações: leitura com `workspace_can_read`; criação/actualização com `workspace_can_write`.
- Sem política DELETE e sem GRANT DELETE.
- `REVOKE ALL` de `PUBLIC` e `anon`; GRANT apenas SELECT/INSERT/UPDATE a `authenticated`.
- RLS activada em todas as tabelas.

Nota de autorização: nesta fase de carteira, o Core owner/admin/editor é a fronteira de gestão do workspace. Os papéis operacionais Inspect do restaurante (gerente, responsável HACCP, colaborador) pertencem a uma fase posterior e não são substituídos por `workspace_members`.

## 3. Correcções obrigatórias à migração monolítica existente

A migração `20261128170000_fkt_inspect_foundation.sql` mistura entidades, relações e permissões numa única transacção. Deve ser substituída por três migrações sequenciais, mantendo o mesmo efeito final e assegurando negação por defeito entre fases.

Antes da divisão, corrigir:
- Proteger `inspect_organisations.workspace_id` contra alteração após criação.
- Garantir que o trigger de autoria não permite falsificar `created_at/created_by` nem reescrever timestamps de associação.
- Manter as FKs compostas da relação temporal.
- Preservar os valores existentes da constraint Core; não substituir a constraint por um conjunto incompleto.
- Confirmar o comportamento do advisory lock e da exclusão temporal em concorrência.
- Não assumir que RLS substitui GRANT: os dois são necessários.

A migração actual não deve ser aplicada remotamente tal como está antes desta revisão.

## 4. Testes obrigatórios por fase

### Fase 1
- Tabelas e constraints criadas.
- Workspace aceita `inspect` e mantém os módulos anteriores.
- Organização 1:1.
- FKs e estados inválidos rejeitados.
- `anon` e `authenticated` sem privilégios; RLS activa e sem policies permissivas.

### Fase 2
- FKs compostas rejeitam mistura de tenants.
- Períodos inválidos rejeitados.
- Sobreposição rejeitada.
- Vigência adjacente aceite.
- Reescrita de histórico rejeitada.
- Teste de duas transacções concorrentes para a mesma relação.

### Fase 3
- Owner cria organização apenas em workspace Inspect próprio.
- Viewer lê mas não escreve.
- Editor/admin podem gerir carteira conforme Core.
- Utilizador de outro workspace não lê nem escreve.
- `anon` sem SELECT/INSERT/UPDATE/DELETE.
- Nenhuma tabela concede DELETE directo.
- UPDATE sem SELECT policy não fica silenciosamente bloqueado: testar leitura e escrita efectivas.

## 5. Dependências e bloqueios

- A implementação deve ser criada com Supabase CLI através de `supabase migration new <nome>`, na cópia local do repositório, e depois commitada. O ambiente desta sessão não tem Supabase CLI nem checkout local do repositório; por isso não foram inventados ficheiros de migração nem timestamps.
- Antes de executar, validar a sequência local com `supabase db reset` e `supabase test db`.
- Executar `supabase db advisors` / advisors de segurança depois das alterações.
- Não aplicar ao projecto remoto sem autorização explícita.
- A migração de FAQ Inspect é independente da fundação de dados e não deve ser confundida com a disponibilidade do módulo.

## 6. Próximo passo

Obter checkout local do repositório com Supabase CLI disponível; criar as três migrações com o comando oficial; separar a migração monolítica ainda não aplicada; implementar os testes pgTAP por fase; rever o diff antes de qualquer aplicação remota.
