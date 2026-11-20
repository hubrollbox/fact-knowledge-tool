-- Remove duplicate covering indexes and cover creator/author foreign keys.
DROP INDEX IF EXISTS public.juridico_aplicacoes_factos_scope_idx;
DROP INDEX IF EXISTS public.juridico_aplicacoes_fontes_scope_idx;

CREATE INDEX IF NOT EXISTS juridico_aplicacoes_autor_id_idx
  ON public.juridico_aplicacoes(autor_id);
CREATE INDEX IF NOT EXISTS juridico_conclusoes_autor_id_idx
  ON public.juridico_conclusoes(autor_id);
CREATE INDEX IF NOT EXISTS juridico_factos_created_by_idx
  ON public.juridico_factos(created_by);
CREATE INDEX IF NOT EXISTS juridico_fontes_created_by_idx
  ON public.juridico_fontes(created_by);
CREATE INDEX IF NOT EXISTS juridico_questoes_created_by_idx
  ON public.juridico_questoes(created_by);
