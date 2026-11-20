import { Footer } from '@/components/layout/Footer';

export default function Licenca() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Licença de Utilização</h1>
        <p className="text-sm text-muted-foreground">Última atualização: 19 de novembro de 2026</p>

        <div className="prose prose-sm text-foreground space-y-4">
          <p>A presente página estabelece as condições da licença de utilização do software FKT — Factual Knowledge Tool. Deve ser lida em conjunto com os <a href="/termos">Termos e Condições de Utilização</a>, que regulam o acesso à plataforma e a relação entre o utilizador e o responsável pela sua exploração.</p>

          <h2 className="text-lg font-semibold">1. Titularidade e direitos</h2>
          <p>O software, o código, a arquitectura, a organização funcional, a identidade visual e os restantes elementos próprios do FKT encontram-se protegidos pela legislação aplicável à propriedade intelectual, incluindo o regime de protecção jurídica dos programas de computador.</p>
          <p>A presente licença não transfere para o utilizador a titularidade de quaisquer direitos de propriedade intelectual sobre o FKT. Os elementos de terceiros, incluindo bibliotecas, componentes ou ferramentas de código aberto, permanecem sujeitos às respectivas licenças e condições, que prevalecem quanto a esses elementos.</p>

          <h2 className="text-lg font-semibold">2. Concessão da licença</h2>
          <p>Durante o período em que lhe seja concedido acesso, o utilizador recebe uma licença limitada, não exclusiva, não transmissível e não sublicenciável para utilizar as funcionalidades do FKT às quais a sua conta ou espaço de trabalho tenha acesso autorizado.</p>
          <p>A utilização fica limitada às finalidades normais da plataforma, às permissões atribuídas ao utilizador e, quando aplicável, às funcionalidades, limites e duração do plano contratado ou das condições específicas de participação num piloto.</p>
          <p>A licença não confere qualquer direito de acesso ao código-fonte, de exploração comercial autónoma do software ou de utilização de módulos que ainda não estejam disponibilizados.</p>

          <h2 className="text-lg font-semibold">3. Utilizações não autorizadas</h2>
          <p>Salvo autorização escrita do titular dos direitos ou nos casos expressamente permitidos pela lei, o utilizador não pode:</p>
          <ul>
            <li>Reproduzir, distribuir, publicar, vender, alugar ou disponibilizar a terceiros o FKT ou cópias substanciais do mesmo;</li>
            <li>Modificar, adaptar, traduzir ou criar obras derivadas do software;</li>
            <li>Remover ou ocultar avisos de direitos de autor, marcas ou outros avisos de titularidade;</li>
            <li>Utilizar o FKT para desenvolver ou disponibilizar uma cópia não autorizada do software;</li>
            <li>Contornar mecanismos de autenticação, segurança, controlo de acesso ou limitações técnicas da plataforma;</li>
            <li>Conceder sublicenças, ceder ou transferir a licença de utilização para terceiros.</li>
          </ul>
          <p>As restrições anteriores não afastam os actos que a legislação aplicável reconheça como permitidos ao utilizador legítimo de um programa de computador, incluindo os limites legais relativos à observação, estudo, ensaio e interoperabilidade. Nenhuma disposição desta licença pretende afastar direitos que não possam ser excluídos por contrato.</p>

          <h2 className="text-lg font-semibold">4. Conteúdos do utilizador</h2>
          <p>Esta licença diz respeito ao software FKT e não atribui ao responsável pela plataforma a propriedade dos documentos, fotografias, textos ou outros conteúdos introduzidos pelo utilizador. Esses conteúdos continuam sujeitos aos direitos de quem legitimamente os detenha.</p>
          <p>O tratamento técnico desses conteúdos para alojamento, armazenamento, apresentação e funcionamento das funcionalidades é regulado pelos Termos e Condições e pela Política de Privacidade.</p>

          <h2 className="text-lg font-semibold">5. Componentes e serviços de terceiros</h2>
          <p>O FKT pode integrar componentes de software, bibliotecas ou serviços disponibilizados por terceiros. A utilização desses componentes pode estar sujeita a termos e licenças próprios. Em caso de divergência, as condições específicas da licença de terceiros aplicam-se ao respectivo componente, sem alterar os direitos do utilizador sobre os seus próprios conteúdos.</p>

          <h2 className="text-lg font-semibold">6. Duração, suspensão e cessação</h2>
          <p>A licença mantém-se válida enquanto o utilizador dispuser de acesso autorizado ao FKT. Pode cessar quando termine o acesso, a participação no piloto ou a subscrição aplicável, ou quando a conta seja legitimamente suspensa ou encerrada nos termos dos Termos e Condições.</p>
          <p>A suspensão ou cessação da licença não prejudica direitos que, pela sua natureza ou por imposição legal, devam manter-se, nem limita os direitos do utilizador relativamente aos conteúdos que lhe pertencem.</p>

          <h2 className="text-lg font-semibold">7. Funcionamento e garantias legais</h2>
          <p>O FKT encontra-se em desenvolvimento contínuo e determinadas funcionalidades podem estar em fase de teste, piloto ou preparação. As funcionalidades efectivamente disponibilizadas e as condições aplicáveis são as indicadas na plataforma e, quando exista contratação, na informação apresentada antes da adesão.</p>
          <p>Não é garantido que a plataforma funcione sem interrupções ou erros em todas as configurações técnicas. Esta informação não constitui, porém, uma exclusão geral de garantias ou de responsabilidade: mantêm-se os direitos e as obrigações que resultem da lei e dos Termos e Condições, incluindo os direitos imperativos dos consumidores em matéria de fornecimento e conformidade de serviços digitais.</p>

          <h2 className="text-lg font-semibold">8. Violação da licença</h2>
          <p>A utilização do FKT em violação desta licença pode determinar a adopção de medidas proporcionais para proteger a plataforma, os seus utilizadores e os direitos de propriedade intelectual envolvidos, incluindo a suspensão ou cessação do acesso nos termos dos Termos e Condições, sem prejuízo dos meios legais aplicáveis.</p>

          <h2 className="text-lg font-semibold">9. Lei aplicável e contacto</h2>
          <p>A presente licença rege-se pela lei portuguesa, sem prejuízo das normas imperativas aplicáveis. Para questões relacionadas com esta licença, o utilizador pode contactar o responsável pela exploração do FKT, Bruno Miguel Pinto, através do endereço <a href="mailto:brunomiguelpinto@icloud.com">brunomiguelpinto@icloud.com</a>.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
