# FKT Inspect — matriz de permissões de acesso externo

## Estado

**Decisão de produto/segurança para o MVP.** Esta matriz fecha o âmbito funcional do acesso externo e serve de entrada para o modelo físico e para as políticas RLS. Não é implementação nem prova de segurança em runtime.

Princípio: **deny by default / least privilege**. Uma concessão externa dá acesso apenas à auditoria identificada e às operações expressamente permitidas. A relação com um cliente, por si só, nunca concede autorização.

## 1. Perfis e fronteiras

- **Proprietário/administrador da Organização Inspect:** gere clientes, estabelecimentos, equipa, modelos, concessões e auditorias dentro das permissões internas da organização.
- **Auditor interno:** executa auditorias e gere resultados, medições, não conformidades e verificações, conforme o papel interno.
- **Utilizador externo do cliente/operador:** não é membro do workspace da consultora. Recebe uma concessão por auditoria concreta.
- **Administrador global FKT:** acesso excepcional de suporte/gestão, sujeito aos controlos globais já definidos no Core; não deve ser usado como mecanismo normal de acesso a dados de clientes.

A autorização externa nunca herda o papel de workspace e nunca permite enumerar clientes, estabelecimentos ou auditorias da organização concedente.

## 2. Matriz de permissões do utilizador externo

| Recurso/operação | Por defeito | Concessão possível no MVP | Limite |
|---|---|---|---|
| Encontrar/abrir auditoria partilhada | Não | Sim | Apenas por referência de partilha própria; não por listagem global |
| Resumo, identificação, âmbito e estado publicado | Não | Sim | Apenas campos expressamente publicados |
| Resultados e conclusões publicados | Não | Sim | Snapshot submetido; sem edição |
| Relatório final emitido | Não | Sim | Versão emitida e publicada; nunca rascunho |
| Evidências recolhidas pelo auditor | Não | Sim, por evidência publicada | Não expor anexos internos ou evidência não publicada |
| Não conformidades publicadas | Não | Sim | Apenas dados partilhados; classificação e texto do auditor não editáveis |
| Acções correctivas atribuídas ao utilizador/entidade | Não | Sim | Apenas acções explicitamente atribuídas e partilhadas |
| Responder a uma acção atribuída | Não | Sim | Submeter resposta; não alterar a acção original |
| Submeter evidência de execução de acção | Não | Sim | Apenas na acção atribuída; ficheiro sujeito a validação |
| Verificar eficácia / encerrar acção | Não | Não | Responsabilidade do auditor autorizado |
| Alterar resultados, critérios, medições ou classificação | Não | Não | Sempre reservado à equipa auditora |
| Editar modelo ou versão de checklist | Não | Não | Sempre reservado à organização |
| Ver notas internas, comentários internos ou rascunhos | Não | Não | Nunca partilhados através da concessão externa |
| Gerir utilizadores, convites ou concessões | Não | Não | Apenas administradores internos autorizados |
| Ver outros clientes/estabelecimentos/auditorias | Não | Não | Proibido |
| Exportar dados em massa ou consultar API geral | Não | Não | Fora do âmbito externo |

### Regra para acções correctivas

A resposta externa é uma submissão, não uma edição do registo de auditoria. O sistema guarda separadamente:
- resposta e descrição submetidas;
- anexos enviados;
- identidade autenticada do autor;
- data/hora do servidor;
- acção a que a resposta respeita;
- estado da submissão.

O auditor decide se aceita a resposta, solicita informação adicional ou realiza a verificação de eficácia. O cliente não pode marcar uma acção como eficaz nem encerrá-la.

## 3. Estados da auditoria e visibilidade externa

Os estados da auditoria e os estados da concessão são independentes.

