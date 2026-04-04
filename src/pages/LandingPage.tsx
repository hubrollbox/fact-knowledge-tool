import { Link } from 'react-router-dom';
import { FileText, BookOpen, Timer, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';

const sections = [
  {
    icon: FileText,
    title: 'Dossiers',
    description: 'Cada assunto é organizado num dossier com toda a informação relevante num único lugar.',
  },
  {
    icon: BookOpen,
    title: 'Estrutura',
    description: 'A informação é organizada em contexto, problema, referências, análise e decisão.',
  },
  {
    icon: Timer,
    title: 'Ações e controlo',
    description: 'Cada dossier tem ações associadas para garantir execução e controlo de prazos.',
  },
  {
    icon: Shield,
    title: 'Decisão',
    description: 'Toda a informação converge para uma decisão clara e fundamentada.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      
      {/* HEADER */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">FKT</span>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="flex-1 flex items-center justify-center px-6 py-20 md:py-32">
        <div className="max-w-3xl text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-2">
            <Shield className="h-3 w-3" />
            Sistema privado e estruturado
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Processos organizados.
            <br />
            Nada perdido.
            <br />
            <span className="text-muted-foreground">Decisões justificadas.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Sistema para organizar dossiers, estruturar informação e tomar decisões com base em dados claros.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/login">
                Entrar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-border bg-secondary/30 px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Como funciona
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Um sistema simples baseado em dossiers, estrutura e ação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sections.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-lg border border-border bg-card p-6 transition-all hover:shadow-md hover:border-foreground/20"
              >
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESTRUTURA DO SISTEMA */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Estrutura do sistema
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            Cada dossier é organizado em cinco elementos fundamentais:
          </p>

          <div className="text-left border border-border rounded-lg p-6 bg-card space-y-2 text-sm">
            <p><strong>Contexto:</strong> enquadramento da situação</p>
            <p><strong>Problema:</strong> questão a resolver</p>
            <p><strong>Referências:</strong> regras, normas ou informação relevante</p>
            <p><strong>Análise:</strong> interpretação da informação</p>
            <p><strong>Decisão:</strong> conclusão fundamentada</p>
          </div>

          <p className="text-muted-foreground">
            Evita perda de informação, reduz erros e permite justificar qualquer decisão com base no que foi registado.
          </p>

        </div>
      </section>

      {/* EXEMPLO */}
      <section className="px-6 py-20 md:py-28 border-t border-border">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Exemplo simples
          </h2>

          <p className="text-muted-foreground">
            Processo de compra de equipamento:
          </p>

          <div className="text-left border border-border rounded-lg p-6 bg-card space-y-2 text-sm">
            <p><strong>Contexto:</strong> necessidade de equipamento com orçamento limitado</p>
            <p><strong>Problema:</strong> escolher fornecedor adequado</p>
            <p><strong>Referências:</strong> orçamento disponível, propostas recebidas</p>
            <p><strong>Análise:</strong> comparação entre preço, prazo e qualidade</p>
            <p><strong>Decisão:</strong> selecionar fornecedor com melhor equilíbrio custo-benefício</p>
          </div>

        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-20 md:py-28 border-t border-border">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Um sistema simples para controlar processos e decisões
          </h2>

          <p className="text-muted-foreground">
            O FKT está em desenvolvimento e em uso real. Esta página serve para explicar o conceito e a estrutura do sistema.
          </p>

          <Button asChild size="lg">
            <Link to="/login">
              Entrar no sistema
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>

        </div>
      </section>

      <Footer />
    </div>
  );
}