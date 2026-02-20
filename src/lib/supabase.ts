import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | boolean | undefined>;

function getEnv(key: string): string | undefined {
  const value = env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPlaceholder(value?: string) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return (
    normalized.includes('placeholder') ||
    normalized.includes('seu-projeto') ||
    normalized.includes('seu_anon_ou_publishable_key') ||
    normalized.includes('your-project') ||
    normalized.includes('your_anon_or_publishable_key') ||
    normalized.includes('change-me')
  );
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

const missingUrl = !supabaseUrl;
const missingKey = !supabaseAnonKey;
const invalidUrl = !missingUrl && isPlaceholder(supabaseUrl);
const invalidKey = !missingKey && isPlaceholder(supabaseAnonKey);

export const supabaseReady = !(missingUrl || missingKey || invalidUrl || invalidKey);

export const supabaseConfigError = supabaseReady
  ? null
  : 'Credenciais Supabase ausentes ou inválidas. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local e reinicie o servidor.';

if (!supabaseReady) {
  const issues = [
    missingUrl ? 'VITE_SUPABASE_URL em falta' : null,
    missingKey ? 'VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY em falta' : null,
    invalidUrl ? 'VITE_SUPABASE_URL com valor placeholder' : null,
    invalidKey ? 'VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY com valor placeholder' : null,
  ]
    .filter(Boolean)
    .join('; ');

  console.warn(`[FKT] Supabase config inválida: ${issues}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(
  supabaseReady ? (supabaseUrl as string) : 'https://placeholder.supabase.co',
  supabaseReady ? (supabaseAnonKey as string) : 'placeholder-key'
) as any;
