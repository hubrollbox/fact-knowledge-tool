import { useEffect, useState } from 'react';
import { Search, Filter, X, CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface SelectOption { value: string; label: string; }

export interface ListFiltersValue {
  search: string;
  estado: string;
  tipo: string;
  clienteId: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export const emptyFilters: ListFiltersValue = {
  search: '', estado: 'todos', tipo: 'todos', clienteId: 'todos',
  dateFrom: null, dateTo: null,
};

interface ListFiltersProps {
  value: ListFiltersValue;
  onChange: (v: ListFiltersValue) => void;
  searchPlaceholder?: string;
  estados?: SelectOption[];
  tipos?: SelectOption[];
  clientes?: SelectOption[];
  showDateRange?: boolean;
}

export function ListFilters({
  value, onChange, searchPlaceholder = 'Pesquisar...',
  estados, tipos, clientes, showDateRange,
}: ListFiltersProps) {
  const [searchLocal, setSearchLocal] = useState(value.search);
  useEffect(() => { setSearchLocal(value.search); }, [value.search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchLocal !== value.search) onChange({ ...value, search: searchLocal });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocal]);

  const isActive =
    value.search || value.estado !== 'todos' || value.tipo !== 'todos' ||
    value.clienteId !== 'todos' || value.dateFrom || value.dateTo;

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchLocal}
          onChange={(e) => setSearchLocal(e.target.value)}
          className="pl-9"
        />
      </div>

      {estados && (
        <Select value={value.estado} onValueChange={(v) => onChange({ ...value, estado: v })}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os estados</SelectItem>
            {estados.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {tipos && (
        <Select value={value.tipo} onValueChange={(v) => onChange({ ...value, tipo: v })}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {clientes && (
        <Select value={value.clienteId} onValueChange={(v) => onChange({ ...value, clienteId: v })}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {clientes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {showDateRange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(
              'w-full sm:w-56 justify-start text-left font-normal',
              !value.dateFrom && !value.dateTo && 'text-muted-foreground'
            )}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.dateFrom ? (
                value.dateTo
                  ? `${format(value.dateFrom, 'dd/MM/yy')} - ${format(value.dateTo, 'dd/MM/yy')}`
                  : format(value.dateFrom, 'dd/MM/yyyy')
              ) : <span>Intervalo de datas</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: value.dateFrom ?? undefined, to: value.dateTo ?? undefined }}
              onSelect={(r) => onChange({ ...value, dateFrom: r?.from ?? null, dateTo: r?.to ?? null })}
              className={cn('p-3 pointer-events-auto')}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {isActive && (
        <Button variant="ghost" size="sm" onClick={() => onChange(emptyFilters)} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />Limpar
        </Button>
      )}
    </div>
  );
}
