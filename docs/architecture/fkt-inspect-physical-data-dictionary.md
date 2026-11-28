# FKT Inspect — dicionário físico de dados (proposta para aprovação)

**Estado:** proposta técnica detalhada; ainda não é DDL aprovado nem migração executável.  
**Âmbito:** gestão HACCP operacional de um estabelecimento de restauração, com auditorias integradas.  
**Regra de segurança:** não aplicar esta proposta à BD remota. Primeiro validar esquema Core, rever RLS/GRANT, implementar migrações locais e executar pgTAP.

## 1. Convenções físicas

- Schema: `public` para tabelas de negócio; funções privilegiadas em `private`.
- PK: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- Identificadores de tenant: `inspect_organisation_id uuid NOT NULL`; acrescentar `establishment_id uuid NOT NULL` em todos os dados operacionais específicos de local.
- Usar FKs compostas `(id, inspect_organisation_id)` e, quando aplicável, `(id, inspect_organisation_id, establishment_id)` para impedir ligações entre tenants/estabelecimentos.
- Datas de evento: `occurred_at timestamptz NOT NULL`; registo no servidor: `created_at timestamptz NOT NULL DEFAULT now()`. Quando o utilizador declara hora de recolha, preservar ambos.
- Autoria: `created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT`; preencher/validar por trigger ou RPC no servidor. Nunca aceitar actor/tenant do browser como autoridade.
- Dados mutáveis usam `created_at/created_by/updated_at/updated_by`; eventos históricos são append-only e não têm UPDATE/DELETE concedidos.
- Quantidades: `numeric(12,3)`; valores de medição: `numeric(12,4)`; dinheiro não pertence a este domínio.
- Códigos externos e números de lote não são globalmente únicos. A unicidade é sempre contextual.
- Não guardar dados relacionais essenciais em JSONB. JSONB é permitido apenas para snapshots/exportação ou payload auxiliar não relacional.
- Todas as enumerações usam CHECK explícito ou tabela de referência versionada; não criar enums PostgreSQL prematuramente.
- Não criar soft-delete para eventos. Entidades de configuração podem ter `status` e datas de vigência.

## 2. Carteira, identidades e estabelecimento

### 2.1 `inspect_organisations` — já existe na migração de fundação
Campos confirmados: `id uuid PK`, `workspace_id uuid UNIQUE NOT NULL FK workspaces`, `organisation_type text CHECK consultant/operator/hybrid`, `display_name varchar/text NOT NULL`, `status text`, `created_at`, `created_by`, `updated_at`, `updated_by`. Tem UNIQUE `(id, workspace_id)`.

### 2.2 `inspect_parties` — nova
Representa pessoa singular/colectiva ou entidade identificável no contexto da organização Inspect.
- `id uuid PK`
- `inspect_organisation_id uuid NOT NULL FK inspect_organisations`
- `party_type text NOT NULL CHECK ('person','legal_entity','public_entity','other')`
- `display_name text NOT NULL CHECK length(trim) 2..200`
- `legal_name text NULL`
- `tax_country_code char(2) NULL`
- `tax_identifier text NULL` — opcional; guardar apenas se necessário e com controlo de acesso.
- `status text NOT NULL CHECK ('active','inactive','archived')`
- auditoria de criação/actualização.
- UNIQUE `(id, inspect_organisation_id)`; índice parcial por identificador fiscal normalizado, apenas quando preenchido, com unicidade por organização e país.
- Não presumir que duas parties com o mesmo nome são a mesma entidade.

### 2.3 `inspect_clients` — existente, extensão
Manter os campos existentes; adicionar `party_id uuid NULL`.
- FK composta `(party_id, inspect_organisation_id) -> inspect_parties(id, inspect_organisation_id)`.
- NULL permitido durante reconciliação; não inferir party com base em `display_name`.
- Depois de validar dados reais, decidir se `party_id` passa a NOT NULL numa migração posterior.

