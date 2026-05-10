export type ModuloSlug = 'juridico' | 'canil' | 'dev';

export interface ModuloFeature {
  icone: string;
  titulo: string;
  descricao: string;
}

export interface ModuloFluxoPasso {
  titulo: string;
  descricao: string;
}

export interface ModuloFAQ {
  q: string;
  a: string;
}

export interface Modulo {
  slug: ModuloSlug;
  nome: string;
  descricao: string;
  icone: string;
  tagline?: string;
  descricaoLonga?: string[];
  funcionalidades?: ModuloFeature[];
  fluxo?: ModuloFluxoPasso[];
  faq?: ModuloFAQ[];
  rotaPrincipal?: string;
}
