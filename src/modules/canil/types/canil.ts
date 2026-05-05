import type { Database } from '@/integrations/supabase/types';

export type Animal = Database['public']['Tables']['canil_animais']['Row'];
export type AnimalInsert = Database['public']['Tables']['canil_animais']['Insert'];
export type AnimalUpdate = Database['public']['Tables']['canil_animais']['Update'];

export type RegistoClinico = Database['public']['Tables']['canil_registos_clinicos']['Row'];
export type RegistoClinicoInsert = Database['public']['Tables']['canil_registos_clinicos']['Insert'];

export type Ninhada = Database['public']['Tables']['canil_ninhadas']['Row'];
export type Reserva = Database['public']['Tables']['canil_reservas']['Row'];
