import { Link, useParams, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { getModulo } from '@/data/modulos';
import { Footer } from '@/components/layout/Footer';
import { ModuloIcon } from '@/components/modulos/ModuloIcon';
import { ModuloCTA } from '@/components/modulos/ModuloCTA';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ModuloDetalhe() {
  const { slug } = useParams();
  const modulo = slug ? getModulo(slug) : undefined;

  useEffect(() => {
    if (!modulo) return;
    document.title = `${modulo.nome} — Módulo FKT`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', modulo.tagline ?? modulo.descricao);
  }, [modulo]);

  if (!modulo) return <Navigate to="/modulos" replace />;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${modulo.nome} — FKT`,
    applicationCategory: 'BusinessApplication',
    description: modulo.tagline ?? modulo.descricao,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight">FKT</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/modulos" className="text-muted-foreground hover:text-foreground">Módulos</Link>
            <Link to="/login" className="text-muted-foreground hover:text-foreground">Entrar</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-6 text-sm text-muted-foreground flex items-center gap-2">
          <Link to="/modulos" className="hover:text-foreground">Módulos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{modulo.nome}</span>
        </div>

        {/* HERO */}
        <section className="max-w-4xl mx-auto px-6 py-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-secondary">
            <ModuloIcon name={modulo.icone} className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{modulo.nome}</h1>
          {modulo.tagline && (
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">{modulo.tagline}</p>
          )}
          <div className="flex justify-center pt-2">
            <ModuloCTA modulo={modulo} />
          </div>
        </section>

        {/* DESCRIÇÃO */}
        {modulo.descricaoLonga && (
          <section className="max-w-3xl mx-auto px-6 py-12 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">O que é</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {modulo.descricaoLonga.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>
        )}

        {/* FUNCIONALIDADES */}
        {modulo.funcionalidades && (
          <section className="bg-secondary/30 border-t border-border">
            <div className="max-w-5xl mx-auto px-6 py-16">
              <h2 className="text-2xl font-bold mb-8 text-center">Funcionalidades</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modulo.funcionalidades.map((f) => (
                  <Card key={f.titulo}>
                    <CardHeader className="space-y-2">
                      <ModuloIcon name={f.icone} className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{f.titulo}</CardTitle>
                      <CardDescription>{f.descricao}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FLUXO */}
        {modulo.fluxo && (
          <section className="max-w-3xl mx-auto px-6 py-16 border-t border-border">
            <h2 className="text-2xl font-bold mb-8 text-center">Fluxo típico</h2>
            <ol className="space-y-4">
              {modulo.fluxo.map((p, i) => (
                <li key={p.titulo} className="flex gap-4">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{p.descricao}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* FAQ */}
        {modulo.faq && modulo.faq.length > 0 && (
          <section className="bg-secondary/30 border-t border-border">
            <div className="max-w-3xl mx-auto px-6 py-16">
              <h2 className="text-2xl font-bold mb-8 text-center">Perguntas frequentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {modulo.faq.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger>{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        )}

        {/* CTA FINAL */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6 border-t border-border">
          <h2 className="text-3xl font-bold tracking-tight">Pronto para começar?</h2>
          <p className="text-muted-foreground">Activa o módulo {modulo.nome} no teu workspace em segundos.</p>
          <div className="flex justify-center"><ModuloCTA modulo={modulo} /></div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
