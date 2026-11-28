# FKT Inspect — matriz de políticas RLS e Storage

## Estado

**Especificação de segurança para revisão antes de SQL.** Não contém políticas executáveis. A matriz pressupõe o modelo relacional lógico documentado em `fkt-inspect-relational-model.md` e a matriz externa em `fkt-inspect-external-access-permissions-matrix.md`.

## 1. Princípios de implementação

- RLS activa em todas as tabelas expostas no schema `public`.
- Privilégios SQL explícitos: não conceder `ALL` a `authenticated`; conceder apenas SELECT/INSERT/UPDATE/DELETE necessários por tabela.
- Negação por defeito, sem política genérica que dê acesso a todos os membros do workspace.
- Helpers privados em schema `private`, não expostos na API, com `SECURITY DEFINER` apenas quando necessário, `search_path` fixo (`pg_catalog, public, auth, private` conforme dependências), owner controlado e privilégios revogados a `PUBLIC`/`anon`.
- Derivar actor sempre de `auth.uid()`; nunca aceitar actor, workspace, organização ou utilizador-alvo como autoridade fornecida pelo frontend.
- Preferir `SECURITY INVOKER`; qualquer `SECURITY DEFINER` deve ter revisão dedicada, assinatura mínima e testes de abuso.
- Políticas não devem consultar recursivamente tabelas sujeitas às próprias políticas sem helper cuidadosamente desenhado.
- Não usar `service_role` no cliente. Edge Functions devem validar JWT e autorização explicitamente; service role não substitui a validação do actor.
- Não usar `FOR ALL` como atalho. Separar SELECT, INSERT, UPDATE e DELETE e evitar DELETE físico em dados históricos.
- RLS não esconde colunas. Dados internos e partilhados têm tabelas distintas ou uma projecção de servidor com grants mínimos.

## 2. Helpers de autorização propostos

Nomes conceptuais, não SQL final:

- `private.inspect_is_org_member(_organisation_id)`: verifica que `auth.uid()` é owner/membro do workspace ligado à organização.
- `private.inspect_can_manage_org(_organisation_id)`: proprietário/administrador autorizado para gestão da organização.
- `private.inspect_can_work_audit(_audit_id)`: auditor/equipa interna com atribuição e permissão de trabalho.
- `private.inspect_has_active_grant(_audit_id)`: concessão aceite, activa e não expirada para `auth.uid()`.
- `private.inspect_has_grant_permission(_audit_id, _permission)`: grant activo mais permissão explícita.
- `private.inspect_audit_is_submitted(_audit_id)`: auditoria submetida e não anulada.
- `private.inspect_resource_is_published(_resource_id, _resource_type)`: publicação válida para a versão consultada.
- `private.inspect_can_respond_to_action(_action_id)`: grant, permissão de resposta, atribuição da acção ao destinatário e estado aberto.

Todos os helpers externos derivam identidade de `auth.uid()`. Não devem aceitar `user_id` arbitrário. As funções têm de ser estáveis/imutáveis apenas quando a semântica o permita; não marcar como IMMUTABLE verificações dependentes de tabelas.

## 3. Matriz RLS por grupo de tabelas

| Tabelas/grupo | SELECT interno | SELECT externo | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `inspect_organisations` | Membros da organização | Negado | Owner cria via activação controlada | Admin/owner, campos permitidos | Negado; desactivação lógica |
| `inspect_parties`, `inspect_clients`, `inspect_establishments` | Membros autorizados | Negado | Editor/admin conforme papel | Editor/admin conforme papel | Negado; arquivo lógico |
| Templates, versões, secções, critérios | Membros com permissão de modelo | Negado | Editor/admin | Draft apenas; versão publicada imutável | Negado em versões publicadas |
| `inspect_audits` | Equipa atribuída/gestores | Negado em SELECT directo | Auditor autorizado | Equipa conforme estado; transições por RPC | Negado; cancelar/arquivar |
| Resultados e medições | Equipa atribuída | Negado em tabelas base | Auditor atribuído | Auditor autorizado antes da submissão | Negado após criação; correcção auditada |
| Notas internas | Equipa autorizada | Sempre negado | Equipa autorizada | Equipa autorizada com histórico | Negado; evento/arquivo |
| Evidência não publicada | Equipa autorizada | Sempre negado | Equipa autorizada ou fluxo de upload validado | Metadados restritos | Sem delete directo; retenção |
| Publicações e resultados publicados | Equipa autorizada | Grant + permissão específica + auditoria submetida | RPC de publicação | Revogação via evento/RPC | Negado |
| Findings e acções | Equipa autorizada | Só projecção publicada/atribuída | Auditor autorizado | Equipa; estado via RPC | Negado |
| Respostas externas | Equipa autorizada | Autor e equipa da auditoria; externo apenas próprias respostas | Externo apenas acção atribuída + permissão + auditoria submetida | Sem update directo; nova resposta/submissão | Negado |
| Verificações de eficácia | Auditor/equipa autorizada | Sempre negado | Auditor autorizado | Append-only; nova verificação | Negado |
| Submissões e relatórios | Equipa autorizada | Apenas versão publicada e permissão específica | RPC de submissão/emissão | Sem update; nova versão/adenda | Negado |
| Convites | Admin/auditor que gere a partilha | Destinatário apenas por fluxo de aceitação, sem enumeração | RPC de convite | RPC de reenvio/revogação | Negado |
| Grants e permissões | Admin/auditor autorizado | Sem SELECT directo; estado mínimo do próprio via RPC | RPC após aceitação | RPC para alteração/revogação | Negado |
| Eventos de segurança | Admin/owner autorizado | Negado | Triggers/RPC | Negado | Negado |

