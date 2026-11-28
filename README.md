# FKT — Fact Knowledge Tool

Plataforma modular para organizar informação, relacionar evidências, fundamentar decisões e acompanhar ações.

O FKT assenta num **Core comum** e em módulos especializados. Cada módulo tem o seu próprio domínio funcional e os respetivos dados.

## Produto

### Core

A aplicação partilha capacidades transversais, cuja utilização depende do módulo e das permissões:
- autenticação;
- organização num workspace principal por conta;
- gestão de membros e permissões;
- organização de registos e documentos;
- evidências, fontes e referências;
- histórico e rastreabilidade;
- ações, responsáveis e prazos.

### Módulos

| Módulo | Estado indicado no produto | Âmbito |
|---|---|---|
| **FKT Works** | Piloto fechado | Visitas, ocorrências, evidências, ações e relatórios de fiscalização de obras. |
| **FKT Lex** | Em preparação | Processos, documentos, prazos e análise jurídica estruturada, incluindo FIRAC. |
| **FKT Vet** | Em preparação | Animais, registos sanitários, ninhadas, agenda e reservas de alojamento. |
| **FKT Dev** | Em preparação | Projetos, issues e decisões técnicas (ADRs). |
| **FKT Inspect** | Próximo MVP; documentação e desenho em revisão, ainda não implementado | Auditorias, evidências, não conformidades e acções correctivas; domínio inicial de segurança alimentar e higiene na restauração. |

A existência de código, rotas ou FAQ para um módulo não significa que esteja concluído, validado ou disponível para utilização geral. O FKT Works é o módulo escolhido para o primeiro piloto comercial.

### Modelo de utilização

- Cada conta está associada a um workspace principal.
- O workspace tem um único módulo ativo de cada vez.
- O utilizador pode mudar o módulo ativo; a aplicação encaminha-o para o contexto correspondente.
- Os módulos mantêm estruturas e funcionalidades próprias. A mudança de módulo não deve ser interpretada como fusão dos seus dados.

## Método de trabalho

O FKT procura manter uma ligação rastreável entre:
1. contexto;
2. registos e factos;
3. documentos, evidências e referências;
4. análise e decisão;
5. ações, responsáveis e prazos.

O método concreto varia por módulo. O FIRAC é específico do contexto jurídico e não é imposto aos restantes módulos.

## Tecnologias observadas no repositório

- React 18, TypeScript e Vite;
- Tailwind CSS e componentes shadcn/ui;
- Supabase (Auth, PostgreSQL e Storage);
- TanStack Query;
- Vitest e Testing Library;
- Vercel como plataforma de alojamento indicada no repositório.

## Requisitos para desenvolvimento local

- Node.js 22 (versão utilizada pelo workflow de CI);
- npm;
- acesso ao projeto Supabase configurado para a aplicação.

Para executar os testes de base de dados localmente, é também necessário o Supabase CLI e Docker.

## Instalação e execução

1. Clonar o repositório e entrar na pasta do projeto.
2. Instalar as dependências:

   ```bash
   npm ci
   ```

