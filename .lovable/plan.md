
# FKT — Factual Knowledge Tool

Uma aplicação web profissional de gestão de processos jurídicos/académicos com análise factual estruturada.

---

## 🗂️ Estrutura Geral

**Layout Principal** com sidebar colapsável (fixo em desktop, toggle em mobile) contendo:
- Dashboard
- Processos + Cronologia
- Conhecimento
- Gestão (Clientes, Arquivo, Relatórios)

**Design:** Escala de cinza (preto/branco), mobile-first, shadcn/ui personalizado.

---

## 🔐 Autenticação (Supabase)

- Página de Login com email/password
- Registo de novos utilizadores
- Cada utilizador vê apenas os **seus próprios dados** (RLS policies)
- Logout e sessão persistente

---

## ⚙️ Base de Dados (Supabase)

**Tabelas principais:**
- `processos` (título, tipo, estado, matéria, descrição, cliente_id, user_id)
- `factos` (descrição, data, certeza, observações, processo_id)
- `issues` (descrição, prioridade, estado, processo_id)
- `rules` (referência, texto, vigência, fonte, processo_id)
- `applications` (issue_id, rule_id, argumento, tipo, factos envolvidos)
- `conclusoes` (resultado, confiança, pontos frágeis, issue_id) — única por issue
- `documentos` (título, tipo, data, entidade, localização, processo_id)
- `clientes` (nome, email, telefone, morada, user_id)
- `disciplinas` (nome, descrição, user_id)
- `topicos` (nome, conteúdo, disciplina_id)

**Triggers:** `updated_at` automático + validação de conclusão de processos.

---

## 📋 Páginas & Funcionalidades

### Dashboard `/`
- Cards de resumo: total de processos, issues abertas, factos registados
- Processos recentes com estado
- Acesso rápido a ações frequentes

### Lista de Processos `/processos`
- Tabela/cards com filtros: estado, matéria, cliente, pesquisa
- Contagem de factos e documentos por processo
- Botão "Novo Processo"

### Criar Processo `/processos/novo`
- Formulário: título, tipo (académico/profissional), cliente (se profissional), matéria, descrição

### Detalhe do Processo `/processos/:id`
Página com **6 abas**:

**Factos** — Lista cronológica com formulário de criação. Validação: bloqueia termos conclusivos ("erro", "culpa", "conforme"). Campos: descrição, data, grau de certeza, documento opcional, observações.

**Issues** — Lista de questões. Formulário: descrição, prioridade (alta/média/baixa), estado (aberta/resolvida).

**Rules** — Lista de normas jurídicas. Formulário: referência (ex: "Art. 123º CC"), texto, vigência, fonte.

**Applications** — Ligação Issue ↔ Rule com argumentação. Formulário: selecionar issue, rule, argumento, tipo (pró/contra), factos envolvidos (seleção múltipla). Apresenta cadeia lógica visual.

**Conclusões** — Por issue selecionada: resultado, grau de confiança, pontos frágeis. Uma conclusão por issue (validação de unicidade). Indicador de completude do processo.

**Documentos** — Upload para Supabase Storage (PDF, imagem). Campos: título, tipo, data, entidade de origem, localização, descrição.

### Cronologia `/processos/cronologia`
- Lista todos os factos de todos os processos, ordenados por data
- Filtros: processo, grau de certeza, pesquisa por descrição
- Botão exportar CSV

### Conhecimento `/conhecimento`
- Lista de disciplinas (CRUD: criar, editar, eliminar)

### Detalhe da Disciplina `/conhecimento/disciplinas/:id`
Abas:
- **Tópicos:** CRUD de tópicos com notas, referências, documentos e processos académicos
- **Processos Associados:** Processos académicos ligados com botão para associar

### Gestão `/gestao`
- Hub com cards para Clientes, Arquivo, Relatórios

### Clientes `/gestao/clientes`
- CRUD completo: nome, email, telefone, morada
- Links para processos associados

### Arquivo `/gestao/arquivo`
- Processos com estado "arquivado"
- Botão restaurar (volta para "em_análise")

### Relatórios `/gestao/relatorios`
- Seleção de processo e tipo (Factos, FIRAC Completo, Lacunas)
- Página formatada para impressão via browser
- Disclaimer obrigatório: declaração de não aconselhamento jurídico
- Estrutura FIRAC: Factos cronológicos → Issues → Rules → Applications → Conclusões

---

## 📱 PWA

- `manifest.json` configurado
- Service Worker para cache e atualizações automáticas em novas deploys
- Ícones e metadados de instalação

---

## 🔒 Regras de Negócio

- Processo só pode ser "concluído" quando todas as issues têm conclusão e não há issues abertas
- Factos com termos conclusivos são bloqueados no frontend (lista de palavras proibidas)
- Toda application deve estar ligada a pelo menos um facto
- Uma issue só pode ter uma conclusão (validação de unicidade)

---

## 📁 Estrutura de Ficheiros

```
src/
├── components/
│   ├── layout/ (AppLayout, Sidebar, Header)
│   ├── processos/ (ProcessoCard, FactoForm, IssueForm, etc.)
│   ├── conhecimento/
│   ├── gestao/
│   └── ui/ (shadcn components)
├── pages/
│   ├── Index.tsx (Dashboard)
│   ├── processos/
│   ├── conhecimento/
│   └── gestao/
├── hooks/ (useProcessos, useFacts, useClientes, etc.)
├── types/ (TypeScript interfaces)
└── lib/ (supabase client, utils)
```

**Implementação em Supabase externo** — serão geradas as migrações SQL completas com tabelas, RLS policies, triggers e storage bucket para documentos.
