

## Plano: Credenciais OAuth por utilizador

A tabela `user_oauth_credentials` ja existe na BD com RLS configurado. Falta apenas ligar tudo.

### Alteracoes

**1. Perfil.tsx** -- Adicionar seccao "Credenciais Google OAuth"
- Formulario com Client ID e Client Secret acima da lista de servicos
- Carregar credenciais existentes ao montar (select da tabela `user_oauth_credentials` where provider='google')
- Botao Guardar faz upsert
- Botoes Conectar dos servicos Google ficam disabled enquanto nao houver credenciais guardadas
- Tooltip/mensagem explicativa

**2. Edge Function `oauth-google`**
- Usar service role client para ler `user_oauth_credentials` do userId
- Usar o `client_id` da BD em vez do env var `GOOGLE_CLIENT_ID`
- Se nao existirem credenciais, retornar erro 400

**3. Edge Function `oauth-callback`**
- Usar service role client para ler `user_oauth_credentials` do userId (vindo do state)
- Usar `client_id` e `client_secret` da BD no token exchange
- Manter redirect URI do env como fallback

### Ficheiros alterados
- `src/pages/gestao/Perfil.tsx`
- `supabase/functions/oauth-google/index.ts`
- `supabase/functions/oauth-callback/index.ts`

