CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER FUNCTION public.obras_can_read(uuid) SET SCHEMA private;
ALTER FUNCTION public.obras_can_write(uuid) SET SCHEMA private;
CREATE INDEX ON public.obras_acoes(ocorrencia_id);
CREATE INDEX ON public.obras_fotos(visita_id);
CREATE INDEX ON public.obras_ocorrencias(visita_id);