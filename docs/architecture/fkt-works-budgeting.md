# FKT Works — Orçamentação e controlo financeiro da obra

## Estado

**Planeado; ainda não disponível como funcionalidade de produção.** Este documento fixa o âmbito aprovado para orientar issues, desenho técnico e validação. Não constitui prova de implementação.

## Objectivo

Alargar o FKT Works para apoiar empreiteiros e fiscais de obra no ciclo entre orçamento, adjudicação, execução, medição e análise de desvios, sem transformar o produto num ERP ou sistema de contabilidade/facturação.

O modelo deve servir dois perfis com perspectivas distintas:
- **Empreiteiro:** preparar propostas, calcular custos e preços, rever orçamentos e acompanhar a execução económica dos trabalhos.
- **Fiscal de obra:** consultar o orçamento de referência, verificar quantidades e preços, registar medições, acompanhar trabalhos adicionais/a menos e documentar desvios.

A estrutura de dados deve ser comum sempre que possível; permissões, linguagem e acções disponíveis dependem do papel e do contexto.

## Decisões funcionais aprovadas

1. O módulo suporta empreiteiros e fiscais de obra.
2. Suporta orçamentação simples e detalhada.
3. Permite criar orçamentos de raiz.
4. Permite importar orçamentos existentes em Excel e PDF.
5. A importação exige pré-visualização e validação humana antes de criar registos definitivos.
6. Uma obra pode ter vários orçamentos: inicial, revisão, alternativo, trabalhos adicionais e trabalhos a menos.
7. Os orçamentos têm estados e histórico.
8. Uma aprovação é registada explicitamente, com entidade/pessoa, data e comprovativo quando disponível.
9. Um orçamento aprovado não é sobrescrito; alterações posteriores originam nova versão.
10. A execução e as medições devem poder ser comparadas com o orçamento/adjudicação.

## Estrutura do orçamento

### Cabeçalho
- Identificador e título;
- obra associada;
- tipo de orçamento;
- autor e entidade proponente;
- data de criação e validade, quando aplicável;
- origem: criado no FKT ou importado;
- estado;
- ligação à versão/orçamento de origem;
- documento original e anexos relevantes.

### Linhas simples
- descrição do trabalho;
- quantidade;
- unidade;
- preço unitário;
- subtotal;
- ordenação e rubrica/categoria opcional.

### Decomposição detalhada opcional
Uma linha pode ser decomposta em:
- materiais;
- mão-de-obra;
- equipamentos;
- outros custos.

A decomposição não deve ser obrigatória. Um utilizador deve conseguir preparar um orçamento simples sem preencher estruturas de custo analítico.

## Importação

### Excel
A importação deve permitir seleccionar folha, pré-visualizar linhas e mapear colunas para os campos reconhecidos. A estrutura real dos ficheiros varia, pelo que não se deve pressupor um modelo universal.

### PDF
A primeira abordagem deve privilegiar PDFs com texto seleccionável e tabelas legíveis. PDFs digitalizados podem exigir OCR e tratamento adicional; não prometer extracção fiável sem avaliação específica.

### Validação humana
Antes de confirmar:
- mostrar linhas reconhecidas e não reconhecidas;
- permitir corrigir descrições, quantidades, unidades e preços;
- sinalizar valores ausentes e divergências de cálculo;
- comparar subtotais/totais extraídos com os valores recalculados;
- permitir ignorar linhas irrelevantes;
- exigir confirmação explícita.

O ficheiro original e os metadados da importação devem permanecer associados ao orçamento, respeitando permissões e política de retenção.

## Estados, aprovação e versões

Estados previstos:
- Rascunho;
- Submetido;
- Aprovado;
- Rejeitado;
- Substituído.

A aprovação é um registo de uma decisão comunicada pelo utilizador. O FKT não certifica a validade jurídica da aprovação, não substitui assinaturas externas e não presume aprovação pela simples importação ou carregamento de um documento.

O histórico deve preservar:
- versões e relações entre versões;
- autor e data;
- transições de estado;
- entidade/pessoa que aprovou;
- observações e comprovativos.

## Medições e controlo de execução

O ciclo funcional previsto é:

**Orçamento → Adjudicação → Execução → Medição → Alterações → Desvios → Relatório**

Devem distinguir-se:
- valor orçamentado;
- valor adjudicado/contratado;
- quantidade medida;
- quantidade executada/reportada;
- trabalhos adicionais e trabalhos a menos;
- impacto financeiro aprovado e por aprovar.

Medição física, execução reportada, facturação e pagamento não são conceitos equivalentes. O FKT Works não deve apresentar medições como facturas, certificações legais ou pagamentos.

As medições e alterações devem ligar-se à obra e, quando aplicável, a visitas, ocorrências, acções, fotografias e documentos.

## Experiência de utilização

- **Escritório:** criação, importação, revisão, decomposição detalhada e exportação.
- **Terreno:** consulta rápida do orçamento de referência, registo de medições e evidências, identificação de trabalhos não previstos.
- Começar simples; detalhe progressivo e opcional.
- Minimizar passos e campos obrigatórios.
- Interfaces adaptadas a telemóvel e computador.
- Não bloquear o registo de uma medição por falta de informação que possa ser completada no escritório.

## Fora de âmbito inicial

- Contabilidade geral;
- facturação e emissão de documentos fiscais;
- processamento de pagamentos;
- gestão integral de compras e fornecedores;
- motor universal de preços de mercado;
- planeamento CPM ou ERP de gestão integral da empreitada;
- OCR universal de qualquer PDF.

## Sequência de implementação

1. Modelo de dados, isolamento por workspace, RLS e histórico.
2. Criação e edição de orçamentos simples/detalhados.
3. Importação Excel e PDF com pré-visualização e validação.
4. Aprovação, estados e versionamento imutável.
5. Medições, trabalhos adicionais/a menos e desvios.
6. Exportação e relatórios integrados com o dossier da obra.
7. Testes de aceitação com empreiteiro e fiscal, em telemóvel e computador.

## Critérios transversais de qualidade

- Nenhum dado importado é aceite silenciosamente.
- Nenhum orçamento aprovado é alterado sem nova versão.
- Isolamento entre workspaces garantido no servidor e Storage.
- Cálculos determinísticos e cobertos por testes.
- Histórico e autoria verificáveis.
- O perfil fiscal não é obrigado a usar funcionalidades comerciais de formação de preço.
- O perfil empreiteiro pode usar decomposição detalhada sem impor essa complexidade ao fiscal.
- A funcionalidade não deve ser anunciada publicamente como disponível antes de concluída e validada.
