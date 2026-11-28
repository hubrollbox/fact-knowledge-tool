# FKT Inspect — contrato físico de dados (pré-DDL)

## Estado

**Especificação física candidata; não é SQL executável.** Este documento prepara a primeira migração local. Não autoriza alterações à BD remota. Deve ser revisto em conjunto com:
- `fkt-inspect-relational-model.md`;
- `fkt-inspect-rls-policy-matrix.md`;
- `fkt-inspect-external-access-permissions-matrix.md`.

A implementação deve ser incremental, com migrações pequenas e testes pgTAP por domínio. Não criar uma migração monolítica.

## 1. Decisões físicas transversais

| Tema | Regra candidata |
|---|---|
| Chaves | UUID gerados na BD (`gen_random_uuid()`) |
| Datas | `timestamptz` em UTC; datas civis sem hora usam `date` |
| Dinheiro | `numeric(12,2)` e moeda ISO 4217 quando aplicável; não usar `float` |
| Medições | `numeric` sem arredondamento implícito, unidade explícita e precisão definida por parâmetro |
| Estados e papéis | `text` + `CHECK` constraints inicialmente; evitar ENUM PostgreSQL enquanto o domínio está em evolução |
| Auditoria de alterações | `created_at`, `created_by`; `updated_at`, `updated_by` apenas em registos editáveis |
| Imutabilidade | snapshots/eventos/submissões sem UPDATE/DELETE concedidos ao cliente; correcções por nova versão/adenda |
| Eliminação | `ON DELETE RESTRICT` em dados históricos; sem cascatas a partir de auditorias |
| Âmbito | FK composta com `inspect_organisation_id` em todas as relações multi-tenant |
| Concorrência | constraints/índices únicos e transacções; não confiar em validação da interface |
| JSONB | apenas snapshots de payload/configuração e dados realmente variáveis; não usar como substituto de relações/FKs |
| PII | recolher o mínimo; não incluir emails, nomes ou moradas em caminhos Storage |

### 1.1. Tipos e convenções

- Todas as tabelas Inspect têm `id uuid primary key default gen_random_uuid()`.
- Tabelas pertencentes a uma organização incluem `inspect_organisation_id uuid not null`.
- Relações filhas guardam também `audit_id` quando a auditoria é o limite de autorização.
- FKs compostas devem ser suportadas por `UNIQUE (id, inspect_organisation_id)` na tabela referenciada.
- `created_by`, `updated_by`, `assigned_user_id` e actores equivalentes referenciam `auth.users(id)` quando a conta tem de existir. Os eventos preservam também o identificador do actor e o contexto mínimo para auditoria histórica.
- Não usar `user_metadata` nem claims editáveis pelo utilizador como fonte de autorização.
- `CHECK` constraints devem rejeitar estados desconhecidos e combinações impossíveis; valores de negócio não devem depender apenas de unions TypeScript.

## 2. Inventário físico por domínio

Os nomes abaixo são candidatos alinhados com o modelo lógico. A migração deve criar primeiro as tabelas-base e só depois as tabelas dependentes.

### 2.1. Organização, carteira e estabelecimentos

| Tabela | Campos mínimos e tipos | Constraints/índices essenciais |
|---|---|---|
| `inspect_organisations` | `id uuid`, `workspace_id uuid`, `organisation_type text`, `display_name text`, `status text`, timestamps, actor | `workspace_id UNIQUE NOT NULL`; FK `workspaces(id)`; CHECK dos tipos/estados |
| `inspect_parties` | `id`, `inspect_organisation_id`, `party_type text`, `legal_name text`, `display_name text`, identificadores estritamente necessários, `status`, timestamps | UNIQUE composta para FKs; índices por organização e nome normalizado |
| `inspect_clients` | `id`, organização, `party_id`, `client_reference text nullable`, estado, timestamps | FK composta para party; UNIQUE da referência quando não nula |
| `inspect_establishments` | `id`, organização, `operator_party_id uuid nullable`, nome, morada estruturada, actividade, estado, timestamps | FK composta para party; índices por organização/estado |
| `inspect_client_establishments` | `id`, organização, `client_id`, `establishment_id`, `valid_from timestamptz`, `valid_until timestamptz nullable`, estado, referência contratual opcional | FKs compostas; CHECK `valid_until > valid_from`; impedir sobreposição temporal para o mesmo par |

