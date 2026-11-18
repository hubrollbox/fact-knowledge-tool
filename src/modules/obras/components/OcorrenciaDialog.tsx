import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useCriarOcorrencia } from '../hooks/useObras';
import { GRAVIDADES } from '../types/obras';

export function OcorrenciaDialog({ obraId, visitaId }: { obraId: string; visitaId?: string }) {
  const [open, setOpen] = useState(false);
  const criar = useCriarOcorrencia();
  const vazio = { titulo: '', descricao: '', localizacao: '', gravidade: 'media' };
  const [f, setF] = useState(vazio);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criar.mutateAsync({ obra_id: obraId, visita_id: visitaId ?? null, titulo: f.titulo.trim(), descricao: f.descricao || null, localizacao: f.localizacao || null, gravidade: f.gravidade });
    setF(vazio); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><AlertTriangle className="h-4 w-4 mr-1" />Nova ocorrência</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registar ocorrência</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>O que foi observado</Label><Input required maxLength={200} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea placeholder="Descreva o que viu, sem conclusões." value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Localização na obra</Label><Input placeholder="Ex.: piso 2, fachada norte" value={f.localizacao} onChange={(e) => setF({ ...f, localizacao: e.target.value })} /></div>
            <div><Label>Gravidade</Label>
              <Select value={f.gravidade} onValueChange={(v) => setF({ ...f, gravidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(GRAVIDADES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={criar.isPending}>Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
