# Manutenção das FAQ FKT

As FAQ são documentação funcional da plataforma. Não devem ser actualizadas apenas quando alguém detecta uma resposta errada: devem ser revistas sempre que o produto muda.

## Regra obrigatória para alterações ao produto

Sempre que uma alteração afecte um ecrã, percurso, botão, campo, permissão, estado, pesquisa, relatório, integração ou comportamento de um módulo:

1. Identificar as FAQ relacionadas com o fluxo alterado.
2. Confirmar se a resposta continua correcta na versão que vai ser publicada.
3. Actualizar, criar ou retirar de publicação as FAQ afectadas.
4. Validar o percurso na aplicação; não basta confirmar que o componente existe no código.
5. Registar na issue de desenvolvimento quais as FAQ revistas e quais foram alteradas.
6. Só concluir a issue quando a documentação afectada estiver tratada ou explicitamente marcada como não aplicável.

Se a alteração não afectar a experiência do utilizador, registar «Sem impacto nas FAQ» na issue.

## Revisão mensal

No primeiro dia útil de cada mês, o responsável pelo produto deve percorrer a área Ajuda e Suporte e:

- testar as instruções de acesso, conta, workspaces, módulos e permissões;
- verificar os percursos principais de FKT Works, Lex, Vet e Dev;
- pesquisar respostas duplicadas, contraditórias ou sem percurso de navegação;
- confirmar que as limitações conhecidas continuam actuais;
- rever a data de revisão apenas depois de validar o conteúdo;
- retirar de publicação instruções que deixaram de corresponder ao produto.

A revisão mensal é uma rede de segurança. Não substitui a revisão feita juntamente com cada alteração.

## Publicação e responsabilidades

- Apenas o Administrador Global pode criar, editar, ordenar, publicar ou retirar FAQ.
- Os utilizadores podem sugerir correcções através de um pedido em Ajuda e Suporte.
- O responsável pela alteração do produto prepara a proposta; o Administrador Global valida e publica.
- As respostas devem usar os nomes exactos dos ecrãs e controlos, em português europeu.
- Funcionalidades planeadas, escondidas ou sem percurso utilizável não podem ser descritas como disponíveis.

## Registo de revisão existente

A tabela `public.fkt_support_faq` já possui `reviewed_at`. Ao guardar uma FAQ publicada pela área de Administração, a aplicação actualiza esta data. A data só deve ser renovada depois de uma verificação real.

Actualmente, a FAQ não guarda o commit nem a versão exacta da aplicação contra a qual foi testada. Não se deve inferir essa informação a partir da data de revisão. Uma futura evolução poderá acrescentar essa rastreabilidade se a equipa precisar de auditoria por versão.

## Checklist para cada alteração

- [ ] A alteração afecta algum percurso ou comportamento documentado?
- [ ] As FAQ relacionadas foram identificadas?
- [ ] Os nomes e passos foram confirmados na aplicação?
- [ ] As respostas desactualizadas foram corrigidas ou retiradas?
- [ ] A issue regista as FAQ revistas/alteradas ou «Sem impacto nas FAQ»?
- [ ] A publicação foi feita pelo Administrador Global?
