import { describe, expect, it, vi } from 'vitest';
import { criarOperacaoOffline, isFalhaDeLigacao, compararCamposOffline, combinarEdicaoOffline, selecionarFotosParaEviccao } from './offlineStore';

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

describe('composição de edições offline', () => {
  it('mantém o registo completo e acumula alterações feitas em momentos diferentes', () => {
    const first = combinarEdicaoOffline(
      { id: 'r1', titulo: 'Original', gravidade: 'media', descricao: 'Texto inicial' },
      undefined,
      { titulo: 'Título local' },
    );
    const second = combinarEdicaoOffline(
      { id: 'r1', titulo: 'Original', gravidade: 'media', descricao: 'Texto inicial' },
      first.payload,
      { gravidade: 'alta' },
      first.changedFields,
    );

    expect(second.payload).toEqual({
      id: 'r1',
      titulo: 'Título local',
      gravidade: 'alta',
      descricao: 'Texto inicial',
    });
    expect(second.changedFields.sort()).toEqual(['gravidade', 'titulo']);
  });

  it('não inclui identificadores nem metadados nos campos alterados', () => {
    const result = combinarEdicaoOffline(
      { id: 'r2', workspace_id: 'w1', titulo: 'A' },
      undefined,
      { id: 'r2', workspace_id: 'w1', titulo: 'B' },
    );
    expect(result.changedFields).toEqual(['titulo']);
  });
});


describe('limites da cache offline de fotografias', () => {
  it('remove primeiro as fotografias mais antigas quando excede o orçamento', () => {
    const photo = (id: string, cachedAt: string, size: number) => ({
      id, cachedAt, blob: new Blob([new Uint8Array(size)]),
    }) as any;

    const photos = [
      photo('oldest', '2026-01-01T00:00:00.000Z', 4),
      photo('middle', '2026-01-02T00:00:00.000Z', 4),
      photo('newest', '2026-01-03T00:00:00.000Z', 4),
    ];

    expect(selecionarFotosParaEviccao(photos, 8, 10)).toEqual(['oldest']);
  });

  it('respeita também o número máximo de fotografias', () => {
    const photos = ['one', 'two', 'three'].map((id, index) => ({
      id,
      cachedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      blob: new Blob(['x']),
    })) as any;

    expect(selecionarFotosParaEviccao(photos, 100, 2)).toEqual(['one']);
  });
});
