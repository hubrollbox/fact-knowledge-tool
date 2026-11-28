# FKT Inspect — arquitectura funcional e âmbito

## Estado

**Âmbito funcional aprovado para preparação do MVP; ainda não implementado nem validado como produto.** Em 28/11/2026, a prioridade foi alterada: o FKT Inspect passa a ser o próximo MVP. O primeiro domínio é segurança alimentar e higiene na restauração. A implementação depende do fecho do modelo de dados/RLS e da validação profissional do catálogo inicial.

## 1. Objectivo e posicionamento

O FKT Inspect é o módulo proposto para realizar auditorias e verificações, recolher evidências, registar não conformidades, acompanhar acções correctivas e verificar a sua eficácia.

Não deve ser apenas um construtor de checklists. A unidade de trabalho é a **auditoria**, com âmbito, critérios, resultados, evidências, responsáveis, decisões e histórico relacionados.

Posicionamento: **Auditoria. Evidência. Conformidade.**

O produto apoia auditorias internas e avaliações profissionais. Não é, por si só, uma autoridade inspectiva, entidade certificadora, garantia de conformidade legal ou substituto das responsabilidades legais dos operadores e profissionais competentes.

## 2. Públicos e modelos de utilização

O módulo deve suportar dois modelos na mesma plataforma:

### 2.1. Consultor / auditor externo
- Gere a sua organização de consultoria e a carteira de clientes.
- Regista clientes e respectivos estabelecimentos.
- Prepara e executa auditorias em diferentes clientes.
- Emite relatórios e acompanha acções correctivas.
- Convida, quando aplicável, utilizadores do cliente para consultar auditorias e responder a acções que lhes sejam atribuídas.

### 2.2. Empresa / operador alimentar
- Utiliza o Inspect dentro da sua própria organização.
- Gere um ou vários estabelecimentos.
- Executa verificações internas e acompanha as respectivas acções.
- Pode conceder acesso delimitado a consultores externos, se o modelo de autorização aprovado o permitir.

Os dois modelos usam o mesmo motor de auditorias. Não devem ser implementadas duas aplicações nem duas bases de dados.

## 3. Modelo de organização e isolamento

O modelo actual do FKT associa cada conta a um workspace principal e permite um módulo activo de cada vez. A migração `20261120091500_enforce_single_primary_workspace.sql` reforça a unicidade do workspace proprietário por utilizador.

Este modelo não permite resolver uma carteira de clientes através da criação de um workspace por restaurante para o mesmo consultor. Também não é aceitável dar ao cliente acesso ao workspace integral da consultora.

A solução funcional proposta é manter o workspace como fronteira da organização proprietária e introduzir no domínio Inspect:
- organização/entidade cliente;
- estabelecimento pertencente ao cliente;
- relação explícita entre consultora, cliente e utilizadores autorizados;
- concessões de acesso com âmbito e permissões definidos;
- auditorias e evidências associadas ao cliente e estabelecimento.

O acesso externo deve ser concedido por relação explícita e limitado aos recursos autorizados. Não se presume que a pertença ao workspace da consultora conceda acesso ao cliente, nem que um utilizador do cliente possa consultar outros clientes da mesma consultora.

A implementação exige RLS, chaves estrangeiras compostas ou mecanismos equivalentes de integridade entre organização, cliente, estabelecimento e auditoria. A autorização não pode depender apenas de ocultação de elementos na interface.

## 4. Fluxo principal de auditoria

1. **Preparação:** seleccionar cliente, estabelecimento, âmbito, modelo e auditor responsável.
2. **Execução:** percorrer secções e critérios, registar resultados, observações, fotografias, documentos e medições.
3. **Avaliação:** classificar cada critério como conforme, não conforme, não aplicável ou não verificado; justificar estados relevantes.
4. **Tratamento:** criar não conformidades a partir de resultados, classificar prioridade/gravidade segundo metodologia configurada e atribuir acções, responsáveis e prazos.
5. **Relatório:** gerar PDF A4 correspondente à versão submetida/aprovada, com âmbito, resultados, evidências e limitações.
6. **Acompanhamento:** o responsável regista a acção executada e evidências da correcção.
7. **Verificação:** auditor ou utilizador autorizado verifica a implementação e eficácia, podendo aceitar, rejeitar ou pedir correcção.
8. **Encerramento:** preservar o resultado final e o histórico; reaberturas devem ficar registadas.

