# FKT Inspect — arquitectura operacional HACCP

## Estado e autoridade do documento

**Proposta arquitectural para revisão e implementação faseada.** Este documento amplia o FKT Inspect de um produto centrado em auditorias para um sistema digital de gestão operacional HACCP destinado, na primeira fase, a restaurantes e estabelecimentos de preparação e serviço de refeições.

Não é um plano HACCP aplicável a um estabelecimento concreto, uma checklist legal aprovada, aconselhamento técnico, nem uma declaração de conformidade. Os perigos, medidas de controlo, limites, frequências e responsabilidades de cada operador têm de ser definidos ou validados por pessoa competente, considerando a actividade e os processos reais.

Este documento prevalece sobre referências anteriores que excluam a gestão HACCP operacional do âmbito do Inspect. A auditoria mantém-se, mas passa a ser uma função do sistema e não o centro exclusivo do produto.

## 1. Posicionamento e fronteiras

O Inspect deve permitir ao restaurante:
- configurar e manter a documentação e os procedimentos do seu sistema HACCP;
- atribuir tarefas e controlos aos colaboradores;
- registar a execução diária e os resultados;
- identificar desvios e acompanhar correcções;
- manter informação de fornecedores, recepção, lotes e rastreabilidade;
- consultar histórico e produzir evidência exportável.

Deve também permitir ao consultor HACCP gerir várias organizações/clientes, rever planos e registos, realizar auditorias e acompanhar acções, sem acesso cruzado entre clientes.

**Não é um ERP de restauração.** Não inclui compras, facturação, POS, gestão financeira, planeamento de menus, custeio, inventário comercial completo ou gestão de pessoal. Regista apenas a informação de produto/lote necessária à segurança alimentar e rastreabilidade.

## 2. Modelo de utilização

### Operador/restaurante
1. Configura o estabelecimento, áreas, equipamentos e responsáveis.
2. Regista ou importa o plano HACCP e os procedimentos aplicáveis.
3. Define controlos, limites, métodos, frequências e responsáveis, de acordo com o plano validado do próprio estabelecimento.
4. A equipa executa tarefas no turno e regista leituras, verificações e ocorrências.
5. Um desvio gera uma não conformidade e um fluxo de contenção/correcção/acção correctiva.
6. O responsável revê pendências, valida registos e acompanha eficácia.
7. Consulta histórico, documentos, lotes e relatórios.

### Consultor
- gere a carteira de clientes e estabelecimentos;
- apoia a configuração/revisão dos planos;
- consulta os registos que lhe forem autorizados;
- realiza auditorias e acompanha acções;
- mantém separadas notas internas e informação partilhada com o operador.

A autorização externa continua a ser explícita e delimitada. A partilha de uma auditoria não concede automaticamente acesso a todos os registos operacionais do restaurante. O acesso operacional do consultor exige uma concessão específica, com âmbito e permissões definidos.

## 3. Domínios funcionais e dados candidatos

Os nomes são conceitos lógicos, não nomes SQL finais. O modelo físico e as políticas RLS devem ser revistos antes de qualquer migração.

### 3.1. Plano HACCP e procedimentos

Entidades candidatas:
- `inspect_food_safety_plans`: plano associado à organização e estabelecimento, estado e responsável;
- `inspect_food_safety_plan_versions`: versões e snapshots imutáveis do plano;
- `inspect_processes` e `inspect_process_steps`: processos e etapas efectivamente existentes no estabelecimento;
- `inspect_hazards`: perigos identificados por etapa e categoria;
- `inspect_control_measures`: medidas de controlo, com classificação atribuída no plano (por exemplo, programa pré-requisito, ponto de controlo ou PCC), justificação e validação;
- `inspect_control_parameters`: parâmetro, valor/intervalo, unidade, fonte, tipo de limite e âmbito de aplicabilidade;
- `inspect_haccp_documents`: procedimentos, instruções, diagramas, fichas e documentos ligados à versão do plano.

