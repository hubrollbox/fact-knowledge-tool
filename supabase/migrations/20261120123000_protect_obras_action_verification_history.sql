-- Keep verification history append-only and preserve the original author of a cause.
ALTER TABLE public.obras_acoes_verificacoes
  DROP CONSTRAINT obras_acoes_verificacoes_action_fk;
ALTER TABLE public.obras_acoes_verificacoes
  ADD CONSTRAINT obras_acoes_verificacoes_action_fk
  FOREIGN KEY (acao_id, ocorrencia_id, workspace_id)
  REFERENCES public.obras_acoes(id, ocorrencia_id, workspace_id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION private.proteger_autoria_causa_ocorrencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.criado_por := (SELECT auth.uid());
  ELSE
    NEW.criado_por := OLD.criado_por;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.proteger_autoria_causa_ocorrencia() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER obras_ocorrencia_causas_autoria
  BEFORE INSERT OR UPDATE ON public.obras_ocorrencia_causas
  FOR EACH ROW EXECUTE FUNCTION private.proteger_autoria_causa_ocorrencia();