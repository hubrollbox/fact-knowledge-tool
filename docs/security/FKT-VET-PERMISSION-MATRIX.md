# FKT Vet — matriz de permissões

Âmbito: `canil_animais`, `canil_ninhadas`, `canil_cachorros`, `canil_registos_clinicos` e `canil_reservas`.

Esta matriz documenta o comportamento definido pelas políticas RLS da migração
`20261120183029_fkt_vet_workspace_integrity_and_history.sql`.

| Papel | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| Proprietário do workspace | Sim | Sim | Sim | Sim, sujeito às restrições de histórico |
| Admin do workspace | Sim | Sim | Sim | Sim, sujeito às restrições de histórico |
| Editor do workspace | Sim | Sim | Sim | Sim, sujeito às restrições de histórico |
| Viewer do workspace | Sim | Não | Não | Não |
| Utilizador de outro workspace | Não | Não | Não | Não |
| Utilizador anónimo | Não | Não | Não | Não |

## Regras adicionais de integridade

- As políticas de escrita exigem pertença ao workspace como proprietário ou membro
  com papel `editor` ou `admin`.
- Um cachorro herda o `workspace_id` da ninhada; o cliente não escolhe livremente
  o workspace do cachorro.
- Chaves estrangeiras compostas impedem referências entre workspaces.
- A alteração do workspace de um registo é bloqueada.
- Animais com registos clínicos, reservas ou descendência não podem ser eliminados
  fisicamente quando as restrições de integridade o impedem; devem ser arquivados.
- Ninhadas com progenitores ou cachorros registados preservam o historial.
- A eliminação de animais/ninhadas sem histórico continua sujeita às permissões
  RLS e às restantes chaves estrangeiras.

## Limite da validação

A matriz descreve as políticas e restrições da base de dados. Não substitui testes
funcionais da interface nem validação de fluxos completos na aplicação publicada.
