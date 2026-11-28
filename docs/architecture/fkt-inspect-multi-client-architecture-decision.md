# FKT Inspect — decisão de arquitectura multi-cliente e acesso externo

## Estado da decisão

**Proposta técnica para revisão.** Esta decisão concretiza o desenho funcional e de segurança do Inspect, mas ainda não autoriza migrações, alterações ao Core ou implementação de interface. Deve ser revista antes de se iniciar a issue de modelo físico/RLS.

## 1. Problema a resolver

O FKT Core tem um workspace principal por utilizador proprietário, reforçado pelo índice único `workspaces_user_id_unique`. Os membros actuais pertencem a um workspace e recebem permissões gerais nesse espaço (`owner`, `admin`, `editor`, `viewer`).

Este mecanismo é adequado à colaboração interna de uma organização. Não é adequado para representar clientes de uma consultora: adicionar o restaurante a `workspace_members` permitiria, em princípio, consultar dados do workspace que não pertencem àquele cliente. Também não se deve criar um workspace por restaurante, porque isso contraria a regra actual de um workspace proprietário por utilizador e multiplica a administração.

## 2. Decisão proposta

Separar dois conceitos que não devem ser confundidos:

1. **Organização proprietária do Inspect:** organização que possui os modelos, clientes, auditorias e dados de trabalho. É ancorada a um workspace FKT.
2. **Acesso externo do cliente:** concessão independente, limitada a recursos Inspect concretos. Não transforma o utilizador externo em membro do workspace da consultora.

O workspace continua a ser a fronteira de propriedade e administração interna. O acesso externo é uma autorização adicional, específica do módulo Inspect, verificada no servidor/base de dados.

### Regra fundamental

**Um utilizador externo não recebe acesso ao workspace da consultora. Recebe acesso apenas às auditorias e às acções que lhe forem explicitamente partilhadas.**

O acesso não deve herdar automaticamente dados de Works, Lex, Vet, Dev ou outros clientes da consultora.

## 3. Modelo de utilização

### 3.1. Consultora / auditor independente

- Tem o seu workspace FKT e uma Organização Inspect associada.
- Regista vários clientes e vários estabelecimentos por cliente.
- Cria e executa auditorias para esses estabelecimentos.
- Mantém notas internas, planeamento e documentação de trabalho sob controlo da sua organização.
- Partilha uma auditoria específica com um ou mais utilizadores do cliente.
- Pode conceder a um cliente acesso a uma acção concreta para responder/submeter evidência, sem expor o resto da carteira.

Um consultor independente é uma organização Inspect com um utilizador proprietário; não precisa de um modelo especial de workspace.

### 3.2. Empresa / operador alimentar

- Tem a sua própria Organização Inspect ancorada ao seu workspace.
- Gere os seus estabelecimentos próprios.
- Executa auditorias internas no mesmo motor de auditorias.
- Pode convidar membros internos usando o modelo actual de workspace.
- Pode, em fase posterior, conceder a uma consultora externa acesso a auditorias/estabelecimentos seleccionados, sempre através de concessão Inspect explícita.

A empresa não deve ser obrigada a criar um registo de «cliente» para si própria quando é simultaneamente proprietária da organização Inspect e operadora auditada.

### 3.3. Utilizador do cliente externo

- Autentica-se com a sua própria conta FKT.
- Não é adicionado a `workspace_members` da consultora.
- Acede a uma área Inspect partilhada, separada do espaço interno da consultora.
- Só vê auditorias, relatórios, não conformidades e acções explicitamente partilhadas e dentro das permissões concedidas.
- Não vê notas internas, modelos privados, outros clientes, dados administrativos internos nem módulos alheios ao Inspect.

A conta externa pode também ter um workspace próprio. A existência desse workspace não aumenta nem reduz as concessões externas.

## 4. Entidades lógicas propostas

Os nomes são conceptuais, não nomes SQL finais.

### 4.1. Organização Inspect

- `id`
- `workspace_id` — único e obrigatório
- `tipo` — `consultant`, `operator` ou `hybrid`
- `nome`, estado e timestamps

