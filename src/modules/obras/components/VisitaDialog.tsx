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

function dataLocal(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function VisitaDialog({ obraId }: { obraId: string }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const criar = useCriarVisita();
  const hoje = new Date();
  const [f, setF] = useState({
    tipo_registo: 'diario', data_visita: dataLocal(hoje), hora_inicio: hoje.toTimeString().slice(0, 5),
    tecnico: '', condicoes_meteo: '', trabalhos_executados: '', equipa_intervenientes: '',
    equipamentos: '', materiais: '', condicionantes: '', atrasos: '', notas: '',
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
    <Dialog open={open} onOpenChange={(value) => { if (!criar.isPending) setOpen(value); }}>
      <DialogTrigger asChild>
        <Button size="default" className="min-h-11 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />Registar no diário
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh]">
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left">
          <DialogTitle>Novo registo do diário de obra</DialogTitle>
          <p className="text-sm text-muted-foreground">Comece pelo essencial. Pode completar os restantes dados depois.</p>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de registo</Label>
                <Select value={f.tipo_registo} onValueChange={(v) => set('tipo_registo', v)}>
                  <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label htmlFor="diario-data">Data</Label><Input id="diario-data" className="min-h-11" type="date" required value={f.data_visita} onChange={(e) => set('data_visita', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-hora">Hora</Label><Input id="diario-hora" className="min-h-11" type="time" value={f.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} /></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="diario-trabalhos">O que aconteceu hoje?</Label>
              <Textarea id="diario-trabalhos" autoFocus required value={f.trabalhos_executados} onChange={(e) => set('trabalhos_executados', e.target.value)} placeholder="Descreva os trabalhos realizados, o progresso e os factos relevantes." className="min-h-32 text-base" />
              <p className="text-xs text-muted-foreground">Registe factos observados. Pode acrescentar informação técnica abaixo.</p>
            </div>

            <details className="rounded-lg border px-3 py-2">
              <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium">Informação complementar</summary>
              <div className="space-y-4 pb-2 pt-3">
                <div className="space-y-1.5"><Label htmlFor="diario-tecnico">Técnico / responsável</Label><Input id="diario-tecnico" className="min-h-11" value={f.tecnico} onChange={(e) => set('tecnico', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-meteo">Condições meteorológicas</Label><Input id="diario-meteo" className="min-h-11" placeholder="Ex.: céu limpo, chuva fraca" value={f.condicoes_meteo} onChange={(e) => set('condicoes_meteo', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-equipa">Equipas e intervenientes</Label><Textarea id="diario-equipa" value={f.equipa_intervenientes} onChange={(e) => set('equipa_intervenientes', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-equipamentos">Equipamentos</Label><Textarea id="diario-equipamentos" value={f.equipamentos} onChange={(e) => set('equipamentos', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-materiais">Materiais</Label><Textarea id="diario-materiais" value={f.materiais} onChange={(e) => set('materiais', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-condicionantes">Condicionantes</Label><Textarea id="diario-condicionantes" value={f.condicionantes} onChange={(e) => set('condicionantes', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-atrasos">Atrasos e motivos</Label><Textarea id="diario-atrasos" value={f.atrasos} onChange={(e) => set('atrasos', e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="diario-notas">Notas complementares</Label><Textarea id="diario-notas" value={f.notas} onChange={(e) => set('notas', e.target.value)} /></div>
              </div>
            </details>
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="submit" className="min-h-12 w-full" disabled={criar.isPending || !f.trabalhos_executados.trim()}>
              {criar.isPending ? 'A guardar…' : 'Guardar registo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
