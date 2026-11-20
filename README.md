# FKT — Fact Knowledge Tool

Plataforma modular que transforma informação dispersa em decisões claras, justificadas e acompanhadas.

O FKT organiza factos, documentos e referências, ajuda a fundamentar decisões e acompanha as ações até ao fim.

## Como funciona

O FKT tem um **Core** transversal e **módulos** especializados por domínio.

### Core
Capacidades comuns a todos os módulos:
- Organizações e workspaces
- Documentos e evidências
- Fontes e referências
- Histórico e rastreabilidade
- Ações, responsáveis e prazos
- Exportação e auditoria

### Módulos

| Módulo | Estado | Foco principal |
|--------|--------|----------------|
| **FKT Works** | Piloto / Validação comercial | Visitas, ocorrências, evidência, decisão e relatório |
| FKT Lex | Em preparação | Processos, referências e análise estruturada (FIRAC) |
| FKT Vet | Em preparação | Histórico, cuidados e operações em pecuária |
| FKT Dev | Em preparação | Decisões técnicas, incidentes e documentação |

O **FKT Works** é o primeiro módulo selecionado para validação comercial e lançamento controlado.

## Método

Todos os módulos partilham a mesma lógica de trabalho:

1. **Organizar** — reunir o assunto num contexto
2. **Registar** — separar factos e evidência
3. **Referenciar** — ligar a regras, normas ou fontes
4. **Decidir** — registar análise e decisão de forma explícita
5. **Agir** — atribuir ações, responsáveis e prazos

No módulo FKT Lex esta lógica é aplicada através do método **FIRAC** (Factos, Issue, Rules, Application, Conclusion).

## Estado do projeto

MVP funcional em produção.  
Foco comercial atual: **FKT Works** (piloto controlado).

## Stack

- React + TypeScript + Vite
- Tailwind + shadcn/ui
- Supabase (Auth, Database, Storage, RLS)
- Vercel

## Propriedade Intelectual

Todos os direitos reservados. Não é concedida licença open source.

## Configuração de autenticação (Supabase)

Para o login funcionar em ambiente local, copie `.env.example` para `.env.local` e preencha as credenciais.
