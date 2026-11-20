import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { ModuloSlug } from '@/types/modulos';
import { modulos } from '@/data/modulos';

export function ProtectedRoute({ children, module }: { children: React.ReactNode; module?: ModuloSlug }) {
  const { user, loading: authLoading } = useAuth();
  const { workspace, moduloSlug, isLoading: workspaceLoading } = useModuloActivo();

  if (authLoading || (user && workspaceLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!workspace || !moduloSlug) return <Navigate to="/configuracao-inicial" replace />;

  if (module && moduloSlug !== module) {
    const activeModule = modulos.find((item) => item.slug === moduloSlug);
    return <Navigate to={activeModule?.rotaPrincipal ?? '/dashboard'} replace />;
  }

  return <>{children}</>;
}
