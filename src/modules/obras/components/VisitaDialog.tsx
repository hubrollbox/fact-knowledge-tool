import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useCriarVisita } from '../hooks/useObras';

export function VisitaDialog({ obraId }: { obraId: string }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const criar = useCriarVisita();
  const hoje = new Date();
  const [f, setF] = useState({ data_visita: hoje.toISOString().slice(0, 10), hora_inicio: hoje.toTimeString().slice(0, 5), tecnico: '', condicoes_meteo: '', notas: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = await criar.mutateAsync({ obra_id: obraId, data_visita: f.data_visita, hora_inicio: f.hora_inicio || null, tecnico: f.tecnico || null, condicoes_meteo: f.condicoes_meteo || null, notas: f.notas || null });
    setOpen(false);
    nav(`/obras/${obraId}/visita/${v.id}`);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Iniciar visita</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova visita</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data</Label><Input type="date" required value={f.data_visita} onChange={(e) => setF({ ...f, data_visita: e.target.value })} /></div>
            <div><Label>Hora de início</Label><Input type="time" value={f.hora_inicio} onChange={(e) => setF({ ...f, hora_inicio: e.target.value })} /></div>
          </div>
          <div><Label>Técnico</Label><Input value={f.tecnico} onChange={(e) => setF({ ...f, tecnico: e.target.value })} /></div>
          <div><Label>Condições meteorológicas</Label><Input placeholder="Ex.: sol, chuva fraca" value={f.condicoes_meteo} onChange={(e) => setF({ ...f, condicoes_meteo: e.target.value })} /></div>
          <div><Label>Notas</Label><Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
          <DialogFooter><Button type="submit" disabled={criar.isPending}>Começar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
