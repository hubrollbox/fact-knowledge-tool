import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { modulos } from '@/data/modulos';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Footer } from '@/components/layout/Footer';
import { ModuloIcon } from '@/components/modulos/ModuloIcon';
import { useEffect } from 'react';

export default function ModulosHub() {
  useEffect(() => {
    document.title = 'Módulos — FKT';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Conhece os módulos disponíveis no FKT: Jurídico, Canil & Vet e Desenvolvimento.');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight">FKT</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/modulos" className="text-foreground">Módulos</Link>
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Entrar</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16">
        <div className="text-center space-y-3 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Módulos</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Adapta o FKT ao teu contexto. Escolhe o módulo que melhor reflecte o teu trabalho.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modulos.map((mod) => (
            <Link key={mod.slug} to={`/modulos/${mod.slug}`} className="group">
              <Card className="h-full transition-all group-hover:shadow-md group-hover:border-primary/40">
                <CardHeader className="space-y-3">
                  <ModuloIcon name={mod.icone} className="h-8 w-8 text-primary" />
                  <CardTitle className="flex items-center justify-between">
                    {mod.nome}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription>{mod.tagline ?? mod.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {mod.funcionalidades?.slice(0, 3).map((f) => (
                    <div key={f.titulo} className="flex items-center gap-2 py-1">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
                      {f.titulo}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