3. Criar o ficheiro local de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env.local
   ```

4. Preencher em `.env.local` as variáveis públicas de ligação ao Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   O cliente Supabase do projeto também contém valores de fallback no código. Para desenvolvimento, configura explicitamente as variáveis locais. Nunca coloques uma chave `service_role` ou outro segredo no frontend.

5. Iniciar o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

O Vite está configurado para usar a porta 8080. Consulta a saída do comando para confirmar o endereço local.

## Comandos disponíveis

Os comandos abaixo correspondem aos scripts actualmente definidos em `package.json`.

| Comando | Finalidade |
|---|---|
| `npm run dev` | Servidor de desenvolvimento Vite |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development |
| `npm run preview` | Servir localmente o build produzido |
| `npm run lint` | Análise ESLint |
| `npm test` | Executar testes Vitest uma vez |
| `npm run test:watch` | Executar Vitest em modo watch |

## Testes de base de dados

O workflow `.github/workflows/database-tests.yml` inicia uma instância Supabase local no runner de CI, reconstrói a base de dados a partir das migrações do repositório, verifica a repetibilidade de algumas migrações e executa os testes pgTAP.

Para reproduzir o ciclo base localmente, com Supabase CLI e Docker instalados:

```bash
supabase start
supabase db reset
supabase test db
supabase stop
```

Estes comandos actuam sobre a instância local. Não substituem a verificação do estado da base de dados remota nem demonstram, por si só, que os fluxos da interface foram testados.

## Estrutura de documentação

- [Visão do produto](docs/Visao.md) — propósito, arquitetura funcional, módulos e princípios.
- [FKT Works — Orçamentação e controlo financeiro](docs/architecture/fkt-works-budgeting.md) — âmbito aprovado e sequência planeada para orçamentos, importação, aprovação, medições e desvios.
- [Modelo funcional e de dados do FKT Lex](docs/architecture/fkt-lex-data-model.md) — proposta e auditoria do domínio jurídico.
- [FKT Inspect — arquitectura funcional](docs/architecture/fkt-inspect-functional-architecture.md) — públicos, fluxo de auditoria, âmbito inicial e limites do produto.
- [FKT Inspect — modelo de dados e segurança](docs/architecture/fkt-inspect-data-model-security.md) — modelo lógico, acesso externo, RLS, Storage e testes obrigatórios.
- [FKT Inspect — matriz de permissões externas](docs/architecture/fkt-inspect-external-access-permissions-matrix.md) — permissões por auditoria, estados, convites e partilha de ficheiros.
- [FKT Inspect — modelo relacional lógico](docs/architecture/fkt-inspect-relational-model.md) — entidades, relações, constraints, RLS, Storage e testes pgTAP propostos.
- [FKT Inspect — contrato físico de dados](docs/architecture/fkt-inspect-physical-data-contract.md) — inventário candidato de tabelas/colunas, tipos, constraints, índices, GRANT, RLS e sequência de migrações; ainda não é DDL aprovado.
- [FKT Inspect — matriz RLS e Storage](docs/architecture/fkt-inspect-rls-policy-matrix.md) — regras propostas por grupo de tabelas, operações, convites e ficheiros.
- [FKT Inspect — decisão de arquitectura multi-cliente](docs/architecture/fkt-inspect-multi-client-architecture-decision.md) — separação entre workspace, clientes e auditorias partilhadas.
- [FKT Food Safety — modelo inicial de auditoria](docs/architecture/fkt-food-safety-audit-model.md) — estrutura inicial para segurança alimentar e higiene na restauração; sujeita a validação técnica.
- [Matriz de permissões do FKT Vet](docs/security/FKT-VET-PERMISSION-MATRIX.md) — políticas e limites de validação documentados para o módulo Vet.
- [Migrações Supabase](supabase/migrations/) — histórico versionado de alterações à base de dados.
- [Manutenção das FAQ](docs/FAQ-MAINTENANCE.md) — processo obrigatório de revisão e publicação da ajuda.
- [Snapshot SQL legado](docs/migration.sql) — apenas referência histórica; **não executar**. A fonte de alterações ao esquema é `supabase/migrations/`.
- [Configuração Supabase](supabase/config.toml) — configuração local do projeto e das Edge Functions.

A documentação específica de cada módulo deve ser lida em conjunto com o código e as migrações correspondentes. Uma matriz ou modelo funcional não substitui testes de permissões e validação funcional.

## Estado e validação

O estado de desenvolvimento deve ser distinguido de disponibilidade, validação funcional e validação comercial. O repositório contém código para os quatro módulos, mas o próprio produto identifica Works como piloto fechado e os restantes como em preparação.

Não se declara aqui que todos os fluxos estejam concluídos, que todos os módulos estejam prontos para produção ou que a validação comercial esteja terminada. Consultar as issues, pull requests, workflows e migrações para o estado técnico actualizado.

## Propriedade intelectual

Todos os direitos reservados. Este repositório não concede uma licença open source.
