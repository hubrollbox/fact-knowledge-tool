export type WorksOfflineEntity = 'visita' | 'ocorrencia' | 'foto';

export interface WorksOfflineOperation {
  id: string;
  userId: string;
  workspaceId: string;
  entity: WorksOfflineEntity;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  operationType?: 'create' | 'update';
  basePayload?: Record<string, unknown>;
  conflictRemote?: Record<string, unknown> | null;
  changedFields?: string[];
}

const DB_NAME = 'fkt-works-offline';
const DB_VERSION = 4;
const STORE = 'operations';
const SNAPSHOTS = 'snapshots';
const PHOTOS = 'photos';
export const MAX_OFFLINE_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_OFFLINE_PHOTO_CACHE_BYTES = 100 * 1024 * 1024;
export const MAX_OFFLINE_PHOTO_CACHE_COUNT = 50;
export const OFFLINE_PHOTO_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function selecionarFotosParaEviccao(
  photos: WorksOfflineCachedPhoto[],
  maxBytes = MAX_OFFLINE_PHOTO_CACHE_BYTES,
  maxCount = MAX_OFFLINE_PHOTO_CACHE_COUNT,
): string[] {
  const ordered = [...photos].sort((a, b) => a.cachedAt.localeCompare(b.cachedAt));
  let totalBytes = ordered.reduce((sum, photo) => sum + photo.blob.size, 0);
  let count = ordered.length;
  const remove: string[] = [];
  for (const photo of ordered) {
    if (totalBytes <= maxBytes && count <= maxCount) break;
    remove.push(photo.id);
    totalBytes -= photo.blob.size;
    count -= 1;
  }
  return remove;
}


function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Este navegador não suporta armazenamento offline.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('scope', ['userId', 'workspaceId'], { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS)) {
        const snapshots = db.createObjectStore(SNAPSHOTS, { keyPath: 'id' });
        snapshots.createIndex('scope', ['userId', 'workspaceId'], { unique: false });
      }
      if (!db.objectStoreNames.contains(PHOTOS)) {
        const photos = db.createObjectStore(PHOTOS, { keyPath: 'id' });
        photos.createIndex('scope', ['userId', 'workspaceId'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento offline.'));
    request.onblocked = () => reject(new Error('O armazenamento offline está ocupado noutra janela.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      request.onerror = () => reject(request.error ?? new Error('Falha no armazenamento offline.'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error('Falha na transação offline.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Operação offline cancelada.'));
    });
  } finally { db.close(); }
}

export async function guardarOperacaoOffline(operation: WorksOfflineOperation): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) => store.put(operation));
}

export function combinarEdicaoOffline(
  base: Record<string, unknown>,
  anterior: Record<string, unknown> | undefined,
  alteracoes: Record<string, unknown>,
  camposAnteriores: string[] = [],
) {
  const payload = { ...base, ...(anterior ?? {}), ...alteracoes };
  const changedFields = [...new Set([
    ...camposAnteriores,
    ...Object.keys(alteracoes).filter((key) => !['id', 'workspace_id', 'created_at', 'updated_at'].includes(key)),
  ])];
  return { payload, changedFields };
}

export async function actualizarRegistoPendenteOffline(
  input: Omit<WorksOfflineOperation, 'createdAt' | 'attempts' | 'lastError' | 'operationType'> & {
    basePayload?: Record<string, unknown>;
    conflictRemote?: Record<string, unknown> | null;
  },
): Promise<void> {
  const current = await withStore<WorksOfflineOperation | undefined>('readonly', (store) => store.get(input.id));
  const operationType = current?.operationType === 'create' ? 'create' : 'update';
  const basePayload = current?.basePayload ?? input.basePayload ?? {};
  const combined = combinarEdicaoOffline(
    operationType === 'create' ? {} : basePayload,
    current?.payload,
    input.payload,
    current?.changedFields,
  );
  const changedFields = operationType === 'create' ? undefined : combined.changedFields;
  const next: WorksOfflineOperation = {
    ...input,
    payload: combined.payload,
    createdAt: current?.createdAt ?? new Date().toISOString(),
    attempts: 0,
    lastError: null,
    operationType,
    basePayload,
    changedFields,
    conflictRemote: input.conflictRemote ?? current?.conflictRemote ?? null,
  };
  await guardarOperacaoOffline(next);
}

