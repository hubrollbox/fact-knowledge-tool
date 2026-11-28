import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { useCriarOcorrencia } from '../hooks/useObras';
import { useUploadFoto } from '../hooks/useFotosObra';
import { comprimirFotografia } from '../utils/comprimirFotografia';
import { GRAVIDADES } from '../types/obras';

export function OcorrenciaDialog({ obraId, visitaId }: { obraId: string; visitaId?: string }) {
  const [open, setOpen] = useState(false);
  const criar = useCriarOcorrencia();
  const upload = useUploadFoto();
  const cameraRef = useRef<HTMLInputElement>(null);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const [fotografia, setFotografia] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState('');
  const [ocorrenciaCriadaId, setOcorrenciaCriadaId] = useState<string | null>(null);
  const [aPreparar, setAPreparar] = useState(false);
  const vazio = { titulo: '', descricao: '', localizacao: '', tipo: '', especialidade: '', gravidade: 'media' };
  const [f, setF] = useState(vazio);
  const ocupado = criar.isPending || upload.isPending || aPreparar;

  useEffect(() => {
    if (!fotografia) { setPreview(null); return; }
    const url = URL.createObjectURL(fotografia);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [fotografia]);

  const limpar = () => {
    setF(vazio); setFotografia(null); setErroFoto(''); setOcorrenciaCriadaId(null);
    if (cameraRef.current) cameraRef.current.value = '';
    if (ficheiroRef.current) ficheiroRef.current.value = '';
  };

  const escolherFotografia = (file: File | null) => {
    setErroFoto('');
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErroFoto('Seleccione um ficheiro de imagem.'); return; }
    if (file.size > 20 * 1024 * 1024) { setErroFoto('A fotografia excede o limite de 20 MB.'); return; }
    setFotografia(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroFoto('');

    let id = ocorrenciaCriadaId;
    if (!id) {
      try {
        const criada = await criar.mutateAsync({
          obra_id: obraId,
          visita_id: visitaId ?? null,
          titulo: f.titulo.trim(),
          descricao: f.descricao.trim() || null,
          localizacao: f.localizacao.trim() || null,
          tipo: f.tipo.trim() || null,
          especialidade: f.especialidade.trim() || null,
          gravidade: f.gravidade,
        });
        id = criada.id;
        setOcorrenciaCriadaId(id);
      } catch (error) {
        setErroFoto(error instanceof Error ? error.message : 'Não foi possível guardar a ocorrência. Os dados continuam disponíveis para tentar novamente.');
        return;
      }
    }

    if (fotografia) {
      try {
        setAPreparar(true);
        const preparada = await comprimirFotografia(fotografia);
        setAPreparar(false);
        await upload.mutateAsync({ file: preparada, visitaId, ocorrenciaId: id! });
      } catch (error) {
        setAPreparar(false);
        setErroFoto(
          error instanceof Error
            ? `A ocorrência foi guardada, mas a fotografia não foi enviada: ${error.message}. Pode tentar novamente.`
            : 'A ocorrência foi guardada, mas não foi possível enviar a fotografia. Pode tentar novamente.',
        );
        return;
      }
    }

    limpar();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!ocupado) { setOpen(value); if (!value) limpar(); } }}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><AlertTriangle className="h-4 w-4 mr-1" />Nova ocorrência</Button></DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh]">
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left"><DialogTitle>Registar ocorrência</DialogTitle><p className="text-sm text-muted-foreground">Registe o que observou e, se possível, junte uma fotografia.</p></DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-1.5"><Label htmlFor="ocorrencia-titulo">O que encontrou?</Label><Input id="ocorrencia-titulo" className="min-h-12 text-base" required maxLength={200} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ocorrencia-descricao">Descrição / observações</Label><Textarea id="ocorrencia-descricao" className="min-h-28 text-base" placeholder="Descreva o que viu, sem conclusões." value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="ocorrencia-localizacao">Onde aconteceu?</Label><Input id="ocorrencia-localizacao" className="min-h-11" placeholder="Ex.: piso 2, fachada norte" value={f.localizacao} onChange={(e) => setF({ ...f, localizacao: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Gravidade</Label>
                <Select value={f.gravidade} onValueChange={(v) => setF({ ...f, gravidade: v })}><SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(GRAVIDADES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <details className="rounded-md border px-3 py-2">
              <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium">Classificação técnica (opcional)</summary>
              <div className="space-y-3 pb-2 pt-3">
                <div className="space-y-1.5"><Label htmlFor="ocorrencia-tipo">Tipo de ocorrência</Label><Input id="ocorrencia-tipo" className="min-h-11" maxLength={100} placeholder="Ex.: infiltração, fissura, defeito" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="ocorrencia-especialidade">Especialidade</Label><Input id="ocorrencia-especialidade" className="min-h-11" maxLength={100} placeholder="Ex.: estruturas, electricidade, AVAC" value={f.especialidade} onChange={(e) => setF({ ...f, especialidade: e.target.value })} /></div>
              </div>
            </details>
            <section className="space-y-3 rounded-md border border-dashed p-3">
              <div><h3 className="text-sm font-medium">Fotografia da ocorrência</h3><p className="text-xs text-muted-foreground">Pode tirar uma fotografia ou escolher uma imagem do dispositivo.</p></div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { escolherFotografia(e.target.files?.[0] ?? null); e.currentTarget.value = ''; }} />
              <input ref={ficheiroRef} type="file" accept="image/*" className="hidden" onChange={(e) => escolherFotografia(e.target.files?.[0] ?? null)} />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="default" className="min-h-11" onClick={() => cameraRef.current?.click()} disabled={ocupado}><Camera className="mr-2 h-4 w-4" />Tirar fotografia</Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => ficheiroRef.current?.click()} disabled={ocupado}><ImagePlus className="mr-2 h-4 w-4" />Escolher foto</Button>
              </div>
              {preview && <div className="relative w-full max-w-xs overflow-hidden rounded-md border">
                <img src={preview} alt="Pré-visualização da fotografia seleccionada" className="max-h-56 w-full object-contain" />
                <Button type="button" size="icon" variant="destructive" className="absolute right-2 top-2 h-9 w-9" aria-label="Remover fotografia" onClick={() => { setFotografia(null); setErroFoto(''); }}><X className="h-4 w-4" /></Button>
                <p className="truncate px-2 py-1 text-xs text-muted-foreground">{fotografia?.name}</p>
              </div>}
              {erroFoto && <p role="alert" className="text-sm text-destructive">{erroFoto}</p>}
              {ocorrenciaCriadaId && fotografia && <p className="text-xs text-muted-foreground">A ocorrência já está guardada. Pode voltar a tentar o envio da fotografia.</p>}
            </section>
          </div>
          <DialogFooter className="sticky bottom-0 shrink-0 border-t bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button type="submit" className="min-h-12 w-full sm:w-auto" disabled={ocupado || (!f.titulo.trim() && !ocorrenciaCriadaId)}>
              {ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {aPreparar ? 'A preparar fotografia…' : upload.isPending ? 'A enviar fotografia…' : criar.isPending ? 'A guardar ocorrência…' : ocorrenciaCriadaId ? (fotografia ? 'Tentar enviar fotografia' : 'Concluir registo') : 'Guardar ocorrência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