Relação proposta: uma Organização Inspect por workspace. Não se propõe alterar a regra Core de um workspace principal por utilizador.

### 4.2. Cliente

- `id`
- `inspect_organisation_id`
- `party_id` — entidade contratante registada em `inspect_parties`
- referência/estado da relação comercial e timestamps

Representa a relação de cliente contratual gerida pela organização Inspect. Não é um utilizador nem um workspace e não concede acesso externo por si só. A entidade legal subjacente é registada uma única vez por organização Inspect em `inspect_parties`, que pode assumir o papel de cliente contratual e/ou operador alimentar. Não existe deduplicação nem partilha entre organizações no MVP.

### 4.3. Estabelecimento

- `id`
- `inspect_organisation_id`
- `operator_party_id nullable` — entidade que opera o estabelecimento, quando identificada
- designação, morada, actividade e estado

O estabelecimento pertence à carteira da organização Inspect, não a um único cliente contratual. A relação de carteira é mantida por `inspect_client_establishments` (N:M), permitindo gerir os estabelecimentos de cada cliente antes de existir uma auditoria e associar um local a mais do que um cliente contratual quando necessário. A auditoria referencia a combinação cliente/estabelecimento concreta. Para o operador que audita internamente, não se cria um cliente fictício.

### 4.4. Auditoria

A auditoria pertence a uma Organização Inspect, a um estabelecimento e, quando aplicável, ao cliente externo. Deve ter chaves compostas/constraints que garantam que organização, cliente e estabelecimento são compatíveis.

A auditoria contém o âmbito, modelo/versão, auditores, estado, resultados e histórico.

### 4.5. Concessão de acesso externo

Entidade conceptual `inspect_access_grants`:
- utilizador autenticado destinatário (`user_id`);
- organização Inspect que concede;
- auditoria específica;
- permissões explícitas;
- estado (pendente, activa, revogada, expirada);
- autor da concessão, datas de criação, aceitação e revogação;
- validade opcional;
- motivo/nota administrativa.

A concessão inicial deve ser **ao nível da auditoria**, não ao nível de toda a carteira do cliente. Evita que auditorias futuras ou informação nova sejam partilhadas automaticamente sem decisão explícita.

A tabela de convites é separada da concessão activa. Convites por email não são autorização: só depois de o destinatário autenticar e aceitar, com o estado de verificação do email confirmado no servidor através do Supabase Auth, é associada a concessão ao `auth.users.id`. Não presumir um claim JWT `email_verified`. Não guardar tokens em claro; usar hash, validade, uso único e limitação de tentativas.

### 4.6. Permissões por recurso

Conjunto inicial vinculativo do MVP, alinhado com a matriz de permissões:
- `view_published_summary`: ver identificação, âmbito e resumo publicados;
- `view_published_results`: ver resultados publicados por critério;
- `view_final_report`: consultar relatório emitido e publicado;
- `view_published_evidence`: consultar evidências explicitamente publicadas;
- `view_assigned_actions`: consultar acções atribuídas e partilhadas;
- `respond_assigned_actions`: submeter resposta a uma acção atribuída;
- `upload_assigned_action_evidence`: submeter evidência de execução para essa acção.

Não incluir comentários genéricos no MVP.

Não conceder por defeito:
- leitura de notas internas do auditor;
- edição de resultados de auditoria;
- alteração de critérios/modelos;
- encerramento ou verificação de eficácia;
- gestão de outros utilizadores;
- acesso a outros clientes ou auditorias.

A matriz exacta deve ser aplicada por operação, não apenas por um campo genérico «role». A concessão deve poder ser de leitura sem escrita.

## 5. Contexto de navegação na aplicação

O contexto de workspace interno e o contexto de auditoria partilhada são distintos.

A interface Inspect deverá separar claramente:
- **Área da organização:** clientes, estabelecimentos, modelos, auditorias próprias, notas internas e gestão de equipa;
- **Partilhado comigo:** auditorias e acções que outras organizações partilharam com o utilizador.

Não alterar o workspace activo global do Core quando o utilizador abre uma auditoria partilhada. Não usar a selecção de workspace para simular o acesso externo.

