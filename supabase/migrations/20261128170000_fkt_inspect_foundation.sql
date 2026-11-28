-- FKT Inspect foundation: one Inspect organisation per existing Core workspace,
-- with a consultant/operator client portfolio and establishments.
-- This migration is committed for local/CI validation only. Do not apply remotely
-- until the migration and its pgTAP tests have passed and the release is approved.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

-- Extend the existing module discriminator without changing any existing value.
ALTER TABLE public.workspaces
  DROP CONSTRAINT IF EXISTS workspaces_modulo_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_modulo_check
  CHECK (modulo IN ('juridico', 'canil', 'dev', 'obras', 'inspect'));

CREATE TABLE public.inspect_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE
    REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  organisation_type text NOT NULL
    CHECK (organisation_type IN ('consultant', 'operator', 'hybrid')),
  display_name text NOT NULL
    CHECK (length(btrim(display_name)) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT inspect_organisations_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE public.inspect_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspect_organisation_id uuid NOT NULL
    REFERENCES public.inspect_organisations(id) ON DELETE RESTRICT,
  display_name text NOT NULL
    CHECK (length(btrim(display_name)) BETWEEN 2 AND 180),
  external_reference text,
  notes text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT inspect_clients_id_org_unique UNIQUE (id, inspect_organisation_id)
);

CREATE UNIQUE INDEX inspect_clients_external_reference_unique
  ON public.inspect_clients (inspect_organisation_id, lower(btrim(external_reference)))
  WHERE external_reference IS NOT NULL AND btrim(external_reference) <> '';

CREATE TABLE public.inspect_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspect_organisation_id uuid NOT NULL
    REFERENCES public.inspect_organisations(id) ON DELETE RESTRICT,
  display_name text NOT NULL
    CHECK (length(btrim(display_name)) BETWEEN 2 AND 180),
  activity_description text,
  address_line text,
  postal_code text,
  locality text,
  country_code char(2) NOT NULL DEFAULT 'PT'
    CHECK (country_code ~ '^[A-Z]{2}$'),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT inspect_establishments_id_org_unique UNIQUE (id, inspect_organisation_id)
);

CREATE INDEX inspect_clients_org_status_idx
  ON public.inspect_clients (inspect_organisation_id, status, display_name);
CREATE INDEX inspect_establishments_org_status_idx
  ON public.inspect_establishments (inspect_organisation_id, status, display_name);

CREATE TABLE public.inspect_client_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspect_organisation_id uuid NOT NULL,
  client_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT inspect_client_establishments_valid_range_check
    CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT inspect_client_establishments_client_fk
    FOREIGN KEY (client_id, inspect_organisation_id)
    REFERENCES public.inspect_clients (id, inspect_organisation_id) ON DELETE RESTRICT,
  CONSTRAINT inspect_client_establishments_establishment_fk
    FOREIGN KEY (establishment_id, inspect_organisation_id)
    REFERENCES public.inspect_establishments (id, inspect_organisation_id) ON DELETE RESTRICT,
  CONSTRAINT inspect_client_establishments_id_org_unique
    UNIQUE (id, inspect_organisation_id)
);

CREATE INDEX inspect_client_establishments_client_period_idx
  ON public.inspect_client_establishments
    (inspect_organisation_id, client_id, valid_from DESC);
CREATE INDEX inspect_client_establishments_establishment_period_idx
  ON public.inspect_client_establishments
    (inspect_organisation_id, establishment_id, valid_from DESC);

