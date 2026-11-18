import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCriarAcao } from '../hooks/useObras';
import type { Ocorrencia } from '../types/obras';

export function AcaoDialog({ obraId, ocorrencias }: { obraId: string; ocorrencias: Ocorrencia[] }) {
  const [open, setOpen] = useState(false);
  const criar = useCriarAcao();
  const vazio = { descricao: '', responsavel: '', prazo: '', ocorrencia_id: 'none' };
  const [f, setF] = useState(vazio);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criar.mutateAsync({ obra_id: obraId, descricao: f.descricao.trim(), responsavel: f.responsavel || null, prazo: f.prazo || null, ocorrencia_id: f.ocorrencia_id === 'none' ? null : f.ocorrencia_id });
    setF(vazio); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova ação</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova ação</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Ação</Label><Input required value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Responsável</Label><Input value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })} /></div>
            <div><Label>Prazo</Label><Input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} /></div>
          </div>
          <div><Label>Ocorrência ligada</Label>
            <Select value={f.ocorrencia_id} onValueChange={(v) => setF({ ...f, ocorrencia_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {ocorrencias.map((o) => <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit" disabled={criar.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