O Core actual procura primeiro workspace próprio e, na ausência deste, um workspace de membro. A futura entrada Inspect tem de suportar também concessões externas sem inserir o utilizador como membro do workspace da consultora. Esta evolução deve ser desenhada como contexto específico do Inspect, sem alterar silenciosamente o comportamento de Works, Lex, Vet ou Dev.

Se a conta não tiver workspace próprio, a aplicação deverá ainda conseguir apresentar o contexto Inspect partilhado após autenticação. O fluxo de activação de um módulo próprio não pode ser pré-requisito para consultar uma auditoria partilhada. Este ponto exige revisão do routing/guards do Core antes da implementação.

## 6. Regras de autorização e RLS

### 6.1. Organização e equipa interna

A organização Inspect é acessível aos proprietários e membros internos autorizados do workspace associado, através dos helpers/políticas de workspace já existentes e de permissões Inspect adicionais quando necessário.

### 6.2. Acesso externo

Uma política de acesso externo deve verificar cumulativamente:
1. `auth.uid()` corresponde ao destinatário da concessão;
2. concessão está activa, aceite e não expirada/revogada;
3. a auditoria pedida corresponde à auditoria da concessão;
4. a operação está incluída nas permissões concedidas;
5. o recurso filho pertence à mesma auditoria/organização;
6. o estado da auditoria permite a operação solicitada.

Não aceitar um `workspace_id`, `contract_client_id`, `establishment_id` ou `audit_id` enviado pelo cliente como prova de autorização.

### 6.3. Isolamento e negação por defeito

- O utilizador externo não consulta `workspaces` nem `workspace_members` da consultora.
- O utilizador externo não enumera clientes nem auditorias não partilhadas.
- O utilizador de outra consultora não vê quaisquer dados.
- IDs conhecidos, URLs antigas ou caminhos Storage não contornam RLS.
- As políticas de Storage aplicam a mesma autorização por auditoria/evidência.
- Operações privilegiadas são implementadas apenas através de RPC controlada, com actor derivado de `auth.uid()`, `search_path` fixo e privilégios mínimos.
- Não usar a chave `service_role` no cliente.

### 6.4. Integridade relacional

Seguir o padrão já usado no FKT Vet e em Works: chaves candidatas e foreign keys compostas para impedir relações entre workspaces/organizações/clientes/auditorias incompatíveis.

Exemplo conceptual:
- auditoria tem `(id, inspect_organisation_id, contract_client_id, establishment_id)`;
- resultado referencia `(audit_id, inspect_organisation_id)`;
- evidência referencia a auditoria e o mesmo âmbito;
- acção referencia a não conformidade e a mesma auditoria.

Os nomes e colunas finais dependem do esquema físico aprovado. RLS não substitui constraints e constraints não substituem RLS.

## 7. Ciclo de vida de acesso

1. Auditor/administrador escolhe uma auditoria concreta e as permissões a conceder.
2. Sistema cria convite pendente para endereço de email.
3. Destinatário autentica-se e confirma controlo desse endereço.
4. Aceitação associa o convite à conta autenticada e cria/activa concessão.
5. Cada pedido valida a concessão actual, sem confiar em permissões guardadas no frontend.
6. Auditor/administrador pode revogar ou deixar expirar a concessão.
7. Revogação bloqueia imediatamente novas consultas e uploads; URLs assinados emitidos anteriormente devem ter validade curta.
8. Histórico de concessão, aceitação e revogação é preservado.

A cessação da relação comercial não apaga auditorias ou evidências que a organização tenha obrigação legítima de conservar. Revoga o acesso externo e segue a política de retenção aplicável.

## 8. Notas internas e informação partilhada

A auditoria deve distinguir conteúdo interno da consultora e conteúdo partilhável com o cliente. Não basta esconder campos na interface: as políticas devem impedir a leitura externa das tabelas/colunas internas ou expor vistas/RPCs com projecção explícita.

Comentários, observações e evidências devem ter classificação de visibilidade explícita. O valor por defeito é interno até ser partilhado pelo auditor.

## 9. Alternativas rejeitadas

