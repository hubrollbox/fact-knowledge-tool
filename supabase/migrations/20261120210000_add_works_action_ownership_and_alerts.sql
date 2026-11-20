-- Issue #61: actionable ownership and Works alerts.
ALTER TABLE public.obras_acoes
  ADD COLUMN IF NOT EXISTS responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.alertas DROP CONSTRAINT IF EXISTS alertas_modulo_check;
ALTER TABLE public.alertas ADD CONSTRAINT alertas_modulo_check
  CHECK (modulo = ANY (ARRAY['juridico','canil','dev','obras']::text[]));

CREATE UNIQUE INDEX IF NOT EXISTS alertas_obras_acao_dedup_idx
  ON public.alertas(workspace_id, user_id, referencia_id, referencia_tipo, tipo, data_alerta)
  WHERE modulo = 'obras'
    AND user_id IS NOT NULL
    AND referencia_id IS NOT NULL
    AND referencia_tipo = 'obras_acoes';

CREATE INDEX IF NOT EXISTS obras_acoes_workspace_estado_prazo_idx
  ON public.obras_acoes(workspace_id, estado, prazo);

CREATE INDEX IF NOT EXISTS obras_acoes_responsavel_idx
  ON public.obras_acoes(workspace_id, responsavel_user_id, prazo)
  WHERE responsavel_user_id IS NOT NULL;

COMMENT ON COLUMN public.obras_acoes.responsavel_user_id IS
  'Utilizador do workspace responsável pela acção. O campo responsavel mantém-se como designação livre/legada.';

CREATE OR REPLACE FUNCTION public.sincronizar_alertas_obras_acoes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_count integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
  END IF;

  IF v_user IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.alertas (
    workspace_id, user_id, modulo, tipo, titulo, descricao,
    data_alerta, referencia_id, referencia_tipo
  )
  SELECT
    a.workspace_id,
    v_user,
    'obras',
    CASE WHEN a.prazo < CURRENT_DATE THEN 'acao_atrasada' ELSE 'acao_prazo_proximo' END,
    CASE WHEN a.prazo < CURRENT_DATE THEN 'Acção em atraso' ELSE 'Prazo de acção próximo' END,
    a.descricao,
    a.prazo,
    a.id,
    'obras_acoes'
  FROM public.obras_acoes AS a
  WHERE a.responsavel_user_id = v_user
    AND a.estado <> 'concluida'
    AND a.prazo IS NOT NULL
    AND a.prazo <= CURRENT_DATE + 3
    AND private.obras_can_read(a.workspace_id)
  ON CONFLICT (workspace_id, user_id, referencia_id, referencia_tipo, tipo, data_alerta)
    WHERE modulo = 'obras'
      AND user_id IS NOT NULL
      AND referencia_id IS NOT NULL
      AND referencia_tipo = 'obras_acoes'
  DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_alertas_obras_acoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_alertas_obras_acoes() TO authenticated;

CREATE OR REPLACE FUNCTION private.notificar_alteracoes_obras_acoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tipo text;
  v_titulo text;
  v_user uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_user := NEW.responsavel_user_id;
    v_tipo := 'acao_atribuida';
    v_titulo := 'Nova acção atribuída';
  ELSIF NEW.responsavel_user_id IS DISTINCT FROM OLD.responsavel_user_id
        AND NEW.responsavel_user_id IS NOT NULL THEN
    v_user := NEW.responsavel_user_id;
    v_tipo := 'acao_atribuida';
    v_titulo := 'Acção atribuída';
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado
        AND NEW.responsavel_user_id IS NOT NULL THEN
    v_user := NEW.responsavel_user_id;
    v_tipo := 'acao_actualizada';
    v_titulo := 'Estado de acção actualizado';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.alertas (
    workspace_id, user_id, modulo, tipo, titulo, descricao,
    data_alerta, referencia_id, referencia_tipo
  ) VALUES (
    NEW.workspace_id, v_user, 'obras', v_tipo, v_titulo,
    NEW.descricao, CURRENT_DATE, NEW.id, 'obras_acoes'
  )
  ON CONFLICT (workspace_id, user_id, referencia_id, referencia_tipo, tipo, data_alerta)
    WHERE modulo = 'obras'
      AND user_id IS NOT NULL
      AND referencia_id IS NOT NULL
      AND referencia_tipo = 'obras_acoes'
  DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.notificar_alteracoes_obras_acoes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_acoes_alertas
  AFTER INSERT OR UPDATE OF responsavel_user_id, estado
  ON public.obras_acoes
  FOR EACH ROW EXECUTE FUNCTION private.notificar_alteracoes_obras_acoes();
