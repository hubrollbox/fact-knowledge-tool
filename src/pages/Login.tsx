import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseReady } from '@/lib/supabase';

function formatAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email ou palavra-passe inválidos.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'A conta ainda não foi confirmada. Verifique o seu email.';
  }

  return message;
}

export default function Login() {
  const { user, signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!supabaseReady) {
      setError('Autenticação indisponível: faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setSubmitting(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(formatAuthError(error.message));
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(formatAuthError(error.message));
      else setSuccess('Conta criada! Verifique o seu email para confirmar o registo.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <Scale className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">FKT</h1>
          <p className="text-sm text-muted-foreground mt-1">Factual Knowledge Tool</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Aceda à sua conta FKT'
                : 'Registe-se para começar a usar o FKT'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!supabaseReady && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  Login desativado. Configure as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong>.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.pt"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md">
                  {success}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting || !supabaseReady}>
                {submitting ? 'A processar...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null); }}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                {mode === 'login' ? 'Não tem conta? Registe-se' : 'Já tem conta? Entre'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