**Regra temporal:** usar intervalos semiabertos `[valid_from, valid_until)`. Preferência por exclusion constraint GiST com `btree_gist`, mas a extensão não está instalada na BD remota observada. Validar a instalação na stack local e CI; se não for possível, implementar trigger transaccional com advisory lock e teste concorrente. Não avançar para produção com esta regra apenas na aplicação.

### 2.2. Modelos e critérios versionados

| Tabela | Campos mínimos e tipos | Constraints/índices essenciais |
|---|---|---|
| `inspect_audit_templates` | `id`, organização, nome, descrição, estado, timestamps | UNIQUE composta; índice por organização/estado |
| `inspect_audit_template_versions` | `id`, organização, `template_id`, `version_number int`, estado, `published_at`, `published_by`, `snapshot jsonb` opcional | UNIQUE(template_id, version_number); versão publicada imutável |
| `inspect_audit_sections` | `id`, organização, `template_version_id`, código, título, ordem | UNIQUE(version, code); FK composta |
| `inspect_audit_criteria` | `id`, organização, `template_version_id`, `section_id`, código, texto, instrução, `response_type`, aplicabilidade, referência normativa | UNIQUE(version, code); FKs compostas; índice por versão/secção |

A referência normativa guarda diploma/fonte, artigo/ponto, versão/data de consulta e nota de aplicabilidade. O texto publicado é snapshot da versão; nunca se altera um critério publicado em uso.

### 2.3. Auditoria, atribuições e execução

| Tabela | Campos mínimos e tipos | Constraints/índices essenciais |
|---|---|---|
| `inspect_audits` | `id`, organização, `establishment_id`, `contract_client_id nullable`, `operator_party_id nullable`, motivo de identificação pendente, `template_version_id`, âmbito, estado, datas, timestamps | FKs compostas; CHECK de consistência entre operador identificado/motivo pendente; índice organização/estado/data |
| `inspect_audit_assignments` | `id`, organização, `audit_id`, `user_id`, papel (`auditor/reviewer/observer`), vigência, estado, actor de atribuição | UNIQUE(audit_id,user_id); FK composta; índices audit/user/estado |
| `inspect_audit_assignment_events` | `id`, organização, `audit_id`, `assignment_id`, tipo de evento, actor, instante, motivo, snapshot anterior/novo | append-only; índices audit/data e assignment/data |
| `inspect_audit_results` | `id`, organização, `audit_id`, `template_version_id`, `criterion_id`, resultado, observação partilhável, justificação, actor, timestamps | UNIQUE(audit_id,criterion_id); resultado CHECK; NA exige justificação; not_verified exige motivo |
| `inspect_audit_internal_notes` | `id`, organização, `audit_id`, texto, classificação, actor, instante | tabela separada; nunca incluída na projecção externa |
| `inspect_audit_measurements` | `id`, organização, `audit_id`, `audit_result_id`, parâmetro, valor `numeric`, unidade, equipamento/local, instante, actor, regra/limite e referência da regra | FK composta; índices por audit/parâmetro/instante |

### 2.4. Evidências, findings e acções

| Tabela | Campos mínimos e tipos | Constraints/índices essenciais |
|---|---|---|
| `inspect_evidence` | `id`, organização, `audit_id`, bucket/path, MIME validado, tamanho, hash, actor, estado, instante, retenção | UNIQUE(bucket,path); path opaco; FK composta |
| `inspect_evidence_links` | ligação tipada a resultado/finding/resposta/relatório | preferir tabelas de ligação por tipo com FKs reais; não aceitar ID polimórfico sem FK |
| `inspect_findings` | `id`, organização, `audit_id`, `audit_result_id nullable`, descrição factual, classificação, estado, prazo, responsável, timestamps | FKs compostas; estado/classificação CHECK; índices audit/estado/prazo |
| `inspect_corrective_actions` | `id`, organização, `audit_id`, `finding_id`, descrição, responsável interno/externo, prazo, estado, timestamps | FK composta; índices finding/estado/prazo |
| `inspect_action_responses` | `id`, organização, `audit_id`, `action_id`, `grant_id`, actor autenticado, texto, instante, estado de revisão | FK composta; actor derivado no servidor; sem update/delete externo |
| `inspect_action_response_evidence` | `response_id`, `evidence_id`, organização/auditoria | PK/FKs compostas; evidência tem de pertencer à resposta/auditoria |
| `inspect_action_verifications` | `id`, organização, `audit_id`, `action_id`, resultado, descrição, evidência, verificador, instante | append-only; índices action/data |

