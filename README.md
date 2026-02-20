FKT — Fact Knowledge Tool
Aplicação web para análise jurídica estruturada.
O FKT operacionaliza um método formal que impõe a separação rigorosa entre:
Factos
Normas
Raciocínio jurídico
O sistema garante que qualquer conclusão seja rastreável, reconstruível e estruturalmente validada.
MVP funcional em produção.
Repositório: https://github.com/hubrollbox/fact-knowledge-tool�
Propósito
O FKT não é software de aconselhamento jurídico.
É uma infraestrutura metodológica que impõe:
Registo factual explícito
Referenciação normativa verificável
Estrutura obrigatória de raciocínio (FIRAC)
Cadeia analítica rastreável
O objetivo é impedir a confusão entre facto, interpretação e conclusão.
Como Funciona
O FKT organiza o trabalho em dois domínios distintos:
Base de Conhecimentos
Espaço dedicado ao estudo teórico e organização estruturada de normas, conceitos e apontamentos.
Processos
Análise estruturada de casos concretos segundo método formal obrigatório.
Os dois domínios são logicamente separados.
Método FIRAC
Cada processo segue obrigatoriamente a estrutura:
F — Factos
I — Issue (Questão jurídica)
R — Rules (Normas aplicáveis)
A — Application (Aplicação das normas aos factos)
C — Conclusion (Conclusão fundamentada)
Regras do sistema:
Factos são registados separadamente da qualificação jurídica.
Normas exigem referência explícita.
Conclusões só existem se ligadas a factos e normas.
Um processo só pode ser considerado concluído se cumprir os requisitos estruturais.
Funcionalidades Atuais (MVP)
Autenticação de utilizadores
Criação estruturada de processos
Modelo formal para:
Factos
Normas
Processos
Fluxo FIRAC obrigatório
Geração automática de cronologia factual
Separação entre Base de Conhecimentos e Processos
Estado do Projeto
MVP funcional em produção.
Em desenvolvimento contínuo.
Propriedade Intelectual
Não é concedida licença open source.
Todos os direitos reservados.


Configuração de autenticação (Supabase)
Para o login funcionar em ambiente local, configure um ficheiro `.env.local` na raiz com:

VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_OU_PUBLISHABLE_KEY

Também é suportada a variável `VITE_SUPABASE_PUBLISHABLE_KEY` como alternativa ao `VITE_SUPABASE_ANON_KEY`.

Erros comuns de login
- `Auth session missing!`: utilizador não autenticado ao aceder rotas protegidas. Faça login primeiro.
- `Invalid login credentials`: email ou palavra-passe inválidos.
- `Email not confirmed`: confirme o registo no email antes de entrar.
