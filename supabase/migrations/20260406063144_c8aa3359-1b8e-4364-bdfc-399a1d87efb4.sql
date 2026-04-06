
-- 1. Add 'name' column and CHECK constraint on 'modulo' to existing workspaces table
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_modulo_check
  CHECK (modulo IN ('juridico', 'canil', 'dev'));

-- 2. Create workspace_members table
CREATE TABLE public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- 3. Enable RLS on workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for workspace_members
CREATE POLICY "members_select_own"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owner_manage_members"
  ON public.workspace_members
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- 5. Trigger for updated_at on workspace_members
CREATE TRIGGER update_workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