O sistema não deve classificar automaticamente um ponto como PCC nem determinar limites legais. A classificação e os parâmetros são configurados pelo operador/profissional competente, com origem e aprovação registadas. A alteração de um plano publicado cria nova versão e não reescreve os registos históricos.

### 3.2. Áreas e equipamentos

Entidades candidatas:
- `inspect_areas`: cozinha, armazém, zona de preparação, câmaras e outras áreas reais;
- `inspect_equipment`: equipamento, tipo, localização, identificação, estado e dados relevantes;
- `inspect_equipment_checks`: manutenção, verificação/calibração e evidência, quando aplicável.

Um equipamento pode estar associado a um ou mais controlos. A aplicação não deve presumir que todos os equipamentos têm os mesmos limites, periodicidades ou método de verificação.

### 3.3. Controlos operacionais e registos

Entidades candidatas:
- `inspect_monitoring_plans`: controlo configurado, origem no plano HACCP, parâmetro, método, unidade, limite/regra, frequência e responsável;
- `inspect_monitoring_assignments`: atribuições e vigência;
- `inspect_monitoring_records`: execução concreta, instante do servidor, autor, valor/resultado, equipamento/produto/área e snapshot da regra aplicada;
- `inspect_monitoring_record_events`: correcções, validações e histórico append-only.

O modelo deve suportar temperaturas e outros controlos quantitativos ou qualitativos sem codificar valores universais. Cada registo preserva o parâmetro, unidade, regra/limite e versão em vigor no momento da medição. O valor original nunca é sobrescrito por uma correcção silenciosa.

A frequência é definida por plano/configuração do estabelecimento, não por uma regra global do software. Alertas de atraso são lembretes operacionais, não prova automática de incumprimento legal.

### 3.4. Higienização

Entidades candidatas:
- `inspect_cleaning_plans`: plano por área/equipamento, método, frequência definida pelo operador e responsável;
- `inspect_cleaning_tasks`: instâncias previstas e atribuídas;
- `inspect_cleaning_records`: execução, data/hora, executor, resultado, produto utilizado e observações;
- `inspect_cleaning_products`: produtos de limpeza registados e informação operacional necessária.

O registo deve permitir evidência e assinalar tarefas não executadas ou rejeitadas. Concentrações, tempos de contacto e outras instruções só são exigidos quando definidos pelo procedimento/produto aplicável.

### 3.5. Fornecedores, recepção e rastreabilidade

Entidades candidatas:
- `inspect_suppliers`: fornecedor e dados necessários à identificação;
- `inspect_food_products`: produto alimentar e identificadores relevantes;
- `inspect_receipts` e `inspect_receipt_items`: recepção, fornecedor, produto, data, quantidade/unidade quando relevante, lote, validade, temperatura quando aplicável, estado de aceitação/rejeição e evidência;
- `inspect_lots`: lote recebido ou lote interno criado por preparação/transformação;
- `inspect_lot_events`: eventos de recepção, abertura, preparação/transformação, utilização, transferência, devolução ou eliminação, com actor, data e referências;
- relações tipadas entre lotes de entrada e lotes resultantes, quando exista transformação.

O objectivo é conseguir identificar a origem e o destino dos lotes relevantes e responder a uma retirada/recolha. Não construir gestão de stock, valorização, compras ou inventário contabilístico. Quantidades só são registadas quando necessárias para a rastreabilidade ou procedimento definido.

### 3.6. Validades e identificação interna

A aplicação deve registar produtos/lotes abertos, preparados ou transformados, com:
- identificação do produto e lote de origem, quando conhecido;
- data/hora de abertura ou preparação;
- prazo/data de utilização definido pelo procedimento aplicável;
- responsável e local de armazenamento;
- estado (válido, vencido, eliminado ou outro estado controlado);
- etiqueta imprimível ou visualização clara para identificação.

A data de utilização não deve ser calculada por uma regra universal do FKT. Deve resultar do procedimento validado para o alimento/processo e ficar identificada como parâmetro do estabelecimento.

