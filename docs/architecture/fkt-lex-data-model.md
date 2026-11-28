# FKT Lex — modelo funcional e de dados

## 1. Objectivo

O FKT Lex deve ser um sistema de organização e rastreabilidade de processos jurídicos. Não deve apresentar conclusões automáticas como aconselhamento jurídico nem substituir a validação do profissional responsável.

A unidade central é o **processo**. Os factos, questões jurídicas, fontes, raciocínios e conclusões devem ser entidades relacionadas, não cinco campos de texto independentes no registo do processo.

## 2. Estrutura funcional

### Processo
Identificação e enquadramento administrativo:
- referência interna e número oficial;
- título, tipo de processo, jurisdição e tribunal/entidade;
- estado, datas relevantes e responsável;
- cliente (opcional) e notas de gestão.

### Partes e intervenientes
Pessoas singulares, pessoas colectivas e entidades processuais, com papel no processo, identificação estritamente necessária, mandatário e contactos. A mesma pessoa pode intervir em processos diferentes; a reutilização transversal deve respeitar as permissões e a privacidade do workspace.

### Factos
Cada facto deve ter:
- descrição factual, sem misturar inferências;
- estado de validação (por confirmar, confirmado, contestado ou não provado);
- data/período e autor do registo;
- origem e ligação a um ou mais documentos/evidências;
- notas sobre lacunas ou divergências.

Um facto não deve ser marcado como confirmado apenas por ter sido introduzido no sistema.

### Questões jurídicas (Issues)
Cada questão deve ser formulada como problema jurídico autónomo, com matéria, pergunta, estado e ligação aos factos relevantes. Um processo pode ter várias questões.

### Regras e fontes
Fontes normativas, jurisprudenciais, doutrinais ou outras, com tipo, jurisdição, entidade, referência/citação, artigo ou segmento, versão/data relevante, URL de origem e documento arquivado associado quando exista. A fonte e a sua aplicabilidade temporal devem poder ser verificadas.

### Aplicação / raciocínio
Registo do raciocínio por questão, ligando explicitamente:
- factos considerados;
- regras/fontes aplicáveis;
- aplicação das regras aos factos;
- argumentos favoráveis e contrários;
- lacunas, pressupostos e pontos por confirmar.

Não usar pontuações automáticas de probabilidade ou risco jurídico sem metodologia validada.

### Conclusões
Conclusão por questão e, quando necessário, síntese do processo. Deve guardar autor, data, estado (rascunho/revista/final) e ligações às fontes e ao raciocínio que a sustentam. Uma conclusão final não deve apagar versões anteriores.

### Documentos e evidência
Metadados, categoria, data, versão, origem, ligação ao processo e relações com factos/questões. Os ficheiros devem ficar num bucket privado. A base de dados guarda o caminho de armazenamento, nunca uma URL pública; a consulta usa URLs assinados de curta duração. O acesso deve ser validado por RLS e permissões do workspace.

### Prazos e actos processuais
Prazos com descrição, data-limite, origem (acto/notificação/regra), data de início da contagem, responsável, antecedência de alerta e estado. O sistema deve distinguir prazo registado pelo utilizador de prazo calculado automaticamente; qualquer cálculo deve indicar a regra e permitir revisão.

### Histórico e tarefas
Histórico cronológico de alterações relevantes e tarefas seguintes, com responsável, prazo, estado e ligação ao processo/questão. As alterações importantes devem ser auditáveis.

## 3. Relações propostas

- Workspace 1:N Processos
- Processo 1:N Partes, Factos, Questões, Documentos, Prazos, Actos e Tarefas
- Factos N:M Documentos/Evidências
- Questões N:M Factos
- Questões N:M Regras/Fontes
- Aplicações ligam uma Questão a Factos e Regras/Fontes
- Conclusões pertencem a uma Questão ou ao Processo e mantêm histórico/versionamento

## 4. FIRAC no FKT Lex

O FIRAC deve ser uma forma de leitura e trabalho sobre entidades estruturadas, não um formulário único:
- **F — Facts:** factos registados, com estado e evidência;
- **I — Issue:** uma ou várias questões jurídicas;
- **R — Rule:** normas, jurisprudência e fontes identificadas;
- **A — Application:** aplicação fundamentada das regras aos factos, incluindo argumentos contrários;
- **C — Conclusion:** conclusão revista, com autor e data.

