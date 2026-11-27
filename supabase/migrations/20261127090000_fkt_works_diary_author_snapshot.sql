-- Issue #39: preserve a human-readable author snapshot for daily site diary records.
BEGIN;

ALTER TABLE public.obras_visitas
  ADD COLUMN IF NOT EXISTS created_by_name text;

CREATE OR REPLACE FUNCTION private.validar_autoria_obras_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- Snapshot only the authenticated creator's display name. User metadata is
    -- used for presentation only; it is never used for authorization.
    IF _user_id IS NOT NULL THEN
      SELECT NULLIF(left(btrim(COALESCE(
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name',
        u.raw_user_meta_data ->> 'display_name'
      )), 120), '')
      INTO _author_name
      FROM auth.users AS u
      WHERE u.id = _user_id;

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

-- Backfill existing records when the account still has a display name.
UPDATE public.obras_visitas AS v
SET created_by_name = NULLIF(left(btrim(COALESCE(
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'name',
  u.raw_user_meta_data ->> 'display_name'
)), 120), '')
FROM auth.users AS u
WHERE v.created_by = u.id
  AND v.created_by_name IS NULL;

COMMENT ON COLUMN public.obras_visitas.created_by_name IS
  'Nome apresentado da conta que criou o registo, guardado como snapshot e imutável. Não é utilizado para autorização.';

COMMIT;
