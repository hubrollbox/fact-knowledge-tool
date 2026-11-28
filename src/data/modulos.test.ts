import { describe, expect, it } from 'vitest';
import { getModulo, modulos } from './modulos';

describe('public module catalogue', () => {
  it('presents FKT Inspect as planned and not activatable', () => {
    const inspect = getModulo('inspect');

    expect(inspect).toBeDefined();
    expect(inspect?.nome).toBe('FKT Inspect');
    expect(inspect?.destaque).toBe('Próximo MVP');
    expect(inspect?.emPreparacao).toBe(true);
    expect(inspect?.rotaPrincipal).toBeUndefined();
  });

  it('does not mark preparation modules as available for activation', () => {
    const availableModules = modulos
      .filter((modulo) => !modulo.emPreparacao && modulo.slug !== 'inspect')
      .map((modulo) => modulo.slug);

    expect(availableModules).toEqual(['obras']);
  });

  it('keeps every public module slug unique', () => {
    const slugs = modulos.map((modulo) => modulo.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
