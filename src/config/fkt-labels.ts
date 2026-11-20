// src/config/fkt-labels.ts

export type FKTLabels = {
  factos: string;
  novoFacto: string;
  editarFacto: string;
  nenhumFacto: string;
  descricaoLabel: string;
  descricaoPlaceholder: string;
  avisoDescricao: string;
};

export const defaultLabels: FKTLabels = {
  factos: 'Factos',
  novoFacto: 'Novo Facto',
  editarFacto: 'Editar Facto',
  nenhumFacto: 'Nenhum facto registado',
  descricaoLabel: 'Descrição',
  descricaoPlaceholder: 'Descreva o facto de forma objectiva e neutra...',
  avisoDescricao: 'Evite termos conclusivos como "erro", "culpa", "conforme".',
};