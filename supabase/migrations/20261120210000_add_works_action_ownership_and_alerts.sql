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