### Adicionar o cliente a `workspace_members`
Rejeitada. A membership actual dá acesso ao workspace e não representa o isolamento por cliente.

### Criar um workspace por restaurante
Rejeitada. Contraria o modelo actual de workspace principal por utilizador, fragmenta a gestão e complica a relação entre auditor e carteira de clientes.

### Dar ao cliente acesso ao workspace e esconder dados na UI
Rejeitada. A UI não é fronteira de segurança; acesso deve ser limitado na base de dados e Storage.

### Partilhar toda a carteira do cliente por defeito
Rejeitada para a primeira versão. A concessão por auditoria é mais restritiva e evita exposição automática de auditorias futuras.

### Criar uma segunda base de dados ou aplicação
Rejeitada. O Inspect reutiliza a plataforma e a única instância Supabase FKT.

## 10. Plano de implementação após aprovação

1. Rever routing e guards do Core para suportar contexto Inspect partilhado sem workspace da consultora.
2. Fechar modelo físico e cardinalidades, incluindo estabelecimento interno do operador.
3. Criar tabelas, constraints e funções de autorização numa migração própria.
4. Implementar RLS e políticas Storage com negação por defeito.
5. Criar testes pgTAP com, pelo menos, duas consultoras, dois clientes na mesma consultora, dois utilizadores externos, uma conta sem workspace próprio e uma conta com workspace próprio.
6. Implementar convites e aceitação com identidade autenticada.
7. Implementar a área «Partilhado comigo» e permissões de leitura/resposta.
8. Testar revogação, URLs assinados, enumeração, acesso por ID e tentativas de associação cruzada.
9. Só depois considerar qualquer migração na única base Supabase existente.

## 11. Testes de segurança mínimos

- Cliente A não lê cliente B da mesma consultora.
- Utilizador externo não lê qualquer tabela geral do workspace da consultora.
- Utilizador externo só lê a auditoria concedida.
- Permissão `view_report` não permite ler anexos/evidências originais.
- Permissão `respond_actions` não permite editar resultados ou encerrar auditoria.
- Revogação bloqueia consultas e uploads subsequentes.
- Convite pendente, expirado, usado ou enviado para outro utilizador não concede acesso.
- Utilizador sem workspace próprio consegue consultar apenas o Inspect partilhado.
- Utilizador com workspace próprio mantém acesso ao seu contexto e às auditorias partilhadas, sem mistura de dados.
- Manipulação de IDs, filtros, RPC e caminhos Storage não permite acesso transversal.
- Constraints rejeitam referências cruzadas mesmo quando o cliente tenta inserir IDs válidos de outra organização.

## 12. Questões ainda por fechar

1. O acesso externo será apenas por convite individual no MVP ou será necessário convidar grupos de utilizadores por cliente?
2. A partilha de auditoria inclui sempre o relatório final ou o auditor escolhe separadamente cada permissão?
3. O cliente poderá responder a uma acção antes de a auditoria ser formalmente submetida?
4. Qual o prazo de validade por defeito de um convite e de uma concessão?
5. Que dados pessoais de contacto do cliente são estritamente necessários e qual a política de retenção?

Estas questões não impedem a decisão arquitectural principal, mas têm de ser fechadas antes do modelo físico e da implementação do fluxo de convites.

## 13. Limites desta análise

A proposta resulta de análise estática do repositório e das migrações versionadas. Não houve consulta à base de dados remota, execução de SQL, testes de RLS do Inspect ou validação de routing em execução. Não afirmar que a arquitectura está implementada ou que o isolamento foi comprovado em runtime.

A prioridade de produto passou para o MVP do FKT Inspect em 28/11/2026. Não criar projectos Supabase, branches de BD ou alterações remotas sem revisão e autorização específica.


## 14. Revisão crítica da proposta — correcções obrigatórias antes do modelo físico

A revisão confirmou a separação entre workspace e acesso externo, mas identificou decisões que têm de ficar explícitas. Esta secção prevalece sobre formulações anteriores mais genéricas deste documento.

### 14.1. Distinguir cliente contratual de operador alimentar

