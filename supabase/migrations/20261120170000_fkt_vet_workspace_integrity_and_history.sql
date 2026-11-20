-- FKT Vet: workspace integrity, role-aware RLS and preservation of animal history.
-- Safe to apply to existing data: cross-workspace inconsistencies abort before constraints are added.

BEGIN;

-- Puppies inherit their workspace from the litter. This makes workspace ownership
-- explicit and allows declarative composite foreign keys and RLS.
ALTER TABLE public.canil_cachorros
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE public.canil_cachorros c
SET workspace_id = n.workspace_id
FROM public.canil_ninhadas n
WHERE n.id = c.ninhada_id
  AND c.workspace_id IS DISTINCT FROM n.workspace_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.canil_cachorros c
    LEFT JOIN public.canil_ninhadas n ON n.id = c.ninhada_id
    WHERE n.id IS NULL OR c.workspace_id IS NULL
  ) THEN
    RAISE EXCEPTION 'FKT Vet migration stopped: puppy records without a valid litter/workspace were found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.canil_registos_clinicos r
    JOIN public.canil_animais a ON a.id = r.animal_id
    WHERE r.workspace_id <> a.workspace_id
  ) OR EXISTS (
    SELECT 1
    FROM public.canil_reservas r
    JOIN public.canil_animais a ON a.id = r.animal_id
    WHERE r.workspace_id <> a.workspace_id
  ) OR EXISTS (
    SELECT 1
    FROM public.canil_ninhadas n
    JOIN public.canil_animais a ON a.id = n.mae_id OR a.id = n.pai_id
    WHERE n.workspace_id <> a.workspace_id
  ) OR EXISTS (
    SELECT 1
    FROM public.canil_cachorros c
    JOIN public.canil_animais a ON a.id = c.animal_id
    WHERE c.workspace_id <> a.workspace_id
  ) THEN
    RAISE EXCEPTION 'FKT Vet migration stopped: cross-workspace animal references must be corrected before applying integrity constraints';
  END IF;
END;
$$;

ALTER TABLE public.canil_cachorros
  ALTER COLUMN workspace_id SET NOT NULL;

-- Candidate keys required by composite foreign keys.
CREATE UNIQUE INDEX IF NOT EXISTS canil_animais_workspace_id_id_uidx
  ON public.canil_animais (workspace_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS canil_ninhadas_workspace_id_id_uidx
  ON public.canil_ninhadas (workspace_id, id);

-- Replace single-column cascading/set-null relationships with workspace-scoped,
-- restrictive relationships. History and pedigree links must not disappear.
ALTER TABLE public.canil_registos_clinicos
  DROP CONSTRAINT IF EXISTS canil_registos_clinicos_animal_id_fkey;
ALTER TABLE public.canil_registos_clinicos
  ADD CONSTRAINT canil_registos_clinicos_workspace_animal_fkey
  FOREIGN KEY (workspace_id, animal_id)
  REFERENCES public.canil_animais (workspace_id, id)
  ON DELETE RESTRICT;

ALTER TABLE public.canil_reservas
  DROP CONSTRAINT IF EXISTS canil_reservas_animal_id_fkey;
ALTER TABLE public.canil_reservas
  ADD CONSTRAINT canil_reservas_workspace_animal_fkey
  FOREIGN KEY (workspace_id, animal_id)
  REFERENCES public.canil_animais (workspace_id, id)
  ON DELETE RESTRICT;

ALTER TABLE public.canil_ninhadas
  DROP CONSTRAINT IF EXISTS canil_ninhadas_mae_id_fkey;
ALTER TABLE public.canil_ninhadas
  DROP CONSTRAINT IF EXISTS canil_ninhadas_pai_id_fkey;
ALTER TABLE public.canil_ninhadas
  ADD CONSTRAINT canil_ninhadas_workspace_mae_fkey
  FOREIGN KEY (workspace_id, mae_id)
  REFERENCES public.canil_animais (workspace_id, id)
  ON DELETE RESTRICT;
ALTER TABLE public.canil_ninhadas
  ADD CONSTRAINT canil_ninhadas_workspace_pai_fkey
  FOREIGN KEY (workspace_id, pai_id)
  REFERENCES public.canil_animais (workspace_id, id)
  ON DELETE RESTRICT;

ALTER TABLE public.canil_cachorros
  DROP CONSTRAINT IF EXISTS canil_cachorros_animal_id_fkey;
ALTER TABLE public.canil_cachorros
  DROP CONSTRAINT IF EXISTS canil_cachorros_ninhada_id_fkey;
ALTER TABLE public.canil_cachorros
  ADD CONSTRAINT canil_cachorros_workspace_ninhada_fkey
  FOREIGN KEY (workspace_id, ninhada_id)
  REFERENCES public.canil_ninhadas (workspace_id, id)
  ON DELETE RESTRICT;
ALTER TABLE public.canil_cachorros
  ADD CONSTRAINT canil_cachorros_workspace_animal_fkey
  FOREIGN KEY (workspace_id, animal_id)
  REFERENCES public.canil_animais (workspace_id, id)
  ON DELETE RESTRICT;

-- Derive the puppy workspace from its litter on every insert/change. The client
-- cannot assign a puppy to a different workspace by supplying workspace_id.
CREATE OR REPLACE FUNCTION public.canil_set_cachorro_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  _workspace_id uuid;
BEGIN
  SELECT n.workspace_id
    INTO _workspace_id
  FROM public.canil_ninhadas n
  WHERE n.id = NEW.ninhada_id;

  IF _workspace_id IS NULL THEN
    RAISE EXCEPTION 'A ninhada indicada não existe'
      USING ERRCODE = '23503';
  END IF;

  NEW.workspace_id := _workspace_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canil_cachorros_set_workspace ON public.canil_cachorros;
CREATE TRIGGER canil_cachorros_set_workspace
BEFORE INSERT OR UPDATE OF ninhada_id, workspace_id
ON public.canil_cachorros
FOR EACH ROW
EXECUTE FUNCTION public.canil_set_cachorro_workspace();

REVOKE ALL ON FUNCTION public.canil_set_cachorro_workspace() FROM PUBLIC, anon, authenticated;

-- Supporting indexes for the composite foreign keys and workspace-scoped reads.
CREATE INDEX IF NOT EXISTS idx_canil_clinico_workspace_animal
  ON public.canil_registos_clinicos (workspace_id, animal_id);
CREATE INDEX IF NOT EXISTS idx_canil_reservas_workspace_animal
  ON public.canil_reservas (workspace_id, animal_id);
CREATE INDEX IF NOT EXISTS idx_canil_ninhadas_workspace_mae
  ON public.canil_ninhadas (workspace_id, mae_id);
CREATE INDEX IF NOT EXISTS idx_canil_ninhadas_workspace_pai
  ON public.canil_ninhadas (workspace_id, pai_id);
CREATE INDEX IF NOT EXISTS idx_canil_cachorros_workspace_ninhada
  ON public.canil_cachorros (workspace_id, ninhada_id);
CREATE INDEX IF NOT EXISTS idx_canil_cachorros_workspace_animal
  ON public.canil_cachorros (workspace_id, animal_id);

-- Replace puppy policies. Owners are recognised and viewers are read-only.
DROP POLICY IF EXISTS "Members can view cachorros via ninhada workspace" ON public.canil_cachorros;
DROP POLICY IF EXISTS "Members can insert cachorros via ninhada workspace" ON public.canil_cachorros;
DROP POLICY IF EXISTS "Members can update cachorros via ninhada workspace" ON public.canil_cachorros;
DROP POLICY IF EXISTS "Members can delete cachorros via ninhada workspace" ON public.canil_cachorros;
DROP POLICY IF EXISTS canil_cachorros_select ON public.canil_cachorros;
DROP POLICY IF EXISTS canil_cachorros_insert ON public.canil_cachorros;
DROP POLICY IF EXISTS canil_cachorros_update ON public.canil_cachorros;
DROP POLICY IF EXISTS canil_cachorros_delete ON public.canil_cachorros;

CREATE POLICY canil_cachorros_select
ON public.canil_cachorros FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_cachorros.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_cachorros.workspace_id AND wm.user_id = auth.uid())
);

