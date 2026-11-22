import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function Privacidade() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 19 de novembro de 2026</p>

        <div className="prose prose-sm text-foreground space-y-4">
          <h2 className="text-lg font-semibold">1. Responsável pelo tratamento</h2>
          <p><strong>Entidade ou pessoa responsável:</strong> Bruno Miguel Pinto.</p>
          <p><strong>Morada:</strong> Rua Brito Capelo, Edifício Diplomata, 4450-075 Matosinhos, Portugal.</p>
          <p><strong>Contacto para assuntos de privacidade e exercício de direitos:</strong> brunomiguelpinto@icloud.com.</p>

          <h2 className="text-lg font-semibold">2. Dados pessoais tratados</h2>
          <p>Consoante a utilização da plataforma, podem ser tratados dados de identificação e contacto associados à conta, dados introduzidos pelo utilizador nos módulos do FKT, documentos e ficheiros carregados e informação técnica necessária ao funcionamento e à segurança do serviço.</p>
          <p>No formulário de pedido de acesso ao piloto FKT Works são recolhidos o nome, endereço de email, função ou empresa, número aproximado de obras acompanhadas, bem como a confirmação e a data do consentimento.</p>

          <h2 className="text-lg font-semibold">3. Finalidades e fundamentos do tratamento</h2>
          <ul>
            <li>Gerir contas e disponibilizar as funcionalidades da plataforma solicitadas pelo utilizador;</li>
            <li>Guardar e organizar a informação que o utilizador introduz nos módulos que utiliza;</li>
            <li>Analisar pedidos de acesso ao piloto FKT Works e, quando adequado, contactar os interessados — com fundamento no consentimento prestado no formulário;</li>
            <li>Assegurar a segurança, prevenir utilizações abusivas e manter o funcionamento técnico do serviço, com fundamento que deverá ser determinado e documentado pelo responsável antes da abertura pública.</li>
          </ul>
          <p>O consentimento para o pedido de acesso ao piloto pode ser retirado a qualquer momento, sem afetar a licitude do tratamento realizado antes da retirada. A retirada pode impedir a continuação da análise do pedido ou do contacto associado.</p>

          <h2 className="text-lg font-semibold">4. Destinatários e infraestrutura</h2>
          <p>Os dados do formulário de acesso ao piloto são armazenados na base de dados Supabase associada ao FKT. O projeto está alojado na região eu-west-1. O acesso público à tabela de pedidos está limitado à submissão de registos; a consulta não é disponibilizada através da API pública.</p>
          <p>Os dados poderão ser tratados por prestadores de serviços técnicos que assegurem alojamento, armazenamento, manutenção ou segurança, apenas na medida necessária à prestação desses serviços e mediante as garantias contratuais aplicáveis. O responsável pelo tratamento deve manter identificados os prestadores e avaliar eventuais transferências de dados para fora do Espaço Económico Europeu.</p>

          <h2 className="text-lg font-semibold">5. Prazo de conservação</h2>
          <p>Os dados são conservados apenas durante o período necessário às finalidades para que foram recolhidos. Os dados dos pedidos de acesso ao piloto serão conservados durante 12 meses após o último contacto relacionado com o pedido. Findo esse prazo, serão apagados ou anonimizados, salvo se existir uma obrigação legal que imponha a sua conservação por período superior.</p>

          <h2 className="text-lg font-semibold">6. Direitos dos titulares</h2>
          <p>Nos termos da legislação aplicável, pode solicitar o acesso aos seus dados, a sua retificação ou apagamento, a limitação do tratamento e, quando aplicável, a portabilidade ou oposição. Quando o tratamento se baseie no consentimento, pode retirá-lo a qualquer momento.</p>
          <p>Para exercer estes direitos, utilize o contacto indicado na secção 1. Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em <a href="https://www.cnpd.pt/" target="_blank" rel="noreferrer">www.cnpd.pt</a>.</p>

          <h2 className="text-lg font-semibold">7. Segurança</h2>
          <p>O FKT utiliza controlos técnicos de acesso e políticas de segurança na base de dados. O acesso aos dados deve ser limitado às pessoas que necessitem deles para as finalidades indicadas. Nenhum sistema de transmissão ou armazenamento pode ser apresentado como absolutamente seguro.</p>

          <h2 className="text-lg font-semibold">8. Alterações a esta política</h2>
          <p>Esta política pode ser atualizada para refletir alterações no serviço ou nas operações de tratamento. A versão em vigor será disponibilizada nesta página, com a respetiva data de atualização.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
