import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface QueryStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  skeletonRows?: number;
  children: ReactNode;
}

export function QueryState({
  loading,
  error,
  empty,
  emptyMessage = 'Nenhum registo encontrado.',
  emptyAction,
  onRetry,
  skeletonRows = 3,
  children,
}: QueryStateProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error}</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (empty) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
        <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
