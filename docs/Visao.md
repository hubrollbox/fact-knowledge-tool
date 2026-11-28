# FKT — Visão do Produto

## 1. Propósito

O FKT (Fact Knowledge Tool) é uma plataforma modular para organizar informação, validar referências, fundamentar decisões e acompanhar ações.

O seu propósito é transformar informação dispersa em conhecimento estruturado e rastreável, permitindo compreender o que aconteceu, identificar a evidência disponível, fundamentar decisões e acompanhar o que deve ser feito.

O FKT não é uma aplicação fechada num único setor. É uma plataforma comum, preparada para responder a diferentes contextos operacionais através de módulos especializados.

A identidade do produto assenta em quatro princípios transversais: **estrutura, evidência, rastreabilidade e controlo**.

## 2. O Problema

Em diferentes setores, profissionais e organizações trabalham com informação dispersa por documentos, mensagens, folhas de cálculo, fotografias e aplicações sem ligação entre si.

Esta fragmentação cria problemas recorrentes:

- **Informação dispersa** — os elementos necessários para compreender um assunto encontram-se em locais diferentes.
- **Falta de contexto** — documentos, ocorrências, decisões e ações nem sempre ficam ligados ao mesmo assunto.
- **Evidência insuficiente** — torna-se difícil perceber em que informação se baseou determinada decisão.
- **Perda de histórico** — alterações, responsabilidades e sequência de acontecimentos podem não ficar devidamente registadas.
- **Acompanhamento deficiente** — ações, responsáveis e prazos perdem-se entre ferramentas e canais de comunicação.
- **Dificuldade de auditoria** — reconstruir o percurso entre informação inicial, análise, decisão e execução exige trabalho adicional.

O problema não é apenas guardar informação. É conseguir relacioná-la, perceber a sua origem e acompanhar as consequências das decisões tomadas.

## 3. A Solução

O FKT disponibiliza uma base comum de trabalho e módulos especializados por domínio.

### 3.1. Core transversal

O Core assegura capacidades partilhadas pela plataforma, de acordo com o módulo e as permissões:

- autenticação;
- organização através de um workspace principal por conta;
- gestão de utilizadores e permissões;
- organização de assuntos e registos;
- documentos, fotografias e outras evidências;
- fontes e referências;
- histórico e rastreabilidade;
- ações, responsáveis e prazos;
- consulta e exportação de informação.

Estas capacidades constituem a infraestrutura comum. Não determinam, por si só, a forma como cada setor deve trabalhar.

### 3.2. Módulos especializados

Cada módulo aplica o Core a um domínio concreto. Mantém a sua própria linguagem, estrutura de dados, regras e fluxos de trabalho.

**Modelo de utilização actualmente implementado:** cada conta está associada a um workspace principal e esse workspace tem um único módulo ativo de cada vez. O utilizador pode mudar o módulo ativo através da aplicação. Esta opção não significa que todos os módulos estejam concluídos ou disponíveis para utilização geral.

Os módulos partilham a infraestrutura e os princípios do FKT, preservando a autonomia funcional necessária a cada atividade. Os dados e estruturas específicas de cada domínio não devem ser considerados intercambiáveis.

A utilização simultânea de vários módulos no mesmo workspace não é descrita como capacidade actual nesta visão.

### 3.3. Método de trabalho comum

A plataforma procura assegurar um percurso de trabalho claro:

1. **Organizar** — reunir a informação num contexto identificável.
2. **Registar** — documentar acontecimentos, dados e elementos relevantes.
3. **Evidenciar** — associar documentos, fotografias e outras fontes.
4. **Fundamentar** — explicitar as referências e os elementos que sustentam uma análise ou decisão.
5. **Decidir** — registar a decisão e a respetiva justificação.
6. **Acompanhar** — atribuir ações, responsáveis e prazos.
7. **Consultar e auditar** — reconstruir o histórico e o percurso da informação.

A sequência concreta e a profundidade de cada etapa dependem do módulo. Não existe uma metodologia setorial única imposta a toda a plataforma.

### 3.4. Inteligência artificial

A inteligência artificial poderá ser disponibilizada como apoio opcional, quando fizer sentido para o módulo e para o respetivo fluxo de trabalho.

