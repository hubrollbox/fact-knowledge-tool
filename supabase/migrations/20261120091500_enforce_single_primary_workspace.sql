-- A user account owns at most one primary workspace.
-- Existing data was checked before adding this index.
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_user_id_unique
  ON public.workspaces (user_id);
