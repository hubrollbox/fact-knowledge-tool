# FKT Inspect — modelo de dados, autorização e segurança

## Estado

**Modelo proposto para desenho técnico. Não implementar sem revisão das relações, RLS e testes.** A base de dados continua a ser a única instância Supabase FKT já configurada. Não criar projectos, branches de base de dados ou ambientes Supabase adicionais.

## 1. Objectivos de desenho

1. Suportar consultoras com vários clientes e empresas que auditam os próprios estabelecimentos.
2. Isolar clientes de uma mesma consultora.
3. Permitir acesso limitado a utilizadores externos do cliente.
4. Preservar a ligação entre auditoria, critérios, resultados, evidências, não conformidades e acções.
5. Preservar versões e autoria de alterações relevantes.
6. Reutilizar padrões existentes sem reutilizar indevidamente o modelo de domínio Works.

## 2. Modelo lógico proposto

Os nomes abaixo são conceptuais; não constituem nomes SQL aprovados.

### Organização Inspect
Representa a entidade que utiliza o módulo e é ancorada no workspace FKT:
- id;
- workspace_id;
- nome e dados de identificação estritamente necessários;
- tipo de utilização (`consultancy`, `operator` ou `both`);
- estado e datas.

Deve existir uma relação inequívoca entre organização Inspect e workspace. Não criar um workspace para cada cliente externo.

### Cliente
Entidade auditada/contratante gerida pela organização Inspect:
- id;
- inspect_organisation_id;
- party_id (entidade legal/organizacional em `inspect_parties`);
- referência/estado da relação comercial;
- timestamps.

A entidade legal subjacente é registada uma única vez em `inspect_parties` e pode assumir o papel de cliente contratual e/ou operador alimentar. O cliente contratual não é utilizador nem workspace e não concede acesso externo por si só.

### Estabelecimento
Local físico:
- id;
- inspect_organisation_id;
- operator_party_id nullable (entidade que opera o estabelecimento, quando identificada);
- nome/designação;
- morada e dados operacionais necessários;
- actividade/tipo de estabelecimento;
- estado.

O estabelecimento pertence à carteira da organização Inspect e não a um único cliente contratual. A ligação ao cliente contratual é registada na auditoria concreta, através de `contract_client_id`; cliente contratual e operador podem coincidir ou ser entidades diferentes. Para auditorias internas do operador não se cria um cliente fictício.

### Acesso externo
Relação explícita entre utilizador autenticado e auditoria concreta:
- destinatário autenticado;
- organização Inspect que concede;
- auditoria específica;
- permissões explícitas por operação;
- estado, validade, autor e datas de aceitação/revogação.

A concessão é por auditoria, nunca por cliente ou carteira. O utilizador externo não entra em `workspace_members`. O convite pendente é separado da concessão activa e só é aceite após validação no servidor do email confirmado no Supabase Auth. Não assumir que os papéis do workspace representam permissões externas.

### Modelo de auditoria
- cabeçalho do modelo;
- versões imutáveis/publicadas;
- secções;
- critérios;
- tipo de resposta e validações;
- instruções e evidência esperada;
- referência/fonte associada;
- regras de aplicabilidade.

Uma versão publicada não é editada no local. Alterações criam nova versão. Auditorias iniciadas mantêm referência à versão exacta usada.

### Auditoria
- organização responsável;
- estabelecimento;
- cliente contratual opcional;
- modelo e versão;
- auditor responsável;
- âmbito, datas, estado;
- versão/submissão;
- observações gerais;
- histórico de transições.

### Resultado de critério
- auditoria e critério da versão usada;
- estado: conforme, não conforme, não aplicável ou não verificado;
- observação;
- autor e instante;
- justificação para não aplicável/não verificado;
- referências e evidências relacionadas.

### Medição
Entidade estruturada para leituras quantitativas:
- auditoria e critério;
- parâmetro medido;
- valor e unidade;
- equipamento/local, quando aplicável;
- data/hora e autor;
- limite inferior/superior ou regra aplicável, com fonte e versão;
- resultado calculado e confirmação humana, se aplicável;
- evidência associada.

