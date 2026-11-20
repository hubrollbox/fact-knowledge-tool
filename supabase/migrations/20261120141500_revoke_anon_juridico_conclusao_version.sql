-- Remove the default Supabase function grants from anonymous callers.
REVOKE ALL ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) FROM anon;