### Nota sobre permissões internas

A tabela acima não define uma nova hierarquia completa de equipa. O desenho físico deve mapear os papéis Core actuais para permissões Inspect explícitas. Não presumir que `editor` do workspace equivale automaticamente a auditor responsável, gestor de modelos ou administrador de partilhas.

## 4. Projecção de dados externos

Não conceder SELECT directo nas tabelas internas de auditoria, resultados, evidências ou notas ao utilizador externo.

Criar uma camada de leitura externa, por exemplo RPCs `SECURITY INVOKER` ou views com permissões cuidadosamente configuradas, que:
1. derive o utilizador de `auth.uid()`;
2. valide grant aceite, activo e não expirado;
3. valide a permissão exacta;
4. valide auditoria submetida;
5. devolva apenas publicações activas e campos permitidos;
6. não exponha notas internas, IDs de outros clientes, dados de workspace, paths Storage ou metadados internos.

Uma view não é automaticamente segura só por ser view: confirmar comportamento de RLS (security invoker quando aplicável), grants sobre tabelas subjacentes e versão PostgreSQL/Supabase. Preferir RPC invoker explícita ou tabela de publicação com RLS própria se houver ambiguidade.

## 5. INSERT/UPDATE: não confiar no payload

- Em INSERT, `created_by`/`actor_id` deve ser derivado por trigger/RPC de `auth.uid()`; se coluna for enviada, CHECK/trigger garante igualdade.
- Organização e workspace derivam do registo pai, nunca de campo livre enviado pelo cliente.
- Em UPDATE, validar tanto `USING` como `WITH CHECK`; impedir mudança de organização, auditoria, autor, destinatário, estado protegido ou caminho Storage.
- Respostas externas são INSERT-only. Para corrigir uma resposta, criar nova versão/submissão ligada à anterior; não alterar nem apagar a anterior.
- Transições críticas (submeter, publicar, revogar, fechar, verificar eficácia) passam por operações transaccionais que validam pré-condições e registam evento.
- Evitar políticas UPDATE permissivas sobre grants, publicações, relatórios ou auditorias submetidas.

## 6. Storage — política específica

### Bucket

Bucket dedicado `fkt-inspect-private`, sempre privado, com limite de tamanho e MIME permitidos configurados. Os limites exactos dependem dos tipos de evidência aprovados.

### Estrutura de objecto

Caminho opaco, gerado no servidor, por exemplo:
`<organisation_uuid>/<audit_uuid>/<opaque_object_uuid>`

Não incluir email, nome, cliente, morada ou nome original no caminho. O caminho não substitui validação de ownership/grant.

### Leitura externa

Preferência de segurança: **download autenticado através de Storage com RLS por objecto**, verificando grant e publicação em cada pedido, sem emitir URL assinada bearer para utilizadores externos.

A política SELECT em `storage.objects` deve exigir:
- bucket correcto;
- objecto ligado a metadado de evidência existente;
- organização/auditoria coerentes;
- auditoria submetida;
- evidência publicada;
- grant activo e permissão `view_published_evidence` do `auth.uid()`.

Se o fluxo de visualização exigir URL assinada, usar Edge Function/proxy autenticado que revalide o grant em cada pedido. Não prometer revogação imediata de URL assinada prévia. URLs assinadas de curta duração são fallback operacional, não a opção de segurança preferida para ficheiros externos sensíveis.

### Upload externo