Não codificar limites universais de temperatura no esquema ou na interface. Os limites dependem do alimento, processo, equipamento e regra aplicável. O sistema deve preservar o valor medido mesmo quando a regra ou limite muda.

### Evidência
Metadados de fotografia, documento, leitura ou outro suporte:
- organização e auditoria;
- recurso associado através de relação tipada com FK real;
- bucket e caminho opaco privado;
- MIME, tamanho e hash;
- autor e data de recolha;
- legenda/contexto e retenção.

Os ficheiros permanecem em bucket privado. Não usar URLs públicas nem persistir URLs assinadas. A leitura externa deve preferir download autenticado com RLS por objecto, revalidando concessão e publicação em cada pedido; URL bearer é apenas fallback, com janela de validade documentada.

### Não conformidade
- auditoria e resultado de origem;
- descrição factual;
- categoria e classificação segundo metodologia configurada;
- estado;
- responsável pela resolução;
- prazo;
- evidências;
- autoria e histórico.

A classificação de gravidade/risco deve ser configurável e documentada; não criar uma pontuação universal sem metodologia validada.

### Acção correctiva / preventiva
- não conformidade associada;
- descrição da medida;
- responsável;
- prazo;
- estado;
- evidência de execução;
- data de submissão;
- verificação de implementação e eficácia;
- verificador, resultado e justificação.

Separar «acção declarada como concluída» de «acção verificada como eficaz».

### Relatório
Registo da emissão:
- auditoria e versão/submissão;
- template e versão;
- ficheiro e hash, se viável;
- emitido por/em;
- estado e eventual substituição/adenda.

O PDF deve representar uma fotografia imutável do estado aprovado, não uma consulta dinâmica a dados que podem mudar.

## 3. Relações lógicas principais

- Workspace 1:1 (ou 1:N apenas se a regra Core mudar explicitamente) Organização Inspect.
- Organização Inspect 1:N Clientes.
- Cliente 1:N Estabelecimentos.
- Cliente N:M Utilizadores externos, através de concessões explícitas.
- Organização Inspect 1:N Modelos e Auditorias.
- Modelo 1:N Versões; versão 1:N Secções e Critérios.
- Estabelecimento 1:N Auditorias.
- Auditoria 1:N Resultados, Medições, Não conformidades e Relatórios.
- Resultado N:M Evidências.
- Não conformidade 1:N Acções.
- Acção 1:N Registos de execução/verificação.
- Entidades com histórico mantêm eventos imutáveis ou versões auditáveis.

As chaves estrangeiras e constraints devem impedir associações entre clientes, estabelecimentos, auditorias e evidências de organizações diferentes.

## 4. Autorização e RLS

### Princípios obrigatórios
- Negar por defeito.
- Toda a autorização é aplicada no servidor/base de dados; a UI apenas reflecte permissões.
- Não confiar em IDs enviados pelo cliente sem validar a relação entre todos os registos.
- Não permitir que um cliente altere o seu próprio âmbito de acesso.
- Revogar acesso externo sem apagar o histórico de auditorias.
- Não permitir acesso de um cliente a outros clientes da mesma consultora.
- Não permitir acesso a ficheiros Storage por conhecer ou adivinhar o caminho.
- Operações privilegiadas devem usar funções controladas, com validação explícita do actor e sem expor chaves privilegiadas no frontend.

### Matriz conceptual

| Perfil | Dados da organização consultora | Cliente atribuído | Outros clientes | Gestão de modelos |
|---|---|---|---|---|
| Owner/Admin da consultora | Gestão conforme papel | Gestão conforme papel | Gestão conforme papel | Conforme papel |
| Auditor/Editor | Acesso de trabalho delimitado | Acesso conforme atribuição | Só se atribuído | Conforme permissão |
| Viewer interno | Leitura permitida | Leitura permitida se atribuída | Não | Não |
| Utilizador externo do cliente | Sem acesso geral | Só recursos concedidos | Não | Não |
| Utilizador de outra organização | Não | Não | Não | Não |
| Anónimo | Não | Não | Não | Não |

