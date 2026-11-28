# Auditoria do modelo actual — FKT Works Orçamentação

Data da auditoria: 28-11-2026
Âmbito: esquema da única base de dados FKT, migrações em `main`, relações e políticas de acesso relevantes para a issue #135.
Projecto Supabase confirmado: `gllrqrqonwuacjxbtgnp` (região eu-west-1; PostgreSQL 17.6).
**Não foram efectuadas alterações à base de dados.**

## Decisões funcionais fechadas em 28-11-2026

1. **IVA:** suportar preços com IVA incluído e sem IVA. A taxa pode ser definida por orçamento como predefinição e substituída em cada linha quando necessário. O modelo guarda de forma explícita a base tributável, taxa, valor de IVA e total com IVA. Não fixar taxas legais no código; as taxas disponíveis e a sua vigência têm de ser configuráveis/validadas. A regra de arredondamento por linha/documento será especificada e testada antes da migração.
2. **Verbas globais:** permitir linhas de valor global sem quantidade nem preço unitário. O tipo de linha deve distinguir verba global de quantidade × preço unitário.
3. **Custos internos:** decomposição de custos internos (materiais, mão-de-obra, equipamentos e outros) é opcional. Deve poder coexistir com um preço proposto ao cliente, sem obrigar a expor custos internos ao destinatário/fiscal.
4. **Edição após aprovação:** orçamento aprovado continua editável por utilizadores autorizados, mas cada edição deve gerar um registo de auditoria detalhado e recuperável, com actor, data, campos alterados e valores anterior/novo. Não pode haver alteração silenciosa. O histórico de aprovação mantém-se identificável; alterações posteriores devem assinalar que o conteúdo aprovado foi modificado e exigir nova confirmação/aprovação quando aplicável. A regra exacta de reaprovação fica por definir no fluxo.
5. **Perfis profissionais:** suportar os perfis Empreiteiro e Fiscal, separados dos papéis de segurança. Mantêm-se os papéis técnicos existentes (owner/admin/editor/viewer); o perfil profissional determina perspectiva e interface, não concede permissões por si só.

Estas decisões substituem os pontos correspondentes da secção 5 abaixo.

## 1. Estruturas existentes que podem ser reutilizadas

### Obra e workspace
- `public.obras` já tem `id` e `workspace_id`, com unicidade composta `(id, workspace_id)`.
- As tabelas Works associam registos à obra e ao workspace.
- `public.workspaces` e `public.workspace_members` implementam propriedade e membros.
- Papéis existentes: `owner`, `admin`, `editor`, `viewer`.
- As funções canónicas de autorização são `private.obras_can_read(workspace_id)` e `private.obras_can_write(workspace_id)`, que delegam no modelo de permissões de workspace.

### Arquivo documental
- `public.obras_documentos`: metadados do documento associados a `workspace_id` e `obra_id`.
- `public.obras_documento_versoes`: versões de ficheiro com número, caminho Storage, nome, MIME type, tamanho, notas, autor e data.
- Existe RPC `create_obras_documento_versao` para criar atomicamente uma versão.
- O bucket privado `obras-documentos` permite PDF, Excel (.xls e .xlsx), Word, PowerPoint, texto e imagens; limite configurado de 25 MiB.
- O arquivo tem RLS por workspace e a versão do ficheiro é separada dos metadados do documento.

**Consequência:** não criar um segundo sistema de anexos para orçamentos. O ficheiro original importado e os comprovativos podem ser documentos do dossier da obra, com classificação adequada, se a auditoria de categorias e fluxo confirmar esse encaixe.

### Histórico
- `public.obras_historico_eventos` guarda entidade, identificador, entidade-pai, operação, actor, data e snapshots JSONB anterior/novo.
- A função `private.registar_obras_historico()` já suporta registos com `workspace_id`, `id` e `obra_id`, associando-os à obra.
- A política de leitura é por workspace; o histórico é concebido como registo de auditoria.

**Consequência:** avaliar a ligação de orçamentos a este histórico, mas manter eventos de aprovação explícitos e semanticamente tipados se forem necessários para provar quem declarou a aprovação, por quem, quando e com que comprovativo.