CREATE POLICY canil_cachorros_insert
ON public.canil_cachorros FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_cachorros.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_cachorros.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

CREATE POLICY canil_cachorros_update
ON public.canil_cachorros FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_cachorros.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_cachorros.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_cachorros.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_cachorros.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

CREATE POLICY canil_cachorros_delete
ON public.canil_cachorros FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_cachorros.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_cachorros.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

-- Explicit WITH CHECK on updates prevents moving rows to another workspace.
DROP POLICY IF EXISTS canil_animais_update ON public.canil_animais;
CREATE POLICY canil_animais_update
ON public.canil_animais FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_animais.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_animais.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_animais.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_animais.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

DROP POLICY IF EXISTS canil_ninhadas_update ON public.canil_ninhadas;
CREATE POLICY canil_ninhadas_update
ON public.canil_ninhadas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_ninhadas.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_ninhadas.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_ninhadas.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_ninhadas.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

DROP POLICY IF EXISTS canil_clinico_update ON public.canil_registos_clinicos;
CREATE POLICY canil_clinico_update
ON public.canil_registos_clinicos FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_registos_clinicos.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_registos_clinicos.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_registos_clinicos.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_registos_clinicos.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

DROP POLICY IF EXISTS canil_reservas_update ON public.canil_reservas;
CREATE POLICY canil_reservas_update
ON public.canil_reservas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_reservas.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_reservas.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w
          WHERE w.id = canil_reservas.workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspace_members wm
             WHERE wm.workspace_id = canil_reservas.workspace_id
               AND wm.user_id = auth.uid()
               AND wm.role IN ('editor', 'admin'))
);

-- No anonymous or PUBLIC access to the Canil data. Authenticated clients receive
-- only the four DML privileges required by the application; service_role is untouched.
REVOKE ALL ON TABLE
  public.canil_animais,
  public.canil_registos_clinicos,
  public.canil_ninhadas,
  public.canil_cachorros,
  public.canil_reservas
FROM anon, PUBLIC;

REVOKE ALL ON TABLE
  public.canil_animais,
  public.canil_registos_clinicos,
  public.canil_ninhadas,
  public.canil_cachorros,
  public.canil_reservas
FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.canil_animais,
  public.canil_registos_clinicos,
  public.canil_ninhadas,
  public.canil_cachorros,
  public.canil_reservas
TO authenticated;

-- The database defaults currently grant all new public tables/sequences to anon.
-- Remove that default for both roles that create project objects, so the grants
-- do not silently return on future migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

COMMIT;
