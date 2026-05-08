import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlertas, useMarcarLido, rotaParaAlerta, type Alerta, type AlertaModulo } from '@/hooks/useAlertas';
import { cn } from '@/lib/utils';

const MODULO_LABEL: Record<AlertaModulo, string> = {
  juridico: 'Jurídico',
  canil: 'Canil',
  dev: 'Dev',
};

export function AlertasBadge() {
  const { grupos, total } = useAlertas();
  const marcarLido = useMarcarLido();
  const navigate = useNavigate();

  const onClickAlerta = (a: Alerta) => {
    marcarLido.mutate(a.id);
    navigate(rotaParaAlerta(a));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alertas" className="relative">
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {total > 99 ? '99+' : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Alertas</span>
          <span className="text-xs text-muted-foreground">{total} por ler</span>
        </div>
        <ScrollArea className="max-h-96">
          {total === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem alertas pendentes.
            </div>
          ) : (
            (Object.keys(grupos) as AlertaModulo[]).map((mod) => {
              const items = grupos[mod];
              if (items.length === 0) return null;
              return (
                <div key={mod} className="py-1">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {MODULO_LABEL[mod]} · {items.length}
                  </div>
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => onClickAlerta(a)}
                      className={cn(
                        'w-full text-left px-3 py-2 hover:bg-accent transition-colors',
                        'border-l-2 border-transparent hover:border-primary'
                      )}
                    >
                      <div className="text-sm font-medium truncate">{a.titulo}</div>
                      {a.descricao && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{a.descricao}</div>
                      )}
                      {a.data_alerta && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(a.data_alerta).toLocaleDateString('pt-PT')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
