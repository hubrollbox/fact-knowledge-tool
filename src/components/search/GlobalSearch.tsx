import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowUpRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type SearchResult = {
  module: string;
  record_type: string;
  record_id: string;
  title: string;
  excerpt: string;
  href: string;
  created_at: string | null;
  workspace_id: string | null;
  obra_id: string | null;
  status: string | null;
};

const MODULES = [
  { value: '', label: 'Todos os módulos' },
  { value: 'works', label: 'FKT Works' },
  { value: 'lex', label: 'FKT Lex' },
  { value: 'vet', label: 'FKT Vet' },
  { value: 'dev', label: 'FKT Dev' },
  { value: 'core', label: 'Conhecimento e dossiers' },
];

const TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'obra', label: 'Obras' },
  { value: 'visita', label: 'Visitas' },
  { value: 'ocorrencia', label: 'Ocorrências' },
  { value: 'documento', label: 'Documentos' },
  { value: 'processo', label: 'Processos' },
  { value: 'analise', label: 'Análises' },
  { value: 'facto', label: 'Factos' },
  { value: 'questao', label: 'Questões' },
  { value: 'fonte', label: 'Fontes' },
  { value: 'animal', label: 'Animais' },
  { value: 'registo_clinico', label: 'Registos clínicos' },
  { value: 'projecto', label: 'Projectos' },
  { value: 'issue', label: 'Issues' },
  { value: 'disciplina', label: 'Disciplinas' },
  { value: 'topico', label: 'Tópicos' },
  { value: 'dossier', label: 'Dossiers' },
];

const MODULE_LABELS: Record<string, string> = {
  works: 'FKT Works', lex: 'FKT Lex', vet: 'FKT Vet', dev: 'FKT Dev', core: 'Core',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [module, setModule] = useState('');
  const [recordType, setRecordType] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [obraId, setObraId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const workspaces = useQuery({
    queryKey: ['fkt-search-workspaces'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('id,name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const obras = useQuery({
    queryKey: ['fkt-search-obras', workspaceId],
    enabled: open && !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase.from('obras').select('id,nome').eq('workspace_id', workspaceId).order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });

  const results = useQuery({
    queryKey: ['fkt-global-search', debounced, module, recordType, workspaceId, obraId, dateFrom, dateTo, status],
    enabled: open && debounced.length >= 2,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('fkt_global_search', {
        p_query: debounced,
        p_module: module || null,
        p_record_type: recordType || null,
        p_workspace_id: workspaceId || null,
        p_obra_id: obraId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_status: status.trim() || null,
        p_limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
  });

  const resetFilters = () => {
    setModule('');
    setRecordType('');
    setWorkspaceId('');
    setObraId('');
    setDateFrom('');
    setDateTo('');
    setStatus('');
  };

  const openResult = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const countLabel = useMemo(() => {
    if (!results.data) return '';
    return results.data.length === 50 ? '50+ resultados (limite de apresentação)' : `${results.data.length} resultado(s)`;
  }, [results.data]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 text-muted-foreground">
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Pesquisar</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pesquisa transversal</DialogTitle>
            <p className="text-sm text-muted-foreground">Pesquisa textual nos registos e metadados acessíveis. O conteúdo binário dos ficheiros ainda não está indexado.</p>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar em todo o FKT…" className="pl-9 pr-10" />
            {query && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setQuery('')}><X className="h-4 w-4" /></Button>}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select aria-label="Módulo" className="h-9 rounded-md border bg-background px-2 text-sm" value={module} onChange={(e) => { setModule(e.target.value); setRecordType(''); }}>
              {MODULES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select aria-label="Tipo de registo" className="h-9 rounded-md border bg-background px-2 text-sm" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
              {TYPES.filter((item) => !module || item.value === '' || (module === 'works' && ['obra','visita','ocorrencia','documento','analise'].includes(item.value)) || (module === 'lex' && ['processo','facto','questao','fonte','documento','analise'].includes(item.value)) || (module === 'vet' && ['animal','registo_clinico'].includes(item.value)) || (module === 'dev' && ['projecto','issue'].includes(item.value)) || (module === 'core' && ['disciplina','topico','dossier','documento','facto'].includes(item.value))).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select aria-label="Espaço de trabalho" className="h-9 rounded-md border bg-background px-2 text-sm" value={workspaceId} onChange={(e) => { setWorkspaceId(e.target.value); setObraId(''); }}>
              <option value="">Todos os workspaces</option>
              {(workspaces.data ?? []).map((w: {id:string;name:string}) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select aria-label="Obra" className="h-9 rounded-md border bg-background px-2 text-sm" value={obraId} onChange={(e) => setObraId(e.target.value)} disabled={!workspaceId}>
              <option value="">Todas as obras</option>
              {(obras.data ?? []).map((o: {id:string;nome:string}) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <Input aria-label="Data desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input aria-label="Data até" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Input aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Estado (opcional)" />
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>Limpar filtros</Button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{debounced.length < 2 ? 'Introduza pelo menos dois caracteres.' : countLabel}</span>
            {results.isFetching && <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" />A pesquisar</span>}
          </div>

          {results.isError && <p className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">A pesquisa não foi concluída. Verifique a ligação e tente novamente.</p>}
          {debounced.length >= 2 && !results.isFetching && results.data?.length === 0 && !results.isError && <p className="py-8 text-center text-sm text-muted-foreground">Não foram encontrados resultados acessíveis.</p>}

          <div className="max-h-[42vh] space-y-2 overflow-y-auto">
            {(results.data ?? []).map((item) => (
              <button key={item.module + item.record_type + item.record_id} type="button" onClick={() => openResult(item.href)} className="flex w-full items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{MODULE_LABELS[item.module] ?? item.module}</span><span>·</span><span>{item.record_type.replaceAll('_',' ')}</span>{item.status && <span className="rounded bg-muted px-1.5 py-0.5">{item.status}</span>}
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium text-foreground">{item.title}</span>
                  {item.excerpt && <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{item.excerpt}</span>}
                  {item.created_at && <span className="mt-1 block text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString('pt-PT')}</span>}
                </span>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