| Estado da auditoria | Acesso externo |
|---|---|
| Rascunho | Nenhum |
| Em execução | Nenhum ao conteúdo da auditoria; o convite pode ser preparado, mas não confere leitura |
| Submetida | Só conteúdos publicados e permissões concedidas; respostas a acções atribuídas podem ser aceites |
| Fechada | Leitura dos conteúdos publicados e relatório final; sem novas respostas, salvo reabertura formal de acção |
| Arquivada | Leitura apenas se a política de retenção e a concessão ainda o permitirem; sem escrita |

Uma auditoria submetida deve ter snapshot/versionamento dos resultados e relatório. Alterações posteriores não reescrevem silenciosamente o que foi submetido: devem gerar revisão/adenda com autor, data, motivo e ligação à versão anterior.

A reabertura de uma auditoria ou acção é operação interna auditada. Não é concedida ao cliente.

## 4. Concessões e permissões

A autorização deve ser composta por:
1. utilizador autenticado destinatário;
2. auditoria concreta;
3. estado da concessão (pendente, activa, revogada, expirada);
4. permissões explícitas;
5. limites de estado e publicação;
6. eventual validade temporal.

Não usar um único papel externo genérico como substituto de permissões. No modelo físico, preferir permissões normalizadas por concessão/recurso/operação, com constraints e enumerações controladas, em vez de aceitar nomes de permissões arbitrários enviados pelo frontend.

A concessão não pode ser alargada pelo destinatário. Qualquer alteração é feita por administrador/auditor interno autorizado e fica no histórico.

### Conjunto de permissões do MVP

- `view_published_summary`
- `view_published_results`
- `view_final_report`
- `view_published_evidence`
- `view_assigned_actions`
- `respond_assigned_actions`
- `upload_assigned_action_evidence`

As três últimas são independentes: poder ver uma acção não implica poder responder; responder não implica poder carregar ficheiros, salvo concessão específica.

Não incluir no MVP permissões de edição de resultados, edição de critérios, verificação de eficácia, fecho, gestão de equipa, comentários genéricos ou exportação global.

## 5. Convites e ciclo de vida

- O convite é enviado para email normalizado.
- A aceitação exige sessão autenticada e email verificado coincidente com o destinatário.
- O token é aleatório, de uso único, armazenado apenas como hash, com validade e consumo atómico.
- O convite não concede acesso antes da aceitação.
- Não associar `user_id` fornecido pelo cliente; o servidor deriva a identidade de `auth.uid()`.
- Reenvio invalida o token anterior.
- Revogação invalida a concessão para novos pedidos e uploads.
- A concessão revogada mantém histórico, autor e motivo.
- O prazo de convite deve ser configurável por política; proposta inicial: 7 dias, com reenvio explícito. Não usar validade indefinida.
- A concessão permanece activa até revogação/expiração definida, sem renovação silenciosa.

## 6. Estratégia de ficheiros e Storage

### Decisão para o MVP

- Bucket privado; nunca bucket público para evidências, relatórios ou respostas.
- Caminhos com identificadores opacos, sem nomes, emails, designações de cliente ou informação pessoal.
- Metadados na BD ligam cada objecto a organização, auditoria, recurso, autor, visibilidade e estado de publicação.
- O caminho Storage não é prova de autorização.
- Não guardar URLs assinados na BD nem em logs.
- Downloads externos: preferir pedido autenticado ao Storage, com RLS por objecto a revalidar sessão, concessão, permissão, estado e publicação em cada pedido; não emitir URL assinada bearer por defeito.
- Uploads externos: emitir autorização de upload apenas após validar concessão, acção atribuída, tipo/tamanho permitido e estado; usar caminho gerado pelo servidor e URL de upload de curta duração.
- Validar MIME real/assinatura do ficheiro, tamanho, extensão, nome normalizado e limites de quantidade; não confiar no Content-Type fornecido pelo browser.
- Isolar anexos internos e anexos partilhados em registos/áreas lógicas distintas. Não expor metadados internos na resposta externa.
- Aplicar quotas, rate limits e limites de tamanho; registar actor, auditoria, acção, objecto, operação e timestamp.
- Nunca disponibilizar listagem genérica do bucket ao utilizador externo.