## 5. Permissões e privacidade

- Todas as tabelas funcionais devem conter `workspace_id` e aplicar políticas coerentes com `workspace_can_read` e `workspace_can_write`.
- Leitura para membros autorizados; escrita conforme função (owner/admin/editor) e leitura limitada para viewer.
- O utilizador deve resolver o workspace principal através do mesmo mecanismo comum usado pela plataforma; não consultar apenas `workspaces.user_id`, porque isso exclui membros convidados.
- Documentos e dados de processos são privados. Não usar URLs públicas de Storage.
- Evitar recolher NIF, contactos e outros dados pessoais sem necessidade funcional.

## 6. Estado e limites da documentação

A descrição de arquitectura acima é o modelo funcional pretendido; não deve ser interpretada como prova de que todas as entidades ou operações estejam implementadas.

A auditoria de 20-11-2026 registou que:
- Existiam as tabelas `juridico_processos`, `juridico_partes`, `juridico_documentos` e `juridico_prazos`.
- `juridico_processos` concentrava contexto, questão, referências, análise e conclusão em campos de texto.
- Não foram então encontradas tabelas específicas para factos, questões individuais, fontes/regras, aplicação do raciocínio, actos processuais ou histórico jurídico.
- As quatro tabelas jurídicas consultadas estavam sem registos.
- O bucket `documentos` estava marcado como privado, embora o código de upload então auditado usasse `getPublicUrl`, incompatível com essa configuração.
- O detalhe do processo continha controlos de interface sem operações funcionais para adicionar partes, carregar documentos e criar prazos.

Estes pontos são um registo histórico da auditoria de 20-11-2026, não uma afirmação sobre o estado actual. Devem ser reconciliados com as migrações, o código e a BD antes de qualquer decisão técnica. A documentação funcional e as FAQ também não substituem testes na aplicação.

### Estado de validação conhecido em 28-11-2026

- O repositório documenta os separadores Resumo, Factos, Questões, Fontes, Aplicação, Conclusões, Partes, Documentos e Prazos.
- As FAQ de produto incluem percursos para criar processos, navegar no detalhe, estruturar a análise FIRAC e gerar o relatório PDF. A presença dessas instruções não comprova que todos os fluxos tenham passado testes end-to-end.
- A versão de conclusões e o histórico jurídico devem ser considerados não validados até existir confirmação explícita do esquema, das políticas RLS, dos testes e do comportamento da interface.
- Não declarar o FKT Lex pronto para processos reais enquanto não forem testados isolamento entre workspaces, permissões por função, upload e leitura segura de documentos, PDF e fluxos completos de análise/conclusão.

### Navegação e identidade visual

- O ícone `Scale` (balança) identifica a navegação do FKT Lex e só deve ser apresentado quando o módulo activo é `juridico`.
- Não deve aparecer no login, no dashboard geral, no selector de módulos ou em componentes comuns fora do contexto Lex.
- O ícone genérico do Core e os ícones dos restantes módulos mantêm-se independentes.

## 7. Sequência de implementação

1. Corrigir resolução do workspace e acesso seguro a documentos.
2. Fechar o esquema relacional e migrações, com RLS, índices e integridade referencial.
3. Implementar CRUD de partes, factos, questões, fontes, documentos e prazos.
4. Implementar FIRAC por questão, com ligações verificáveis.
5. Implementar histórico, tarefas, alertas e relatórios.
6. Testar permissões com owner, admin, editor e viewer; testar isolamento entre workspaces.
7. Só depois considerar o módulo pronto para uso com processos reais.

## 8. Decisões ainda necessárias

- Se o Lex será orientado a escritórios/advogados, departamentos jurídicos internos, estudantes ou uma combinação.
- Quais os tipos de processo e jurisdições a suportar na primeira versão.
- Se o cliente/contacto deve ser uma entidade reutilizável do workspace ou permanecer isolado por processo.
- Quais os cálculos de prazos que podem ser automatizados, com que fontes e validação.
