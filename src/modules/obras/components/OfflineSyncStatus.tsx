import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, CloudUpload, Loader2, Wifi, WifiOff, GitCompareArrows } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { resolverConflitoOffline, type WorksOfflineOperation } from '../offline/offlineStore';
import { useObrasWorkspace } from '../hooks/useObrasWorkspace';
import { useWorksOfflineQueue } from '../offline/useWorksOfflineQueue';

const labels: Record<string, string> = {
  titulo: 'Título', descricao: 'Descrição', localizacao: 'Localização', tipo: 'Tipo',
  especialidade: 'Especialidade', gravidade: 'Gravidade', data_visita: 'Data da visita',
  hora_inicio: 'Hora de início', tecnico: 'Técnico', condicoes_meteo: 'Condições meteorológicas',
  notas: 'Notas', estado: 'Estado',
};

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function OfflineSyncStatus() {
  const queryClient = useQueryClient();
  const workspaceId = useObrasWorkspace();
  const { operations, pendingCount, syncing, queueLoaded, storageError, sync, refresh } = useWorksOfflineQueue(workspaceId);
  const [online, setOnline] = useState(navigator.onLine);
  const [selected, setSelected] = useState<WorksOfflineOperation | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const conflicts = useMemo(() => operations.filter((operation) => operation.conflictRemote), [operations]);
  const statusLabel = !workspaceId
    ? 'A verificar espaço de trabalho'
    : !queueLoaded
      ? 'A verificar sincronização'
      : storageError
        ? 'Armazenamento offline indisponível'
        : syncing
      ? 'A sincronizar alterações'
      : !online
        ? 'Sem ligação à Internet'
        : pendingCount > 0
          ? pendingLabel
          : 'Tudo sincronizado';
  const failed = operations.find((operation) => operation.lastError);
  const pendingPhotos = operations.filter((operation) => operation.entity === 'foto').length;
  const pendingRecords = pendingCount - pendingPhotos;
  const pendingLabel = [
    pendingRecords ? pendingRecords + (pendingRecords === 1 ? ' registo' : ' registos') : '',
    pendingPhotos ? pendingPhotos + (pendingPhotos === 1 ? ' fotografia' : ' fotografias') : '',
  ].filter(Boolean).join(' e ') + ' pendentes de sincronização';

  const resolve = async (choice: 'keep_local' | 'keep_remote') => {
    if (!selected) return;
    setResolving(true);
    try {
      await resolverConflitoOffline(selected.id, choice);
      setSelected(null);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['obras_visitas'] });
      await queryClient.invalidateQueries({ queryKey: ['obras_ocorrencias'] });
      await queryClient.invalidateQueries({ queryKey: ['obras_visita'] });
      await queryClient.invalidateQueries({ queryKey: ['obras_ocorrencia'] });
      if (choice === 'keep_local' && navigator.onLine) await sync();
    } finally {
      setResolving(false);
    }
  };

  const changedFields = selected
    ? (selected.changedFields ?? Object.keys(selected.payload).filter((key) => !['id', 'workspace_id', 'created_at', 'updated_at'].includes(key)))
    : [];

  return (
    <div className="space-y-2">
      <div role="status" aria-live="polite" className="flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
        {syncing || !queueLoaded
          ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
          : storageError || !online
            ? <WifiOff className="h-4 w-4 text-destructive" />
            : pendingCount > 0
              ? <CloudUpload className="h-4 w-4 text-amber-600" />
              : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        <span className="font-medium">{statusLabel}</span>
        {online && !syncing && <Wifi className="ml-auto h-4 w-4 text-muted-foreground" aria-label="Ligação disponível" />}
      </div>
      {(!online || pendingCount > 0 || !!storageError) && <Alert className={conflicts.length ? 'border-destructive/40' : failed ? 'border-destructive/40' : 'border-amber-500/40'}>
        {conflicts.length || failed ? <AlertCircle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <AlertTitle>{storageError ? 'Não foi possível consultar os dados pendentes' : !online ? 'Sem ligação à Internet' : conflicts.length ? 'Existem conflitos por resolver' : pendingLabel}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {storageError
              ? storageError + ' Não considere os dados sincronizados até recuperar o armazenamento local.'
              : conflicts.length
              ? 'Alguns registos foram alterados no servidor. Compare as versões antes de continuar a sincronização.'
              : failed?.lastError
                ? 'Sincronização interrompida: ' + failed.lastError
                : !online
                  ? 'A aplicação está sem ligação. Só estão disponíveis os dados previamente guardados neste dispositivo; as alterações compatíveis ficam pendentes.'
                  : pendingPhotos > 0 && pendingRecords > 0
                    ? pendingRecords + ' registos e ' + pendingPhotos + ' fotografias aguardam envio.'
                    : pendingPhotos > 0
                      ? pendingPhotos + (pendingPhotos === 1 ? ' fotografia aguarda envio.' : ' fotografias aguardam envio.')
                      : 'Existem registos guardados neste dispositivo por enviar.'}
          </span>
          <div className="flex flex-wrap gap-2">
            {conflicts.map((operation) => (
              <Button key={operation.id} type="button" size="sm" variant="destructive" onClick={() => setSelected(operation)}>
                <GitCompareArrows className="mr-2 h-4 w-4" />Resolver conflito
              </Button>
            ))}
            {pendingCount > 0 && !storageError && <Button type="button" size="sm" variant="outline" disabled={!online || syncing || conflicts.length > 0} onClick={() => void sync()}>
              <CloudUpload className="mr-2 h-4 w-4" />{syncing ? 'A sincronizar…' : 'Sincronizar agora'}
            </Button>}
          </div>
        </AlertDescription>
      </Alert>}

      <Dialog open={!!selected} onOpenChange={(open) => !resolving && !open && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comparar versões em conflito</DialogTitle>
            <DialogDescription>
              A versão local contém as alterações feitas neste dispositivo. A versão do servidor contém as alterações entretanto gravadas por outro utilizador. Escolha qual deve prevalecer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {changedFields.map((key) => (
              <div key={key} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                <div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{labels[key] ?? key} · Neste dispositivo</p><p className="whitespace-pre-wrap break-words text-sm">{display(selected?.payload[key])}</p></div>
                <div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{labels[key] ?? key} · Servidor</p><p className="whitespace-pre-wrap break-words text-sm">{display(selected?.conflictRemote?.[key])}</p></div>
              </div>
            ))}
            {!changedFields.length && <p className="text-sm text-muted-foreground">Não foram encontrados campos diferentes para apresentar.</p>}
          </div>
          <DialogFooter className="flex-col sm:flex-row">
            <Button type="button" variant="outline" disabled={resolving} onClick={() => void resolve('keep_remote')}>Manter versão do servidor</Button>
            <Button type="button" disabled={resolving || !online} onClick={() => void resolve('keep_local')}>{resolving ? 'A aplicar…' : 'Manter versão local'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
