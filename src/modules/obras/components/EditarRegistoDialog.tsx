import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { useEditarRegistoOffline } from '../hooks/useObras';
import { GRAVIDADES } from '../types/obras';

type Props = {
  entity: 'visita' | 'ocorrencia';
  record: Record<string, any>;
  obraId: string;
};

export function EditarRegistoDialog({ entity, record, obraId }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const editar = useEditarRegistoOffline(entity);

  useEffect(() => {
    if (open) {
      setForm(entity === 'visita' ? {
        data_visita: record.data_visita ?? '',
        hora_inicio: record.hora_inicio ?? '',
        tecnico: record.tecnico ?? '',
        condicoes_meteo: record.condicoes_meteo ?? '',
        notas: record.notas ?? '',
        tipo_registo: record.tipo_registo ?? 'visita',
        trabalhos_executados: record.trabalhos_executados ?? '',
        equipa_intervenientes: record.equipa_intervenientes ?? '',
        equipamentos: record.equipamentos ?? '',
        materiais: record.materiais ?? '',
        condicionantes: record.condicionantes ?? '',
        atrasos: record.atrasos ?? '',
      } : {
        titulo: record.titulo ?? '',
        descricao: record.descricao ?? '',
        localizacao: record.localizacao ?? '',
        tipo: record.tipo ?? '',
        especialidade: record.especialidade ?? '',
        gravidade: record.gravidade ?? 'media',
      });
    }
  }, [open, entity, record]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const changes = entity === 'visita'
      ? { data_visita: form.data_visita, hora_inicio: form.hora_inicio || null, tecnico: form.tecnico || null, condicoes_meteo: form.condicoes_meteo || null, notas: form.notas || null, tipo_registo: form.tipo_registo || 'visita', trabalhos_executados: form.trabalhos_executados || null, equipa_intervenientes: form.equipa_intervenientes || null, equipamentos: form.equipamentos || null, materiais: form.materiais || null, condicionantes: form.condicionantes || null, atrasos: form.atrasos || null }
      : { titulo: form.titulo.trim(), descricao: form.descricao.trim() || null, localizacao: form.localizacao.trim() || null, tipo: form.tipo.trim() || null, especialidade: form.especialidade.trim() || null, gravidade: form.gravidade };
    await editar.mutateAsync({ id: record.id, obraId, changes });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !editar.isPending && setOpen(value)}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="mr-2 h-4 w-4" />Editar</Button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{entity === 'visita' ? 'Editar visita' : 'Editar ocorrência'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {entity === 'visita' ? <>
            <div><Label>Data</Label><Input type="date" required value={form.data_visita ?? ''} onChange={(e) => set('data_visita', e.target.value)} /></div>
            <div><Label>Hora de início</Label><Input type="time" value={form.hora_inicio ?? ''} onChange={(e) => set('hora_inicio', e.target.value)} /></div>
            <div><Label>Técnico</Label><Input value={form.tecnico ?? ''} onChange={(e) => set('tecnico', e.target.value)} /></div>
            <div><Label>Condições meteorológicas</Label><Input value={form.condicoes_meteo ?? ''} onChange={(e) => set('condicoes_meteo', e.target.value)} /></div>
            <div><Label>Tipo de registo</Label><Select value={form.tipo_registo ?? 'visita'} onValueChange={(v) => set('tipo_registo', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="diario">Diário de obra</SelectItem><SelectItem value="visita">Visita</SelectItem><SelectItem value="reuniao">Reunião</SelectItem><SelectItem value="fiscalizacao">Fiscalização</SelectItem></SelectContent></Select></div>
            <div><Label>Trabalhos executados</Label><Textarea value={form.trabalhos_executados ?? ''} onChange={(e) => set('trabalhos_executados', e.target.value)} /></div>
            <div><Label>Equipas e intervenientes</Label><Textarea value={form.equipa_intervenientes ?? ''} onChange={(e) => set('equipa_intervenientes', e.target.value)} /></div>
            <div><Label>Equipamentos</Label><Textarea value={form.equipamentos ?? ''} onChange={(e) => set('equipamentos', e.target.value)} /></div>
            <div><Label>Materiais</Label><Textarea value={form.materiais ?? ''} onChange={(e) => set('materiais', e.target.value)} /></div>
            <div><Label>Condicionantes</Label><Textarea value={form.condicionantes ?? ''} onChange={(e) => set('condicionantes', e.target.value)} /></div>
            <div><Label>Atrasos e motivos</Label><Textarea value={form.atrasos ?? ''} onChange={(e) => set('atrasos', e.target.value)} /></div>
            <div><Label>Notas complementares</Label><Textarea value={form.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></div>
          </> : <>
            <div><Label>Título</Label><Input required maxLength={200} value={form.titulo ?? ''} onChange={(e) => set('titulo', e.target.value)} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} /></div>
            <div><Label>Localização</Label><Input value={form.localizacao ?? ''} onChange={(e) => set('localizacao', e.target.value)} /></div>
            <div><Label>Tipo</Label><Input maxLength={100} value={form.tipo ?? ''} onChange={(e) => set('tipo', e.target.value)} /></div>
            <div><Label>Especialidade</Label><Input maxLength={100} value={form.especialidade ?? ''} onChange={(e) => set('especialidade', e.target.value)} /></div>
            <div><Label>Gravidade</Label><Select value={form.gravidade ?? 'media'} onValueChange={(value) => set('gravidade', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(GRAVIDADES).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
          </>}
          <DialogFooter><Button type="submit" disabled={editar.isPending || (entity === 'ocorrencia' && !form.titulo?.trim())}>{editar.isPending ? 'A guardar…' : 'Guardar alterações'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
