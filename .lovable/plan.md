

# Plano: Corrigir Countdown Widgets e tornar acessiveis em qualquer pagina

## Problemas identificados

1. **Tabela `countdown_events` nao existe na base de dados** -- os pedidos de rede retornam 404 com "Could not find the table 'public.countdown_events' in the schema cache".
2. **Erro de build no TypeScript** -- o tipo `Json` do Supabase nao e compativel com `CountdownSettings`. E preciso fazer cast via `unknown`.
3. **Os countdowns so aparecem no dashboard** -- o utilizador quer poder criar/ver countdowns a partir de qualquer pagina.

## O que vai ser feito

### 1. Criar a tabela `countdown_events` (migracao SQL)

```text
countdown_events
  id           uuid PK default gen_random_uuid()
  user_id      uuid NOT NULL
  title        text NOT NULL
  target_date  timestamptz NOT NULL
  settings     jsonb NOT NULL default '{}'
  created_at   timestamptz default now()
  updated_at   timestamptz default now()
```

RLS: `user_id = auth.uid()` para ALL. Trigger `updated_at`.

### 2. Corrigir o erro de tipos no CountdownWidgetsBoard.tsx

Na linha 48, alterar o cast de `data as CountdownEvent[]` para converter primeiro para `unknown`:
```
setEvents((data as unknown as CountdownEvent[]) ?? []);
```

### 3. Criar componente flutuante global para countdowns

Criar um componente `CountdownFab` (floating action button) que:
- Aparece em todas as paginas (colocado no `AppLayout`)
- Permite abrir um painel/popover com a lista de countdowns existentes
- Permite criar um novo countdown directamente a partir de qualquer pagina
- Reutiliza a logica ja existente do `CountdownWidgetsBoard`

### 4. Actualizar tipos Supabase

Adicionar a tabela `countdown_events` ao ficheiro `src/integrations/supabase/types.ts`.

## Ficheiros a criar
- `src/components/dashboard/CountdownFab.tsx` -- botao flutuante com popover de countdowns

## Ficheiros a modificar
- `src/components/dashboard/CountdownWidgetsBoard.tsx` -- corrigir cast de tipos (linha 48)
- `src/components/layout/AppLayout.tsx` -- adicionar `CountdownFab` ao layout global
- `src/integrations/supabase/types.ts` -- adicionar tipo `countdown_events`

## Migracao SQL
- Criar tabela `countdown_events` com RLS e trigger `updated_at`

