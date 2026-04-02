

## Plano: Dashboard do Processo com Cards de Resumo

Atualmente, ao abrir um processo, o utilizador ve imediatamente os tabs FIRAC. A ideia e criar uma vista "Overview" como tab default, com cards informativos que dao uma visao rapida do processo antes de mergulhar nos detalhes.

### Estrutura da nova tab "Resumo"

Adicionar uma nova tab "Resumo" como default (antes de "Factos"), com o seguinte layout:

**1. Card Descricao** -- Descricao completa do processo (em vez do `line-clamp-2` atual no header)

**2. Card Documentos Recentes** -- Ultimos 3-4 documentos associados, com link rapido para a tab Documentos

**3. Card FIRAC** -- Contadores resumidos (X factos, Y issues, Z rules, W applications, N conclusoes) com botoes de acesso rapido a cada tab

**4. Card Cronologia** -- Ultimos 3-5 factos ordenados por data, mini-timeline visual

**5. Card Cliente** -- Dados do cliente associado (nome, email, telefone) se existir

### Ficheiros alterados

- **`src/pages/processos/ProcessoDetalhe.tsx`** -- Adicionar tab "Resumo" como default, importar novo componente
- **`src/components/processos/ResumoTab.tsx`** (novo) -- Componente com os cards de resumo. Faz queries independentes para contar factos/issues/rules/applications/conclusoes e buscar ultimos documentos e factos

### Detalhes tecnicos

- O componente `ResumoTab` recebe `processoId` e o objeto `processo` como props
- Usa queries paralelas com `Promise.all` para buscar contagens e dados recentes
- Cards usam os componentes `Card/CardHeader/CardContent` existentes
- Layout responsivo: grid de 2 colunas em desktop, 1 coluna em mobile
- Cada card com icone Lucide e acao de click que muda o tab ativo (passado via callback)
- O `defaultValue` dos Tabs passa de `"factos"` para `"resumo"`
- Tab "Resumo" usa state controlado nos Tabs para permitir navegacao dos cards para outros tabs

