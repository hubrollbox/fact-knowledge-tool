-- Close default table grants on the append-only conclusion audit log.
-- Only authenticated users with workspace read access may SELECT events.
-- Inserts are reserved to the SECURITY DEFINER trigger and transition RPC owners.
REVOKE ALL ON TABLE public.juridico_conclusoes_eventos FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.juridico_conclusoes_eventos TO authenticated;
