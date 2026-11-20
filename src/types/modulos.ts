export type ModuloSlug = 'juridico' | 'canil' | 'dev' | 'obras';

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
  /** Destaque comercial (ex.: 'MVP'). */
  destaque?: string;
  /** Ainda não pode ser activado num workspace. */
  emPreparacao?: boolean;
}