## 2. O que não existe

Na lista actual de tabelas e migrações da base de dados não foi encontrada estrutura de orçamentos, linhas de orçamento, decomposição de custos, medições ou aprovações financeiras.

Não reutilizar `obras_actividades` como linhas de orçamento: actividade planeada e artigo orçamental têm semânticas, unidades e ciclos de vida diferentes.

## 3. Recomendações para o modelo de dados

A proposta a desenhar na issue #135 é composta por entidades próprias, sempre com `workspace_id` e `obra_id`:

1. **Orçamentos** — cabeçalho, tipo, origem, entidade proponente, moeda, estado, datas, relação com versão/orçamento anterior e totais.
2. **Linhas** — descrição, referência opcional, quantidade, unidade, preço unitário, ordem e rubrica; integridade composta com orçamento/obra/workspace.
3. **Componentes de custo** — decomposição opcional de cada linha em materiais, mão-de-obra, equipamentos e outros custos.
4. **Eventos de estado/aprovação** — registo append-only da submissão, decisão, entidade/pessoa, data, observações e documento comprovativo.
5. **Medições** — entidade própria posterior, ligada a uma linha orçamental e à obra; não misturar com linhas de orçamento.
6. **Importação** — metadados de origem e mapeamento/resultado da validação; o binário permanece no arquivo documental existente.

Não duplicar totais sem definir claramente quais são valores calculados e quais são snapshots de versões aprovadas. Definir regras de IVA, encargos, arredondamento e moeda antes da migração.

## 4. Segurança e consistência obrigatórias

- RLS em todas as novas tabelas.
- Políticas com as funções de autorização Works existentes; não criar um modelo paralelo de permissões.
- Chaves estrangeiras compostas que impeçam misturar orçamento, obra e workspace.
- Índices para FKs e consultas por obra/estado/data, justificados pelos padrões de acesso.
- Operações críticas atómicas: criação de orçamento e linhas, importação confirmada, aprovação e gravação de alterações.
- Orçamento aprovado pode ser editado por utilizador autorizado, mas cada edição tem de criar evento de auditoria detalhado e recuperável; nunca actualizar silenciosamente.
- A edição após aprovação deve marcar o orçamento como alterado após aprovação e permitir identificar se aguarda nova confirmação/aprovação.
- Não confiar em valores de autor, workspace ou estado enviados pelo cliente.
- Verificar permissões de Storage e usar bucket privado existente.

## 5. Pontos a resolver antes de fechar o desenho

1. **Perspectiva comercial:** o orçamento é elaborado pelo empreiteiro, recebido de terceiro, ou ambos? A origem do ficheiro não determina o papel do utilizador.
2. **Cálculos:** regras de precisão, arredondamento, descontos por linha e encargos explícitos definidas na secção 7.
3. **Aprovação:** registar aprovação externa declarada no FKT; não é assinatura electrónica nem certificação.
4. **Reaprovação:** definir quando uma edição posterior à aprovação exige nova aprovação e como se notifica a contraparte.
5. **Perfis profissionais:** definir se Empreiteiro/Fiscal é escolhido por workspace ou por obra, sem confundir perfil profissional com papel de segurança.
6. **Âmbito dos perfis:** decidir se Empreiteiro/Fiscal é escolhido por workspace ou por obra. Retenções/cauções/penalizações e descontos globais ficam fora do MVP.

## 6. Resultado

A base técnica existente oferece bons blocos reutilizáveis: workspaces/RLS, arquivo documental versionado e histórico de obra. A nova funcionalidade deve acrescentar um domínio orçamental próprio, sem duplicar esses mecanismos.

A auditoria identificou os blocos reutilizáveis e as cinco decisões funcionais acima estão agora fechadas. As regras-base de cálculo estão especificadas na secção 7. Antes da migração, ainda falta fechar o âmbito dos perfis profissionais e o fluxo de reaprovação após edição de orçamento aprovado.

## 7. Regras de cálculo — decisão funcional de 28-11-2026

Estas regras definem o comportamento do produto. Não constituem aconselhamento fiscal nem substituem validação contabilística/fiscal antes da entrada em produção.

### Precisão e arredondamento

