-- FKT Inspect — Phase 1: base entities and deny-by-default isolation.
-- Replaces the former monolithic foundation draft.
-- Local/CI validation only. Do not apply remotely without explicit approval.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

-- Preserve existing Core module values and add Inspect.
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

CREATE TABLE public.inspect_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspect_organisation_id uuid NOT NULL REFERENCES public.inspect_organisations(id) ON DELETE RESTRICT,
  party_type text NOT NULL CHECK (party_type IN ('person', 'legal_entity', 'public_entity', 'other')),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 200),
  legal_name text,
  tax_country_code char(2) CHECK (tax_country_code IS NULL OR tax_country_code ~ '^[A-Z]{2}
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

ALTER TABLE public.inspect_clients
  ADD COLUMN party_id uuid NULL,
  ADD CONSTRAINT inspect_clients_party_org_fk
    FOREIGN KEY (party_id, inspect_organisation_id)
    REFERENCES public.inspect_parties (id, inspect_organisation_id)
    ON DELETE RESTRICT;
CREATE INDEX inspect_clients_party_idx
  ON public.inspect_clients (inspect_organisation_id, party_id)
  WHERE party_id IS NOT NULL;

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

ALTER TABLE public.inspect_establishments
  ADD COLUMN operator_party_id uuid NULL,
  ADD COLUMN operator_identification_status text NOT NULL DEFAULT 'pending'
    CHECK (operator_identification_status IN ('pending', 'identified', 'not_applicable')),
  ADD COLUMN operator_verified_at timestamptz NULL,
  ADD COLUMN operator_verified_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT inspect_establishments_operator_party_org_fk
    FOREIGN KEY (operator_party_id, inspect_organisation_id)
    REFERENCES public.inspect_parties (id, inspect_organisation_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT inspect_establishments_operator_identified_check
    CHECK (operator_identification_status <> 'identified' OR operator_party_id IS NOT NULL);
CREATE INDEX inspect_establishments_operator_party_idx
  ON public.inspect_establishments (inspect_organisation_id, operator_party_id)
  WHERE operator_party_id IS NOT NULL;

-- Protect tenant identity and derive audit fields from the authenticated actor.
CREATE OR REPLACE FUNCTION private.inspect_set_actor_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, auth
AS $function$
DECLARE
  _row jsonb := to_jsonb(NEW);
  _old jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);

    IF TG_TABLE_NAME = 'inspect_organisations'
      AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'workspace_id da organização Inspect é imutável'
        USING ERRCODE = 'check_violation';
    END IF;

    IF _row ? 'created_at' THEN
      _row := jsonb_set(_row, '{created_at}', _old->'created_at', true);
    END IF;
    IF _row ? 'created_by' THEN
      _row := jsonb_set(_row, '{created_by}', _old->'created_by', true);
    END IF;
  ELSE
    IF _row ? 'created_at' THEN
      _row := jsonb_set(_row, '{created_at}', to_jsonb(now()), true);
    END IF;
    IF _row ? 'created_by' THEN
      _row := jsonb_set(_row, '{created_by}', to_jsonb((SELECT auth.uid())), true);
    END IF;
  END IF;

  IF _row ? 'updated_at' THEN
    _row := jsonb_set(_row, '{updated_at}', to_jsonb(now()), true);
  END IF;
  IF _row ? 'updated_by' THEN
    _row := jsonb_set(_row, '{updated_by}', to_jsonb((SELECT auth.uid())), true);
  END IF;

  NEW := jsonb_populate_record(NEW, _row);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.inspect_set_actor_fields()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER inspect_organisations_actor_fields
  BEFORE INSERT OR UPDATE ON public.inspect_organisations
  FOR EACH ROW EXECUTE FUNCTION private.inspect_set_actor_fields();

CREATE TRIGGER inspect_clients_actor_fields
  BEFORE INSERT OR UPDATE ON public.inspect_clients
  FOR EACH ROW EXECUTE FUNCTION private.inspect_set_actor_fields();

CREATE TRIGGER inspect_establishments_actor_fields
  BEFORE INSERT OR UPDATE ON public.inspect_establishments
  FOR EACH ROW EXECUTE FUNCTION private.inspect_set_actor_fields();

-- Deny by default until Phase 3 installs the reviewed GRANT and RLS policies.
REVOKE ALL ON TABLE
  public.inspect_organisations,
  public.inspect_parties,
  public.inspect_clients,
  public.inspect_establishments
FROM PUBLIC, anon, authenticated;

ALTER TABLE public.inspect_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_establishments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.inspect_organisations IS
  'Organização Inspect associada a um workspace Core; acesso fechado até à fase de permissões.';
COMMENT ON TABLE public.inspect_parties IS
  'Entidades legais/comerciais locais à organização Inspect; não existe identidade global.';
COMMENT ON TABLE public.inspect_clients IS
  'Carteira de clientes da organização Inspect; acesso fechado por defeito.';
COMMENT ON TABLE public.inspect_establishments IS
  'Estabelecimentos geridos pela organização Inspect; acesso fechado por defeito.';
),
  tax_identifier text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT inspect_parties_id_org_unique UNIQUE (id, inspect_organisation_id)
);

