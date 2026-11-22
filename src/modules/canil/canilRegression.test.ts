import { describe, expect, it } from 'vitest';
import { NINHADAS_DO_ANIMAL_SELECT } from './hooks/useNinhadas';
import { canilAnimalPath } from './utils/routes';

describe('regressões do FKT Vet', () => {
  it('usa as foreign keys compostas actuais nas ninhadas', () => {
    expect(NINHADAS_DO_ANIMAL_SELECT).toContain(
      '!canil_ninhadas_workspace_mae_fkey(id, nome)',
    );
    expect(NINHADAS_DO_ANIMAL_SELECT).toContain(
      '!canil_ninhadas_workspace_pai_fkey(id, nome)',
    );
    expect(NINHADAS_DO_ANIMAL_SELECT).not.toContain('canil_ninhadas_mae_id_fkey');
    expect(NINHADAS_DO_ANIMAL_SELECT).not.toContain('canil_ninhadas_pai_id_fkey');
  });

  it('constrói a rota da ficha individual do animal', () => {
    expect(canilAnimalPath('animal-123')).toBe('/canil/animal/animal-123');
  });
});
