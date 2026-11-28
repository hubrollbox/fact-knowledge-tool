import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ClipboardCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

type Resultado = 'eficaz' | 'parcial' | 'ineficaz';
type Verificacao = {
  id: string;
  resultado: Resultado;
  descricao: string;
  evidencia: string | null;
  verificado_por: string;
  verificado_em: string;
};

const RESULTADOS: Record<Resultado, string> = {
  eficaz: 'Eficaz',
  parcial: 'Parcialmente eficaz',
  ineficaz: 'Ineficaz',
};

export function AcaoVerificacao({ acaoId, ocorrenciaId, workspaceId, estado, canWrite }: {
  acaoId: string;
  ocorrenciaId: string;
  workspaceId: string;
  estado: string;
  canWrite: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ['obras_acao_verificacoes', workspaceId, acaoId];
  const [resultado, setResultado] = useState<Resultado>('eficaz');
  const [descricao, setDescricao] = useState('');
  const [evidencia, setEvidencia] = useState('');

  const { data: verificacoes = [], isLoading, isError } = useQuery<Verificacao[]>({
    queryKey,
    enabled: !!workspaceId && !!acaoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('obras_acoes_verificacoes')
        .select('id, resultado, descricao, evidencia, verificado_por, verificado_em')
        .eq('workspace_id', workspaceId)
        .eq('acao_id', acaoId)
        .order('verificado_em', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Verificacao[];
    },
  });

  const guardar = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('É necessário iniciar sessão.');
      if (estado !== 'concluida') throw new Error('A acção tem de estar concluída antes da verificação.');
      if (!descricao.trim()) throw new Error('Descreva o que foi verificado.');
      const { error } = await (supabase as any).from('obras_acoes_verificacoes').insert({
        acao_id: acaoId,
        ocorrencia_id: ocorrenciaId,
        workspace_id: workspaceId,
        resultado,
        descricao: descricao.trim(),
        evidencia: evidencia.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDescricao('');
      setEvidencia('');
      await qc.invalidateQueries({ queryKey });
      toast({ title: 'Verificação registada' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível registar a verificação', description: error.message, variant: 'destructive' }),
  });

  return (
    <section className="space-y-3 border-t pt-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" />Verificação da eficácia
      </div>
      {isLoading ? <p className="text-xs text-muted-foreground">A carregar verificações…</p>
        : isError ? <p className="text-xs text-destructive">Não foi possível carregar as verificações.</p>
        : verificacoes.length === 0 ? <p className="text-xs text-muted-foreground">Ainda não foi registada qualquer verificação.</p>
        : <ol className="space-y-2">{verificacoes.map((v) => (
          <li key={v.id} className="rounded-md bg-muted/40 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              <strong>{RESULTADOS[v.resultado] ?? v.resultado}</strong>
              <span className="text-muted-foreground">{new Date(v.verificado_em).toLocaleString('pt-PT')}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{v.descricao}</p>
            {v.evidencia && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">Evidência: {v.evidencia}</p>}
            <p className="mt-1 text-[10px] text-muted-foreground">Verificador · {v.verificado_por === user?.id ? 'Eu' : v.verificado_por.slice(0, 8)}</p>
          </li>
        ))}</ol>}
      {canWrite && estado === 'concluida' && (
        <form className="space-y-2 rounded-md border p-3" onSubmit={(event) => { event.preventDefault(); guardar.mutate(); }}>
          <div className="space-y-1">
            <Label>Resultado</Label>
            <Select value={resultado} onValueChange={(value) => setResultado(value as Resultado)}>
              <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eficaz">Eficaz</SelectItem>
                <SelectItem value="parcial">Parcialmente eficaz</SelectItem>
                <SelectItem value="ineficaz">Ineficaz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>O que foi verificado? *</Label>
            <Textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={2} maxLength={5000} placeholder="Descreva a inspecção e o resultado observado." />
          </div>
          <div className="space-y-1">
            <Label>Evidência (opcional)</Label>
            <Textarea value={evidencia} onChange={(event) => setEvidencia(event.target.value)} rows={2} maxLength={5000} placeholder="Identifique medições, documentos ou fotografias que sustentam a verificação." />
          </div>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={guardar.isPending || !descricao.trim()}>
            {guardar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Registar verificação
          </Button>
        </form>
      )}
      {estado !== 'concluida' && <p className="text-xs text-muted-foreground">A verificação de eficácia fica disponível depois de a acção ser marcada como concluída. A conclusão da acção não resolve automaticamente a ocorrência.</p>}
    </section>
  );
}
