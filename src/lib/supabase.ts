import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

// Warn in dev without crashing the app
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[FKT] Supabase environment variables are not set. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in the project secrets.'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
) as any;

/** True only when both env vars are present and non-empty */
export const supabaseReady = !!(supabaseUrl && supabaseAnonKey);
