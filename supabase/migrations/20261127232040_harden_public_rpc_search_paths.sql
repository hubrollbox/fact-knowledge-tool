-- Issue #133: prevent object shadowing in exposed SECURITY DEFINER RPCs.
-- Keep SECURITY DEFINER: these RPCs perform writes that authenticated clients
-- cannot perform directly. Their bodies already schema-qualify application objects.
ALTER FUNCTION public.create_application_with_factos(uuid, uuid, uuid, text, text, uuid[])
  SET search_path = '';
ALTER FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text)
  SET search_path = '';
ALTER FUNCTION public.transition_juridico_conclusao(uuid, text, text)
  SET search_path = '';
