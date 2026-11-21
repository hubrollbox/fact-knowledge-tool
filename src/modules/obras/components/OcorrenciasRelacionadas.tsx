import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Loader2, Search, Unlink } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

type RelationRow = {
  id: string;
  workspace_id: string;
  ocorrencia_id: string;
  ocorrencia_relacionada_id: string;
  created_at: string;
  criado_por: string;
};
type Candidate = {
  id: string;
  obra_id: string;
  titulo: string;
  descricao: string | null;
  localizacao: string | null;
  tipo: string | null;
  especialidade: string | null;
  gravidade: string;
  estado: string;
  obras: { nome: string } | null;
};

export function OcorrenciasRelacionadas({
  ocorrenciaId,
  workspaceId,
  canWrite,
}: {
  ocorrenciaId: string;
  workspaceId: string;
  canWrite: boolean;
}) {
  const [termo, setTermo] = useState('');
  const qc = useQueryClient();
  const db = supabase as any;

  const relations = useQuery({
    queryKey: ['obras-ocorrencias-relacoes', workspaceId, ocorrenciaId],
    enabled: !!workspaceId && !!ocorrenciaId,
    queryFn: async () => {
      const { data, error } = await db.from('obras_ocorrencias_relacoes')
        .select('*').eq('workspace_id', workspaceId)
        .or(`ocorrencia_id.eq.${ocorrenciaId},ocorrencia_relacionada_id.eq.${ocorrenciaId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((r: RelationRow) =>
        r.ocorrencia_id === ocorrenciaId ? r.ocorrencia_relacionada_id : r.ocorrencia_id
      );
      if (!ids.length) return [];
      const { data: occurrences, error: occurrenceError } = await db.from('obras_ocorrencias')
        .select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)')
        .eq('workspace_id', workspaceId).in('id', ids);
      if (occurrenceError) throw occurrenceError;
      const byId = new Map((occurrences ?? []).map((o: Candidate) => [o.id, o]));
      return (data ?? []).flatMap((r: RelationRow) => {
        const relatedId = r.ocorrencia_id === ocorrenciaId ? r.ocorrencia_relacionada_id : r.ocorrencia_id;
        const occurrence = byId.get(relatedId);
        return occurrence ? [{ relation: r, occurrence }] : [];
      });
    },
  });

  const candidates = useQuery({
    queryKey: ['obras-ocorrencias-pesquisa', workspaceId, termo],
    enabled: canWrite && termo.trim().length >= 2,
    queryFn: async () => {
      const search = `%${termo.trim()}%`;
      const [titles, descriptions, locations, types, specialties, works] = await Promise.all([
        db.from('obras_ocorrencias').select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)').eq('workspace_id', workspaceId).ilike('titulo', search).limit(20),
        db.from('obras_ocorrencias').select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)').eq('workspace_id', workspaceId).ilike('descricao', search).limit(20),
        db.from('obras_ocorrencias').select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)').eq('workspace_id', workspaceId).ilike('localizacao', search).limit(20),
        db.from('obras_ocorrencias').select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)').eq('workspace_id', workspaceId).ilike('tipo', search).limit(20),
        db.from('obras_ocorrencias').select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)').eq('workspace_id', workspaceId).ilike('especialidade', search).limit(20),
        db.from('obras').select('id').eq('workspace_id', workspaceId).ilike('nome', search).limit(20),
      ]);
      for (const result of [titles, descriptions, locations, types, specialties, works]) if (result.error) throw result.error;
      const workIds = (works.data ?? []).map((w: { id: string }) => w.id);
      const workOccurrences = workIds.length
        ? await db.from('obras_ocorrencias').select('id, obra_id, titulo, descricao, localizacao, tipo, especialidade, gravidade, estado, obras(nome)').eq('workspace_id', workspaceId).in('obra_id', workIds).limit(20)
        : { data: [], error: null };
      if (workOccurrences.error) throw workOccurrences.error;
      const all = [...(titles.data ?? []), ...(descriptions.data ?? []), ...(locations.data ?? []), ...(types.data ?? []), ...(specialties.data ?? []), ...(workOccurrences.data ?? [])] as Candidate[];
      const unique = new Map(all.map((o) => [o.id, o]));
      const linked = new Set((relations.data ?? []).map((r: { occurrence: Candidate }) => r.occurrence.id));
      return [...unique.values()].filter((o) => o.id !== ocorrenciaId && !linked.has(o.id)).slice(0, 20);
    },
  });

  const add = useMutation({
    mutationFn: async (otherId: string) => {
      const [left, right] = [ocorrenciaId, otherId].sort();
      const { error } = await db.from('obras_ocorrencias_relacoes').insert({
        workspace_id: workspaceId, ocorrencia_id: left, ocorrencia_relacionada_id: right,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras-ocorrencias-relacoes', workspaceId, ocorrenciaId] });
      qc.invalidateQueries({ queryKey: ['obras-ocorrencias-pesquisa', workspaceId] });
      toast({ title: 'Ocorrências relacionadas', description: 'A relação foi registada como confirmação manual.' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível relacionar', description: error.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (relationId: string) => {
      const { error } = await db.from('obras_ocorrencias_relacoes').delete()
        .eq('id', relationId).eq('workspace_id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras-ocorrencias-relacoes', workspaceId, ocorrenciaId] });
      qc.invalidateQueries({ queryKey: ['obras-ocorrencias-pesquisa', workspaceId] });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível desligar', description: error.message, variant: 'destructive' }),
  });

  const linkedIds = useMemo(() => new Set((relations.data ?? []).map((r: { occurrence: Candidate }) => r.occurrence.id)), [relations.data]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Estas ligações são confirmadas manualmente. Uma relação entre ocorrências não significa que tenham a mesma causa técnica.</p>
      </div>
      {relations.isLoading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar relações…</div> :
        relations.isError ? <p className="text-sm text-destructive">Não foi possível carregar as relações.</p> :
        !relations.data?.length ? <p className="text-sm text-muted-foreground">Ainda não existem ocorrências relacionadas.</p> :
        <ul className="space-y-2">
          {relations.data.map((item: { relation: RelationRow; occurrence: Candidate }) => (
            <li key={item.relation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0 space-y-1">
                <Link className="text-sm font-medium text-primary hover:underline" to={`/obras/${item.occurrence.obra_id}/ocorrencia/${item.occurrence.id}`}>{item.occurrence.titulo}</Link>
                <p className="text-xs text-muted-foreground">{item.occurrence.obras?.nome ?? 'Obra'}{item.occurrence.localizacao ? ` · ${item.occurrence.localizacao}` : ''}</p>
                <div className="flex flex-wrap gap-1"><Badge variant="outline">{item.occurrence.gravidade}</Badge><Badge variant="outline">{item.occurrence.estado}</Badge><Badge variant="secondary">Ligação manual</Badge></div>
              </div>
              {canWrite && <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(item.relation.id)}><Unlink className="mr-1 h-4 w-4" />Desligar</Button>}
            </li>
          ))}
        </ul>
      }
      {canWrite && (
        <div className="space-y-2 border-t pt-3">
          <label className="text-sm font-medium" htmlFor={`pesquisa-ocorrencias-${ocorrenciaId}`}>Pesquisar ocorrências anteriores</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id={`pesquisa-ocorrencias-${ocorrenciaId}`} value={termo} onChange={(e) => setTermo(e.target.value)} className="pl-9" placeholder="Título, descrição, tipo, especialidade, localização ou obra…" />
          </div>
          {termo.trim().length > 0 && termo.trim().length < 2 && <p className="text-xs text-muted-foreground">Introduza pelo menos dois caracteres.</p>}
          {candidates.isFetching && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />A pesquisar…</p>}
          {candidates.isError && <p className="text-xs text-destructive">Não foi possível pesquisar ocorrências.</p>}
          {!!candidates.data?.length && (
            <ul className="space-y-2">
              {candidates.data.filter((o: Candidate) => !linkedIds.has(o.id)).map((o: Candidate) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0"><p className="text-sm font-medium">{o.titulo}</p><p className="text-xs text-muted-foreground">{o.obras?.nome ?? 'Obra'}{o.localizacao ? ` · ${o.localizacao}` : ''}{o.tipo ? ` · ${o.tipo}` : ''}{o.especialidade ? ` · ${o.especialidade}` : ''}</p></div>
                  <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => add.mutate(o.id)}><Link2 className="mr-1 h-4 w-4" />Relacionar</Button>
                </li>
              ))}
            </ul>
          )}
          {candidates.data?.length === 0 && termo.trim().length >= 2 && !candidates.isFetching && <p className="text-xs text-muted-foreground">Não foram encontradas ocorrências com esses termos.</p>}
        </div>
      )}
    </section>
  );
}