A matriz final deve decompor permissões por recurso (auditoria, relatório, evidência, acção) e operação. A tabela acima é orientação, não política RLS pronta a aplicar.

## 5. Histórico e integridade

- Registar actor, instante, operação e entidade afectada.
- Preservar alterações relevantes e transições de estado.
- Bloquear alterações retroactivas de auditorias submetidas/fechadas.
- Alterações a modelos publicados criam novas versões.
- Preservar o critério e a referência legal usados em cada auditoria.
- Registar concessão e revogação de acessos externos.
- Não eliminar evidências referenciadas por auditorias sem política de retenção e tratamento de integridade.
- As funções SECURITY DEFINER, caso necessárias, devem ter search_path controlado, privilégios mínimos e testes de autorização.

## 6. Storage

- Reutilizar padrões seguros existentes, não presumir que o bucket Works serve automaticamente o Inspect.
- Bucket privado dedicado ou política de separação equivalente, a decidir na implementação.
- Caminhos devem incluir identificadores de organização/cliente/auditoria e ser validados no servidor.
- Upload, associação de metadados e criação de relações devem evitar registos órfãos.
- MIME, tamanho e tipo de ficheiro devem ser validados.
- URLs assinados devem ter duração curta e ser emitidos após verificação de autorização.

## 7. Offline e sincronização

O Inspect deve ser utilizável em contexto de terreno com conectividade limitada, mas o MVP não deve prometer offline integral sem desenho e testes próprios.

A primeira versão pode privilegiar rascunhos locais recuperáveis e fila de uploads com estados explícitos. A sincronização deve:
- identificar cada operação de forma idempotente;
- evitar duplicação de auditorias, resultados e evidências;
- tratar conflitos sem sobrescrever silenciosamente dados;
- preservar autor e hora original da recolha e hora de sincronização;
- indicar claramente o que está pendente, sincronizado ou em erro.

## 8. Testes obrigatórios antes de produção

- isolamento entre duas consultoras;
- isolamento entre dois clientes da mesma consultora;
- acesso externo apenas ao cliente concedido;
- revogação de acesso e invalidação de novas consultas;
- tentativas de associação cruzada entre workspace, cliente, estabelecimento, auditoria e evidência;
- Storage: leitura e upload não autorizados;
- transições de auditoria e imutabilidade de versões;
- histórico e autoria;
- emissão de PDF e correspondência com snapshot;
- concorrência e idempotência de sincronização, se offline for incluído.

## 9. Reutilização técnica identificada no FKT

A análise estática inicial do repositório identificou padrões candidatos a reutilização:
- autenticação e workspace;
- formulários dinâmicos e snapshots de definição;
- upload/compressão de fotografias;
- acções, verificações de eficácia e anexos;
- histórico de eventos;
- Storage privado e URLs assinados;
- testes pgTAP e CI local.

A reutilização deve ser confirmada ficheiro a ficheiro e por testes. Não se deve importar directamente o domínio `obras_*` para o Inspect nem presumir que as políticas actuais resolvem acesso externo multi-cliente.

## 10. Decisões em aberto para desenho técnico

1. Se a Organização Inspect é sempre 1:1 com workspace ou se a evolução futura do Core exige outra cardinalidade.
2. Se o cliente externo tem conta própria obrigatória ou se pode receber convite apenas para consulta.
3. Granularidade das permissões externas por auditoria/estabelecimento.
4. Política de retenção e eliminação de evidências.
5. Requisitos offline exactos para o MVP.
6. Formatos e limites de anexos.
7. Estratégia de snapshot e hash dos PDFs.

Estas decisões devem ser fechadas nas issues de implementação antes das migrações.

## 11. Limites

Este documento é um modelo lógico e de segurança proposto. Não afirma que as tabelas, políticas ou fluxos estejam implementados. A implementação deve ser revista contra o esquema real da única base de dados FKT e testada em ambiente local/CI antes de qualquer migração remota.


## 12. Decisão de arquitectura multi-cliente

A decisão detalhada encontra-se em [FKT Inspect — decisão de arquitectura multi-cliente e acesso externo](fkt-inspect-multi-client-architecture-decision.md).

