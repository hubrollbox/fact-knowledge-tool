import { describe, expect, it, vi } from 'vitest';
import { criarOperacaoOffline, isFalhaDeLigacao } from './offlineStore';

describe('offlineStore', () => {
  it('cria operações pendentes com tentativas a zero e sem erro', () => {
    const operation = criarOperacaoOffline({
      id: 'stable-id',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      entity: 'visita',
      payload: { id: 'stable-id', obra_id: 'obra-1' },
    });

    expect(operation.id).toBe('stable-id');
    expect(operation.attempts).toBe(0);
    expect(operation.lastError).toBeNull();
    expect(Number.isNaN(Date.parse(operation.createdAt))).toBe(false);
  });

  it('reconhece erros de rede e não classifica erros funcionais como offline', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isFalhaDeLigacao(new TypeError('Failed to fetch'))).toBe(true);
    expect(isFalhaDeLigacao(new Error('violates row-level security policy'))).toBe(false);
    vi.unstubAllGlobals();
  });

  it('trata a ausência de ligação como falha de rede mesmo sem erro explícito', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isFalhaDeLigacao(null)).toBe(true);
    vi.unstubAllGlobals();
  });
});
