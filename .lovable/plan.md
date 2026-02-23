

# Plano: Perfil do Utilizador com Sincronizacao de Servicos

## Resumo

Adicionar um cartao "Perfil" ao hub de Gestao e criar uma nova pagina `/gestao/perfil` onde o utilizador pode ver os seus dados e ligar/desligar servicos externos (Google Drive, OneDrive, Gmail, Google Calendar, GitHub).

## O que vai mudar

### 1. Novo cartao no hub de Gestao
- Adicionar um quarto cartao "Perfil" com icone de utilizador na pagina Gestao.tsx
- O grid passa de 3 para 4 colunas em desktop (`sm:grid-cols-4`)

### 2. Nova pagina de Perfil (`src/pages/gestao/Perfil.tsx`)

A pagina tera duas seccoes:

**Dados do utilizador** (lidos do Supabase Auth):
- Email
- Data de criacao da conta
- Botao de logout

**Servicos externos** - cards para cada servico com estado (conectado/desconectado) e botao de acao:
- Google Drive
- OneDrive
- Gmail / Email
- Google Calendar
- GitHub

Cada card mostra o nome do servico, um icone, o estado atual (guardado numa tabela `user_services`) e um botao para conectar ou desconectar.

### 3. Tabela `user_services` (migracao SQL)

```text
user_services
  id          uuid PK default gen_random_uuid()
  user_id     uuid NOT NULL
  service     text NOT NULL  (google_drive, onedrive, gmail, google_calendar, github)
  connected   boolean default false
  metadata    jsonb default '{}'
  connected_at timestamptz
  created_at  timestamptz default now()
  updated_at  timestamptz default now()
  UNIQUE(user_id, service)
```

RLS: `user_id = auth.uid()` para ALL.

Nota: nesta fase, os botoes de "Conectar" vao marcar o servico como conectado na base de dados (placeholder). A integracao OAuth real com cada servico sera implementada numa fase posterior -- a estrutura fica preparada para isso.

### 4. Nova rota em App.tsx

Adicionar `import Perfil` e rota `/gestao/perfil` protegida.

## Detalhes tecnicos

**Ficheiros a criar:**
- `src/pages/gestao/Perfil.tsx` -- pagina com useAuth() para dados do utilizador + queries a `user_services`

**Ficheiros a modificar:**
- `src/pages/gestao/Gestao.tsx` -- adicionar cartao Perfil
- `src/App.tsx` -- adicionar rota `/gestao/perfil`

**Migracao SQL:**
- Criar tabela `user_services` com RLS policy `own` (user_id = auth.uid())
- Trigger `updated_at`

