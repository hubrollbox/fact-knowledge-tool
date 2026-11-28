import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrecosUtilizacao() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">
        <section className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-4xl space-y-6 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">FKT · Condições de utilização</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Preços e utilização</h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Informação clara sobre o modelo de acesso, os planos e os custos da plataforma FKT.
            </p>
            <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-card p-4 text-left">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm leading-6">
                Os preços finais e os limites de cada plano ainda não estão publicados. Estão em validação no âmbito do piloto FKT Works. Não apresentamos valores indicativos como se fossem preços contratualizados.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/30 px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Como está pensado o acesso</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>O modelo comercial em avaliação é de subscrição, tendo o workspace como unidade comercial de referência.</p>
                <p>Os planos conceptuais — Individual, Profissional, Equipa e Empresa — ainda não têm preços nem limites finais aprovados para publicação.</p>
                <p>A utilização de módulos depende do estado de disponibilidade de cada módulo e das permissões atribuídas no workspace.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>O que será explicado em cada plano</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                {['Número de utilizadores incluídos e regras para membros adicionais', 'Módulos e funcionalidades disponíveis', 'Limites de obras, armazenamento e documentos, se aplicáveis', 'Exportações, suporte e condições de utilização', 'Periodicidade, renovação e cancelamento'].map(item => (
                  <div key={item} className="flex items-start gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /><span>{item}</span></div>
                ))}
                <p>Estes pontos serão publicados quando estiverem definidos e corresponderem a limites efectivamente aplicados na aplicação.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-5 px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Interessado no piloto FKT Works?</h2>
          <p className="text-muted-foreground">O piloto permite validar a utilização real com fiscais de obra e pequenas equipas antes da definição final das condições comerciais.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild><Link to="/modulos/obras#pedido-piloto">Pedir acesso ao piloto <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link to="/ajuda-suporte">Consultar ajuda e suporte</Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