A auditoria deve distinguir rascunho, em execução, submetida, revista/aprovada e encerrada. Os estados definitivos e transições serão especificados na issue de fluxo.

## 5. Domínio inicial: segurança alimentar e higiene na restauração

O primeiro âmbito de produto é a restauração e os estabelecimentos de preparação e serviço de refeições. Não se pretende cobrir de início toda a cadeia alimentar nem todos os sectores de actividade.

Áreas iniciais de avaliação:
- higiene pessoal e práticas de manipulação;
- higiene, limpeza e desinfecção das instalações e equipamentos;
- controlo de temperaturas e conservação;
- armazenamento, separação e identificação;
- procedimentos baseados nos princípios HACCP;
- rastreabilidade e informação sobre fornecedores/lotes.

Esta lista é uma estrutura funcional inicial, não uma checklist legal exaustiva nem uma declaração de conformidade. Os critérios concretos, limites, periodicidades e classificações têm de ser validados por profissional competente e associados à fonte e versão aplicáveis.

## 6. Regras de avaliação e integridade

- Distinguir observação factual, resultado do critério, não conformidade e interpretação de incumprimento legal.
- Não converter automaticamente uma resposta negativa numa conclusão jurídica.
- Permitir «não aplicável» e «não verificado», com justificação quando necessário.
- Não inventar limites de temperatura, frequências, prazos ou classificações universais.
- Os critérios devem identificar fonte, referência, jurisdição, versão/data de vigência e âmbito de aplicabilidade, quando derivem de norma ou obrigação legal.
- Os modelos publicados devem ser versionados. Uma alteração não pode modificar retroactivamente auditorias já iniciadas ou concluídas.
- Uma auditoria submetida/fechada não pode ser alterada silenciosamente. Correcções devem gerar evento, nova versão ou adenda com autor, data e motivo.
- O relatório PDF deve identificar a versão dos critérios/modelo e a versão dos resultados que representa.

## 7. Funcionalidades transversais do Inspect

- carteira de clientes e estabelecimentos;
- modelos de auditoria versionados;
- execução móvel;
- recolha de fotografias, documentos, observações e medições;
- resultados por critério;
- não conformidades;
- acções correctivas e preventivas, responsáveis e prazos;
- verificação de implementação e eficácia;
- relatórios PDF A4;
- histórico e rastreabilidade;
- acesso externo limitado do cliente;
- indicadores agregados numa fase posterior.

## 8. Fora do MVP

- certificação automática ou emissão de certificados;
- substituição de inspecções oficiais;
- garantia automática de conformidade legal;
- gestão integral de HACCP como serviço profissional;
- ERP de restauração, compras, stocks, fornecedores ou facturação;
- integração automática com sensores/equipamentos;
- inteligência artificial para decidir conformidade ou gravidade;
- cobertura de todos os sectores alimentares;
- módulo de segurança e saúde no trabalho (eventual domínio futuro separado).

## 9. Princípios de experiência

- Primeiro telemóvel: utilização prática durante a visita.
- Registo rápido, com campos obrigatórios mínimos e detalhe progressivo.
- Gravar rascunhos automaticamente no servidor e mostrar claramente o estado guardado/por guardar/erro; a versão inicial não promete edição offline nem guarda localmente evidências sensíveis.
- Evidências associadas directamente ao critério, auditoria ou não conformidade.
- Separar a experiência do auditor da experiência do cliente.
- Não bloquear a recolha de uma observação por falta de dados administrativos que possam ser completados posteriormente.

## 10. Critérios de sucesso do MVP

O MVP só será considerado funcionalmente aceite quando:
- um consultor conseguir gerir pelo menos dois clientes e vários estabelecimentos sem criar workspaces por cliente;
- o isolamento impedir acesso cruzado entre clientes;
- for possível preparar e executar uma auditoria num dispositivo móvel;
- cada resultado relevante puder ter evidência e referência;
- uma não conformidade gerar acção com responsável e prazo;
- a acção puder ser submetida e verificada, mantendo histórico;
- o PDF reproduzir fielmente a versão aprovada da auditoria;
- existirem testes automatizados para permissões, integridade e transições;
- um piloto com consultores e estabelecimentos confirmar utilidade do fluxo.