-- Serialize changes for a given organisation/client/establishment tuple so
-- concurrent transactions cannot create overlapping [from, until) periods.
CREATE OR REPLACE FUNCTION private.inspect_guard_client_establishment_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  _lock_key bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.inspect_organisation_id IS DISTINCT FROM OLD.inspect_organisation_id
      OR NEW.client_id IS DISTINCT FROM OLD.client_id
      OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id
      OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'A relação histórica não pode ser reescrita; termine a vigência em valid_until'
        USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.valid_until IS NOT NULL AND NEW.valid_until IS DISTINCT FROM OLD.valid_until THEN
      RAISE EXCEPTION 'Uma vigência terminada não pode ser alterada'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  _lock_key := hashtextextended(
    NEW.inspect_organisation_id::text || ':' ||
    NEW.client_id::text || ':' ||
    NEW.establishment_id::text,
    0
  );
  PERFORM pg_advisory_xact_lock(_lock_key);

  IF EXISTS (
    SELECT 1
    FROM public.inspect_client_establishments existing
    WHERE existing.inspect_organisation_id = NEW.inspect_organisation_id
      AND existing.client_id = NEW.client_id
      AND existing.establishment_id = NEW.establishment_id
      AND existing.id IS DISTINCT FROM NEW.id
      AND tstzrange(existing.valid_from, existing.valid_until, '[)')
          && tstzrange(NEW.valid_from, NEW.valid_until, '[)')
  ) THEN
    RAISE EXCEPTION 'Já existe uma relação cliente/estabelecimento com vigência sobreposta'
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.inspect_guard_client_establishment_period() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER inspect_client_establishments_period_guard
  BEFORE INSERT OR UPDATE ON public.inspect_client_establishments
  FOR EACH ROW
  EXECUTE FUNCTION private.inspect_guard_client_establishment_period();

-- New Inspect tables are not exposed to anon. Authenticated receives only the
-- operations needed by the first portfolio workflow; RLS remains authoritative.
REVOKE ALL ON TABLE
  public.inspect_organisations,
  public.inspect_clients,
  public.inspect_establishments,
  public.inspect_client_establishments
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.inspect_organisations,
  public.inspect_clients,
  public.inspect_establishments,
  public.inspect_client_establishments
TO authenticated;

ALTER TABLE public.inspect_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_client_establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspect_organisations_select
  ON public.inspect_organisations FOR SELECT TO authenticated
  USING (private.workspace_can_read(workspace_id));

CREATE POLICY inspect_organisations_insert
  ON public.inspect_organisations FOR INSERT TO authenticated
  WITH CHECK (
    private.workspace_is_owner(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.modulo = 'inspect'
    )
  );

CREATE POLICY inspect_organisations_update
  ON public.inspect_organisations FOR UPDATE TO authenticated
  USING (private.workspace_is_owner(workspace_id))
  WITH CHECK (private.workspace_is_owner(workspace_id));

CREATE POLICY inspect_clients_select
  ON public.inspect_clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_read(o.workspace_id)
    )
  );

CREATE POLICY inspect_clients_insert
  ON public.inspect_clients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  );

CREATE POLICY inspect_clients_update
  ON public.inspect_clients FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  );

CREATE POLICY inspect_establishments_select
  ON public.inspect_establishments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_read(o.workspace_id)
    )
  );

CREATE POLICY inspect_establishments_insert
  ON public.inspect_establishments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  );

CREATE POLICY inspect_establishments_update
  ON public.inspect_establishments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  );

CREATE POLICY inspect_client_establishments_select
  ON public.inspect_client_establishments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_read(o.workspace_id)
    )
  );

CREATE POLICY inspect_client_establishments_insert
  ON public.inspect_client_establishments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  );

CREATE POLICY inspect_client_establishments_update
  ON public.inspect_client_establishments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspect_organisations o
      WHERE o.id = inspect_organisation_id
        AND private.workspace_can_write(o.workspace_id)
    )
  );

COMMENT ON TABLE public.inspect_organisations IS
  'Organização Inspect associada a um workspace Core; não concede acesso externo.';
COMMENT ON TABLE public.inspect_clients IS
  'Carteira de clientes da organização Inspect; acesso limitado ao workspace.';
COMMENT ON TABLE public.inspect_establishments IS
  'Estabelecimentos geridos pela organização Inspect.';
COMMENT ON TABLE public.inspect_client_establishments IS
  'Histórico temporal de associação cliente/estabelecimento; sem sobreposição de vigências.';