A tabela de ligações de evidência não deve usar `resource_type + resource_id` como única referência. Se o desenho polimórfico não permitir FK real, dividir em tabelas de ligação tipadas.

### 2.5. Submissões, relatórios e partilha externa

| Tabela | Campos mínimos e tipos | Constraints/índices essenciais |
|---|---|---|
| `inspect_audit_submissions` | `id`, organização, `audit_id`, número sequencial, versão, snapshot `jsonb`, hash, actor, instante | UNIQUE(audit_id, submission_number); append-only |
| `inspect_reports` | `id`, organização, `audit_id`, `submission_id`, bucket/path, hash, MIME, tamanho, versão do template, emissor, instante | FK para submissão concreta; UNIQUE por submissão/versão |
| `inspect_publications` | `id`, organização, `audit_id`, `submission_id`, actor, instante, estado/revogação | publicação ligada à submissão concreta; sem update do snapshot |
| `inspect_publication_evidence` | `id`, organização, `publication_id`, `evidence_id`, permissão/visibilidade | FKs compostas; só evidência da mesma auditoria |
| `inspect_access_invitations` | `id`, organização, `audit_id`, email normalizado, `token_hash`, validade, estado, actor, consumo | token_hash UNIQUE; sem token em claro; um convite activo por auditoria/email |
| `inspect_access_grants` | `id`, organização, `audit_id`, `user_id`, estado, actor, aceite/revogação/expiração | sem grants activos duplicados; actor externo derivado do Auth |
| `inspect_access_grant_permissions` | `id`, `grant_id`, permissão controlada | UNIQUE(grant_id, permission); CHECK da lista permitida |
| `inspect_access_events` | `id`, organização, `audit_id`, `grant_id nullable`, tipo, actor, instante, motivo, snapshot | append-only; índices audit/data e grant/data |

## 3. Índices obrigatórios

Criar índices para:
- todas as FKs que não sejam cobertas pelo prefixo de uma PK/UNIQUE existente;
- colunas usadas em predicates RLS: `inspect_organisation_id`, `audit_id`, `user_id`, `status`, `valid_from/valid_until`;
- listagens reais: organização + estado + data; auditoria + estado; prazo + estado;
- `token_hash` e paths de Storage;
- chaves de idempotência/numeração sequencial.

Evitar índices redundantes. Confirmar com `EXPLAIN (ANALYZE, BUFFERS)` usando fixtures representativas; não inventar índices por antecipação sem medir.

## 4. Data API, GRANT e RLS

A regra Supabase mudou: desde 30/10/2026, novos objectos em `public` deixam de receber automaticamente grants Data API nos projectos abrangidos. A exposição tem duas camadas independentes:
1. GRANT SQL permite que o papel alcance o objecto;
2. RLS determina as linhas e operações autorizadas.

Regras para cada migração Inspect:
- activar RLS na mesma migração em que a tabela é criada;
- conceder apenas privilégios mínimos a `authenticated` nas tabelas necessárias ao cliente;
- não conceder privilégios a `anon`;
- não conceder CRUD indiscriminado em todas as tabelas;
- tabelas de eventos, notas internas, snapshots, convites e metadados privados recebem apenas as operações estritamente necessárias; preferir RPC controlada para transições e escrita append-only;
- funções recebem `EXECUTE` apenas para os papéis que precisam delas;
- `service_role` não é uma solução para contornar RLS no browser;
- cada alteração a GRANT é testada com o papel real via Data API e RLS.