Não constitui uma condição de utilização do FKT nem substitui a validação humana, as fontes ou a responsabilidade de quem regista e decide.

Qualquer utilização de IA deverá respeitar os princípios de rastreabilidade, transparência e controlo do produto.

## 4. Módulos e âmbito

O FKT desenvolve-se através de módulos verticais. O estado indicado na aplicação deve ser distinguido entre piloto e preparação; a presença de código não equivale a disponibilidade geral.

| Módulo | Âmbito | Estado indicado no produto |
|---|---|---|
| **FKT Works** | Visitas, ocorrências, fotografias, ações, decisões técnicas e relatórios de fiscalização. | Piloto fechado; primeiro módulo escolhido para validação comercial. |
| **FKT Lex** | Organização de processos, factos, documentos, referências e análise jurídica estruturada. | Em preparação. O FIRAC é aplicável neste módulo quando adequado. |
| **FKT Vet** | Animais, registos sanitários, ninhadas, agenda e reservas de alojamento. | Em preparação. |
| **FKT Dev** | Projetos, issues, decisões técnicas e documentação. | Em preparação. |
| **FKT Inspect** | Auditorias, evidências, não conformidades e acções correctivas; domínio inicial de segurança alimentar e higiene na restauração. | Planeado; documentado, não implementado. |

Esta lista representa o âmbito e os estados identificados no código do produto. Não constitui uma certificação de conclusão, validação funcional ou disponibilidade em produção.

### 4.1. FKT Works

O FKT Works é o primeiro módulo vertical selecionado para validação comercial.

Está orientado para profissionais que necessitam de registar e acompanhar a atividade de fiscalização e acompanhamento de obras, incluindo:

- registo de visitas;
- registo e acompanhamento de ocorrências;
- recolha e associação de fotografias e documentos;
- registo de decisões e ações;
- identificação de responsáveis e prazos;
- consulta do histórico;
- preparação de relatórios de acompanhamento.

O objetivo é assegurar que a informação recolhida no terreno não fica isolada: deve manter ligação à obra, à visita, à ocorrência, à decisão e à ação correspondente.

A evolução funcional planeada inclui orçamentação para empreiteiros e fiscais de obra, criação e importação de orçamentos, versionamento, aprovação registada, medições e controlo de desvios. Este âmbito está documentado em [FKT Works — Orçamentação e controlo financeiro](architecture/fkt-works-budgeting.md) e não deve ser apresentado como funcionalidade já disponível.

O FKT Works não deve ser apresentado como substituto de todas as ferramentas de gestão de obra. O seu foco é a organização da informação, a evidência, a rastreabilidade e o acompanhamento.

### 4.2. FKT Inspect

O FKT Inspect está planeado como módulo de auditoria, recolha de evidências, registo de não conformidades e acompanhamento de acções correctivas. O primeiro domínio previsto é segurança alimentar e higiene na restauração.

O produto destina-se tanto a consultores/auditores que trabalham com vários clientes como a empresas que executam verificações internas. O modelo deverá permitir acesso externo estritamente limitado aos dados do cliente correspondente, sem criar um workspace por cliente nem expor a carteira de uma consultora.

O Inspect encontra-se documentado, mas **não está implementado**. O FKT Works mantém prioridade de conclusão do MVP. O âmbito, modelo de dados, segurança e catálogo inicial estão descritos em:
- [Arquitectura funcional do FKT Inspect](architecture/fkt-inspect-functional-architecture.md);
- [Modelo de dados e segurança do FKT Inspect](architecture/fkt-inspect-data-model-security.md);
- [Modelo inicial de auditoria FKT Food Safety](architecture/fkt-food-safety-audit-model.md).

O FKT Inspect não deve ser apresentado como autoridade inspectiva, entidade certificadora ou garantia automática de conformidade legal. Os critérios e referências devem ser validados por profissionais competentes e associados às fontes e versões aplicáveis.

## 5. Princípios fundamentais

