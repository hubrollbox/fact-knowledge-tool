import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCriarVisita } from '../hooks/useObras';

const TIPOS = { diario: 'Diário de obra', visita: 'Visita', reuniao: 'Reunião', fiscalizacao: 'Fiscalização' } as const;

export function VisitaDialog({ obraId }: { obraId: string }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const criar = useCriarVisita();
  const hoje = new Date();
  const [f, setF] = useState({
    tipo_registo: 'diario', data_visita: hoje.toISOString().slice(0, 10),
    hora_inicio: hoje.toTimeString().slice(0, 5), tecnico: '', condicoes_meteo: '',
    trabalhos_executados: '', equipa_intervenientes: '', equipamentos: '', materiais: '',
    condicionantes: '', atrasos: '', notas: '',
  });
  const set = (key: string, value: string) => setF((old) => ({ ...old, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = await criar.mutateAsync({
      obra_id: obraId, data_visita: f.data_visita, hora_inicio: f.hora_inicio || null,
      tecnico: f.tecnico || null, condicoes_meteo: f.condicoes_meteo || null, notas: f.notas || null,
      tipo_registo: f.tipo_registo, trabalhos_executados: f.trabalhos_executados || null,
      equipa_intervenientes: f.equipa_intervenientes || null, equipamentos: f.equipamentos || null,
      materiais: f.materiais || null, condicionantes: f.condicionantes || null, atrasos: f.atrasos || null,
    } as any);
    setOpen(false);
    nav(`/obras/${obraId}/visita/${v.id}`);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo registo</Button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo registo do diário de obra</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Tipo de registo</Label><Select value={f.tipo_registo} onValueChange={(v) => set('tipo_registo', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TIPOS).map(([key,label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data</Label><Input type="date" required value={f.data_visita} onChange={(e) => set('data_visita', e.target.value)} /></div>
            <div><Label>Hora de início</Label><Input type="time" value={f.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} /></div>
          </div>
          <div><Label>Técnico / responsável</Label><Input value={f.tecnico} onChange={(e) => set('tecnico', e.target.value)} /></div>
          <div><Label>Condições meteorológicas</Label><Input placeholder="Ex.: céu limpo, chuva fraca" value={f.condicoes_meteo} onChange={(e) => set('condicoes_meteo', e.target.value)} /></div>
          <div><Label>Trabalhos executados</Label><Textarea value={f.trabalhos_executados} onChange={(e) => set('trabalhos_executados', e.target.value)} /></div>
          <div><Label>Equipas e intervenientes</Label><Textarea value={f.equipa_intervenientes} onChange={(e) => set('equipa_intervenientes', e.target.value)} /></div>
          <div><Label>Equipamentos</Label><Textarea value={f.equipamentos} onChange={(e) => set('equipamentos', e.target.value)} /></div>
          <div><Label>Materiais</Label><Textarea value={f.materiais} onChange={(e) => set('materiais', e.target.value)} /></div>
          <div><Label>Condicionantes</Label><Textarea value={f.condicionantes} onChange={(e) => set('condicionantes', e.target.value)} /></div>
          <div><Label>Atrasos e motivos</Label><Textarea value={f.atrasos} onChange={(e) => set('atrasos', e.target.value)} /></div>
          <div><Label>Notas complementares</Label><Textarea value={f.notas} onChange={(e) => set('notas', e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={criar.isPending}>{criar.isPending ? 'A guardar…' : 'Guardar registo'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