Não assumir que a tabela está acessível porque existe em `public`. Testar também o comportamento de ausência de GRANT.

Referência oficial: [Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api).

## 5. Funções, triggers e transacções

- Preferir `SECURITY INVOKER`.
- Não criar funções privilegiadas no schema exposto `public`.
- Se uma função `SECURITY DEFINER` for estritamente necessária, colocá-la em schema não exposto, fixar `search_path`, derivar actor de `auth.uid()`, verificar membership/grant dentro da função, revogar EXECUTE de `PUBLIC` e conceder explicitamente só o necessário.
- Não usar `user_metadata` para papéis/permissões.
- Escrita de evento + alteração de estado deve ocorrer na mesma transacção.
- Submissão: bloquear a linha de auditoria, validar estado e atribuição, calcular número/hash, gravar snapshot e evento e alterar estado atomicamente.
- Convite: consumir token e criar grant na mesma transacção; nunca aceitar `user_id` fornecido pelo browser.
- Upload: validar autorização e quota antes de persistir metadados; nunca confiar no path como autorização.

## 6. Plano de migrações

Separar em migrações pequenas e reversíveis sempre que possível:

1. **Foundation:** constraints de módulo Inspect no workspace, tabela `inspect_organisations`, tipos/checks base, grants/RLS mínimos.
2. **Carteira:** parties, clients, establishments e relação temporal cliente/estabelecimento.
3. **Templates:** templates, versões, secções e critérios.
4. **Auditoria:** audits, assignments, assignment events, resultados, medições e notas internas.
5. **Evidência e acções:** evidence, links tipados, findings, corrective actions, responses e verifications.
6. **Submissão/partilha:** submissions, reports, publications, invitations, grants, permissions e events.
7. **Storage:** bucket privado, policies específicas, testes de upload/download/revogação.

Não executar esta sequência na BD remota. Cada migração deve ser criada e validada localmente, em CI, e revista antes de qualquer pedido de autorização para aplicar remotamente.

## 7. Critérios de saída desta especificação

- [ ] Todas as tabelas do modelo lógico têm campos/tipos/PK/FK/UNIQUE/CHECK definidos.
- [ ] Nenhuma FK multi-tenant permite cruzar organizações.
- [ ] Índices cobrem FKs e predicates RLS.
- [ ] Data API grants explícitos e mínimos, sem `anon`.
- [ ] RLS activada na mesma migração da tabela.
- [ ] Eventos/submissões/snapshots imutáveis.
- [ ] Convites não confiam em `user_id` do cliente.
- [ ] Upload/download validam concessão e auditoria.
- [ ] Testes pgTAP para actores internos, externos, anon e isolamento entre organizações.
- [ ] Stack local e CI aprovam migrações repetíveis.
- [ ] BD remota permanece inalterada até autorização explícita.

## 8. Fontes e limitações