## 11. Relação com o FKT Core e outros módulos

O Inspect deve reutilizar, quando tecnicamente adequado, autenticação, workspace, membros, componentes de ficheiros, histórico, formulários versionados e padrões de acções do Core/Works.

Reutilizar padrões não significa copiar tabelas de Works nem acoplar o Inspect ao domínio de obras. As entidades, estados, permissões e políticas de retenção do Inspect devem ser próprias.

A prioridade de produto é concluir o MVP do FKT Inspect. O desenvolvimento deve evitar regressões nos módulos existentes, mas já não está subordinado à conclusão do FKT Works.

## 12. Referências normativas iniciais

As referências abaixo orientam a investigação e a modelação; não constituem uma checklist nem substituem validação jurídica/técnica actualizada:
- Regulamento (CE) n.º 852/2004, relativo à higiene dos géneros alimentícios.
- Regulamento (CE) n.º 178/2002, que estabelece princípios e requisitos gerais da legislação alimentar, incluindo rastreabilidade.
- Orientações e materiais aplicáveis da Direcção-Geral de Alimentação e Veterinária (DGAV).

Cada critério do catálogo deverá apontar para a fonte exacta e versão aplicável. A aplicabilidade depende da actividade, do estabelecimento e das circunstâncias concretas.

## 13. Estado da proposta

Decisões de produto aprovadas para planeamento:
- nome: FKT Inspect;
- dois públicos: consultores/auditores e empresas/operadores;
- domínio inicial: segurança alimentar e higiene na restauração;
- uma plataforma e uma base de dados FKT;
- clientes e estabelecimentos como entidades próprias do domínio;
- acesso externo delimitado;
- Works continua prioritário;
- implementação faseada após fecho do modelo de dados/RLS; sem alterações à BD remota sem revisão e autorização explícita.

Este documento descreve o âmbito pretendido. A implementação e a validação devem ser acompanhadas nas issues associadas.


## 14. Separação entre área da organização e auditorias partilhadas

A utilização externa é contextual e não equivale a integrar o utilizador no workspace da consultora.

A experiência Inspect deve separar:
- **Área da organização:** clientes, estabelecimentos, modelos, auditorias próprias e notas internas.
- **Partilhado comigo:** auditorias e acções que outras organizações concederam ao utilizador.

O acesso externo é concedido por auditoria concreta e permissões explícitas. Não há partilha automática de toda a carteira do cliente nem de auditorias futuras. Um utilizador externo não passa a membro do workspace da consultora.

O desenho técnico detalhado e as regras de autorização constam de [FKT Inspect — decisão de arquitectura multi-cliente e acesso externo](fkt-inspect-multi-client-architecture-decision.md).


## 15. Clarificações da validação arquitectural

- Distinguir o cliente contratual da entidade que explora legalmente o estabelecimento alimentar; podem coincidir, mas não se deve presumir que são sempre a mesma entidade.
- O acesso externo inicial é concedido por auditoria concreta, não por cliente nem por carteira.
- A área «Partilhado comigo» apresenta apenas conteúdos e operações autorizados para cada auditoria e para o seu estado actual.
- O cliente externo não altera constatações, medições originais, classificações ou verificações do auditor. Pode, se aprovado no âmbito do MVP, responder a acções que lhe sejam atribuídas e submeter evidência.
- A auditoria e a concessão de acesso têm estados independentes.


## 16. Acesso externo — âmbito funcional do MVP

A matriz detalhada e vinculativa consta de [FKT Inspect — matriz de permissões de acesso externo](fkt-inspect-external-access-permissions-matrix.md).

Resumo:
- não há leitura externa durante rascunho ou execução;
- após submissão, o cliente vê apenas conteúdos publicados e explicitamente partilhados;
- o cliente não altera resultados, critérios, medições ou classificação nem verifica eficácia/fecha acções;
- pode responder a acções que lhe sejam atribuídas, apenas com permissão específica;
- acesso a ficheiros é privado e autorizado por pedido;
- concessão e estado da auditoria são ciclos de vida independentes.
