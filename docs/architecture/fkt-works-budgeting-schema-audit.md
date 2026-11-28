# Auditoria do modelo actual — FKT Works Orçamentação

Data da auditoria: 28-11-2026
Âmbito: esquema da única base de dados FKT, migrações em `main`, relações e políticas de acesso relevantes para a issue #135.
Projecto Supabase confirmado: `gllrqrqonwuacjxbtgnp` (região eu-west-1; PostgreSQL 17.6).
**Não foram efectuadas alterações à base de dados.**

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
- Operações críticas atómicas: criação de orçamento e linhas, importação confirmada, aprovação e criação de revisão.
- Orçamento aprovado não pode ser editado directamente; nova revisão cria novo registo relacionado.
- Não confiar em valores de autor, workspace ou estado enviados pelo cliente.
- Verificar permissões de Storage e usar bucket privado existente.

## 5. Pontos a resolver antes de fechar o desenho

1. **Perspectiva comercial:** o orçamento é elaborado pelo empreiteiro, recebido de terceiro, ou ambos? A origem do ficheiro não determina o papel do utilizador.
2. **IVA e preços:** armazenar preços com IVA incluído/excluído e taxa por linha ou por orçamento? Não fixar uma regra fiscal sem requisito validado.
3. **Unidades e quantidades:** permitir linhas sem quantidade/preço (p.ex. verba global), ou exigir valores numéricos?
4. **Aprovação:** registar aprovação externa declarada no FKT; não é assinatura electrónica nem certificação.
5. **Imutabilidade:** decidir se a aprovação congela cabeçalho e linhas integralmente e como se corrigem erros.
6. **Permissões:** papéis actuais são genéricos. Não acrescentar já novos papéis “empreiteiro/fiscal” à tabela de membros; primeiro definir se são perfis de utilização do workspace, da obra ou apenas modos de interface.

## 6. Resultado

A base técnica existente oferece bons blocos reutilizáveis: workspaces/RLS, arquivo documental versionado e histórico de obra. A nova funcionalidade deve acrescentar um domínio orçamental próprio, sem duplicar esses mecanismos.

A auditoria não autoriza ainda uma migração de esquema: primeiro fechar as regras de IVA/valores, linhas de verba global, papel do proponente e imutabilidade da aprovação.