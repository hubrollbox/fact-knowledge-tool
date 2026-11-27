-- Issue #39: preserve a human-readable author snapshot for daily site diary records.
BEGIN;

ALTER TABLE public.obras_visitas
  ADD COLUMN IF NOT EXISTS created_by_name text;

-- Backfill legacy rows while the previous trigger is temporarily disabled.
-- This also makes re-running this migration safe when old rows still lack a name.
ALTER TABLE public.obras_visitas DISABLE TRIGGER obras_visitas_validar_autoria;

UPDATE public.obras_visitas AS v
SET created_by_name = NULLIF(left(btrim(COALESCE(
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'name',
  u.raw_user_meta_data ->> 'display_name'
)), 120), '')
FROM auth.users AS u
WHERE v.created_by = u.id
  AND v.created_by_name IS NULL;

ALTER TABLE public.obras_visitas ENABLE TRIGGER obras_visitas_validar_autoria;

CREATE OR REPLACE FUNCTION private.validar_autoria_obras_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  _user_id uuid;
  _author_name text;
BEGIN
  _user_id := (SELECT auth.uid());

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := _user_id;
    END IF;

    IF _user_id IS NOT NULL AND NEW.created_by IS DISTINCT FROM _user_id THEN
      RAISE EXCEPTION 'O autor do registo tem de corresponder ao utilizador autenticado'
        USING ERRCODE = '42501';
    END IF;

    -- Metadata is used only as a display label, never for authorization.
    -- Read the verified request claims instead of querying auth.users at runtime.
    IF _user_id IS NOT NULL THEN
      _author_name := NULLIF(left(btrim(COALESCE(
        (SELECT auth.jwt()) -> 'user_metadata' ->> 'full_name',
        (SELECT auth.jwt()) -> 'user_metadata' ->> 'name',
        (SELECT auth.jwt()) -> 'user_metadata' ->> 'display_name'
      )), 120), '');
      NEW.created_by_name := _author_name;
    ELSE
      NEW.created_by_name := NULL;
    END IF;
  ELSE
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'O autor original do registo não pode ser alterado'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.created_by_name IS DISTINCT FROM OLD.created_by_name THEN
      RAISE EXCEPTION 'O nome do autor original não pode ser alterado'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.validar_autoria_obras_visita()
  FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.obras_visitas.created_by_name IS
  'Nome apresentado da conta que criou o registo, guardado como snapshot e imutável. Não é utilizado para autorização.';

COMMIT;
