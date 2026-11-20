-- Keep the conclusion-version RPC available only to authenticated users.
REVOKE EXECUTE ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) TO authenticated;
