import { AlertCircle, CloudUpload, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useObrasWorkspace } from '../hooks/useObrasWorkspace';
import { useWorksOfflineQueue } from '../offline/useWorksOfflineQueue';

export function OfflineSyncStatus() {
  const workspaceId = useObrasWorkspace();
  const { operations, pendingCount, syncing, sync } = useWorksOfflineQueue(workspaceId);
  if (!pendingCount) return null;
  const failed = operations.find((operation) => operation.lastError);
  return (
    <Alert className="border-amber-500/40">
      {failed ? <AlertCircle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <AlertTitle>{pendingCount} {pendingCount === 1 ? 'registo pendente' : 'registos pendentes'} de sincronização</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{failed?.lastError ? 'Último erro: ' + failed.lastError : 'Os dados estão guardados neste dispositivo e serão enviados quando houver ligação.'}</span>
        <Button type="button" size="sm" variant="outline" disabled={!navigator.onLine || syncing} onClick={() => void sync()}>
          <CloudUpload className="mr-2 h-4 w-4" />{syncing ? 'A sincronizar…' : 'Sincronizar agora'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
