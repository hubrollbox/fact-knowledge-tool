import { Footer } from '@/components/layout/Footer';

export default function Termos() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Termos e Condições de Utilização</h1>
        <p className="text-sm text-muted-foreground">Última atualização: Março 2026</p>
        <div className="prose prose-sm text-foreground space-y-4">
          <p>Ao utilizar a plataforma FKT — Factual Knowledge Tool, o utilizador aceita os presentes termos e condições na sua totalidade.</p>
          <h2 className="text-lg font-semibold">1. Objeto</h2>
          <p>O FKT é uma ferramenta de gestão de conhecimento factual destinada a profissionais do direito.</p>
          <h2 className="text-lg font-semibold">2. Conta de utilizador</h2>
          <p>O acesso à plataforma requer registo com email e palavra-passe. O utilizador é responsável pela confidencialidade das suas credenciais.</p>
          <h2 className="text-lg font-semibold">3. Utilização aceitável</h2>
          <p>O utilizador compromete-se a utilizar a plataforma de forma lícita e conforme as boas práticas profissionais.</p>
          <h2 className="text-lg font-semibold">4. Propriedade intelectual</h2>
          <p>Todo o conteúdo inserido pelo utilizador permanece sua propriedade. O código e design da plataforma são propriedade dos seus autores.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
