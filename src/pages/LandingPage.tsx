import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  async function handlePilotRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from('pilot_access_requests').insert({
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim().toLowerCase(),
      role_company: String(form.get('role_company') ?? '').trim(),
      works_count: Number(form.get('works_count')),
      privacy_consent: form.get('privacy_consent') === 'on',
      privacy_consent_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      setFormError('Não foi possível enviar o pedido. Verifica os dados e tenta novamente.');
      return;
    }
    setSubmitted(true);
    event.currentTarget.reset();
  }
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* HEADER */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">FKT</span>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/modulos">Módulos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
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
            Factos registados.
            <br />
            Nada perdido.
            <br />
            <span className="text-muted-foreground">Decisões justificadas.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Regista a visita no terreno, organiza a análise e acompanha as decisões. O primeiro módulo do FKT é dedicado à fiscalização de obras.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href="#pedido-piloto">Pedir acesso ao piloto <ArrowRight className="h-4 w-4 ml-2" /></a>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </div>
      </section>

      {/* FKT OBRAS */}
      <section className="border-t border-border px-6 py-20 md:py-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="inline-block text-[11px] uppercase tracking-wider border border-border rounded-full px-3 py-1 text-muted-foreground">
              Primeiro módulo · Piloto fechado
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">FKT Obras</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em vez de reconstruir uma visita a partir de fotografias, WhatsApp e Word, o técnico regista os factos no momento,
              organiza a análise e gera um relatório partilhável com ações, responsáveis e prazos.
            </p>
            <p className="text-sm text-muted-foreground">
              Não é um ERP nem gere toda a obra. É uma camada simples de evidência, decisão e seguimento.
            </p>
            <Button asChild variant="outline">
              <Link to="/modulos/obras">
                Conhecer o FKT Obras
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <ol className="border border-border rounded-lg bg-card divide-y divide-border text-sm">
            {[
              ['Obra', 'Cliente, morada e responsável'],
              ['Visita', 'Data, hora e notas gerais'],
              ['Ocorrência', 'Fotografia e descrição curta'],
              ['Análise', 'Referências e fundamentação'],
              ['Decisão', 'Orientação técnica'],
              ['Ação', 'Responsável e prazo'],
              ['Acompanhamento', 'Ações, responsáveis e prazos'],
            ].map(([t, d], i) => (
              <li key={t} className="flex items-center gap-4 px-5 py-3">
                <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                <span className="font-medium">{t}</span>
                <span className="text-muted-foreground ml-auto text-right">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PEDIDO DE ACESSO AO PILOTO */}
      <section id="pedido-piloto" className="border-t border-border px-6 py-20 md:py-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <span className="inline-block text-[11px] uppercase tracking-wider border border-border rounded-full px-3 py-1 text-muted-foreground">FKT Obras · Piloto fechado</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Pedir acesso ao piloto</h2>
            <p className="text-muted-foreground">Estamos a reunir fiscais e equipas de fiscalização para testar o fluxo de registo de visitas, ocorrências e acompanhamento de ações.</p>
          </div>
          {submitted ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2" role="status">
              <h3 className="font-semibold">Pedido recebido</h3>
              <p className="text-sm text-muted-foreground">Obrigado pelo interesse. Os dados foram registados para análise e eventual contacto.</p>
            </div>
          ) : (
            <form onSubmit={handlePilotRequest} className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="pilot-name" className="text-sm font-medium">Nome</label>
                <input id="pilot-name" name="name" required minLength={2} maxLength={120} autoComplete="name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label htmlFor="pilot-email" className="text-sm font-medium">Email</label>
                <input id="pilot-email" name="email" type="email" required maxLength={254} autoComplete="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label htmlFor="pilot-role" className="text-sm font-medium">Função / Empresa</label>
                <input id="pilot-role" name="role_company" required minLength={2} maxLength={180} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ex.: Fiscal de obra independente" />
              </div>
              <div className="space-y-1">
                <label htmlFor="pilot-works" className="text-sm font-medium">Quantas obras acompanha habitualmente?</label>
                <select id="pilot-works" name="works_count" required defaultValue="" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="" disabled>Selecciona uma opção</option>
                  <option value="0">Ainda não acompanho obras</option>
                  <option value="1">1</option>
                  <option value="3">2 a 3</option>
                  <option value="5">4 a 5</option>
                  <option value="10">6 a 10</option>
                  <option value="11">Mais de 10</option>
                </select>
              </div>
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="privacy_consent" required className="mt-0.5" />
                <span>Autorizo o tratamento destes dados para análise do pedido e eventual contacto sobre o piloto. Consulte a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.</span>
              </label>
              {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? 'A enviar…' : 'Enviar pedido'}</Button>
              <p className="text-xs text-muted-foreground">O envio do pedido não garante acesso ao piloto nem cria uma conta.</p>
            </form>
          )}
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

      {/* ESTRUTURA */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Estrutura do sistema
          </h2>

          <p className="text-muted-foreground">
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

      {/* APLICAÇÃO */}
      <section className="px-6 py-20 md:py-28 border-t border-border">
        <div className="max-w-3xl mx-auto text-center space-y-6">

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Aplicável a qualquer área
          </h2>

          <p className="text-muted-foreground">
            Pode ser utilizado em qualquer contexto onde exista necessidade de organizar informação e tomar decisões com base em regras ou evidência.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 text-sm text-left">
            <div className="border border-border rounded-lg p-4 bg-card">Jurídico, compliance e auditoria</div>
            <div className="border border-border rounded-lg p-4 bg-card">Saúde humana e veterinária</div>
            <div className="border border-border rounded-lg p-4 bg-card">Gestão, estratégia e operações</div>
            <div className="border border-border rounded-lg p-4 bg-card">Engenharia, qualidade e indústria</div>
            <div className="border border-border rounded-lg p-4 bg-card">Tecnologia e análise de incidentes</div>
            <div className="border border-border rounded-lg p-4 bg-card">Educação, investigação e estudo</div>
          </div>

        </div>
      </section>

      {/* PORQUE FUNCIONA */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">

          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Porque funciona
          </h2>

          <div className="text-left border border-border rounded-lg p-6 bg-card space-y-2 text-sm">
            <p>• Separa informação de interpretação</p>
            <p>• Obriga a definir claramente o problema</p>
            <p>• Baseia decisões em referências objetivas</p>
            <p>• Regista o raciocínio de forma estruturada</p>
            <p>• Permite justificar e rever decisões</p>
          </div>

          <p className="text-muted-foreground">
            O resultado é um sistema de decisão claro, consistente e rastreável.
          </p>

        </div>
      </section>

      {/* CTA */}
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