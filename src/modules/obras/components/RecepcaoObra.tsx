import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Printer, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

type Pendencia = { id: string; origem: 'ocorrencia' | 'acao'; origem_id: string; titulo: string; estado_origem: string; decisao: '' | 'resolvida' | 'reserva_aceite'; justificacao: string };
type Props = { obraId: string; workspaceId: string; canWrite: boolean };

export function RecepcaoObra({ obraId, workspaceId, canWrite }: Props) {
  const qc = useQueryClient();
  const [reservas, setReservas] = useState('');
  const [notas, setNotas] = useState('');
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [estado, setEstado] = useState('em_preparacao');
  const [documentosIds, setDocumentosIds] = useState<string[]>([]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['obras-recepcao', obraId],
    queryFn: async () => {
      const [r, o, a, d] = await Promise.all([
        (supabase as any).from('obras_recepcoes').select('*').eq('obra_id', obraId).maybeSingle(),
        supabase.from('obras_ocorrencias').select('id,titulo,estado').eq('obra_id', obraId).neq('estado', 'resolvida'),
        supabase.from('obras_acoes').select('id,descricao,estado').eq('obra_id', obraId).not('estado', 'in', '("concluida","cancelada")'),
        supabase.from('obras_documentos').select('id,titulo,categoria').eq('obra_id', obraId).order('created_at', { ascending: false }),
      ]);
      if (r.error) throw r.error; if (o.error) throw o.error; if (a.error) throw a.error; if (d.error) throw d.error;
      const current: Pendencia[] = [
        ...(o.data ?? []).map((x: any) => ({ id: 'ocorrencia:' + x.id, origem: 'ocorrencia' as const, origem_id: x.id, titulo: x.titulo, estado_origem: x.estado, decisao: '' as const, justificacao: '' })),
        ...(a.data ?? []).map((x: any) => ({ id: 'acao:' + x.id, origem: 'acao' as const, origem_id: x.id, titulo: x.descricao, estado_origem: x.estado, decisao: '' as const, justificacao: '' })),
      ];
      const saved = new Map<string, Pendencia>((r.data?.pendencias ?? []).map((x: Pendencia) => [x.id, x]));
      return { reception: r.data, pendencias: current.map((x) => ({ ...x, ...(saved.get(x.id) ?? {}) })), documents: d.data ?? [] };
    },
  });
  useEffect(() => {
    if (!data) return;
    setPendencias(data.pendencias);
    setReservas(data.reception?.reservas ?? '');
    setNotas(data.reception?.notas ?? '');
    setEstado(data.reception?.estado ?? 'em_preparacao');
    setDocumentosIds(data.reception?.documentos_ids ?? []);
  }, [data]);
  const save = useMutation({
    mutationFn: async (nextState: string) => {
      if (!canWrite) throw new Error('Sem permissões para alterar a recepção.');
      const { error } = await (supabase as any).from('obras_recepcoes').upsert({
        workspace_id: workspaceId, obra_id: obraId, estado: nextState, pendencias, documentos_ids: documentosIds,
        reservas: reservas.trim() || null, notas: notas.trim() || null,
      }, { onConflict: 'obra_id' });
      if (error) throw error;
    },
    onSuccess: async (_data, nextState) => { setEstado(nextState); await qc.invalidateQueries({ queryKey: ['obras-recepcao', obraId] }); toast({ title: 'Recepção guardada' }); },
    onError: (e: Error) => toast({ title: 'Não foi possível guardar', description: e.message, variant: 'destructive' }),
  });
  const porTratar = pendencias.filter((p) => !p.decisao || (p.decisao === 'reserva_aceite' && !p.justificacao.trim()));
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (isError) return <p className="text-sm text-destructive">Não foi possível carregar a recepção.</p>;
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Recepção da obra</h2><p className="text-sm text-muted-foreground">Um único registo por obra, com pendências e reservas.</p></div><Badge variant={estado === 'concluida' ? 'default' : 'outline'}>{estado === 'concluida' ? 'Recebida' : estado === 'recebida_com_reservas' ? 'Recebida com reservas' : 'Em preparação'}</Badge></div>
    <div className="space-y-2"><h3 className="text-sm font-medium">Pendências por verificar ({pendencias.length})</h3>
      {!pendencias.length ? <p className="text-sm text-muted-foreground">Não existem ocorrências ou acções pendentes nesta obra.</p> : pendencias.map((p) => <div key={p.id} className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{p.titulo}</p><Badge variant="outline">{p.origem === 'ocorrencia' ? 'Ocorrência' : 'Acção'} · {p.estado_origem}</Badge></div>
        {canWrite ? <div className="grid gap-2 sm:grid-cols-2"><div><Label>Decisão</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={p.decisao} onChange={(e) => setPendencias((old) => old.map((x) => x.id === p.id ? { ...x, decisao: e.target.value as Pendencia['decisao'] } : x))}><option value="">Por decidir</option><option value="resolvida">Resolvida</option><option value="reserva_aceite">Aceite como reserva</option></select></div>{p.decisao === 'reserva_aceite' && <div><Label>Justificação da reserva *</Label><Input value={p.justificacao} onChange={(e) => setPendencias((old) => old.map((x) => x.id === p.id ? { ...x, justificacao: e.target.value } : x))} /></div>}</div> : <p className="text-xs text-muted-foreground">{p.decisao || 'Por decidir'} {p.justificacao}</p>}
      </div>)}
    </div>
    <div className="space-y-2"><Label htmlFor="recepcao-reservas">Reservas gerais</Label><Textarea id="recepcao-reservas" value={reservas} onChange={(e) => setReservas(e.target.value)} disabled={!canWrite} /></div>
    <div className="space-y-2"><Label htmlFor="recepcao-notas">Notas da recepção</Label><Textarea id="recepcao-notas" value={notas} onChange={(e) => setNotas(e.target.value)} disabled={!canWrite} /></div>
    <div className="space-y-2"><h3 className="text-sm font-medium">Documentos a integrar na recepção ({documentosIds.length})</h3>{data?.documents.length ? <div className="space-y-2">{data.documents.map((d: any) => <label key={d.id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={!canWrite} checked={documentosIds.includes(d.id)} onChange={(e) => setDocumentosIds((old) => e.target.checked ? [...old, d.id] : old.filter((id) => id !== d.id))} /><span>{d.titulo} <span className="text-muted-foreground">· {d.categoria}</span></span></label>)}</div> : <p className="text-sm text-muted-foreground">Sem documentos arquivados. Pode adicioná-los no separador Documentos.</p>}</div>
    <div className="flex flex-wrap justify-between gap-2 border-t pt-3"><Button type="button" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir relatório</Button>{canWrite && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate('em_preparacao')}><Save className="mr-2 h-4 w-4" />Guardar preparação</Button><Button type="button" disabled={save.isPending || porTratar.length > 0} onClick={() => save.mutate(pendencias.some((p) => p.decisao === 'reserva_aceite') || !!reservas.trim() ? 'recebida_com_reservas' : 'concluida')}><CheckCircle2 className="mr-2 h-4 w-4" />{porTratar.length ? 'Resolver pendências' : 'Confirmar recepção'}</Button></div>}</div>
    {porTratar.length > 0 && <p className="text-xs text-muted-foreground">A recepção só pode ser concluída depois de decidir todas as pendências e justificar as reservas aceites.</p>}
  </section>;
}
