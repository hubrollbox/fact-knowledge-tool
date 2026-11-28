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
  // Inspect is a public/planned module only. It is intentionally excluded from ModuloSlug
  // because the current workspaces_modulo_check constraint does not permit activation.
  slug: ModuloSlug | 'inspect';
  nome: string;
  descricao: string;
  icone: string;
  tagline?: string;
  descricaoLonga?: string[];
  funcionalidades?: ModuloFeature[];
  fluxo?: ModuloFluxoPasso[];
  faq?: ModuloFAQ[];
  rotaPrincipal?: string;
  /** Destaque comercial ou estado público (ex.: 'Piloto fechado', 'Planeado'). */
  destaque?: string;
  /** Ainda não pode ser activado num workspace. */
  emPreparacao?: boolean;
}
