import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, MapPin } from 'lucide-react';
import { useFotos, useUploadFoto } from '../hooks/useFotosObra';

interface Props { visitaId?: string; ocorrenciaId?: string; canWrite: boolean }

export function FotosGaleria({ visitaId, ocorrenciaId, canWrite }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const { data: fotos, isLoading } = useFotos({ visitaId, ocorrenciaId });
  const upload = useUploadFoto();
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const [legenda, setLegenda] = useState('');
  const [uploadResumo, setUploadResumo] = useState<string | null>(null);
  const [uploadErros, setUploadErros] = useState<string[]>([]);

  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const photo of fotos ?? []) {
      if (photo.cachedBlob instanceof Blob) urls[photo.id] = URL.createObjectURL(photo.cachedBlob);
    }
    setLocalUrls(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [fotos]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    let guardadas = 0;
    let pendentes = 0;
    const erros: string[] = [];
    setUploadResumo(null);
    setUploadErros([]);
    for (const file of selected) {
      try {
        const result = await upload.mutateAsync({
          file, visitaId, ocorrenciaId, legenda: legenda.trim() || undefined,
        });
        if (result?.queued) pendentes += 1;
        else guardadas += 1;
      } catch {
        erros.push(file.name);
      }
    }
    const partes = [];
    if (guardadas) partes.push(guardadas + (guardadas === 1 ? ' fotografia guardada' : ' fotografias guardadas'));
    if (pendentes) partes.push(pendentes + (pendentes === 1 ? ' fotografia pendente de envio' : ' fotografias pendentes de envio'));
    setUploadResumo(partes.join(' · ') || null);
    setUploadErros(erros);
    if (ref.current) ref.current.value = '';
  };

  return (
    <div className="space-y-3">
      {canWrite && (
        <>
          <input ref={ref} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <div className="max-w-xl space-y-2">
            <label htmlFor={`foto-legenda-${visitaId ?? ocorrenciaId}`} className="text-xs font-medium">Legenda das fotografias seleccionadas (opcional)</label>
            <Input id={`foto-legenda-${visitaId ?? ocorrenciaId}`} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Ex.: Fissura junto ao vão da fachada norte" className="min-h-11" />
            <p className="text-[11px] text-muted-foreground">A mesma legenda será aplicada a todas as fotografias escolhidas nesta selecção.</p>
          </div>
          <Button size="sm" variant="outline" className="min-h-11" onClick={() => ref.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
            Adicionar foto
          </Button>
        </>
      )}
      {uploadResumo && <p role="status" className="text-xs text-muted-foreground">{uploadResumo}</p>}
      {uploadErros.length > 0 && <div role="alert" className="rounded-md border border-destructive/40 p-2 text-xs text-destructive">Não foi possível guardar: {uploadErros.join(', ')}. Pode voltar a seleccionar estas fotografias para tentar novamente.</div>}
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : !fotos?.length ? (
        <p className="text-sm text-muted-foreground">Ainda não há fotos.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {fotos.map((f) => (
            <a key={f.id} href={f.url ?? localUrls[f.id] ?? '#'} target="_blank" rel="noreferrer" className="block rounded-md overflow-hidden border border-border bg-muted">
              {(f.url ?? localUrls[f.id]) && <img src={f.url ?? localUrls[f.id]} alt={f.legenda ?? 'Foto de obra'} className="aspect-square w-full object-cover" loading="lazy" />}
              <div className="p-1.5 text-[11px] text-muted-foreground space-y-0.5">
                {f.legenda && <div className="font-medium text-foreground">{f.legenda}</div>}
                {f.capturada_em && <div>{new Date(f.capturada_em).toLocaleString('pt-PT')}</div>}
                {f.latitude != null && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{f.latitude.toFixed(5)}, {f.longitude?.toFixed(5)}</div>}
              </div>
            </a>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Quando autorizada, a app regista a hora e a localização da foto. Isto não constitui certificação.</p>
    </div>
  );
}
