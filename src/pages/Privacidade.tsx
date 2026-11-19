import { Footer } from '@/components/layout/Footer';

export default function Privacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: Novembro 2026</p>
        <div className="prose prose-sm text-foreground space-y-4">
          <p>A sua privacidade é importante para nós. Esta política descreve como recolhemos, utilizamos e protegemos os seus dados pessoais.</p>
          <h2 className="text-lg font-semibold">1. Dados recolhidos</h2>
          <p>Consoante a utilização da plataforma, podem ser tratados dados de conta, informação e documentos introduzidos nos módulos e, no formulário do piloto, os dados de contacto indicados nesta política.</p>
          <h2 className="text-lg font-semibold">2. Finalidade</h2>
          <p>Os dados da plataforma são utilizados para disponibilizar as funcionalidades solicitadas. Os dados do formulário do piloto são utilizados para analisar o pedido e, quando adequado, contactar a pessoa interessada.</p>
          <h2 className="text-lg font-semibold">3. Armazenamento</h2>
          <p>Os dados do formulário são armazenados na base de dados Supabase associada ao FKT. O acesso público está limitado à submissão de pedidos; a consulta dos registos não é disponibilizada através da API pública.</p>
          <h2 className="text-lg font-semibold">4. Pedidos de acesso ao piloto</h2>
          <p>Quando solicita acesso ao piloto FKT Obras, recolhemos o nome, endereço de email, função ou empresa e número aproximado de obras acompanhadas. Recolhemos também a confirmação de consentimento e a data em que foi prestada.</p>
          <p>Estes dados são utilizados para analisar o pedido e, quando adequado, contactar a pessoa interessada sobre o piloto. O envio do formulário não cria uma conta nem garante a participação. Os pedidos são mantidos enquanto forem necessários para gerir o processo de selecção e contacto do piloto.</p>
          <h2 className="text-lg font-semibold">5. Direitos do titular dos dados</h2>
          <p>Pode solicitar o acesso, a rectificação ou o apagamento dos dados, bem como retirar o consentimento. A identificação do responsável pelo tratamento e o respectivo contacto devem ser consultados junto da entidade que opera o FKT.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