CREATE UNIQUE INDEX inspect_parties_tax_identifier_unique
  ON public.inspect_parties (inspect_organisation_id, coalesce(tax_country_code, ''), lower(btrim(tax_identifier)))
  WHERE tax_identifier IS NOT NULL AND btrim(tax_identifier) <> '';
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

-- Protect tenant identity and derive audit fields from the authenticated actor.
CREATE OR REPLACE FUNCTION private.inspect_set_actor_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, auth
AS $function$
DECLARE
  _row jsonb := to_jsonb(NEW);
  _old jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);

    IF TG_TABLE_NAME = 'inspect_organisations'
      AND NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'workspace_id da organização Inspect é imutável'
        USING ERRCODE = 'check_violation';
    END IF;

    IF _row ? 'created_at' THEN
      _row := jsonb_set(_row, '{created_at}', _old->'created_at', true);
    END IF;
    IF _row ? 'created_by' THEN
      _row := jsonb_set(_row, '{created_by}', _old->'created_by', true);
    END IF;
  ELSE
    IF _row ? 'created_at' THEN
      _row := jsonb_set(_row, '{created_at}', to_jsonb(now()), true);
    END IF;
    IF _row ? 'created_by' THEN
      _row := jsonb_set(_row, '{created_by}', to_jsonb((SELECT auth.uid())), true);
    END IF;
  END IF;

  IF _row ? 'updated_at' THEN
    _row := jsonb_set(_row, '{updated_at}', to_jsonb(now()), true);
  END IF;
  IF _row ? 'updated_by' THEN
    _row := jsonb_set(_row, '{updated_by}', to_jsonb((SELECT auth.uid())), true);
  END IF;

  NEW := jsonb_populate_record(NEW, _row);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.inspect_set_actor_fields()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER inspect_organisations_actor_fields
  BEFORE INSERT OR UPDATE ON public.inspect_organisations
  FOR EACH ROW EXECUTE FUNCTION private.inspect_set_actor_fields();

CREATE TRIGGER inspect_clients_actor_fields
  BEFORE INSERT OR UPDATE ON public.inspect_clients
  FOR EACH ROW EXECUTE FUNCTION private.inspect_set_actor_fields();

CREATE TRIGGER inspect_establishments_actor_fields
  BEFORE INSERT OR UPDATE ON public.inspect_establishments
  FOR EACH ROW EXECUTE FUNCTION private.inspect_set_actor_fields();

-- Deny by default until Phase 3 installs the reviewed GRANT and RLS policies.
REVOKE ALL ON TABLE
  public.inspect_organisations,
  public.inspect_clients,
  public.inspect_establishments
FROM PUBLIC, anon, authenticated;

ALTER TABLE public.inspect_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspect_establishments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.inspect_organisations IS
  'Organização Inspect associada a um workspace Core; acesso fechado até à fase de permissões.';
COMMENT ON TABLE public.inspect_clients IS
  'Carteira de clientes da organização Inspect; acesso fechado por defeito.';
COMMENT ON TABLE public.inspect_establishments IS
  'Estabelecimentos geridos pela organização Inspect; acesso fechado por defeito.';