### 3.7. Óleos alimentares

O MVP pode incluir registo operacional de utilização, controlo, filtragem, substituição e encaminhamento de óleos alimentares usados, desde que os campos e periodicidades sejam definidos com base nos requisitos aplicáveis e no procedimento do estabelecimento. Não presumir limites, testes ou frequências universais. A integração com sensores ou equipamentos fica fora da primeira versão.

### 3.8. Não conformidades e acções correctivas transversais

A mesma estrutura de tratamento deve receber desvios originados por:
- auditoria;
- controlo/medição operacional;
- higienização;
- recepção;
- rastreabilidade/validades;
- equipamento ou procedimento.

A não conformidade deve manter uma referência tipada ao registo de origem, descrição factual, contenção imediata quando aplicável, responsável, prazo, causa, acção correctiva, evidência de execução e verificação de eficácia. Não usar apenas `source_type + source_id` sem integridade referencial. A arquitectura física deve escolher FKs tipadas ou tabelas de associação específicas.

Uma acção declarada concluída não equivale a eficácia verificada. O histórico é append-only/versionado e as verificações não podem ser apagadas.

### 3.9. Auditorias e relatórios

As auditorias existentes mantêm-se para:
- auditorias internas e de consultoria;
- revisão de implementação e eficácia do plano;
- verificação documental e por amostragem dos registos;
- constatações, evidências, acções e relatório imutável.

Os modelos de auditoria podem referenciar versões do plano HACCP, procedimentos e registos operacionais. Uma auditoria não deve duplicar o registo diário nem substituir o controlo operacional.

Os relatórios devem distinguir claramente:
- registos operacionais;
- constatações de auditoria;
- avaliação profissional;
- parâmetros internos do operador;
- fontes legais/orientações e respectivas versões.

## 4. Fluxo operacional mínimo

1. **Configurar:** organização, estabelecimento, operador, áreas, equipamentos, produtos, fornecedores e responsáveis.
2. **Documentar:** registar/importar o plano HACCP, procedimentos e versão validada.
3. **Programar:** criar controlos, tarefas e frequências segundo o plano do estabelecimento.
4. **Executar:** colaborador regista tarefa/medição com feedback inequívoco de guardado, pendente ou erro.
5. **Tratar desvios:** o desvio abre não conformidade; definir contenção e acção, responsável e prazo.
6. **Rever:** responsável valida pendências e eficácia; manter autoria e histórico.
7. **Rastrear:** consultar fornecedor, recepção, lote, utilização e destino registados.
8. **Demonstrar:** consultar histórico e exportar registos/documentação para revisão ou fiscalização.

## 5. Prioridade do MVP

### Núcleo obrigatório para primeira entrega comercial controlada
- configuração do estabelecimento, áreas, equipamentos e utilizadores;
- plano HACCP e procedimentos versionados, incluindo parâmetros definidos pelo operador;
- controlos operacionais e registos diários, começando por temperaturas;
- plano e registos de higienização;
- recepção de mercadorias e identificação de fornecedor/produto/lote;
- rastreabilidade básica de lotes e registo de abertura/preparação/validade;
- não conformidades e acções correctivas transversais;
- evidências, histórico e exportação de relatórios;
- auditorias e acesso externo devidamente delimitado.

### Entrega seguinte, sem bloquear a arquitectura
- registos específicos de óleos alimentares;
- verificações/calibração e manutenção de equipamentos mais completas;
- etiquetas impressas integradas;
- gestão avançada de produção, transformação e rastreabilidade;
- múltiplos estabelecimentos com visão consolidada;
- integrações com sensores e termómetros Bluetooth;
- modo offline e sincronização.

A decisão sobre óleos deve ser confirmada com o âmbito regulamentar e os procedimentos do tipo de restaurante piloto. Não assumir que todos os restaurantes têm exactamente os mesmos processos.

## 6. Requisitos de segurança e integridade

