import type { Database } from '@/integrations/supabase/types';

export type Animal = Database['public']['Tables']['canil_animais']['Row'];
export type AnimalResumo = Pick<Animal, 'id' | 'nome' | 'raca' | 'foto_url'>;
export type AnimalInsert = Database['public']['Tables']['canil_animais']['Insert'];
export type AnimalUpdate = Omit<Database['public']['Tables']['canil_animais']['Update'], 'workspace_id'>;

export type Cachorro = Database['public']['Tables']['canil_cachorros']['Row'];
export type CachorroInsert = Omit<Database['public']['Tables']['canil_cachorros']['Insert'], 'workspace_id'>;
export type CachorroUpdate = Omit<Database['public']['Tables']['canil_cachorros']['Update'], 'workspace_id'>;

export type RegistoClinico = Database['public']['Tables']['canil_registos_clinicos']['Row'];
export type RegistoClinicoInsert = Database['public']['Tables']['canil_registos_clinicos']['Insert'];
export type RegistoClinicoUpdate = Omit<Database['public']['Tables']['canil_registos_clinicos']['Update'], 'workspace_id'>;

export type Ninhada = Database['public']['Tables']['canil_ninhadas']['Row'];
export type NinhadaInsert = Database['public']['Tables']['canil_ninhadas']['Insert'];
export type NinhadaUpdate = Omit<Database['public']['Tables']['canil_ninhadas']['Update'], 'workspace_id'>;

export type Reserva = Database['public']['Tables']['canil_reservas']['Row'];
export type ReservaInsert = Database['public']['Tables']['canil_reservas']['Insert'];
export type ReservaUpdate = Omit<Database['public']['Tables']['canil_reservas']['Update'], 'workspace_id'>;
export type ReservaComAnimal = Reserva & { animal: AnimalResumo | null };
export type RegistoClinicoComAnimal = RegistoClinico & { animal: AnimalResumo | null };
export type NinhadaComProgenitores = Ninhada & {
  mae: Pick<Animal, 'id' | 'nome'> | null;
  pai: Pick<Animal, 'id' | 'nome'> | null;
};
