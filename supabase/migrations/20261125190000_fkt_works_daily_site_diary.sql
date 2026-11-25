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
DROP TRIGGER IF EXISTS obras_visitas_historico ON public.obras_visitas;
CREATE TRIGGER obras_visitas_historico AFTER INSERT OR UPDATE OR DELETE ON public.obras_visitas
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
COMMENT ON COLUMN public.obras_visitas.created_by IS
  'Utilizador que criou o registo. Registos anteriores à migração podem não ter autor identificável.';
COMMENT ON COLUMN public.obras_visitas.tipo_registo IS
  'Tipo de entrada no diário de obra: diário, visita, reunião ou fiscalização.';
COMMIT;