- Quantidades: precisão até 4 casas decimais.
- Preços unitários: precisão até 4 casas decimais.
- Percentagens de desconto e taxas: guardar com precisão suficiente (pelo menos 4 casas decimais).
- Valores monetários apresentados e persistidos: 2 casas decimais.
- Usar tipos decimais exactos na base de dados e na lógica de cálculo; nunca usar ponto flutuante binário para valores monetários.
- Calcular cada linha com precisão intermédia, arredondar a base tributável da linha a 2 casas decimais e calcular o IVA dessa linha sobre essa base arredondada.
- Arredondamento monetário: ao cêntimo mais próximo; em empate exacto, afastar de zero (half-up).
- O total do documento é a soma dos valores já arredondados por linha. Não recalcular o IVA global sobre a soma das bases, pois isso pode produzir diferenças de cêntimos.
- Apresentar discriminação por taxa de IVA, com base tributável, IVA e total.

### Preços com IVA incluído ou excluído

- Cada orçamento define o modo de introdução/apresentação por predefinição: com IVA ou sem IVA.
- Cada linha pode herdar o modo e a taxa do orçamento ou substituí-los explicitamente.
- O modelo guarda sempre base tributável, taxa, IVA e total com IVA.
- Quando o preço introduzido inclui IVA, o sistema calcula a base tributável por divisão pela taxa aplicável e determina o IVA como diferença entre total bruto e base arredondada, preservando o total introduzido ao cêntimo.
- Quando o preço é introduzido sem IVA, calcula o IVA sobre a base tributável arredondada e soma-o para obter o total.
- Não codificar taxas fiscais fixas. A taxa aplicável tem de ser seleccionada de uma configuração controlada e datada; a importação nunca deve inferir uma taxa em falta sem confirmação do utilizador.

### Descontos

- MVP: permitir desconto por linha, em percentagem ou valor fixo.
- Um desconto é aplicado antes do cálculo do IVA.
- Não permitir aplicar simultaneamente desconto percentual e fixo à mesma linha; o utilizador escolhe um método.
- Validar que o desconto não excede o valor da linha.
- Não incluir desconto global ao documento no primeiro MVP: a sua distribuição por linhas com taxas diferentes exige regras explícitas de imputação e reconciliação.
- Descontos globais ficam para evolução posterior, com distribuição proporcional por base tributável e preservação dos grupos de taxa, sujeita a testes.

### Encargos e custos adicionais

- No MVP, representar custos adicionais cobrados ao cliente como linhas explícitas do orçamento, com descrição, valor e taxa de IVA própria/herdada.
- Não aplicar sobretaxas globais ocultas.
- Retenções, cauções, garantias, penalizações e encargos contratuais não são descontos nem linhas genéricas de preço; ficam fora do cálculo-base do MVP até haver requisitos específicos.
- Custos internos de materiais, mão-de-obra, equipamentos e outros permanecem separados do preço proposto ao cliente.

### Exemplos mínimos de teste

1. Linha de 100,00 € sem IVA a 23%: base 100,00 €, IVA 23,00 €, total 123,00 €.
2. Linha de 100,00 € com IVA incluído a 23%: total 100,00 €, base calculada 81,30 €, IVA 18,70 €.
3. Linha de 3 × 10,1234 € sem IVA: cálculo intermédio 30,3702 €, base arredondada 30,37 € antes do IVA.
4. Duas linhas com taxas distintas: apurar IVA por linha e apresentar subtotais separados por taxa.
5. Desconto fixo ou percentual reduz a base tributável antes do IVA.
6. Verba global sem quantidade nem preço unitário calcula imposto como uma linha normal.
7. Preço negativo/desconto superior ao valor da linha deve ser rejeitado ou tratado por um tipo de linha de crédito explicitamente definido, nunca silenciosamente.
8. Somatório do documento deve corresponder exactamente à soma dos totais de linha, incluindo diferenças de arredondamento.

### Limitações deliberadas do MVP

- Sem desconto global no documento.
- Sem retenções/cauções/penalizações.
- Sem motor de aconselhamento fiscal ou determinação automática de taxas.
- Sem cálculo de pagamentos, facturação ou certificação de medições.