### Limite conhecido das URLs assinadas

Uma URL assinada já emitida é uma capacidade temporária e pode continuar utilizável até expirar, mesmo depois da revogação da concessão. Com TTL de 60 segundos, o risco fica limitado temporalmente, mas não é revogação instantânea.

Se o requisito do produto passar a ser revogação imediata ou se a sensibilidade dos ficheiros o exigir, usar proxy/Edge Function autenticada que revalide a concessão em cada download. Esta alternativa tem custo de tráfego/execução e deve ser avaliada antes de se prometer revogação instantânea.

## 7. Separação de dados internos e publicados

RLS protege linhas; não deve ser usada como se ocultasse colunas individuais. Assim:
- notas internas, deliberações, rascunhos e comentários da equipa ficam em tabelas próprias;
- conteúdo partilhável é publicado explicitamente e fica identificado por versão;
- vistas/RPC externas devolvem apenas campos permitidos;
- não expor directamente tabelas internas à role `authenticated` se a projecção pública não puder ser garantida;
- qualquer função `SECURITY DEFINER` tem `search_path` fixo, valida `auth.uid()`, aplica privilégios mínimos e não aceita identidade/organização confiada do cliente.

## 8. Auditoria de segurança e histórico

Registar, sem guardar tokens ou URLs assinadas:
- criação, envio, reenvio, aceitação, expiração e revogação de convite/concessão;
- alteração de permissões;
- publicação/despublicação de resultados, evidências e relatórios;
- leitura/download de ficheiros sensíveis, quando tecnicamente viável;
- submissão de resposta e upload de evidência;
- rejeição/aceitação de resposta e verificação de eficácia pelo auditor.

Eventos são append-only para os actores normais. Correcções administrativas geram novo evento, nunca reescrita silenciosa.

## 9. Testes obrigatórios antes de produção

Matriz de testes com pelo menos:
- duas organizações consultoras;
- dois clientes dentro da mesma consultora;
- dois estabelecimentos por cliente;
- dois utilizadores externos com concessões distintas;
- conta externa com e sem workspace próprio;
- concessão activa, pendente, expirada e revogada;
- auditoria em cada estado;
- ficheiros internos, publicados e submetidos pelo cliente.

Testes negativos:
- adivinhar/trocar IDs de auditoria, cliente, estabelecimento, acção e objecto Storage;
- chamar endpoints/RPC directamente sem passar pela UI;
- usar token de convite por outra conta ou email não verificado;
- reutilizar token consumido;
- usar URL assinada após revogação e confirmar o limite temporal documentado;
- tentar consultar tabelas internas, notas, drafts, outros clientes e listagens Storage;
- tentar editar resultados, medições, critérios, classificação, eficácia e fecho;
- tentar responder a acção não atribuída ou depois de fechada;
- tentar carregar ficheiro com tipo/tamanho proibido.

Todos os testes devem verificar negação no servidor/BD, não apenas ausência de botões na interface.

## 10. Decisões fechadas e limites

Decisões para o MVP:
- acesso externo por auditoria concreta;
- nenhum acesso durante rascunho/em execução;
- leitura apenas de conteúdo publicado após submissão;
- cliente pode responder apenas a acções atribuídas, se a permissão for concedida;
- sem edição de resultados nem verificação/fecho pelo cliente;
- Storage privado, downloads externos autenticados com RLS por objecto; proxy autenticado se for necessária URL bearer;
- sem promessa de revogação instantânea de URLs já emitidas;
- convite de 7 dias como valor inicial, com reenvio explícito.

Ficam para desenho físico:
- estrutura exacta das tabelas de grants e permissões;
- implementação do convite e entrega de email;
- estratégia final de Edge Functions/Storage;
- política de retenção e eliminação;
- revisão de requisitos legais de conservação e acesso.

Nenhuma destas decisões autoriza por si só migrações remotas. A implementação só começa após o desenho ER/RLS e os testes locais/CI serem revistos, e a base remota só muda com autorização explícita.