«Cliente» não deve ser automaticamente tratado como sinónimo de operador responsável pelo estabelecimento. Uma consultora pode ser contratada por uma entidade gestora, enquanto a responsabilidade pela exploração alimentar pertence a outra entidade; também pode haver vários estabelecimentos e operadores diferentes.

O modelo físico distingue:
- a relação comercial/cliente da organização Inspect;
- a entidade operadora do estabelecimento, quando identificável;
- o estabelecimento físico;
- a associação N:M entre cliente e estabelecimento (`inspect_client_establishments`).

No cenário de utilização interna por uma empresa, não se exige uma relação comercial fictícia consigo própria. A organização Inspect pode associar a sua própria entidade operadora aos estabelecimentos. A auditoria guarda um snapshot do operador identificado à data, sem o inferir a partir do cliente contratual; se desconhecido, regista a pendência e essa limitação.

### 14.2. A concessão externa é por auditoria, não por cliente

A regra do MVP é uma concessão explícita por auditoria. Não existe associação de utilizador externo ao cliente que, por si só, dê acesso a todas as auditorias desse cliente.

Se futuramente for necessário um acesso permanente à carteira de um cliente, isso será uma capacidade distinta, com âmbito e consentimento próprios, fora do MVP.

A referência a «cliente N:M utilizadores externos» noutros documentos deve ser entendida apenas como relação de contactos/convidados, nunca como autorização. A autorização efectiva resulta exclusivamente das concessões activas por auditoria.

### 14.3. Separar dados internos de dados partilháveis ao nível da base de dados

RLS em PostgreSQL/Supabase é essencialmente aplicada por linha; não se deve assumir que uma política de linha consegue esconder selectivamente colunas sensíveis de uma linha que o utilizador pode ler.

Assim, notas internas, avaliações reservadas ao auditor, comunicações internas e campos de trabalho não podem residir na mesma linha/tabela exposta ao cliente externo se tiverem de permanecer confidenciais. Devem ficar em tabelas separadas, ou ser expostos através de vistas/RPC com projecção explícita e privilégios cuidadosamente definidos. A UI não é mecanismo de confidencialidade.

### 14.4. Convites e identidade

O convite deve ficar associado a um endereço de email normalizado. Na aceitação, o servidor valida a identidade com Supabase Auth, confirma `email_confirmed_at` e compara o email da conta com o destinatário. O cliente não pode escolher livremente o `user_id` a associar.

O token deve ser aleatório, de uso único, armazenado apenas sob forma não reversível (hash), com validade, limitação de tentativas e consumo atómico. Convite pendente nunca equivale a concessão activa.

### 14.5. Revogação e Storage

Uma URL assinada já emitida pode continuar utilizável até expirar; revogar a concessão não garante a invalidação instantânea de URLs assinados previamente emitidos.

Consequentemente:
- URLs assinados de duração muito curta;
- não guardar URLs assinados nas tabelas;
- verificar autorização em cada novo pedido de emissão;
- para requisitos de revogação imediata, usar um endpoint/proxy autenticado que volte a validar a concessão em cada download, em vez de depender exclusivamente de URLs assinados directos.

A decisão entre URL curta e proxy deve ser tomada em função do risco e da experiência móvel, antes da implementação.

### 14.6. Permissões externas mínimas do MVP

Começar com o menor conjunto:
- consultar resumo e estado da auditoria partilhada;
- consultar resultados e relatório explicitamente partilhados;
- consultar evidências explicitamente partilhadas;
- responder a acções atribuídas e submeter evidência para essas acções, se essa funcionalidade for incluída no primeiro piloto.

Não permitir ao cliente externo editar resultados, critérios, medições originais, classificação de não conformidade, verificação de eficácia ou fechar a auditoria.

### 14.7. Separar estado da auditoria de estado da partilha

Uma auditoria pode estar em rascunho, em execução, submetida ou fechada; a concessão de acesso tem o seu próprio ciclo de vida. A política deve definir quais os dados visíveis em cada estado. Não assumir que «concessão activa» significa acesso irrestrito a todos os estados e conteúdos da auditoria.

### 14.8. Resultado da validação