- **Estrutura antes da interface** — a informação deve ter organização e contexto.
- **Evidência identificável** — os registos relevantes devem poder ser relacionados com as respetivas fontes.
- **Rastreabilidade** — deve ser possível reconstruir o histórico e compreender a origem das decisões.
- **Responsabilidade explícita** — ações, responsáveis e prazos devem ser identificáveis.
- **Autonomia dos módulos** — cada domínio mantém os seus conceitos, regras e fluxos próprios.
- **Core comum, sem uniformização artificial** — partilham-se capacidades transversais, não se forçam modelos de dados ou metodologias inadequados a cada setor.
- **Controlo de acesso** — a informação deve estar acessível de acordo com a organização, o workspace e as permissões atribuídas.
- **IA opcional e controlada** — nenhuma funcionalidade de IA deve comprometer a validação, a transparência ou a responsabilidade humana.
- **Evolução baseada em utilização real** — as decisões de produto devem ser sustentadas por necessidades verificadas.

## 6. Público-alvo

O público do FKT depende dos módulos utilizados.

De forma transversal, a plataforma destina-se a organizações e profissionais que precisam de:

- organizar informação operacional;
- relacionar registos com documentos e evidências;
- fundamentar decisões;
- acompanhar ações e responsabilidades;
- manter um histórico consultável e auditável.

No primeiro ciclo de validação, o foco comercial está nos profissionais e pequenas organizações ligados à fiscalização e ao acompanhamento de obras.

Os restantes públicos serão trabalhados à medida que os respetivos módulos estejam desenvolvidos e validados.

## 7. Posicionamento

O FKT posiciona-se como uma plataforma de organização, fundamentação e rastreabilidade da informação e da ação.

Não pretende ser um repositório genérico de ficheiros, uma folha de cálculo com outra interface ou um sistema universal que obrigue todos os setores a trabalhar da mesma forma.

Também não pretende substituir automaticamente os sistemas especializados já utilizados pelas organizações. A sua utilidade está em estruturar o percurso entre informação, evidência, decisão e acompanhamento.

A diferenciação pretendida resulta da combinação de uma infraestrutura transversal, módulos adaptados a necessidades concretas e relações explícitas entre registos, fontes, decisões e ações.

## 8. Visão de longo prazo

A evolução do FKT deverá ser progressiva.

**Primeira etapa — validação:** consolidar o Core necessário e validar o FKT Works com profissionais e organizações reais, identificando necessidades, limitações e valor efetivo.

**Segunda etapa — consolidação:** estabilizar a arquitetura modular, as permissões, a gestão de organizações e o modelo de utilização de um módulo ativo por workspace.

**Terceira etapa — expansão:** desenvolver e validar outros módulos, sem comprometer a coerência do Core nem impor dependências desnecessárias entre setores.

Qualquer evolução futura para utilização simultânea de vários módulos no mesmo workspace deverá ser tratada como decisão de arquitetura explícita, acompanhada de análise de permissões, isolamento de dados e migração. Não é assumida como capacidade actual.

**Longo prazo:** evoluir para uma plataforma modular utilizada por diferentes organizações, com módulos próprios para os seus contextos de trabalho e uma base comum de evidência, rastreabilidade e controlo.

Esta evolução deverá ser orientada por utilização real, segurança e sustentabilidade do produto, não por funcionalidades especulativas.

## 9. O que o FKT não é

- Não é uma aplicação exclusivamente jurídica.
- Não impõe o método FIRAC a todos os módulos.
- Não é um sistema universal que obriga setores diferentes a utilizar os mesmos modelos de dados e fluxos.
- Não é, por definição, um CRM ou um ERP.
- Não é um substituto automático de todos os softwares especializados.
- Não é um sistema de aconselhamento ou decisão autónoma por inteligência artificial.
- Não dispensa a validação humana nem a responsabilidade de quem utiliza a plataforma.

O FKT é uma plataforma modular que organiza informação, relaciona evidências, fundamenta decisões e permite acompanhar ações.

## 10. Mensagem central

**Informação organizada. Decisões fundamentadas. Ações acompanhadas.**

O FKT liga aquilo que é registado à evidência que o sustenta, à decisão que dele resulta e às ações que devem ser acompanhadas.

**Estrutura. Evidência. Rastreabilidade. Controlo.**