### 2.4 `inspect_establishments` — existente, extensão
Manter os campos existentes; adicionar:
- `operator_party_id uuid NULL`
- FK composta `(operator_party_id, inspect_organisation_id) -> inspect_parties(id, inspect_organisation_id)`.
- `operator_identification_status text NOT NULL DEFAULT 'pending' CHECK ('pending','identified','not_applicable')`.
- `operator_verified_at timestamptz NULL`, `operator_verified_by uuid NULL FK auth.users`.
- CHECK: estado `identified` exige `operator_party_id IS NOT NULL`; estado `pending` não declara identidade confirmada.
- O operador é distinto do cliente contratual. Pode coincidir, mas a BD não o assume.

### 2.5 `inspect_client_establishments` — já existe
Manter relação N:M temporal de carteira. A vigência usa intervalo `[valid_from, valid_until)`; impedir sobreposições para a mesma organização/cliente/estabelecimento. Não usar esta relação como prova de quem explora legalmente o restaurante.

### 2.6 `inspect_establishment_memberships` — nova
Atribui utilizadores às funções do restaurante, sem criar membership Core nem dar acesso por defeito.
- `id uuid PK`, `inspect_organisation_id uuid NOT NULL`, `establishment_id uuid NOT NULL`, `user_id uuid NOT NULL FK auth.users`
- `role text NOT NULL CHECK ('manager','haccp_responsible','staff')`
- `valid_from timestamptz NOT NULL`, `valid_until timestamptz NULL`, `status text CHECK ('active','revoked','expired')`
- `granted_by uuid NOT NULL FK auth.users`, `created_at timestamptz`.
- FKs compostas para estabelecimento; CHECK de intervalo; índice por `(establishment_id,user_id,valid_from)`.
- Impedir atribuições sobrepostas iguais por utilizador/função/estabelecimento. Uma pessoa pode acumular funções.
- Consultores/auditores mantêm atribuições específicas nos modelos de auditoria/concessão externa; não usar estes papéis de restaurante para lhes dar acesso implícito.

## 3. Plano HACCP e conteúdo versionado

### 3.1 `inspect_food_safety_plans`
Um plano estável por estabelecimento e âmbito.
- `id uuid PK`, `inspect_organisation_id uuid NOT NULL`, `establishment_id uuid NOT NULL`
- `plan_code text NOT NULL`, `title text NOT NULL`, `scope_description text NULL`
- `status text CHECK ('draft','active','suspended','archived')`
- `current_published_version_id uuid NULL`
- `created_at/created_by/updated_at/updated_by`
- UNIQUE `(id, inspect_organisation_id, establishment_id)`; UNIQUE `(establishment_id, plan_code)`.
- FK composta para estabelecimento.

### 3.2 `inspect_food_safety_plan_versions`
- `id uuid PK`, `inspect_organisation_id uuid NOT NULL`, `establishment_id uuid NOT NULL`, `plan_id uuid NOT NULL`
- `version_number integer NOT NULL CHECK > 0`
- `status text CHECK ('draft','in_review','approved','published','superseded','withdrawn')`
- `valid_from timestamptz NULL`, `valid_until timestamptz NULL`
- `prepared_by uuid FK auth.users`, `approved_by uuid FK auth.users NULL`, `approved_at timestamptz NULL`
- `external_validator_name text NULL`, `external_validator_qualification text NULL`, `validation_evidence_document_id uuid NULL`
- `snapshot jsonb NOT NULL DEFAULT '{}'` apenas para reprodução exacta/exportação; os dados técnicos permanecem normalizados.
- `content_hash text NULL`, `created_at/created_by`.
- UNIQUE `(plan_id,version_number)`, UNIQUE `(id,inspect_organisation_id,establishment_id)`.
- Publicada/aprovada não pode ser editada; nova alteração cria versão nova. A publicação deve ocorrer por RPC transaccional e validar que só há uma versão corrente.

