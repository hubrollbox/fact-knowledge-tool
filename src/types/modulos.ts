export type ModuloSlug = 'juridico' | 'canil' | 'dev';

export interface Modulo {
  slug: ModuloSlug;
  nome: string;
  descricao: string;
  icone: string;
}