export async function listarOperacoesOffline(userId: string, workspaceId: string): Promise<WorksOfflineOperation[]> {
  const rows = await withStore<WorksOfflineOperation[]>('readonly', (store) =>
    store.index('scope').getAll(IDBKeyRange.only([userId, workspaceId])),
  );
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function actualizarOperacaoOffline(
  id: string,
  changes: Partial<Pick<WorksOfflineOperation, 'attempts' | 'lastError' | 'operationType' | 'basePayload' | 'conflictRemote' | 'changedFields'>>,
): Promise<void> {
  const current = await withStore<WorksOfflineOperation | undefined>('readonly', (store) => store.get(id));
  if (current) await guardarOperacaoOffline({ ...current, ...changes });
}

export async function removerOperacaoOffline(id: string): Promise<void> {
  await withStore<undefined>('readwrite', (store) => store.delete(id));
}

export async function limparOperacoesOfflineDoUtilizador(userId: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const request = transaction.objectStore(STORE).index('scope').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if ((cursor.value as WorksOfflineOperation).userId === userId) cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível limpar os dados offline.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Limpeza offline cancelada.'));
    });
  } finally { db.close(); }
}

export function criarOperacaoOffline(input: Omit<WorksOfflineOperation, 'createdAt' | 'attempts' | 'lastError'>): WorksOfflineOperation {
  return { ...input, createdAt: new Date().toISOString(), attempts: 0, lastError: null };
}

export function isFalhaDeLigacao(error: unknown): boolean {
  if (!navigator.onLine) return true;
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|offline|timeout/i.test(message);
}

export type WorksOfflineSnapshotEntity = 'obra' | 'visitas' | 'ocorrencias' | 'acoes';

export interface WorksOfflineSnapshot {
  id: string;
  userId: string;
  workspaceId: string;
  obraId: string;
  entity: WorksOfflineSnapshotEntity;
  data: unknown;
  savedAt: string;
}

function snapshotId(userId: string, workspaceId: string, obraId: string, entity: WorksOfflineSnapshotEntity) {
  return [userId, workspaceId, obraId, entity].join(':');
}

export async function guardarSnapshotOffline(input: Omit<WorksOfflineSnapshot, 'id' | 'savedAt'>): Promise<void> {
  const snapshot: WorksOfflineSnapshot = {
    ...input,
    id: snapshotId(input.userId, input.workspaceId, input.obraId, input.entity),
    savedAt: new Date().toISOString(),
  };
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOTS, 'readwrite');
      tx.objectStore(SNAPSHOTS).put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Não foi possível guardar a cache offline.'));
      tx.onabort = () => reject(tx.error ?? new Error('Cache offline cancelada.'));
    });
  } finally { db.close(); }
}

export async function obterSnapshotOffline<T>(
  userId: string,
  workspaceId: string,
  obraId: string,
  entity: WorksOfflineSnapshotEntity,
): Promise<T | null> {
  const db = await openDatabase();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOTS, 'readonly');
      const request = tx.objectStore(SNAPSHOTS).get(snapshotId(userId, workspaceId, obraId, entity));
      request.onsuccess = () => resolve((request.result?.data as T | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('Não foi possível ler a cache offline.'));
    });
  } finally { db.close(); }
}

export async function listarSnapshotsOffline(
  userId: string,
  workspaceId: string,
): Promise<WorksOfflineSnapshot[]> {
  const db = await openDatabase();
  try {
    return await new Promise<WorksOfflineSnapshot[]>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOTS, 'readonly');
      const request = tx.objectStore(SNAPSHOTS).index('scope').getAll(IDBKeyRange.only([userId, workspaceId]));
      request.onsuccess = () => resolve((request.result ?? []) as WorksOfflineSnapshot[]);
      request.onerror = () => reject(request.error ?? new Error('Não foi possível consultar a cache offline.'));
    });
  } finally { db.close(); }
}

export interface WorksOfflineCachedPhoto {
  id: string;
  userId: string;
  workspaceId: string;
  visita_id: string | null;
  ocorrencia_id: string | null;
  legenda: string | null;
  capturada_em: string | null;
  latitude: number | null;
  longitude: number | null;
  blob: Blob;
  cachedAt: string;
}

