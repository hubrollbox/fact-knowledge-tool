

## Plano: Credenciais OAuth por utilizador

### Problema actual
As credenciais Google (Client ID e Client Secret) estão hardcoded como segredos do Supabase, partilhadas por todos os utilizadores. O utilizador quer que cada pessoa possa usar as suas próprias credenciais OAuth.

### Alterações

**1. Base de dados — nova tabela `user_oauth_credentials`**

```sql
CREATE TABLE public.user_oauth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL, -- 'google'
  client_id text NOT NULL,
  client_secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.user_oauth_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own" ON public.user_oauth_credentials FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**2. UI na página Perfil**
- Adicionar uma secção "Credenciais Google OAuth" acima dos serviços, com campos Client ID e Client Secret.
- Botão "Guardar" que faz upsert na tabela `user_oauth_credentials`.
- Enquanto as credenciais não estiverem guardadas, os botões "Conectar" dos serviços Google ficam desativados com tooltip explicativo.

**3. Edge Function `oauth-google`**
- Em vez de ler `GOOGLE_CLIENT_ID` do env, ler da tabela `user_oauth_credentials` para o `userId` autenticado (usando service role).
- Se não existirem credenciais, retornar erro 400 com mensagem clara.

**4. Edge Function `oauth-callback`**
- Ler `client_id` e `client_secret` da tabela `user_oauth_credentials` para o `userId` do state, em vez dos env vars.
- Manter o fallback para env vars caso se queira suportar ambos os modos.

### Segurança
- RLS garante que cada utilizador só vê/edita as suas credenciais.
- O `client_secret` é armazenado em texto na BD (acessível apenas via RLS + service role nas edge functions). Para maior segurança futura, pode ser cifrado via Vault.

### Ficheiros a alterar
- `docs/migration.sql` — documentar nova tabela
- Nova migração SQL — criar tabela
- `src/pages/gestao/Perfil.tsx` — formulário de credenciais + lógica de estado
- `supabase/functions/oauth-google/index.ts` — ler credenciais da BD
- `supabase/functions/oauth-callback/index.ts` — ler credenciais da BD

