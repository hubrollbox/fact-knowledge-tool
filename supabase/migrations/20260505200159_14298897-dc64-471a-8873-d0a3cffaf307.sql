-- =========================================
-- 010_canil_animais
-- =========================================
CREATE TABLE public.canil_animais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  nome TEXT NOT NULL,
  raca TEXT,
  data_nascimento DATE,
  sexo TEXT CHECK (sexo IN ('macho','femea')),
  proprietario_nome TEXT,
  proprietario_contacto TEXT,
  numero_chip TEXT,
  numero_lop TEXT,
  foto_url TEXT,
  observacoes TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canil_animais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view animais in their workspace"
ON public.canil_animais FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can insert animais in their workspace"
ON public.canil_animais FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can update animais in their workspace"
ON public.canil_animais FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can delete animais in their workspace"
ON public.canil_animais FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid()));

CREATE INDEX idx_canil_animais_workspace ON public.canil_animais(workspace_id);

-- =========================================
-- 011_canil_clinico
-- =========================================
CREATE TABLE public.canil_registos_clinicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.canil_animais(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('vacina','desparasitacao','consulta','tratamento','cirurgia','outro')),
  descricao TEXT,
  data_registo DATE NOT NULL,
  data_proxima DATE,
  produto TEXT,
  veterinario TEXT,
  custo NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canil_registos_clinicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view clinico in their workspace"
ON public.canil_registos_clinicos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can insert clinico in their workspace"
ON public.canil_registos_clinicos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can update clinico in their workspace"
ON public.canil_registos_clinicos FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can delete clinico in their workspace"
ON public.canil_registos_clinicos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid()));

CREATE INDEX idx_canil_clinico_animal ON public.canil_registos_clinicos(animal_id);
CREATE INDEX idx_canil_clinico_workspace ON public.canil_registos_clinicos(workspace_id);

-- =========================================
-- 012_canil_ninhadas
-- =========================================
CREATE TABLE public.canil_ninhadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  mae_id UUID REFERENCES public.canil_animais(id) ON DELETE SET NULL,
  pai_id UUID REFERENCES public.canil_animais(id) ON DELETE SET NULL,
  data_cobertura DATE,
  data_parto DATE,
  numero_cachorros INT,
  numero_sobreviventes INT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canil_ninhadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view ninhadas in their workspace"
ON public.canil_ninhadas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can insert ninhadas in their workspace"
ON public.canil_ninhadas FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can update ninhadas in their workspace"
ON public.canil_ninhadas FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can delete ninhadas in their workspace"
ON public.canil_ninhadas FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid()));

CREATE INDEX idx_canil_ninhadas_workspace ON public.canil_ninhadas(workspace_id);

CREATE TABLE public.canil_cachorros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ninhada_id UUID NOT NULL REFERENCES public.canil_ninhadas(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES public.canil_animais(id) ON DELETE SET NULL,
  sexo TEXT CHECK (sexo IN ('macho','femea')),
  cor TEXT,
  estado TEXT NOT NULL DEFAULT 'disponivel' CHECK (estado IN ('disponivel','reservado','vendido','obito')),
  comprador_nome TEXT,
  comprador_contacto TEXT,
  preco_venda NUMERIC(10,2),
  data_saida DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canil_cachorros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view cachorros via ninhada workspace"
ON public.canil_cachorros FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.canil_ninhadas n
  JOIN public.workspace_members wm ON wm.workspace_id = n.workspace_id
  WHERE n.id = canil_cachorros.ninhada_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can insert cachorros via ninhada workspace"
ON public.canil_cachorros FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.canil_ninhadas n
  JOIN public.workspace_members wm ON wm.workspace_id = n.workspace_id
  WHERE n.id = canil_cachorros.ninhada_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can update cachorros via ninhada workspace"
ON public.canil_cachorros FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.canil_ninhadas n
  JOIN public.workspace_members wm ON wm.workspace_id = n.workspace_id
  WHERE n.id = canil_cachorros.ninhada_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Members can delete cachorros via ninhada workspace"
ON public.canil_cachorros FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.canil_ninhadas n
  JOIN public.workspace_members wm ON wm.workspace_id = n.workspace_id
  WHERE n.id = canil_cachorros.ninhada_id AND wm.user_id = auth.uid()
));

CREATE INDEX idx_canil_cachorros_ninhada ON public.canil_cachorros(ninhada_id);

-- =========================================
-- 013_canil_hotel
-- =========================================
CREATE TABLE public.canil_reservas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  animal_id UUID NOT NULL REFERENCES public.canil_animais(id) ON DELETE CASCADE,
  data_entrada DATE NOT NULL,
  data_saida DATE NOT NULL,
  box TEXT,
  estado TEXT NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada','checkin','checkout','cancelada')),
  instrucoes TEXT,
  preco_dia NUMERIC(10,2),
  total NUMERIC(10,2),
  pago BOOLEAN NOT NULL DEFAULT false,
  observacoes_estadia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.canil_reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reservas in their workspace"
ON public.canil_reservas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can insert reservas in their workspace"
ON public.canil_reservas FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can update reservas in their workspace"
ON public.canil_reservas FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Members can delete reservas in their workspace"
ON public.canil_reservas FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid()));

CREATE INDEX idx_canil_reservas_workspace ON public.canil_reservas(workspace_id);
CREATE INDEX idx_canil_reservas_animal ON public.canil_reservas(animal_id);