import { PublicHeader } from '@/components/layout/PublicHeader';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, FolderKanban, ShieldCheck, Network, FileText, Dog, Code, HardHat, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';

const principles = [
  {
    icon: FolderKanban,
    title: 'Um workspace principal',
    description: 'Cada conta trabalha num espaço de trabalho central, com a sua equipa e informação organizada.',
  },
  {
    icon: Boxes,
    title: 'Módulos especializados',
    description: 'O FKT reúne módulos distintos. Cada um responde às necessidades próprias da sua área.',
  },
  {
    icon: ShieldCheck,
    title: 'Acesso e permissões',
    description: 'A informação é disponibilizada de acordo com as permissões atribuídas a cada membro.',
  },
  {
    icon: Network,
    title: 'Estrutura e rastreabilidade',
    description: 'Registos, documentos, decisões e ações mantêm-se ligados ao respetivo contexto.',
  },
];

const modules = [
  {
    name: 'FKT Works',
    description: 'Registo de visitas, ocorrências e acompanhamento de ações de fiscalização.',
    status: 'Piloto fechado',
    icon: HardHat,
    href: '/modulos/obras',
  },
  {
    name: 'FKT Lex',
    description: 'Organização de processos, factos, documentos e prazos.',
    status: 'Em preparação',
    icon: FileText,
    href: '/modulos/juridico',
  },
  {
    name: 'FKT Vet',
    description: 'Gestão de informação sobre animais, registos e ninhadas.',
    status: 'Em preparação',
    icon: Dog,
    href: '/modulos/canil',
  },
  {
    name: 'FKT Dev',
    description: 'Organização de projetos, tarefas, issues e decisões técnicas.',
    status: 'Em preparação',
    icon: Code,
    href: '/modulos/dev',
  },
  {
    name: 'FKT Inspect',
    description: 'Auditorias, evidências e acompanhamento de não conformidades.',
    status: 'Planeado',
    icon: ClipboardCheck,
    href: '/modulos/inspect',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1">
        <section className="px-6 py-24 md:py-36">
          <div className="max-w-4xl mx-auto text-center space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              Uma plataforma. Diferentes áreas de trabalho.
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Factos organizados.
              <br />
              <span className="text-muted-foreground">Conhecimento estruturado.</span>
              <br />
              Decisões com contexto.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              O FKT é uma plataforma de trabalho estruturado que reúne módulos especializados numa base comum de organização, acesso e rastreabilidade.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="#modulos">Explorar módulos <ArrowRight className="h-4 w-4 ml-2" /></a>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#core">Conhecer o FKT Core</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="core" className="border-t border-border bg-secondary/30 px-6 py-20 md:py-24">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">A plataforma</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">O FKT Core</h2>
              <p className="text-muted-foreground leading-relaxed">
                O Core é a base comum da plataforma. Dá estrutura ao workspace, à equipa, às permissões e à forma como cada módulo é utilizado, sem misturar os dados e os processos próprios de cada área.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {principles.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-lg border border-border bg-card p-6">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Uma experiência comum, com módulos independentes</h2>
            <p className="text-muted-foreground leading-relaxed">
              A conta utiliza um workspace principal e seleciona um módulo de cada vez. A navegação e a gestão do espaço são comuns; as funcionalidades e os dados de cada módulo mantêm-se separados.
            </p>
          </div>
        </section>

        <section id="modulos" className="border-t border-border bg-secondary/30 px-6 py-20 md:py-24">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Áreas de aplicação</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Módulos FKT</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cada módulo tem uma página própria, onde são explicadas as suas funcionalidades, o seu âmbito e o seu estado de desenvolvimento.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {modules.map(({ name, description, status, icon: Icon, href }) => (
                <article key={name} className="flex flex-col rounded-lg border border-border bg-card p-6">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{name}</h3>
                  {status && <span className="mt-1 w-fit rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{status}</span>}
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 flex-1">{description}</p>
                  <Button asChild variant="outline" className="mt-5 w-full">
                    <Link to={href}>Conhecer módulo <ArrowRight className="h-4 w-4 ml-2" /></Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Uma base. Diferentes formas de trabalhar.</h2>
            <p className="text-muted-foreground leading-relaxed">
              O FKT procura reduzir a dispersão da informação e preservar o contexto que permite compreender, acompanhar e rever o trabalho realizado. O detalhe de cada processo pertence ao módulo correspondente.
            </p>
            <Button asChild size="lg">
              <Link to="/modulos">Ver todos os módulos <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
