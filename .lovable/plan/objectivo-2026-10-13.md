## Objectivo
Criar uma página dedicada por módulo (Jurídico, Canil & Vet, Desenvolvimento) que funcione como vitrine + ponto de entrada — explica o que o módulo faz e permite activar/aceder em um clique.

## Arquitectura proposta

### 1. Hub `/modulos` (índice)
Página pública que lista os 3 módulos em cards grandes (reaproveitar visual do `ModuleSelector` mas mais editorial). Cada card → `/modulos/:slug`.

### 2. Página por módulo `/modulos/:slug`
Rota pública (SEO + permite partilhar links). Estrutura:

```text
┌─ Hero ─────────────────────────────┐
│ Ícone + Nome + Tagline + CTA       │
│ [Activar módulo] / [Abrir módulo]  │
└────────────────────────────────────┘
┌─ O que é ──────────────────────────┐
│ Descrição longa (2–3 parágrafos)   │
└────────────────────────────────────┘
┌─ Funcionalidades (grid 2x3) ───────┐
│ Ícone + título + descrição curta   │
└────────────────────────────────────┘
┌─ Fluxo típico (passos numerados) ──┐
└────────────────────────────────────┘
┌─ Screenshots / mockups ────────────┐
└────────────────────────────────────┘
┌─ FAQ curta + CTA final ────────────┐
└────────────────────────────────────┘
```

### 3. CTA contextual (lógica única)
- **Não autenticado** → "Experimentar" → `/auth?redirect=/modulos/:slug`
- **Autenticado, módulo já activo** → "Abrir módulo" → `/dashboard`
- **Autenticado, módulo diferente** → "Activar este módulo" → confirma e troca via `useModuloActivo`
- **Sem permissão (role viewer)** → CTA desactivado com tooltip

### 4. Conteúdo (data-driven)
Estender `src/data/modulos.ts` com:
```ts
{
  slug, nome, descricao, icone,
  tagline, descricaoLonga,
  funcionalidades: [{ icone, titulo, descricao }],
  fluxo: [{ passo, titulo, descricao }],
  faq: [{ q, a }],
  screenshots: [{ src, alt }],
}
```
Conteúdo concreto inline para os 3 módulos (sem CMS).

### 5. Pontos de entrada
- Item "Módulos" no menu da `LandingPage` (público)
- Secção "Explorar módulos" no `Dashboard` (link para `/modulos`)
- `ModuleSelector` actual ganha link discreto "Saber mais →" em cada card

## Ficheiros (estimativa)

**Criar**
- `src/pages/modulos/ModulosHub.tsx` — índice `/modulos`
- `src/pages/modulos/ModuloDetalhe.tsx` — `/modulos/:slug`
- `src/components/modulos/ModuloHero.tsx`
- `src/components/modulos/ModuloFeatures.tsx`
- `src/components/modulos/ModuloFluxo.tsx`
- `src/components/modulos/ModuloCTA.tsx` — encapsula lógica dos 4 estados
- `src/components/modulos/ModuloFAQ.tsx`

**Editar**
- `src/data/modulos.ts` — enriquecer schema + conteúdo
- `src/types/modulos.ts` — novos campos
- `src/App.tsx` — rotas `/modulos` e `/modulos/:slug`
- `src/pages/LandingPage.tsx` — link no menu
- `src/components/ModuleSelector.tsx` — link "Saber mais"

## SEO
- `<title>` e meta description únicos por módulo
- H1 = nome do módulo
- JSON-LD `SoftwareApplication` por página
- Screenshots com `alt` descritivo + lazy loading

## Fora de âmbito (decidir depois)
- Múltiplos módulos activos em simultâneo no mesmo workspace (continua 1)
- Sistema de planos/preços por módulo
- Vídeos demo (só screenshots por agora)

## Próximo passo
Aprova o plano e implemento tudo numa única passagem. Se quiseres ajustar algum bloco (ex: remover FAQ, mudar localização do CTA, conteúdo de um módulo específico), diz antes de aprovar.