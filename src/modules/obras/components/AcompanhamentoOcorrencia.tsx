import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, ShieldCheck } from 'lucide-react';

type Acao = { id: string; descricao: string; estado: string };
type Causa = { id: string; descricao: string; estado: string; fundamentacao: string; confirmado_em: string | null };
type Verificacao = { id: string; acao_id: string; resultado: string; descricao: string; evidencia: string | null; verificado_em: string; verificado_por: string };

const labels: Record<string, string> = { hipotese: 'Hipótese', confirmada: 'Confirmada', descartada: 'Descartada', eficaz: 'Eficaz', parcial: 'Parcialmente eficaz', ineficaz: 'Ineficaz' };
const dataPt = (value: string) => new Date(value).toLocaleString('pt-PT');

export function AcompanhamentoOcorrencia({ ocorrenciaId, estado, acoes, canWrite }: {
  ocorrenciaId: string; estado: string; acoes: Acao[]; canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [causaOpen, setCausaOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [fundamentacao, setFundamentacao] = useState('');
  const [verificacaoAcao, setVerificacaoAcao] = useState<Acao | null>(null);
  const [resultado, setResultado] = useState('eficaz');
  const [causaEstados, setCausaEstados] = useState<Record<string, string>>({});
  const [verificacaoDescricao, setVerificacaoDescricao] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const causas = useQuery({
    queryKey: ['obras_ocorrencia_causas', ocorrenciaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('obras_ocorrencia_causas')
        .select('*').eq('ocorrencia_id', ocorrenciaId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Causa[];
    },
  });
  const verificacoes = useQuery({
    queryKey: ['obras_acoes_verificacoes', ocorrenciaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('obras_acoes_verificacoes')
        .select('*').eq('ocorrencia_id', ocorrenciaId).order('verificado_em', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Verificacao[];
    },
  });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia_causas', ocorrenciaId] }),
      qc.invalidateQueries({ queryKey: ['obras_acoes_verificacoes', ocorrenciaId] }),
      qc.invalidateQueries({ queryKey: ['obras_historico_ocorrencia', ocorrenciaId] }),
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia'] }),
      qc.invalidateQueries({ queryKey: ['obras_ocorrencias'] }),
    ]);
  };

  const criarCausa = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('obras_ocorrencia_causas').insert({
        ocorrencia_id: ocorrenciaId, descricao: descricao.trim(), fundamentacao: fundamentacao.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCausaOpen(false); setDescricao(''); setFundamentacao('');
      await refresh(); toast({ title: 'Causa registada' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível registar a causa', description: error.message, variant: 'destructive' }),
  });

  const actualizarCausa = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from('obras_ocorrencia_causas').update({ estado }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (error: Error) => toast({ title: 'Não foi possível actualizar a causa', description: error.message, variant: 'destructive' }),
  });

  const criarVerificacao = useMutation({
    mutationFn: async () => {
      if (!verificacaoAcao) throw new Error('Seleccione uma acção.');
      const { error } = await (supabase as any).from('obras_acoes_verificacoes').insert({
        acao_id: verificacaoAcao.id, ocorrencia_id: ocorrenciaId, resultado,
        descricao: verificacaoDescricao.trim(), evidencia: evidencia.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setVerificacaoAcao(null); setVerificacaoDescricao(''); setEvidencia('');
      await refresh(); toast({ title: 'Verificação registada' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível registar a verificação', description: error.message, variant: 'destructive' }),
  });

  const reabrir = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('reabrir_obras_ocorrencia', {
        _ocorrencia_id: ocorrenciaId, _motivo: motivo.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setReabrirOpen(false); setMotivo('');
      await refresh(); toast({ title: 'Ocorrência reaberta' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível reabrir a ocorrência', description: error.message, variant: 'destructive' }),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-semibold">Causas identificadas</h3><p className="text-xs text-muted-foreground">Registe causas como hipóteses até existir fundamentação para as confirmar.</p></div>
        {canWrite && <Button size="sm" variant="outline" onClick={() => setCausaOpen(true)}>Registar causa</Button>}
      </div>
      {causas.isLoading ? <p className="text-xs text-muted-foreground">A carregar causas…</p> : causas.isError ? <p className="text-xs text-destructive">Não foi possível carregar as causas.</p> : !causas.data?.length ? <p className="text-xs text-muted-foreground">Ainda não foram registadas causas.</p> : (
        <div className="space-y-2">
          {causas.data.map((causa) => <div key={causa.id} className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{causa.descricao}</p><Badge variant={causa.estado === 'confirmada' ? 'default' : 'outline'}>{labels[causa.estado] ?? causa.estado}</Badge></div>
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{causa.fundamentacao}</p>
            {causa.confirmado_em && <p className="text-[11px] text-muted-foreground">Confirmada em {dataPt(causa.confirmado_em)}</p>}
            {canWrite && <div className="flex flex-wrap gap-2">
              {causa.estado !== 'confirmada' && <Button size="sm" variant="outline" disabled={actualizarCausa.isPending} onClick={() => actualizarCausa.mutate({ id: causa.id, estado: 'confirmada' })}>Confirmar causa</Button>}
              {causa.estado !== 'descartada' && <Button size="sm" variant="ghost" disabled={actualizarCausa.isPending} onClick={() => actualizarCausa.mutate({ id: causa.id, estado: 'descartada' })}>Descartar</Button>}
              {causa.estado !== 'hipotese' && <Button size="sm" variant="ghost" disabled={actualizarCausa.isPending} onClick={() => actualizarCausa.mutate({ id: causa.id, estado: 'hipotese' })}>Voltar a hipótese</Button>}
            </div>}
          </div>)}
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <div><h3 className="text-sm font-semibold">Verificação da eficácia das acções</h3><p className="text-xs text-muted-foreground">A conclusão da execução não substitui a verificação do resultado.</p></div>
        {acoes.filter((acao) => acao.estado === 'concluida').map((acao) => {
          const items = verificacoes.data?.filter((v) => v.acao_id === acao.id) ?? [];
          return <div key={acao.id} className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{acao.descricao}</p>{canWrite && <Button size="sm" variant="outline" onClick={() => setVerificacaoAcao(acao)}><ShieldCheck className="mr-1 h-4 w-4" />Verificar eficácia</Button>}</div>
            {!items.length ? <p className="text-xs text-muted-foreground">Ainda não foi verificada.</p> : items.map((item) => <div key={item.id} className="border-t pt-2 text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-2"><Badge variant={item.resultado === 'eficaz' ? 'default' : 'outline'}>{labels[item.resultado] ?? item.resultado}</Badge><span className="text-muted-foreground">{dataPt(item.verificado_em)}</span></div>
              <p>{item.descricao}</p>{item.evidencia && <p className="text-muted-foreground">Evidência: {item.evidencia}</p>}
            </div>)}
          </div>;
        })}
        {!acoes.some((acao) => acao.estado === 'concluida') && <p className="text-xs text-muted-foreground">As acções concluídas surgirão aqui para verificação.</p>}
        {verificacoes.isError && <p className="text-xs text-destructive">Não foi possível carregar as verificações.</p>}
      </div>

      {estado === 'resolvida' && canWrite && <div className="border-t pt-4 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-semibold">A ocorrência voltou a manifestar-se?</h3><p className="text-xs text-muted-foreground">A reabertura fica registada com motivo, autor e data.</p></div>
        <Button size="sm" variant="outline" onClick={() => setReabrirOpen(true)}><RotateCcw className="mr-1 h-4 w-4" />Reabrir ocorrência</Button>
      </div>}

      <Dialog open={causaOpen} onOpenChange={setCausaOpen}>
        <DialogContent><DialogHeader><DialogTitle>Registar causa</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); criarCausa.mutate(); }}>
            <div className="space-y-1"><Label>Descrição da causa</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required /></div>
            <div className="space-y-1"><Label>Fundamentação</Label><Textarea value={fundamentacao} onChange={(e) => setFundamentacao(e.target.value)} required rows={4} /></div>
            <p className="text-xs text-muted-foreground">A causa é criada como hipótese. Só será confirmada quando existir fundamentação suficiente.</p>
            <DialogFooter><Button type="submit" disabled={criarCausa.isPending || !descricao.trim() || !fundamentacao.trim()}>Guardar hipótese</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verificacaoAcao} onOpenChange={(open) => !open && setVerificacaoAcao(null)}>
        <DialogContent><DialogHeader><DialogTitle>Verificar eficácia da acção</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); criarVerificacao.mutate(); }}>
            <p className="text-sm text-muted-foreground">{verificacaoAcao?.descricao}</p>
            <div className="space-y-1"><Label>Resultado</Label><Select value={resultado} onValueChange={setResultado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="eficaz">Eficaz</SelectItem><SelectItem value="parcial">Parcialmente eficaz</SelectItem><SelectItem value="ineficaz">Ineficaz</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Descrição da verificação</Label><Textarea required rows={3} value={verificacaoDescricao} onChange={(e) => setVerificacaoDescricao(e.target.value)} /></div>
            <div className="space-y-1"><Label>Evidência (opcional)</Label><Textarea rows={2} value={evidencia} onChange={(e) => setEvidencia(e.target.value)} placeholder="Identificação ou descrição da evidência" /></div>
            <DialogFooter><Button type="submit" disabled={criarVerificacao.isPending || !verificacaoDescricao.trim()}>Registar verificação</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reabrirOpen} onOpenChange={setReabrirOpen}>
        <DialogContent><DialogHeader><DialogTitle>Reabrir ocorrência</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); reabrir.mutate(); }}>
            <div className="space-y-1"><Label>Motivo da reabertura</Label><Textarea required rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
            <DialogFooter><Button type="submit" disabled={reabrir.isPending || !motivo.trim()}>Confirmar reabertura</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
