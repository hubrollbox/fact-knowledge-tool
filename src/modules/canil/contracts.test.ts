import { describe, expect, it } from 'vitest';
import { CANIL_NINHADAS_SELECT, canilAnimalPath } from './contracts';

describe('FKT Vet contracts', () => {
  it('uses the workspace-scoped foreign keys for both parents of a litter', () => {
    expect(CANIL_NINHADAS_SELECT).toContain('canil_ninhadas_workspace_mae_fkey');
    expect(CANIL_NINHADAS_SELECT).toContain('canil_ninhadas_workspace_pai_fkey');
    expect(CANIL_NINHADAS_SELECT).not.toContain('canil_ninhadas_mae_id_fkey');
    expect(CANIL_NINHADAS_SELECT).not.toContain('canil_ninhadas_pai_id_fkey');
  });

  it('builds the registered route for an individual animal', () => {
    expect(canilAnimalPath('animal-123')).toBe('/canil/animal/animal-123');
  });
});