Princípios agora explicitados:
- a Organização Inspect é ancorada ao workspace proprietário;
- clientes e estabelecimentos são entidades do domínio Inspect, não workspaces;
- utilizadores externos não entram em `workspace_members` da consultora;
- a partilha inicial é por auditoria concreta, com permissões por recurso/operação;
- o contexto «Partilhado comigo» é distinto do workspace interno e não altera o workspace activo do Core;
- contas sem workspace próprio podem consultar auditorias Inspect partilhadas, sem obter acesso à organização consultora;
- convites pendentes não conferem acesso; é necessária aceitação autenticada;
- notas internas não são visíveis externamente por defeito;
- RLS, Storage e constraints compostas têm de validar o mesmo âmbito.

Esta decisão é proposta para revisão. Não representa implementação nem validação em runtime.


## 13. Correcções resultantes da revisão arquitectural

- Distinguir cliente contratual da entidade que opera legalmente o estabelecimento alimentar. A relação comercial não prova, por si, quem é o operador responsável.
- A autorização externa do MVP é por auditoria concreta. Uma eventual relação de contacto ao nível do cliente não concede acesso.
- Não colocar notas internas e conteúdo partilhável na mesma linha/tabela se o utilizador externo puder ler essa linha. Usar separação física ou projecções controladas; RLS não é controlo de ocultação de colunas.
- Aceitação de convite exige email da conta confirmado no servidor igual ao destinatário normalizado; token de uso único armazenado como hash e consumo atómico.
- URL assinada previamente emitida pode sobreviver à revogação até expirar. Para revogação imediata, avaliar proxy autenticado com autorização por pedido.
- Separar ciclo de vida da auditoria do ciclo de vida da concessão e definir visibilidade por estado.
- O cliente externo não altera resultados, critérios, medições originais, classificações nem verificações de eficácia. A resposta a acções atribuídas é a única escrita candidata ao MVP, sujeita a aprovação.

Estas correcções são requisitos de desenho, não implementação. O modelo físico deve reflecti-las antes da primeira migração.


## 14. Matriz de permissões externas aprovada para desenho

Consultar [FKT Inspect — matriz de permissões de acesso externo](fkt-inspect-external-access-permissions-matrix.md).

Requisitos vinculativos para o desenho físico:
- concessão por auditoria concreta; permissões por operação;
- acesso de leitura externo apenas depois de submissão e publicação explícita;
- separação física/lógica de notas internas e conteúdo partilhável;
- respostas externas e anexos associados a acções atribuídas, sem alterar o registo original;
- convite com email confirmado no servidor, token hash, uso único e consumo atómico;
- bucket privado; autorização antes de cada emissão de URL/download/upload;
- não emitir URL assinada bearer por defeito; se for inevitável, usar TTL mínimo operacional e reconhecer a janela de validade;
- RLS e constraints compostas para todos os recursos e operações;
- histórico append-only para concessões, publicações, downloads sensíveis e respostas.

O desenho deve considerar funções RPC/Edge Function com identidade derivada da sessão e privilégios mínimos. Nenhuma função deve aceitar `user_id`, `workspace_id` ou organização como autoridade fornecida pelo cliente.

A matriz fecha decisões funcionais do MVP. Não autoriza migração remota.


## 15. Modelo relacional lógico

O desenho relacional candidato, incluindo entidades, cardinalidades, constraints compostas, grupos RLS, Storage e testes pgTAP, está em [FKT Inspect — modelo relacional lógico e integridade](fkt-inspect-relational-model.md).

Este modelo:
- distingue parte contratante, operador alimentar e estabelecimento;
- permite auditorias internas sem cliente contratual fictício;
- mantém a auditoria como unidade de concessão externa;
- separa convites pendentes de concessões activas;
- separa notas internas de resultados/conteúdos publicados;
- mantém respostas externas separadas das acções e findings originais;
- usa snapshots para submissões e relatórios imutáveis.

O desenho ainda exige revisão de PK/FK reais do Core, cardinalidades e políticas SQL antes de migrações. Não foi executado contra a BD remota.