export async function guardarFotoCacheOffline(input: Omit<WorksOfflineCachedPhoto, 'cachedAt'>): Promise<void> {
  if (input.blob.size <= 0 || input.blob.size > MAX_OFFLINE_PHOTO_BYTES) {
    throw new Error('A fotografia excede o limite de 20 MB da cache offline.');
  }
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTOS, 'readwrite');
      const store = tx.objectStore(PHOTOS);
      const photo: WorksOfflineCachedPhoto = { ...input, cachedAt: new Date().toISOString() };
      // Evict before writing: a put that exceeds the browser quota aborts the
      // transaction, so cleaning up after put is too late to recover.
      const request = store.index('scope').getAll(IDBKeyRange.only([input.userId, input.workspaceId]));
      request.onsuccess = () => {
        const existing = (request.result ?? []) as WorksOfflineCachedPhoto[];
        const scoped = existing.filter((row) => row.id !== photo.id);
        const idsToRemove = selecionarFotosParaEviccao([...scoped, photo]);
        for (const id of idsToRemove) store.delete(id);
        store.put(photo);
      };
      request.onerror = () => {
        try { tx.abort(); } catch { /* transaction already finished */ }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Não foi possível guardar a fotografia offline.'));
      tx.onabort = () => reject(tx.error ?? new Error('Cache da fotografia cancelada.'));
    });
  } finally { db.close(); }
}

export async function listarFotosCacheOffline(userId: string, workspaceId: string): Promise<WorksOfflineCachedPhoto[]> {
  const db = await openDatabase();
  try {
    return await new Promise<WorksOfflineCachedPhoto[]>((resolve, reject) => {
      const tx = db.transaction(PHOTOS, 'readwrite');
      const store = tx.objectStore(PHOTOS);
      const request = store.index('scope').getAll(IDBKeyRange.only([userId, workspaceId]));
      let result: WorksOfflineCachedPhoto[] = [];
      request.onsuccess = () => {
        const now = Date.now();
        const rows = (request.result ?? []) as WorksOfflineCachedPhoto[];
        const expired = rows.filter((photo) => {
          const timestamp = Date.parse(photo.cachedAt);
          return !Number.isFinite(timestamp) || now - timestamp > OFFLINE_PHOTO_CACHE_MAX_AGE_MS;
        });
        const expiredIds = new Set(expired.map((photo) => photo.id));
        for (const id of expiredIds) store.delete(id);
        result = rows.filter((photo) => !expiredIds.has(photo.id));
      };
      request.onerror = () => reject(request.error ?? new Error('Não foi possível consultar fotografias offline.'));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error('Não foi possível limpar a cache offline.'));
      tx.onabort = () => reject(tx.error ?? new Error('Limpeza da cache offline cancelada.'));
    });
  } finally { db.close(); }
}

export function prepararOperacaoParaManterLocal(current: WorksOfflineOperation): WorksOfflineOperation {
  if (!current.conflictRemote) throw new Error('O conflito já não está disponível.');
  const remote = current.conflictRemote;
  const changedFields = Object.keys(current.payload).filter((key) =>
    !['id', 'workspace_id', 'created_at', 'updated_at'].includes(key) &&
    JSON.stringify(current.payload[key] ?? null) !== JSON.stringify(remote[key] ?? null),
  );
  return {
    ...current,
    operationType: 'update',
    basePayload: remote,
    changedFields,
    conflictRemote: null,
    lastError: null,
    attempts: 0,
  };
}

export async function resolverConflitoOffline(
  id: string,
  resolution: 'keep_local' | 'keep_remote',
): Promise<void> {
  const current = await withStore<WorksOfflineOperation | undefined>('readonly', (store) => store.get(id));
  if (!current || !current.conflictRemote) throw new Error('O conflito já não está disponível.');
  if (resolution === 'keep_remote') {
    await removerOperacaoOffline(id);
    return;
  }
  await guardarOperacaoOffline(prepararOperacaoParaManterLocal(current));
}

export function compararCamposOffline(
  base: Record<string, unknown>,
  remote: Record<string, unknown>,
  fields: string[],
): string[] {
  return fields.filter((key) =>
    JSON.stringify(remote[key] ?? null) !== JSON.stringify(base[key] ?? null),
  );
}
