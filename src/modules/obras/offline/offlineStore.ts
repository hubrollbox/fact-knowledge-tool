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
}

const DB_NAME = 'fkt-works-offline';
const DB_VERSION = 3;
const STORE = 'operations';
const SNAPSHOTS = 'snapshots';

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

export async function listarOperacoesOffline(userId: string, workspaceId: string): Promise<WorksOfflineOperation[]> {
  const rows = await withStore<WorksOfflineOperation[]>('readonly', (store) =>
    store.index('scope').getAll(IDBKeyRange.only([userId, workspaceId])),
  );
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function actualizarOperacaoOffline(
  id: string,
  changes: Partial<Pick<WorksOfflineOperation, 'attempts' | 'lastError'>>,
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
