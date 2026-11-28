import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type InspectOrganisation = {
  id: string; workspace_id: string; organisation_type: 'consultant' | 'operator' | 'hybrid';
  display_name: string; status: 'active' | 'suspended' | 'archived';
  created_at: string; created_by: string; updated_at: string; updated_by: string | null;
};
type InspectClient = {
  id: string; inspect_organisation_id: string; display_name: string;
  external_reference: string | null; notes: string | null;
  status: 'active' | 'inactive' | 'archived'; created_at: string; created_by: string;
  updated_at: string; updated_by: string | null;
};
type InspectEstablishment = {
  id: string; inspect_organisation_id: string; display_name: string;
  activity_description: string | null; address_line: string | null; postal_code: string | null;
  locality: string | null; country_code: string; status: 'active' | 'inactive' | 'archived';
  created_at: string; created_by: string; updated_at: string; updated_by: string | null;
};
type InspectClientEstablishment = {
  id: string; inspect_organisation_id: string; client_id: string; establishment_id: string;
  valid_from: string; valid_until: string | null; created_at: string; created_by: string;
};
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type InspectDatabase = {
  public: {
    Tables: {
      inspect_organisations: Table<InspectOrganisation,
        { id?: string; workspace_id: string; organisation_type: InspectOrganisation['organisation_type']; display_name: string; status?: InspectOrganisation['status'] },
        { organisation_type?: InspectOrganisation['organisation_type']; display_name?: string; status?: InspectOrganisation['status'] }>;
      inspect_clients: Table<InspectClient,
        { id?: string; inspect_organisation_id: string; display_name: string; external_reference?: string | null; notes?: string | null; status?: InspectClient['status'] },
        { display_name?: string; external_reference?: string | null; notes?: string | null; status?: InspectClient['status'] }>;
      inspect_establishments: Table<InspectEstablishment,
        { id?: string; inspect_organisation_id: string; display_name: string; activity_description?: string | null; address_line?: string | null; postal_code?: string | null; locality?: string | null; country_code?: string; status?: InspectEstablishment['status'] },
        { display_name?: string; activity_description?: string | null; address_line?: string | null; postal_code?: string | null; locality?: string | null; country_code?: string; status?: InspectEstablishment['status'] }>;
      inspect_client_establishments: Table<InspectClientEstablishment,
        { id?: string; inspect_organisation_id: string; client_id: string; establishment_id: string; valid_from?: string; valid_until?: string | null },
        { valid_until?: string | null }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export const inspectDb = supabase as unknown as SupabaseClient<InspectDatabase>;
export type { InspectOrganisation, InspectClient, InspectEstablishment, InspectClientEstablishment };
