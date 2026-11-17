CREATE OR REPLACE FUNCTION public.obras_can_read(_ws uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM workspaces w WHERE w.id=_ws AND w.user_id=auth.uid())
      OR EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id=_ws AND m.user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.obras_can_write(_ws uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM workspaces w WHERE w.id=_ws AND w.user_id=auth.uid())
      OR EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id=_ws AND m.user_id=auth.uid() AND m.role IN ('editor','admin'));
$$;
REVOKE EXECUTE ON FUNCTION public.obras_can_read(uuid), public.obras_can_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obras_can_read(uuid), public.obras_can_write(uuid) TO authenticated;

CREATE TABLE public.obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  codigo text, nome text NOT NULL, morada text, dono_obra text,
  data_inicio date, data_prevista_fim date,
  estado text NOT NULL DEFAULT 'ativa' CHECK (estado IN ('ativa','suspensa','concluida')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.obras_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  data_visita date NOT NULL DEFAULT current_date, hora_inicio time, hora_fim time,
  condicoes_meteo text, tecnico text, notas text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.obras_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  visita_id uuid REFERENCES public.obras_visitas(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  titulo text NOT NULL, descricao text, localizacao text,
  gravidade text NOT NULL DEFAULT 'media' CHECK (gravidade IN ('baixa','media','alta','critica')),
  estado text NOT NULL DEFAULT 'aberta' CHECK (estado IN ('aberta','em_resolucao','resolvida')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.obras_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  visita_id uuid REFERENCES public.obras_visitas(id) ON DELETE CASCADE,
  ocorrencia_id uuid REFERENCES public.obras_ocorrencias(id) ON DELETE CASCADE,
  storage_path text NOT NULL, legenda text,
  capturada_em timestamptz, latitude double precision, longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.obras_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  ocorrencia_id uuid REFERENCES public.obras_ocorrencias(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  descricao text NOT NULL, responsavel text, prazo date,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','em_curso','concluida')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['obras','obras_visitas','obras_ocorrencias','obras_fotos','obras_acoes'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.obras_can_read(workspace_id))', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.obras_can_write(workspace_id))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.obras_can_write(workspace_id)) WITH CHECK (public.obras_can_write(workspace_id))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.obras_can_write(workspace_id))', t||'_delete', t);
    EXECUTE format('CREATE INDEX ON public.%I (workspace_id)', t);
  END LOOP;
END $$;

CREATE INDEX ON public.obras_visitas(obra_id);
CREATE INDEX ON public.obras_ocorrencias(obra_id);
CREATE INDEX ON public.obras_fotos(ocorrencia_id);
CREATE INDEX ON public.obras_acoes(obra_id);

CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_visitas_updated_at BEFORE UPDATE ON public.obras_visitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_ocorrencias_updated_at BEFORE UPDATE ON public.obras_ocorrencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_acoes_updated_at BEFORE UPDATE ON public.obras_acoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage: bucket 'obras-fotos', path = <workspace_id>/...
CREATE POLICY "obras_fotos_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='obras-fotos' AND public.obras_can_read(((storage.foldername(name))[1])::uuid));
CREATE POLICY "obras_fotos_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='obras-fotos' AND public.obras_can_write(((storage.foldername(name))[1])::uuid));
CREATE POLICY "obras_fotos_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='obras-fotos' AND public.obras_can_write(((storage.foldername(name))[1])::uuid));