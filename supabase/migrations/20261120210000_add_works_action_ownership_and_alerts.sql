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
