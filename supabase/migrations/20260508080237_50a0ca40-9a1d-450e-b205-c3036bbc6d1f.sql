
-- Restore safe view to security_invoker = true (project convention)
ALTER VIEW public.user_oauth_credentials_safe SET (security_invoker = true);

-- Re-add row-level SELECT policy so the safe view (invoker) can read user's own rows
CREATE POLICY "own_select" ON public.user_oauth_credentials FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Block direct reads of client_secret column at the API layer
REVOKE SELECT (client_secret) ON public.user_oauth_credentials FROM authenticated, anon;
-- Keep SELECT on safe columns so the form can show whether credentials exist + the client_id
GRANT SELECT (id, user_id, provider, client_id, created_at, updated_at) ON public.user_oauth_credentials TO authenticated;
