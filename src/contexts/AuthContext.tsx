import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    await supabase.auth.signOut();
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
