-- Issue #39: extend existing visit records into a searchable daily site diary.
-- Existing visits remain intact; no parallel diary table is introduced.
BEGIN;
ALTER TABLE public.obras_visitas
  ADD COLUMN IF NOT EXISTS tipo_registo text NOT NULL DEFAULT 'visita',
  ADD COLUMN IF NOT EXISTS trabalhos_executados text,
  ADD COLUMN IF NOT EXISTS equipa_intervenientes text,
  ADD COLUMN IF NOT EXISTS equipamentos text,
  ADD COLUMN IF NOT EXISTS materiais text,
  ADD COLUMN IF NOT EXISTS condicionantes text,
  ADD COLUMN IF NOT EXISTS atrasos text,
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.obras_visitas'::regclass AND conname='obras_visitas_tipo_registo_check') THEN
    ALTER TABLE public.obras_visitas ADD CONSTRAINT obras_visitas_tipo_registo_check
      CHECK (tipo_registo IN ('diario','visita','reuniao','fiscalizacao'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS obras_visitas_workspace_date_type_idx
  ON public.obras_visitas(workspace_id, data_visita DESC, tipo_registo);

CREATE OR REPLACE FUNCTION private.validar_autoria_obras_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := (SELECT auth.uid()); END IF;
    IF (SELECT auth.uid()) IS NOT NULL AND NEW.created_by IS DISTINCT FROM (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'O autor do registo tem de corresponder ao utilizador autenticado' USING ERRCODE='42501';
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'O autor original do registo não pode ser alterado' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.validar_autoria_obras_visita() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS obras_visitas_validar_autoria ON public.obras_visitas;
CREATE TRIGGER obras_visitas_validar_autoria
  BEFORE INSERT OR UPDATE ON public.obras_visitas
  FOR EACH ROW EXECUTE FUNCTION private.validar_autoria_obras_visita();

DROP TRIGGER IF EXISTS obras_visitas_historico ON public.obras_visitas;
CREATE TRIGGER obras_visitas_historico AFTER INSERT OR UPDATE OR DELETE ON public.obras_visitas
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
COMMENT ON COLUMN public.obras_visitas.created_by IS
  'Utilizador que criou o registo. Registos anteriores à migração podem não ter autor identificável.';
COMMENT ON COLUMN public.obras_visitas.tipo_registo IS
  'Tipo de entrada no diário de obra: diário, visita, reunião ou fiscalização.';
COMMIT;