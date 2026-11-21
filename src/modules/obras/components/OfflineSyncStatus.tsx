import { useEffect, useState } from 'react';
import { AlertCircle, CloudUpload, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useObrasWorkspace } from '../hooks/useObrasWorkspace';
import { useWorksOfflineQueue } from '../offline/useWorksOfflineQueue';

export function OfflineSyncStatus() {
  const workspaceId = useObrasWorkspace();
  const { operations, pendingCount, syncing, sync } = useWorksOfflineQueue(workspaceId);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!pendingCount && online) return null;
  const failed = operations.find((operation) => operation.lastError);
  const pendingLabel = pendingCount + (pendingCount === 1 ? ' registo pendente' : ' registos pendentes') + ' de sincronização';
  return (
    <Alert className={failed ? 'border-destructive/40' : 'border-amber-500/40'}>
      {failed ? <AlertCircle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <AlertTitle>{!online ? 'Sem ligação à Internet' : pendingLabel}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {failed?.lastError
            ? 'Sincronização interrompida: ' + failed.lastError
            : !online
              ? 'A aplicação está a utilizar os dados desta obra previamente guardados neste dispositivo. As alterações ficam pendentes.'
              : 'Existem dados guardados neste dispositivo por enviar.'}
        </span>
        {pendingCount > 0 && (
          <Button type="button" size="sm" variant="outline" disabled={!online || syncing} onClick={() => void sync()}>
            <CloudUpload className="mr-2 h-4 w-4" />{syncing ? 'A sincronizar…' : 'Sincronizar agora'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