- Todas as tabelas operacionais são isoladas por organização e, quando aplicável, por estabelecimento.
- RLS deny-by-default e GRANT mínimos; sem acesso `anon`.
- Consultor só acede a registos operacionais através de concessão específica, com âmbito definido e revogação efectiva.
- Colaboradores só executam/revêm tarefas de acordo com as atribuições e permissões do operador.
- Valores medidos e registos submetidos não são silenciosamente reescritos.
- Regras/limites são copiados para o registo como snapshot para preservar o contexto histórico.
- Storage privado, caminhos opacos e autorização verificada em cada leitura.
- Eventos de execução, correcção, validação e acção correctiva preservam actor e instante.
- Testes negativos cobrem organizações, estabelecimentos, utilizadores e consultores distintos.

## 7. Decisões ainda por validar

Antes de fechar o DDL:
1. Validar o modelo operacional com profissional competente em HACCP e com pelo menos um restaurante piloto.
2. Confirmar quais os registos mínimos por tipo de operação, evitando transformar o produto numa lista universal.
3. Definir o que pode ser configurado pelo gerente e o que exige aprovação técnica do plano.
4. Definir a matriz de acesso de gerente, responsável HACCP, colaborador, consultor e auditor.
5. Confirmar se o piloto inclui registo de óleos e quais os procedimentos efectivamente usados.
6. Validar a rastreabilidade mínima necessária sem introduzir gestão de stock completa.

## 8. Referências e limites

O desenho deve ser validado contra a legislação e orientações oficiais aplicáveis, incluindo os Regulamentos (CE) n.º 852/2004 e 178/2002 e, conforme os produtos/actividades, outros diplomas aplicáveis. A DGAV é fonte relevante de orientação. A lista de referências existente em `fkt-food-safety-audit-model.md` é enquadramento inicial, não validação integral do modelo operacional.

Nenhuma frequência, temperatura, prazo de validade, classificação de risco ou regra de aplicabilidade deve ser apresentada como universal sem fundamento e âmbito identificados.


## 9. Decisões de âmbito e desenho fechadas para o MVP — 28/11/2026

Esta secção substitui as pendências e exclusões de âmbito anteriores que contrariem a decisão de HACCP operacional completo.

### Incluído no MVP
- configuração do estabelecimento, áreas, equipamentos e operadores;
- plano HACCP versionado, processos, perigos, medidas, parâmetros e procedimentos;
- controlos diários, tarefas, temperaturas e respectivos registos;
- higienização, tarefas e execuções;
- fornecedores, recepção, produtos, lotes e rastreabilidade mínima;
- abertura/preparação e controlo de validades;
- registo manual básico de óleos alimentares;
- desvios, não conformidades, acções correctivas e verificação;
- auditorias, evidências, relatórios e histórico.

### Fora do MVP
- ERP, POS, compras, facturação, inventário comercial completo;
- sensores, termómetros Bluetooth e integrações automáticas;
- modo offline/sincronização complexa;
- gestão avançada de produção ou balanço de massas;
- multi-estabelecimento consolidado e analytics avançado.

### Decisões técnicas
- Parties locais à organização Inspect; sem identidade global partilhada entre consultoras.
- Tarefas persistidas geradas on-demand por RPC idempotente e cursores com FKs reais; sem Cron obrigatório.
- Quantidade/unidade opcionais em recepção/lotes, mas ambas ou nenhuma.
- NC central com várias origens tipadas; cada origem liga-se a uma NC.
- Perfis internos: gerente, responsável HACCP e colaborador. Consultor/auditor acedem por grants/atribuições explícitos.
- Registos retroactivos permitidos com motivo obrigatório, tempos separados, identificação e evento auditável.
- Óleos incluídos como registo manual simples, sem limites universais predefinidos.

### Limite de responsabilidade técnica
O FKT fornece estrutura, registo, rastreabilidade e evidência. Não certifica conformidade nem substitui o profissional competente. Perigos, limites, frequências, métodos e prazos são específicos do estabelecimento e da versão do plano; não são preenchidos como regras universais pelo software.
