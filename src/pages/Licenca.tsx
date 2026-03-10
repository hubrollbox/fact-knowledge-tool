import { Footer } from '@/components/layout/Footer';

export default function Licenca() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Licença</h1>
        <p className="text-sm text-muted-foreground">Última atualização: Março 2026</p>
        <div className="prose prose-sm text-foreground space-y-4">
          <p>O FKT — Factual Knowledge Tool é disponibilizado sob os seguintes termos de licenciamento.</p>
          <h2 className="text-lg font-semibold">1. Concessão de licença</h2>
          <p>É concedida ao utilizador registado uma licença não exclusiva, intransmissível e revogável para utilizar a plataforma.</p>
          <h2 className="text-lg font-semibold">2. Restrições</h2>
          <p>É proibida a reprodução, engenharia reversa, redistribuição ou sublicenciamento do software sem autorização expressa.</p>
          <h2 className="text-lg font-semibold">3. Isenção de garantia</h2>
          <p>O software é fornecido "tal como está", sem garantias expressas ou implícitas de qualquer natureza.</p>
          <h2 className="text-lg font-semibold">4. Limitação de responsabilidade</h2>
          <p>Os autores não se responsabilizam por danos diretos ou indiretos resultantes da utilização da plataforma.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
