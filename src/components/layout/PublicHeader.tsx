import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight">FKT</Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Navegação principal">
          <Button asChild variant="ghost" size="sm"><Link to="/">Início</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/modulos">Módulos</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/ajuda-suporte">Ajuda e Suporte</Link></Button>
          <Button asChild size="sm">
            <Link to={user ? '/dashboard' : '/login'}>{user ? 'Ir para a aplicação' : 'Entrar'}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
