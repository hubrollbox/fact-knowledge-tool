CREATE TABLE public.obras_recepcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'em_preparacao' CHECK (estado IN ('em_preparacao','recebida_com_reservas','concluida')),
  pendencias jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(pendencias) = 'array'),
  reservas text,
  notas text,
  recebido_em timestamptz,
  recebido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_recepcoes_obra_workspace_fkey FOREIGN KEY (obra_id, workspace_id)
    REFERENCES public.obras(id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX obras_recepcoes_workspace_idx ON public.obras_recepcoes(workspace_id, estado);
ALTER TABLE public.obras_recepcoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.obras_recepcoes TO authenticated;
GRANT ALL ON public.obras_recepcoes TO service_role;
CREATE POLICY obras_recepcoes_select ON public.obras_recepcoes FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_recepcoes_insert ON public.obras_recepcoes FOR INSERT TO authenticated
  WITH CHECK (private.obras_can_write(workspace_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY obras_recepcoes_update ON public.obras_recepcoes FOR UPDATE TO authenticated
  USING (private.obras_can_write(workspace_id))
  WITH CHECK (private.obras_can_write(workspace_id));
CREATE TRIGGER obras_recepcoes_historico
  AFTER INSERT OR UPDATE ON public.obras_recepcoes
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE OR REPLACE FUNCTION private.validar_obras_recepcao()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE item jsonb;
BEGIN
  IF NEW.estado = 'concluida' THEN
    IF jsonb_array_length(NEW.pendencias) > 0 THEN
      FOR item IN SELECT value FROM jsonb_array_elements(NEW.pendencias) LOOP
        IF COALESCE(item->>'decisao','') NOT IN ('resolvida','reserva_aceite')
           OR (item->>'decisao' = 'reserva_aceite' AND length(btrim(COALESCE(item->>'justificacao',''))) = 0) THEN
          RAISE EXCEPTION 'Todas as pendências têm de estar resolvidas ou justificadas como reserva';
        END IF;
      END LOOP;
    END IF;
    NEW.recebido_em := COALESCE(NEW.recebido_em, clock_timestamp());
    NEW.recebido_por := COALESCE(NEW.recebido_por, (SELECT auth.uid()));
  ELSE
    NEW.recebido_em := NULL;
    NEW.recebido_por := NULL;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validar_obras_recepcao() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER obras_recepcoes_validar
  BEFORE INSERT OR UPDATE ON public.obras_recepcoes
  FOR EACH ROW EXECUTE FUNCTION private.validar_obras_recepcao();