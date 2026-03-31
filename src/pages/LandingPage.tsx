import { Link } from 'react-router-dom';
import { Scale, FileText, BookOpen, Timer, Mail, BarChart3, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';

const services = [
  {
    icon: Scale,
    title: 'Gestão de Processos',
    description: 'Organize todos os seus processos com factos, documentos, issues e cronologia num único lugar.',
  },
  {
    icon: FileText,
    title: 'Documentos & Factos',
    description: 'Registe factos relevantes, associe documentos e construa a sua argumentação de forma estruturada.',
  },
  {
    icon: BookOpen,
    title: 'Base de Conhecimento',
    description: 'Crie disciplinas e tópicos de referência para consultar a qualquer momento.',
  },
  {
    icon: Timer,
    title: 'Countdowns & Prazos',
    description: 'Nunca perca um prazo — acompanhe datas-limite com contagens regressivas visuais.',
  },
  {
    icon: Mail,
    title: 'Integração de Email',
    description: 'Conecte o Gmail para monitorizar emails não lidos diretamente do dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Tesouraria & Relatórios',
    description: 'Controle receitas e despesas com visão clara da saúde financeira do seu escritório.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">Workoffice</span>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20 md:py-32">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground mb-2">
            <Shield className="h-3 w-3" />
            Plataforma segura e privada
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            O seu escritório,
            <br />
            <span className="text-muted-foreground">simplificado.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Gerencie processos, documentos, prazos e conhecimento jurídico numa plataforma integrada — desenhada para profissionais exigentes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/login">
                Começar agora
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#servicos">Ver serviços</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="border-t border-border bg-secondary/30 px-6 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Tudo o que precisa</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Ferramentas integradas para cada aspeto do seu trabalho.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, title, description }) => (
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

      {/* CTA */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Pronto para organizar o seu escritório?
          </h2>
          <p className="text-muted-foreground">
            Crie a sua conta gratuitamente e comece a gerir processos em minutos.
          </p>
          <Button asChild size="lg">
            <Link to="/login">
              Criar conta gratuita
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
