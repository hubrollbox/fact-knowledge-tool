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
          <p>Recolhemos apenas os dados necessários ao funcionamento do serviço: email, dados de processos e documentos inseridos pelo utilizador.</p>
          <h2 className="text-lg font-semibold">2. Finalidade</h2>
          <p>Os dados são utilizados exclusivamente para fornecer as funcionalidades da plataforma FKT.</p>
          <h2 className="text-lg font-semibold">3. Armazenamento</h2>
          <p>Os dados são armazenados de forma segura utilizando infraestrutura Supabase com encriptação em repouso e em trânsito.</p>
          <h2 className="text-lg font-semibold">4. Pedidos de acesso ao piloto</h2>
          <p>Quando solicita acesso ao piloto FKT Obras, recolhemos o nome, endereço de email, função ou empresa e número aproximado de obras acompanhadas. Recolhemos também a confirmação de consentimento e a data em que foi prestada.</p>
          <p>Estes dados são utilizados para analisar o pedido e, quando adequado, contactar a pessoa interessada sobre o piloto. O envio do formulário não cria uma conta nem garante a participação.</p>
          <h2 className="text-lg font-semibold">5. Direitos do titular dos dados</h2>
          <p>Pode solicitar o acesso, a rectificação ou o apagamento dos dados, bem como retirar o consentimento. A identificação do responsável pelo tratamento e o respectivo contacto devem ser consultados junto da entidade que opera o FKT.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
