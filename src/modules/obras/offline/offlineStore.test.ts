import { describe, expect, it, vi } from 'vitest';
import { criarOperacaoOffline, isFalhaDeLigacao, compararCamposOffline } from './offlineStore';

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

describe('comparação de versões offline', () => {
  it('identifica apenas os campos alterados no servidor', () => {
    const base = { titulo: 'Fissura', gravidade: 'media', descricao: 'Inicial' };
    const remote = { titulo: 'Fissura estrutural', gravidade: 'media', descricao: 'Inicial' };
    expect(compararCamposOffline(base, remote, ['titulo', 'gravidade', 'descricao'])).toEqual(['titulo']);
  });

  it('considera null e campo ausente equivalentes e não acusa falso conflito', () => {
    const base = { notas: null, tecnico: 'Ana' };
    const remote = { tecnico: 'Ana' };
    expect(compararCamposOffline(base, remote, ['notas', 'tecnico'])).toEqual([]);
  });

  it('detecta conflito quando ambos alteraram o mesmo campo', () => {
    const base = { descricao: 'Original' };
    const local = { descricao: 'Alteração local' };
    const remote = { descricao: 'Alteração remota' };
    expect(compararCamposOffline(base, remote, Object.keys(local))).toEqual(['descricao']);
  });
});