### 3.3 Conteúdo da versão
Todas as tabelas seguintes têm `inspect_organisation_id`, `establishment_id`, `plan_version_id`, PK UUID e FK composta para a versão:
- `inspect_processes`: `code`, `name`, `description`, `sequence_no`, `status`.
- `inspect_process_steps`: `process_id`, `step_code`, `name`, `description`, `sequence_no`; FK composta para processo da mesma versão.
- `inspect_hazards`: `process_step_id`, `hazard_category`, `description`, `cause`, `severity_basis`, `likelihood_basis`, `risk_assessment`, `significance_decision`, `decision_justification`.
- `inspect_control_measures`: `hazard_id`, `measure_type`, `description`, `responsible_role`, `verification_method`, `corrective_reference`.
- `inspect_control_parameters`: `control_measure_id`, `parameter_code`, `parameter_name`, `comparison_operator`, `lower_value numeric(12,4) NULL`, `upper_value numeric(12,4) NULL`, `text_value text NULL`, `unit_code text NULL`, `limit_class text CHECK ('legal','guidance','validated_plan','internal')`, `source_reference text`, `source_version text`, `applicability text`, `effective_from/effective_until`.
- CHECK em parâmetros: não aceitar limites numéricos invertidos; exigir pelo menos um valor numérico ou textual; não aceitar unidade numérica sem valor numérico.
- A classificação legal/orientação/plano/interno é explícita. Não codificar valores universais no software.

### 3.4 `inspect_haccp_documents`
- `id`, tenant/local/versão, `document_type`, `title`, `storage_path`, `mime_type`, `byte_size`, `sha256`, `uploaded_by`, `uploaded_at`, `valid_from`, `valid_until`.
- Storage privado; path inclui organização/estabelecimento e UUID, nunca nome de ficheiro fornecido como caminho.
- FK para versão; sem URL pública permanente.

## 4. Áreas, equipamentos e monitorização

### 4.1 `inspect_areas`
`id`, tenant/local, `code`, `name`, `description`, `status`, datas/autoria. UNIQUE `(establishment_id,code)`.

### 4.2 `inspect_equipment`
`id`, tenant/local, `area_id`, `equipment_type`, `code`, `name`, `manufacturer`, `model`, `serial_number`, `status`, `installed_at`, `retired_at`, datas/autoria. FK composta para área; UNIQUE parcial por código activo dentro do estabelecimento. Não impor tipo ou intervalo de temperatura universal.

### 4.3 `inspect_monitoring_controls`
Liga uma medida de controlo do plano a um objecto observado.
- `id`, tenant/local, `plan_version_id`, `control_measure_id`, `equipment_id NULL`, `area_id NULL`, `control_code`, `title`, `method`, `frequency_value integer`, `frequency_unit text CHECK ('minute','hour','day','week','event')`, `local_time time NULL`, `due_window_minutes integer NULL`, `is_active boolean`.
- CHECK exige equipamento ou área; ambos podem ser nulos apenas se o controlo for geral e isso estiver explicitamente modelado. Frequência positiva.
- A versão do plano determina os parâmetros. Não guardar limites duplicados nesta tabela.

### 4.4 `inspect_monitoring_assignments`
`id`, tenant/local, `monitoring_control_id`, `user_id`, `valid_from`, `valid_until`, `assigned_by`, `status`. FK composta para controlo e utilizador auth. Atribuição temporal; índice para tarefas activas.

### 4.5 `inspect_monitoring_tasks`
Instância devida, não é a medição.
- `id`, tenant/local, `monitoring_control_id`, `scheduled_for timestamptz`, `due_until timestamptz NULL`
- `status CHECK ('pending','completed','missed','waived','cancelled')`
- `waiver_reason text NULL`, `generated_at timestamptz`, `completed_at timestamptz NULL`
- UNIQUE `(monitoring_control_id,scheduled_for)`; CHECK waiver exige motivo.
- Não criar tarefas em massa infinitas; geração por janela temporal idempotente via função/worker.

### 4.6 `inspect_monitoring_records`
Registo de execução/medição, imutável depois de submetido.
- `id`, tenant/local, `task_id`, `monitoring_control_id`, `plan_version_id`, `control_parameter_id`
- `observed_value numeric(12,4) NULL`, `observed_text text NULL`, `unit_code text NULL`
- `observed_at timestamptz NOT NULL`, `recorded_at timestamptz NOT NULL DEFAULT now()`, `recorded_by uuid NOT NULL`
- `is_retroactive boolean NOT NULL DEFAULT false`, `retroactive_reason text NULL`
- `result_status CHECK ('within_limit','deviation','not_applicable','not_verifiable')`, `comment text NULL`, `submitted_at timestamptz NULL`
- Snapshot obrigatório do parâmetro aplicado: `parameter_snapshot jsonb NOT NULL` com operador, limites/valor, unidade, classificação, fonte e versão. Snapshot não substitui FK.
- CHECK: registo retroactivo exige justificação; resultado quantitativo exige valor; resultado não aplicável exige motivo.
- UNIQUE `(id,inspect_organisation_id,establishment_id)`; índice por local/observed_at e por task_id.
- Não permitir UPDATE/DELETE depois de submetido; correcção através de evento.

