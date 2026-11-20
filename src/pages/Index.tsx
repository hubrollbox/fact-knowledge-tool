import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { modulos } from '@/data/modulos';

export default function Dashboard() {
  const { workspace, moduloSlug, isLoading } = useModuloActivo();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!workspace || !moduloSlug) return <Navigate to="/configuracao-inicial" replace />;
  const modulo = modulos.find(item => item.slug === moduloSlug);
  return <Navigate to={modulo?.rotaPrincipal ?? '/configuracao-inicial'} replace />;
}
