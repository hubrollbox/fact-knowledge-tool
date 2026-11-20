import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Props = { obraId: string; visitaId?: string; ocorrenciaId?: string };

export function DocumentosAssociados({ obraId, visitaId, ocorrenciaId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['obras-documentos-associados', obraId, visitaId, ocorrenciaId],
    enabled: !!obraId && (!!visitaId || !!ocorrenciaId),
    queryFn: async () => {
      let linksQuery = supabase.from('obras_documentos_ligacoes').select('documento_id').eq('obra_id', obraId);
      if (visitaId) linksQuery = linksQuery.eq('visita_id', visitaId);
      if (ocorrenciaId) linksQuery = linksQuery.eq('ocorrencia_id', ocorrenciaId);
      const { data: links, error: linksError } = await linksQuery;
      if (linksError) throw linksError;
      const ids = [...new Set((links ?? []).map((link) => link.documento_id))];
      if (!ids.length) return [];
      const [docs, versions] = await Promise.all([
        supabase.from('obras_documentos').select('id,titulo,categoria,entidade_origem,identificador').in('id', ids),
        supabase.from('obras_documento_versoes').select('id,documento_id,numero_versao,nome_ficheiro,storage_path,created_at').in('documento_id', ids).order('numero_versao', { ascending: false }),
      ]);
      if (docs.error) throw docs.error;
      if (versions.error) throw versions.error;
      const paths = (versions.data ?? []).map((version) => version.storage_path);
      const signed = paths.length ? await supabase.storage.from('obras-documentos').createSignedUrls(paths, 900) : { data: [], error: null };
      if (signed.error) throw signed.error;
      const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
      return (docs.data ?? []).map((doc) => ({
        ...doc,
        versions: (versions.data ?? []).filter((version) => version.documento_id === doc.id)
          .map((version) => ({ ...version, signedUrl: urls.get(version.storage_path) ?? null })),
      }));
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar documentos…</div>;
  if (isError) return <p className="text-xs text-destructive">Não foi possível carregar os documentos associados.</p>;
  if (!data?.length) return <p className="text-xs text-muted-foreground">Não existem documentos associados.</p>;

  return (
    <div className="space-y-2">
      {data.map((doc) => (
        <div key={doc.id} className="rounded-md border border-border p-2">
          <div className="flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-muted-foreground" />{doc.titulo}</div>
          <p className="text-xs text-muted-foreground">{[doc.categoria, doc.entidade_origem, doc.identificador].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 space-y-1">
            {doc.versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between gap-2 text-xs">
                <span>V{version.numero_versao} · {version.nome_ficheiro}</span>
                {version.signedUrl && <a href={version.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />Abrir</a>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