### 4.7 `inspect_monitoring_record_events`
Append-only: `id`, tenant/local, `monitoring_record_id`, `event_type CHECK ('correction_requested','corrected','reviewed','rejected','voided')`, `previous_value jsonb`, `new_value jsonb`, `reason text NOT NULL`, `actor_id`, `occurred_at`, `created_at`. FK composta para registo. Sem UPDATE/DELETE para authenticated.

## 5. Higienização

### 5.1 `inspect_cleaning_plans`
Tenant/local, versão do plano, `code`, `name`, `area_id`, `method`, `products_description`, `frequency_value`, `frequency_unit`, `status`, vigência. A frequência é definida no plano aprovado, não pelo sistema.

### 5.2 `inspect_cleaning_tasks`
Instância programada: `cleaning_plan_id`, `scheduled_for`, `due_until`, `status CHECK ('pending','completed','missed','waived','cancelled')`, `waiver_reason`, `generated_at`. UNIQUE `(cleaning_plan_id,scheduled_for)`.

### 5.3 `inspect_cleaning_records`
Execução: `cleaning_task_id`, `performed_at`, `performed_by`, `result_status CHECK ('completed','incomplete','failed')`, `products_used text NULL`, `dilution_or_method text NULL`, `comment`, `submitted_at`, datas/autoria. Evidências em tabela de anexos com Storage privado. Uma tarefa concluída exige registo válido.

## 6. Fornecedores, recepção e rastreabilidade

### 6.1 `inspect_suppliers`
Tenant/local, `party_id NULL`, `display_name`, `supplier_reference`, `status`, datas/autoria. FK composta para party, quando exista. UNIQUE parcial por referência não vazia dentro do estabelecimento. Não guardar informação comercial desnecessária.

### 6.2 `inspect_food_products`
Tenant/local, `product_code`, `name`, `description`, `category`, `storage_condition_text`, `allergen_information`, `status`, datas/autoria. UNIQUE `(establishment_id,product_code)`. A ficha não substitui a rotulagem/documentação do fornecedor.

### 6.3 `inspect_receipts`
Cabeçalho de recepção: tenant/local, `supplier_id`, `received_at`, `recorded_at`, `received_by`, `delivery_reference`, `overall_status CHECK ('accepted','partially_accepted','rejected','pending_review')`, `notes`. Uma recepção contém uma ou mais linhas.

### 6.4 `inspect_receipt_items`
Tenant/local, `receipt_id`, `food_product_id`, `supplier_lot_code`, `quantity numeric(12,3) NULL`, `unit_code`, `expiry_date date NULL`, `temperature_value numeric(12,4) NULL`, `temperature_unit text NULL`, `condition_status CHECK ('accepted','rejected','pending')`, `rejection_reason`, `evidence_reference`. Uma linha pode originar vários lotes se o fornecedor entregar mais de um lote: modelar em `inspect_lot_receipt_items`, não repetir a linha de recepção.

### 6.5 `inspect_lots`
Tenant/local, `food_product_id`, `internal_lot_code`, `supplier_lot_code NULL`, `origin_type CHECK ('supplier','internal_preparation','transformation')`, `received_on date NULL`, `prepared_at timestamptz NULL`, `expiry_date date NULL`, `status CHECK ('active','blocked','consumed','discarded','recalled')`, datas/autoria. UNIQUE `(establishment_id,internal_lot_code)`; não impor unicidade global ao lote do fornecedor.

### 6.6 `inspect_lot_receipt_items`
Ligação N:M entre lotes e linhas de recepção: `receipt_item_id`, `lot_id`, `quantity numeric(12,3) NULL`, `unit_code NULL`. UNIQUE `(receipt_item_id,lot_id)`; FKs compostas no mesmo tenant/local.

