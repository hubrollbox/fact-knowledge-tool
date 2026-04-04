# FKT — Fact Knowledge Tool

Sistema para organização de informação, análise estruturada e apoio à decisão.

O FKT operacionaliza um método formal que impõe a separação rigorosa entre:
- Contexto (factos)
- Problema
- Referências
- Análise
- Decisão

O sistema garante que qualquer conclusão seja rastreável, reconstruível e estruturalmente validada.

MVP funcional em produção.  
Repositório: https://github.com/hubrollbox/fact-knowledge-tool

---

## Propósito

O FKT não é software de aconselhamento.

É uma infraestrutura metodológica que impõe:

- Registo factual explícito  
- Referenciação verificável  
- Estrutura obrigatória de raciocínio  
- Cadeia analítica rastreável  

O objetivo é impedir a confusão entre informação, interpretação e conclusão.

---

## Como Funciona

O FKT organiza o trabalho em dois domínios distintos:

### Base de Conhecimento
Espaço dedicado ao estudo, organização de referências e estruturação de informação.

### Dossiers (Processos)
Análise estruturada de situações concretas segundo um método formal obrigatório.

Os dois domínios são logicamente separados.

---

## Método

Cada dossier segue obrigatoriamente uma estrutura:

- Contexto  
- Problema  
- Referências  
- Análise  
- Decisão  

### Regras do sistema:

- O contexto é registado separadamente da interpretação  
- As referências exigem identificação explícita  
- A análise liga contexto e referências  
- A decisão tem de ser justificável  
- Um dossier só pode ser considerado concluído se cumprir os requisitos estruturais  

---

## Aplicação

O sistema pode ser utilizado em qualquer área que exija decisão estruturada baseada em informação verificável, incluindo:

- Jurídico  
- Gestão e administração  
- Saúde (humana e veterinária)  
- Engenharia e qualidade  
- Tecnologia e análise de incidentes  
- Educação e investigação  

---

## Funcionalidades Atuais (MVP)

- Autenticação de utilizadores  
- Criação estruturada de dossiers  
- Modelo formal para:
  - Contexto  
  - Referências  
  - Análise  
- Separação entre Base de Conhecimento e Dossiers  
- Estrutura obrigatória de análise  
- Organização cronológica de informação  

---

## Estado do Projeto

MVP funcional em produção.  
Em desenvolvimento contínuo.

---

## Propriedade Intelectual

Não é concedida licença open source.  
Todos os direitos reservados.

---

## Configuração de autenticação (Supabase)

Para o login funcionar em ambiente local, copie `.env.example` para `.env.local` e preencha as credenciais: