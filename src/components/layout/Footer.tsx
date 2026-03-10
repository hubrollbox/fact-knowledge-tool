import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-4 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="italic tracking-wide">Scientia potentia est</p>
        <nav className="flex items-center gap-4">
          <Link to="/termos" className="hover:text-foreground transition-colors">
            Termos e Condições
          </Link>
          <Link to="/privacidade" className="hover:text-foreground transition-colors">
            Política de Privacidade
          </Link>
          <Link to="/licenca" className="hover:text-foreground transition-colors">
            Licença
          </Link>
        </nav>
      </div>
    </footer>
  );
}