### 6.7 `inspect_lot_transformations` e `inspect_lot_transformation_inputs`
Transformação/preparação que gera lote interno:
- transformação: `id`, tenant/local, `output_lot_id`, `process_step_id NULL`, `performed_at`, `performed_by`, `description`, `procedure_version_id`.
- inputs: `transformation_id`, `input_lot_id`, `quantity numeric(12,3) NULL`, `unit_code NULL`.
- Um lote resultante pode ter várias entradas; um lote de entrada pode alimentar várias transformações. CHECK impede que output_lot_id também seja input na mesma transformação.
- FKs compostas impedem cruzamento de estabelecimento. Não é um livro de stock.

### 6.8 `inspect_lot_events`
Append-only: `lot_id`, `event_type CHECK ('received','opened','prepared','transferred','used','blocked','released','discarded','returned','recalled')`, `occurred_at`, `actor_id`, `related_lot_id NULL`, `reference_type NULL`, `reference_id NULL`, `notes`, `created_at`.
- Para relações críticas, usar FKs dedicadas/tabelas de ligação (recepção, transformação); `reference_type/reference_id` serve apenas como metadado auxiliar e nunca como integridade principal.
- Eventos não são editáveis/apagáveis.

### 6.9 `inspect_product_life_records`
Abertura/preparação de embalagem ou produto sem transformação de lote:
`id`, tenant/local, `food_product_id`, `source_lot_id NULL`, `internal_label_code`, `opened_at`, `prepared_at NULL`, `use_by_at NULL`, `procedure_version_id`, `performed_by`, `status CHECK ('active','consumed','discarded','expired')`, `closed_at NULL`, `close_reason NULL`.
CHECK exige source_lot_id ou justificação de origem não rastreável; prazo de utilização deriva de procedimento configurado e é preservado. Não inventar prazos por categoria.

## 7. Não conformidades e acções correctivas transversais

### 7.1 `inspect_nonconformities`
Entidade de tratamento formal:
- `id`, tenant/local, `reference_code`, `title`, `description`, `severity CHECK ('low','medium','high','critical')` — classificação interna configurável, não classificação legal universal.
- `status CHECK ('open','contained','action_assigned','awaiting_verification','closed','reopened','cancelled')`
- `detected_at`, `detected_by`, `owner_user_id NULL`, `due_at NULL`, `closed_at NULL`, `closure_reason NULL`.
- UNIQUE `(establishment_id,reference_code)`.
- Não duplicar finding da auditoria; criar ligação tipada à origem.

### 7.2 Ligações tipadas de origem
Tabelas separadas, cada uma com `nonconformity_id` UNIQUE e FK composta:
- `inspect_nc_monitoring_sources` -> `monitoring_record_id`
- `inspect_nc_cleaning_sources` -> `cleaning_record_id`
- `inspect_nc_receipt_sources` -> `receipt_item_id`
- `inspect_nc_lot_sources` -> `lot_event_id`
- `inspect_nc_audit_sources` -> `finding_id`
- Adicionar origem de validade/equipamento quando o fluxo for especificado. Não usar `source_type + source_id` como relação principal.
- Se uma NC puder ter várias origens, retirar UNIQUE de nonconformity_id e definir cardinalidade 1:N; a proposta inicial é permitir várias origens e uma origem poder gerar no máximo uma NC activa. Fechar esta regra antes do DDL.

### 7.3 `inspect_corrective_actions`
`id`, tenant/local, `nonconformity_id`, `action_type CHECK ('containment','correction','corrective_action','verification')`, `description`, `assigned_to`, `due_at`, `status CHECK ('pending','in_progress','submitted','verified','rejected','cancelled')`, `completed_at`, `verified_by`, `verified_at`, `verification_result`, `created_at/created_by`.
- Não permitir que quem executa a acção valide a sua eficácia, salvo excepção configurada e auditada.
- Eventos de estado em `inspect_corrective_action_events`, append-only, com estado anterior/novo, actor, instante e motivo.

## 8. Auditorias e integração