O cliente externo não recebe INSERT genérico no bucket. Criar uma intenção de upload associada a uma acção atribuída e grant válido; o servidor gera o caminho opaco e valida:
- acção aberta e atribuída ao destinatário;
- permissão `upload_assigned_action_evidence`;
- MIME/tamanho/quantidade;
- quota e rate limit;
- sessão e concessão activas.

A política Storage INSERT valida a intenção ainda válida e o actor. Após upload, uma operação de finalização verifica que o objecto existe, confere metadados/tamanho e associa-o atomicamente à resposta. Objectos sem finalização são limpos por rotina controlada após prazo curto.

Não permitir UPDATE/DELETE directo pelo cliente externo. A substituição é novo objecto/versão. Remoção por retenção é processo privilegiado e auditado.

### URLs e caches

- Não persistir URL assinada.
- Não colocar URLs bearer em logs, analytics ou eventos.
- Respostas de download sensíveis devem usar headers de não cache quando aplicável.
- O cliente não pode enumerar o bucket nem listar prefixos.
- Considerar thumbnails derivados como objectos separados, com a mesma política de autorização.

## 7. Convites e grants

- Tabela de convite não expõe token_hash nem destinatários a listagem externa.
- Aceitação é RPC transaccional: normalizar email, verificar claim de email verificado da sessão, validar hash/expiração/uso, consumir token e criar grant com `auth.uid()`.
- Não permitir que a função receba destinatário `user_id`.
- Reenvio invalida convite anterior e cria token novo.
- Revogação altera estado e cria evento; não elimina grant.
- A autorização deve consultar o estado actual do grant em cada operação, sem cache de permissões no frontend.

## 8. Padrões do repositório a reutilizar — e limites

A revisão das migrações actuais identificou:
- helpers privados `private.workspace_can_read/write` com `auth.uid()` e `search_path` fixo no hardening do Lex;
- constraints compostas para impedir referências cruzadas no Lex/Vet/Works;
- bucket privado e validação de path em Storage;
- RPC controlada de anexos Works com verificação de metadados e ligação transaccional;
- testes pgTAP com `SET LOCAL ROLE authenticated` e claims de utilizador, em vez de testar apenas como service_role.

Não copiar directamente:
- helpers `workspace_can_read` como autorização externa Inspect;
- políticas de Storage baseadas apenas em workspace;
- acesso de todos os membros do workspace a todos os ficheiros;
- modelo de anexos `obras_*` como domínio Inspect.

O utilizador externo Inspect não é workspace member e a autorização depende de grant + publicação + estado + permissão por operação.

## 9. Plano de testes RLS por actor

| Actor | Deve conseguir | Não pode conseguir |
|---|---|---|
| Owner da consultora | Gerir organização, clientes, modelos, partilhas e auditorias | Contornar histórico/imutabilidade |
| Auditor atribuído | Executar auditorias atribuídas e publicar conforme permissão | Aceder a outra organização |
| Viewer interno | Consultar dados permitidos | Criar/alterar resultados |
| Externo com grant de leitura | Ver apenas publicações da auditoria concedida | Ler tabelas internas, outras auditorias ou ficheiros não publicados |
| Externo com resposta de acção | Inserir resposta na acção atribuída | Alterar acção/finding/resultado ou verificar eficácia |
| Externo com upload de evidência | Anexar ficheiro à resposta autorizada | Upload genérico, path arbitrário, outro audit/action |
| Externo sem workspace | Ver apenas partilhas próprias | Descobrir workspaces, clientes, membros ou módulo interno |
| Externo com workspace próprio | Manter contexto próprio e partilhas separadas | Misturar permissões entre organizações |
| Utilizador de outra consultora | Nada sobre organização alheia | Enumerar ou aceder por IDs conhecidos |

Testes devem incluir SELECT, INSERT, UPDATE, DELETE, RPC, Storage GET/POST/PUT e manipulação de IDs/path. A expectativa é negar no servidor, não apenas esconder elementos de UI.

## 10. Limites e próximos passos

Este documento é especificação de políticas, não migração. Antes de SQL:
1. rever tabelas e privilégios existentes no esquema Core real;
2. validar assinatura/ownership de helpers e grants;
3. desenhar matriz exacta para cada tabela física;
4. implementar em Supabase local;
5. testar pgTAP com roles e claims reais;
6. executar testes negativos de Storage e RPC;
7. rever migrações e resultados em PR;
8. só aplicar à instância remota com autorização explícita.

A revisão até agora foi estática sobre migrações versionadas; não foi executada consulta ao catálogo remoto nem teste em runtime. Não declarar as políticas seguras até aos testes locais/CI passarem.
