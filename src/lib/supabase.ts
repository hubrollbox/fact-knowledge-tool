import { createClient } from '@supabase/supabase-js';

function readEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = (import.meta.env as Record<string, string | boolean | undefined>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function looksLikePlaceholder(value?: string) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return (
    normalized.includes('placeholder') ||
    normalized.includes('seu-') ||
    normalized.includes('your-') ||
    normalized.includes('change-me') ||
    normalized.includes('example')
  );
}

const supabaseUrl = readEnv(['VITE_SUPABASE_URL', 'SUPABASE_URL']);
const supabaseAnonKey = readEnv([
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
]);

export const supabaseReady = !!(supabaseUrl && supabaseAnonKey) && !looksLikePlaceholder(supabaseUrl) && !looksLikePlaceholder(supabaseAnonKey);

export const supabaseConfigError = supabaseReady
  ? null
  : 'As credenciais Supabase não estão configuradas corretamente neste ambiente.';

if (!supabaseReady) {
  console.warn(
    '[FKT] Supabase credentials missing/invalid. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(
  supabaseReady ? (supabaseUrl as string) : 'https://placeholder.supabase.co',
  supabaseReady ? (supabaseAnonKey as string) : 'placeholder-key'
) as any;