Manter os modelos existentes `inspect_audits`, `inspect_findings`, evidências, medições e submissões conforme as issues #161/#163/#165/#167.
- Uma auditoria referencia `establishment_id` e, opcionalmente, `plan_version_id` concreta.
- Um finding pode originar uma NC formal por FK tipada; não duplicar o finding nem a evidência.
- Auditorias consultam amostras de registos operacionais por referências tipadas, respeitando atribuição e concessão explícita.
- A submissão de auditoria continua snapshot/hash imutável.

## 9. Integridade, índices e retenção

1. FKs compostas em todas as relações tenant/local.
2. Índices B-tree nas FKs, colunas de estado e datas de pesquisa; índices parciais para registos activos.
3. Índices GIN só para pesquisa real de JSONB snapshot, após justificar a consulta.
4. Exclusion constraint temporal, ou trigger transaccional com advisory lock se extensão GiST não for aprovada, para membership e vigências.
5. Tarefas geradas com chave natural única para idempotência.
6. Não permitir cascatas destrutivas em dados operacionais; usar RESTRICT. Eventos append-only sem DELETE.
7. Definir política de retenção com enquadramento legal/contratual antes de configurar expurgo; não escolher prazo arbitrário.
8. Anexos: bucket privado, limites MIME/tamanho, hash, autorização por registo pai, download assinado de curta duração.

## 10. RLS e GRANT — desenho obrigatório

- `anon`: sem acesso a todas as tabelas operacionais.
- `authenticated`: GRANT mínimo por tabela; RLS activada e FORCE ROW LEVEL SECURITY quando compatível com o modelo de funções.
- Gerente: gestão de configuração/utilizadores e leitura operacional do estabelecimento.
- Responsável HACCP: gestão do plano e controlos, revisão de registos e NC.
- Colaborador: só tarefas atribuídas e criação de execução/desvio; sem UPDATE/DELETE de histórico submetido.
- Consultor: apenas por grant explícito, com estabelecimento, domínios, operações e período definidos.
- Auditor: apenas amostras/conteúdo atribuídos à auditoria, sem acesso geral ao histórico operacional.
- Workspace owner/admin não tem acesso automático ao conteúdo operacional.
- RPC SECURITY DEFINER só para operações transaccionais que não possam ser garantidas por RLS; `search_path` fixo, validação de `auth.uid()`, sem actor/tenant recebido do cliente, EXECUTE revogado de PUBLIC/anon e concedido apenas a authenticated quando aplicável.
- Cada tabela deve ter testes positivos e negativos para organização, estabelecimento, perfil, atribuição revogada e acesso externo.

## 11. Decisões ainda abertas (bloqueiam DDL)

1. **Party e operador:** aprovar a separação proposta; confirmar se um operador pode ser party fora da organização Inspect quando o restaurante tem workspace próprio. A proposta actual limita party à organização Inspect, o que simplifica a carteira mas pode duplicar entidades entre organizações.
2. **Tarefas:** decidir se a geração é por cron Supabase ou on-demand idempotente. Recomendo geração por janela on-demand para MVP, com tarefa persistida e chave única.
3. **Rastreabilidade:** confirmar com restaurante piloto se quantidades são obrigatórias ou apenas quando necessárias; a proposta permite NULL.
4. **Não conformidades:** aprovar cardinalidade de origens e regra de uma origem -> uma NC activa.
5. **Perfis:** confirmar se gerente/responsável/colaborador são suficientes para MVP; consultor e auditor continuam em grants próprios.
6. **Registos retroactivos:** aprovar se são permitidos; recomendação: sim, apenas com justificação, identificação visual e evento auditável.
7. **Óleos alimentares:** manter fora do primeiro DDL até confirmação do piloto.

## 12. Critérios para aprovar este dicionário

- [ ] Cada tabela tem tenant/local e FKs compostas aplicáveis.
- [ ] Campos e estados são validados com fluxos reais.
- [ ] Relações de origem de NC estão definidas e testáveis.
- [ ] Plano publicado e registos submetidos são imutáveis.
- [ ] RLS/GRANT está descrita por tabela/operação, não apenas por perfil genérico.
- [ ] Esquema Core e migrações reais foram comparados antes de SQL.
- [ ] Testes pgTAP cobrem isolamento e transições.
- [ ] Profissional HACCP e restaurante piloto validam o conteúdo operacional.