A arquitectura base fica validada com estas correcções. O modelo físico, as funções de autorização e as políticas RLS continuam por desenhar e testar. Não se autoriza ainda migração ou alteração da base de dados.


## 15. Matriz de permissões e estratégia de Storage — decisão MVP

A matriz normativa encontra-se em [FKT Inspect — matriz de permissões de acesso externo](fkt-inspect-external-access-permissions-matrix.md).

Decisões para o MVP:
- deny-by-default e menor privilégio;
- nenhuma leitura externa em rascunho ou durante execução;
- após submissão, leitura apenas de conteúdos publicados e concedidos;
- cliente não edita resultados, critérios, medições, classificações nem verifica eficácia/fecha acções;
- resposta externa apenas a acções atribuídas e apenas quando a permissão específica foi concedida;
- convite de 7 dias, uso único, email confirmado no servidor e aceitação autenticada;
- bucket privado; downloads externos preferencialmente autenticados com RLS por objecto em cada pedido; proxy autenticado se for necessária URL bearer;
- URL assinada já emitida pode funcionar até expirar; não prometer revogação instantânea;
- notas internas separadas dos dados publicados ao nível da BD.

A matriz é a referência de produto para o desenho físico e RLS. Não é implementação nem prova de segurança em runtime.


## 9. Fecho das decisões para o MVP — 28/11/2026

Este aditamento fecha as decisões de arquitectura que estavam em proposta. Em caso de conflito, prevalece esta secção e o dicionário físico.

### 9.1. Estado e fronteira

A separação entre workspace proprietário, carteira Inspect e concessões externas fica adoptada para o MVP. A organização Inspect continua 1:1 com o workspace Core; o cliente não é workspace nem membership Core.

### 9.2. Party e operador

- `inspect_parties` é scoped por `inspect_organisation_id`.
- Não existe party global nem partilha transversal entre organizações Inspect no MVP.
- O mesmo restaurante pode ter fichas independentes em organizações diferentes; não há pesquisa transversal nem deduplicação automática.
- Dentro da mesma organização, a mesma party pode representar o cliente contratual e o operador alimentar.
- O operador do estabelecimento é identificado por `operator_party_id`; a relação cliente-estabelecimento é apenas comercial/gestão de carteira.
- Os valores físicos de `organisation_type` são os da migração: `consultant`, `operator`, `hybrid`. Os termos antigos `consultancy` e `both` ficam obsoletos.

### 9.3. Utilizadores e tarefas

- Papéis internos Inspect: `manager`, `haccp_responsible`, `staff`, atribuídos por estabelecimento e período.
- Consultor e auditor usam grants/atribuições explícitas, nunca acesso por membership de workspace do cliente.
- Tarefas persistidas são geradas on-demand por RPC idempotente, com cursor por controlo, lock transaccional e chave única. Cron não é requisito do MVP.
- Registos retroactivos são permitidos com motivo obrigatório, identificação visível e evento auditável; janela configurável por estabelecimento.

### 9.4. Rastreabilidade e não conformidades

- Quantidade/unidade são opcionais em recepção e ligações de lote, mas têm de estar ambas preenchidas ou ambas vazias.
- Transformações exigem quantidades quando o procedimento aplicável o determinar.
- Uma NC agrega várias origens tipadas; cada origem fica ligada a uma única NC ao longo do seu ciclo de vida.
- A NC é reaberta para recorrência da mesma origem; não se cria duplicação silenciosa.
- Controlo manual de óleos integra o MVP; sensores e limiares universais codificados ficam fora.

### 9.5. Dependências que não ficam fechadas por decisão de arquitectura

A validação dos perigos, limites, frequências, prazos, métodos, critérios de aceitação e retenção específica continua dependente de profissional competente e do plano do estabelecimento. O FKT não define estes valores por defeito.

A migração de fundação Inspect está no repositório, mas declara-se destinada a validação local/CI e não deve ser aplicada remotamente sem aprovação. A constraint de módulo, tabelas e RLS só ficam disponíveis em produção depois da migração ser aplicada e testada. O código de selector mantém Inspect fora da activação geral enquanto esta condição não estiver cumprida.
