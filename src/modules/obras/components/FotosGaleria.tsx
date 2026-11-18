import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, MapPin } from 'lucide-react';
import { useFotos, useUploadFoto } from '../hooks/useFotosObra';

interface Props { visitaId?: string; ocorrenciaId?: string; canWrite: boolean }

export function FotosGaleria({ visitaId, ocorrenciaId, canWrite }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const { data: fotos, isLoading } = useFotos({ visitaId, ocorrenciaId });
  const upload = useUploadFoto();

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) await upload.mutateAsync({ file, visitaId, ocorrenciaId }).catch(() => {});
    if (ref.current) ref.current.value = '';
  };

  return (
    <div className="space-y-3">
      {canWrite && (
        <>
          <input ref={ref} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
            Adicionar foto
          </Button>
        </>
      )}
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : !fotos?.length ? (
        <p className="text-sm text-muted-foreground">Ainda não há fotos.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {fotos.map((f) => (
            <a key={f.id} href={f.url ?? '#'} target="_blank" rel="noreferrer" className="block rounded-md overflow-hidden border border-border bg-muted">
              {f.url && <img src={f.url} alt={f.legenda ?? 'Foto de obra'} className="aspect-square w-full object-cover" loading="lazy" />}
              <div className="p-1.5 text-[11px] text-muted-foreground space-y-0.5">
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
