import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export function ClassificacaoOcorrencia({
  ocorrenciaId,
  obraId,
  tipoInicial,
  especialidadeInicial,
  canWrite,
}: {
  ocorrenciaId: string;
  obraId: string;
  tipoInicial: string | null;
  especialidadeInicial: string | null;
  canWrite: boolean;
}) {
  const [tipo, setTipo] = useState(tipoInicial ?? '');
  const [especialidade, setEspecialidade] = useState(especialidadeInicial ?? '');
  const qc = useQueryClient();

  useEffect(() => {
    setTipo(tipoInicial ?? '');
    setEspecialidade(especialidadeInicial ?? '');
  }, [ocorrenciaId, tipoInicial, especialidadeInicial]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('obras_ocorrencias')
        .update({ tipo: tipo.trim() || null, especialidade: especialidade.trim() || null })
        .eq('id', ocorrenciaId).eq('obra_id', obraId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obras_ocorrencia', obraId, ocorrenciaId] });
      qc.invalidateQueries({ queryKey: ['obras_ocorrencias'] });
      toast({ title: 'Classificação guardada' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível guardar a classificação', description: error.message, variant: 'destructive' }),
  });

  return (
    <section className="space-y-3">
      <p className="text-xs text-muted-foreground">A classificação é livre nesta fase. Use designações consistentes para facilitar a pesquisa entre obras.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`tipo-ocorrencia-${ocorrenciaId}`}>Tipo de ocorrência</Label>
          <Input id={`tipo-ocorrencia-${ocorrenciaId}`} maxLength={100} value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={!canWrite} placeholder="Ex.: infiltração, fissura, defeito" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`especialidade-ocorrencia-${ocorrenciaId}`}>Especialidade</Label>
          <Input id={`especialidade-ocorrencia-${ocorrenciaId}`} maxLength={100} value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} disabled={!canWrite} placeholder="Ex.: estruturas, electricidade, AVAC" />
        </div>
      </div>
      {canWrite && <div className="flex justify-end"><Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'A guardar…' : 'Guardar classificação'}</Button></div>}
    </section>
  );
}
