import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { clearPersistedAuthSession, supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authEventVersion = 0;

    // Subscribe first so auth changes cannot be missed while the initial
    // session is being loaded.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1;

      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    // A newer auth event takes precedence over this initial snapshot.
    const versionAtRequest = authEventVersion;

    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!isMounted || authEventVersion !== versionAtRequest) return;

        if (error) {
          setSession(null);
          setUser(null);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted || authEventVersion !== versionAtRequest) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      // A failed Auth API request must not leave the current account cached in
      // the browser. The user needs to be able to switch accounts immediately.
      if (error) {
        console.warn('Logout remoto falhou; a sessão local será removida.', error);
        await clearPersistedAuthSession();
      }
    } catch (error) {
      console.warn('Logout remoto lançou um erro; a sessão local será removida.', error);
      await clearPersistedAuthSession();
    } finally {
      // Keep the UI correct even if the storage event is delayed by a Preview
      // auth broker or is not delivered after a failed request.
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
