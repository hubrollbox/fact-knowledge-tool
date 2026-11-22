export const CANIL_NINHADAS_SELECT =
  '*, mae:canil_animais!canil_ninhadas_workspace_mae_fkey(id, nome), pai:canil_animais!canil_ninhadas_workspace_pai_fkey(id, nome)';

export function canilAnimalPath(animalId: string): string {
  return `/canil/animal/${animalId}`;
}
