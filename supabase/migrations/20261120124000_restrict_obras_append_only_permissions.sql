REVOKE ALL ON public.obras_acoes_verificacoes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.obras_acoes_verificacoes TO authenticated;
GRANT ALL ON public.obras_acoes_verificacoes TO service_role;

REVOKE ALL ON public.obras_ocorrencia_reaberturas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.obras_ocorrencia_reaberturas TO authenticated;
GRANT ALL ON public.obras_ocorrencia_reaberturas TO service_role;