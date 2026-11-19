import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useObrasWorkspace } from '../hooks/useObrasWorkspace';
import { useVisitas, useOcorrencias } from '../hooks/useObras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

const BUCKET = 'obras-documentos';
const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
]);

type Props = { obraId: string; canWrite: boolean };

export function DocumentosObra({ obraId, canWrite }: Props) {
  const workspaceId = useObrasWorkspace();
  const queryClient = useQueryClient();
  const versionInput = useRef<HTMLInputElement>(null);
  const [versionFor, setVersionFor] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('outro');
  const [origem, setOrigem] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [dataDocumento, setDataDocumento] = useState('');
  const [notas, setNotas] = useState('');
  const [visitaId, setVisitaId] = useState('');
  const [ocorrenciaId, setOcorrenciaId] = useState('');

  const { data: visitas } = useVisitas(obraId);
  const { data: ocorrencias } = useOcorrencias(obraId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['obras-documentos', obraId],
    enabled: !!obraId,
    queryFn: async () => {
      const [docs, versions, links] = await Promise.all([
        supabase.from('obras_documentos').select('*').eq('obra_id', obraId).order('created_at', { ascending: false }),
        supabase.from('obras_documento_versoes').select('*').eq('obra_id', obraId).order('numero_versao', { ascending: false }),
        supabase.from('obras_documentos_ligacoes').select('*').eq('obra_id', obraId),
      ]);
      if (docs.error) throw docs.error;
      if (versions.error) throw versions.error;
      if (links.error) throw links.error;
      const paths = (versions.data ?? []).map((v) => v.storage_path);
      const signed = paths.length
        ? await supabase.storage.from(BUCKET).createSignedUrls(paths, 900)
        : { data: [], error: null };
      if (signed.error) throw signed.error;
      const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
      return {
        documentos: docs.data ?? [],
        versoes: (versions.data ?? []).map((v) => ({ ...v, signedUrl: urls.get(v.storage_path) ?? null })),
        ligacoes: links.data ?? [],
      };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['obras-documentos', obraId] });

  const uploadNew = useMutation({
    mutationFn: async (file: File) => {
      if (!workspaceId) throw new Error('Não foi possível identificar o espaço de trabalho.');
      if (!file || !ALLOWED.has(file.type)) throw new Error('Formato não permitido. Utilize PDF, Office, TXT, JPG ou PNG.');
      if (file.size > MAX_SIZE) throw new Error('O ficheiro excede o limite de 25 MB.');
      if (!titulo.trim()) throw new Error('Indique o título do documento.');

      const documentId = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${workspaceId}/${obraId}/${documentId}/${versionId}/${safeName}`;
      const uploaded = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploaded.error) throw uploaded.error;

      const doc = await supabase.from('obras_documentos').insert({
        id: documentId, workspace_id: workspaceId, obra_id: obraId, titulo: titulo.trim(),
        categoria, entidade_origem: origem.trim() || null, identificador: identificador.trim() || null,
        data_documento: dataDocumento || null, notas: notas.trim() || null,
      }).select('id').single();

      if (doc.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw doc.error;
      }

      const version = await supabase.from('obras_documento_versoes').insert({
        id: versionId, documento_id: documentId, workspace_id: workspaceId, obra_id: obraId,
        numero_versao: 1, storage_path: path, nome_ficheiro: file.name, mime_type: file.type, tamanho_bytes: file.size,
      });
      if (version.error) {
        await supabase.from('obras_documentos').delete().eq('id', documentId);
        await supabase.storage.from(BUCKET).remove([path]);
        throw version.error;
      }

      if (visitaId || ocorrenciaId) {
        const link = await supabase.from('obras_documentos_ligacoes').insert({
          documento_id: documentId, workspace_id: workspaceId, obra_id: obraId,
          visita_id: visitaId || null, ocorrencia_id: ocorrenciaId || null,
        });
        if (link.error) toast({ title: 'Documento guardado', description: 'Não foi possível guardar a associação à visita/ocorrência.', variant: 'destructive' });
      }
      return documentId;
    },
    onSuccess: () => {
      setTitulo(''); setOrigem(''); setIdentificador(''); setDataDocumento(''); setNotas('');
      setVisitaId(''); setOcorrenciaId(''); setCategoria('outro');
      refresh();
      toast({ title: 'Documento arquivado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível arquivar o documento', description: error.message, variant: 'destructive' }),
  });

  const addVersion = useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      if (!workspaceId) throw new Error('Não foi possível identificar o espaço de trabalho.');
      if (!ALLOWED.has(file.type)) throw new Error('Formato de ficheiro não permitido.');
      if (file.size > MAX_SIZE) throw new Error('O ficheiro excede o limite de 25 MB.');
      const { data: latest, error: latestError } = await supabase.from('obras_documento_versoes')
        .select('numero_versao').eq('documento_id', documentId).order('numero_versao', { ascending: false }).limit(1).maybeSingle();
      if (latestError) throw latestError;
      const versionId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${workspaceId}/${obraId}/${documentId}/${versionId}/${safeName}`;
      const uploaded = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploaded.error) throw uploaded.error;
      const inserted = await supabase.from('obras_documento_versoes').insert({
        id: versionId, documento_id: documentId, workspace_id: workspaceId, obra_id: obraId,
        numero_versao: (latest?.numero_versao ?? 0) + 1, storage_path: path,
        nome_ficheiro: file.name, mime_type: file.type, tamanho_bytes: file.size,
      });
      if (inserted.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw inserted.error;
      }
    },
    onSuccess: () => { refresh(); toast({ title: 'Nova versão arquivada' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível guardar a versão', description: error.message, variant: 'destructive' }),
  });

  const docs = data?.documentos ?? [];
  const versions = data?.versoes ?? [];
  const links = data?.ligacoes ?? [];
  const fileForVersion = (documentId: string) => {
    setVersionFor(documentId);
    versionInput.current?.click();
  };
  const onVersionFile = (file?: File) => {
    if (file && versionFor) addVersion.mutate({ documentId: versionFor, file });
    setVersionFor(null);
    if (versionInput.current) versionInput.current.value = '';
  };

  return (
    <div className="space-y-5">
      {canWrite && (
        <form className="rounded-md border border-border p-3 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const file = (event.currentTarget.elements.namedItem('document-file') as HTMLInputElement).files?.[0];
          if (file) uploadNew.mutate(file);
        }}>
          <div>
            <h3 className="text-sm font-semibold">Arquivar documento</h3>
            <p className="text-xs text-muted-foreground">PDF, Office, TXT, JPG ou PNG · máximo 25 MB. Os ficheiros ficam privados.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="doc-title">Título *</Label><Input id="doc-title" value={titulo} onChange={(e) => setTitulo(e.target.value)} required /></div>
            <div className="space-y-1"><Label htmlFor="doc-category">Categoria</Label>
              <select id="doc-category" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="projeto">Projecto</option><option value="norma">Norma / Regulamento</option><option value="ficha_tecnica">Ficha técnica</option><option value="relatorio">Relatório</option><option value="correspondencia">Correspondência</option><option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="doc-origin">Entidade emissora / origem</Label><Input id="doc-origin" value={origem} onChange={(e) => setOrigem(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="doc-reference">Número / código</Label><Input id="doc-reference" value={identificador} onChange={(e) => setIdentificador(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="doc-date">Data do documento</Label><Input id="doc-date" type="date" value={dataDocumento} onChange={(e) => setDataDocumento(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="doc-file">Ficheiro *</Label><Input id="doc-file" name="document-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png" required /></div>
            <div className="space-y-1"><Label htmlFor="doc-visit">Associar a visita (opcional)</Label>
              <select id="doc-visit" value={visitaId} onChange={(e) => setVisitaId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Sem associação</option>{(visitas ?? []).map((v) => <option key={v.id} value={v.id}>{new Date(v.data_visita).toLocaleDateString('pt-PT')} · {v.tecnico || 'Visita'}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="doc-occurrence">Associar a ocorrência (opcional)</Label>
              <select id="doc-occurrence" value={ocorrenciaId} onChange={(e) => setOcorrenciaId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Sem associação</option>{(ocorrencias ?? []).map((o) => <option key={o.id} value={o.id}>{o.titulo}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1"><Label htmlFor="doc-notes">Notas</Label><Input id="doc-notes" value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={uploadNew.isPending}><Upload className="mr-2 h-4 w-4" />{uploadNew.isPending ? 'A carregar…' : 'Guardar documento'}</Button></div>
        </form>
      )}

      <input ref={versionInput} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
        onChange={(e) => onVersionFile(e.target.files?.[0])} />

      {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar o arquivo documental.</p>
      ) : !docs.length ? (
        <p className="text-sm text-muted-foreground">Ainda não existem documentos associados a esta obra.</p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const docVersions = versions.filter((v) => v.documento_id === doc.id);
            const docLinks = links.filter((link) => link.documento_id === doc.id);
            const latest = docVersions[0];
            return (
              <article key={doc.id} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">{doc.titulo}</h4>
                    <p className="text-xs text-muted-foreground">{[doc.categoria, doc.entidade_origem, doc.identificador, doc.data_documento && new Date(doc.data_documento).toLocaleDateString('pt-PT')].filter(Boolean).join(' · ')}</p>
                  </div>
                  {canWrite && <Button type="button" size="sm" variant="outline" onClick={() => fileForVersion(doc.id)} disabled={addVersion.isPending}><Plus className="mr-1 h-3.5 w-3.5" />Nova versão</Button>}
                </div>
                {doc.notas && <p className="text-sm whitespace-pre-wrap">{doc.notas}</p>}
                {docLinks.map((link) => <p key={link.id} className="text-xs text-muted-foreground">Associado{link.visita_id ? ' a uma visita' : ''}{link.visita_id && link.ocorrencia_id ? ' e' : ''}{link.ocorrencia_id ? ' a uma ocorrência' : ''}</p>)}
                <div className="space-y-1 border-t border-border pt-2">
                  {docVersions.map((version) => (
                    <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>Versão {version.numero_versao} · {version.nome_ficheiro} · {(version.tamanho_bytes / 1024 / 1024).toFixed(2)} MB · {new Date(version.created_at).toLocaleDateString('pt-PT')}</span>
                      {version.signedUrl && <a href={version.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />Abrir</a>}
                    </div>
                  ))}
                  {!latest && <p className="text-xs text-muted-foreground">Sem versões carregadas.</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