- [Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Changelog — PostgreSQL 15.19 / 17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
- [Supabase Changelog — CLI v3](https://supabase.com/changelog/cli-v3)

A documentação consultada indica que a partir de 30/10/2026 a exposição de novos objectos em `public` é opt-in por GRANT; o desenho deve ser compatível com esse comportamento. O projecto remoto observado está em PostgreSQL 17.6 no levantamento anterior; confirmar a versão actual na stack local antes de decidir a extensão e executar migrações. Este documento não substitui revisão SQL, testes reais ou validação de segurança.


## 9. Integração com autorização Core existente — confirmação remota

A consulta read-only ao catálogo remoto confirmou a existência dos helpers:
- `private.workspace_can_read(uuid)`
- `private.workspace_can_write(uuid)`
- `private.workspace_is_owner(uuid)`
- `private.workspace_role_for_current_user(uuid)`

Estão em schema `private`, são `SECURITY DEFINER`, derivam a identidade do próprio `auth.uid()`, têm `search_path` controlado na migração Core e são executáveis por `authenticated`, não por `anon`. As funções públicas de compatibilidade correspondentes são `SECURITY INVOKER`.

Regras Inspect:
1. As policies internas devem chamar os helpers privados com a assinatura actual, sem passar um `user_id` controlado pelo cliente.
2. Não criar novos helpers Inspect em `public`.
3. Os helpers Core apenas provam membership/papel no workspace; **não provam atribuição à auditoria**. As policies Inspect têm de verificar também `inspect_audit_assignments` e a vigência/estado da atribuição.
4. Não reutilizar `workspace_can_write` como autorização suficiente para resultados, medições, evidências ou transições de auditoria.
5. Para funções privilegiadas Inspect, seguir o padrão Core apenas quando tecnicamente necessário: schema não exposto, `search_path` fixo, actor de `auth.uid()`, sem actor/tenant recebido do browser, grants mínimos e testes negativos.

Esta secção foi confirmada com consulta read-only à BD remota em 28/11/2026; não foram alterados helpers, grants ou policies.


## 10. Extensão do inventário físico — gestão operacional HACCP (28/11/2026)

Esta extensão é **inventário candidato para revisão em #175**, não DDL aprovado. Deve ser integrada no inventário das secções 2.1–2.5 antes da primeira migração operacional.

| Domínio | Tabelas candidatas | Requisitos físicos essenciais |
|---|---|---|
| Plano HACCP | inspect_food_safety_plans, inspect_food_safety_plan_versions | FK organização/estabelecimento; versão única; snapshot e aprovação; versão publicada imutável |
| Processos e perigos | inspect_processes, inspect_process_steps, inspect_hazards, inspect_control_measures, inspect_control_parameters | FKs compostas; etapa e medida ligadas à versão do plano; parâmetro com unidade, fonte, tipo e aplicabilidade |
| Procedimentos | inspect_haccp_documents | Storage privado; ligação à versão do plano; hash, autor, instante e retenção |
| Áreas/equipamentos | inspect_areas, inspect_equipment | Organização/estabelecimento em todas as chaves; estado e histórico; sem limites/frequências globais |
| Monitorização | inspect_monitoring_plans, inspect_monitoring_assignments, inspect_monitoring_records, inspect_monitoring_record_events | Plano/versão/controlo de origem; autor e instante; valor/unidade; snapshot da regra; eventos append-only |
| Higienização | inspect_cleaning_plans, inspect_cleaning_tasks, inspect_cleaning_records | Tarefa atribuída; frequência definida no plano; execução, resultado, produto e histórico |
| Fornecedores/recepção | inspect_suppliers, inspect_food_products, inspect_receipts, inspect_receipt_items | Fornecedor, produto, lote, validade e parâmetros de recepção aplicáveis; aceitação/rejeição e evidência |
| Rastreabilidade | inspect_lots, inspect_lot_events | Lotes de origem/destino e transformação ligados por FKs; eventos com actor/instante; pesquisa de origem/destino |
| Validades | inspect_product_life_records | Abertura/preparação, origem, data definida pelo procedimento, responsável e estado |
| Óleos | inspect_oil_control_records | Apenas após validação do âmbito e requisitos do piloto |
| Desvios | Extensão de inspect_findings e inspect_corrective_actions | Origem tipada; preservação do registo operacional; contenção, acção e verificação |

### Regras adicionais
- Todas as tabelas operacionais devem ter inspect_organisation_id; as que são específicas de local devem também ter establishment_id.
- As FKs compostas devem impedir que um registo associe plano, equipamento, produto, lote ou tarefa de outra organização/estabelecimento.
- Os snapshots dos parâmetros aplicados devem preservar valor, unidade, fonte, versão, tipo de limite e instante de validade.
- Não utilizar JSONB como substituto de relações entre produtos, lotes, eventos, planos e controlos.
- Acesso externo do consultor requer autorização explícita. Acesso à auditoria partilhada não equivale a acesso aos registos operacionais.
- RLS, GRANT e Storage têm de ser especificados por tabela/operação na matriz própria; não inferir que uma policy de auditoria cobre automaticamente o domínio operacional.
- Não criar inventário comercial, compras, encomendas, POS ou facturação.

A revisão #175 deve transformar este inventário numa especificação física completa e resolver cardinalidades, constraints, índices, RLS e testes antes de qualquer migração.
