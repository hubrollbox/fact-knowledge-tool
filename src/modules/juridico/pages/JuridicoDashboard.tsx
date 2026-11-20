import { useProcessos } from '../hooks/useProcessos';
import { usePrazosUrgentes } from '../hooks/usePrazos';
import { ProcessoCard } from '../components/ProcessoCard';
import { PrazosBadge } from '../components/PrazosBadge';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { ProcessoNovoDialog } from '../components/ProcessoNovoDialog';

export function JuridicoDashboard() {
  const { data: processos, isLoading } = useProcessos();
  const { data: prazosUrgentes } = usePrazosUrgentes();
  const [novoOpen, setNovoOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Processos</h1>
          <p className="text-sm text-muted-foreground">Gestão de processos jurídicos</p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo processo
        </Button>
      </div>

      {/* Prazos urgentes */}
      {prazosUrgentes && prazosUrgentes.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-3">
            <PrazosBadge prazos={prazosUrgentes} />
            <span className="text-sm text-muted-foreground">nos próximos 7 dias</span>
          </div>
        </div>
      )}

      {/* Lista de processos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !processos?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Nenhum processo criado</p>
          <Button variant="outline" className="mt-4" onClick={() => setNovoOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Criar primeiro processo
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {processos.map((p) => {
            const prazo = prazosUrgentes?.find(
              (pr: any) => pr.processo_id === p.id
            );
            return (
              <ProcessoCard
                key={p.id}
                processo={p}
                proximoPrazo={prazo ?? null}
              />
            );
          })}
        </div>
      )}

      <ProcessoNovoDialog open={novoOpen} onOpenChange={setNovoOpen} />
    </div>
  );
}
