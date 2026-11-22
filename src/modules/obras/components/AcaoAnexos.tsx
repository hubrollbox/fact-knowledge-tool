import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Paperclip, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const BUCKET = 'obras-documentos';
const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
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

type Props = {
  acaoId: string;
  obraId: string;
  workspaceId: string;
  canWrite: boolean;
};

type Anexo = {
  id: string;
  criado_por: string;
  created_at: string;
  versao: {
    nome_ficheiro: string;
    mime_type: string;
    tamanho_bytes: number;
    storage_path: string;
    created_at: string;
  };
  signedUrl: string | null;
};

const formatarTamanho = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function AcaoAnexos({ acaoId, obraId, workspaceId, canWrite }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['obras_acao_anexos', acaoId];

  const { data: anexos = [], isLoading, isError } = useQuery<Anexo[]>({
    queryKey,
    enabled: !!acaoId && !!workspaceId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('obras_acoes_anexos')
        .select('id, criado_por, created_at, versao:obras_documento_versoes!inner(nome_ficheiro, mime_type, tamanho_bytes, storage_path, created_at)')
        .eq('acao_id', acaoId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Omit<Anexo, 'signedUrl'>[];
      const paths = rows.map((row) => row.versao.storage_path);
      const signed = paths.length
        ? await supabase.storage.from(BUCKET).createSignedUrls(paths, 900)
        : { data: [], error: null };
      if (signed.error) throw signed.error;

      const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
      return rows.map((row) => ({
        ...row,
        signedUrl: urls.get(row.versao.storage_path) ?? null,
      }));
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('É necessário iniciar sessão.');
      if (!canWrite) throw new Error('Não tem permissões para anexar ficheiros.');
      if (!file || !ALLOWED_TYPES.has(file.type)) {
        throw new Error('Formato não permitido. Utilize PDF, Office, TXT, JPG ou PNG.');
      }
      if (file.size < 1 || file.size > MAX_SIZE) {
        throw new Error('O ficheiro tem de ter conteúdo e não pode exceder 25 MB.');
      }
      if (file.name.length > 255) throw new Error('O nome do ficheiro é demasiado longo.');

      const documentoId = crypto.randomUUID();
      const versaoId = crypto.randomUUID();
      const nomeSeguro = file.name
        .normalize('NFKC')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 120) || 'ficheiro';
      const storagePath = `${workspaceId}/${obraId}/${documentoId}/${versaoId}/${nomeSeguro}`;

      const uploaded = await supabase.storage.from(BUCKET).upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;

      const created = await (supabase as any).rpc('create_obras_acao_anexo', {
        _acao_id: acaoId,
        _documento_id: documentoId,
        _versao_id: versaoId,
        _storage_path: storagePath,
        _nome_ficheiro: file.name,
        _mime_type: file.type,
        _tamanho_bytes: file.size,
      });

      if (created.error) {
        const cleanup = await supabase.storage.from(BUCKET).remove([storagePath]);
        if (cleanup.error) {
          throw new Error(`Não foi possível registar o anexo: ${created.error.message}. A limpeza do ficheiro também falhou: ${cleanup.error.message}`);
        }
        throw created.error;
      }

      return created.data as string;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Anexo associado à acção' });
    },
    onError: (error: Error) => {
      toast({ title: 'Não foi possível anexar o ficheiro', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <section className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />Anexos ({anexos.length})
        </div>
        {canWrite && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) upload.mutate(file);
              }}
            />
            <Button type="button" size="sm" variant="outline" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1 h-3.5 w-3.5" />
              {upload.isPending ? 'A carregar…' : 'Anexar ficheiro'}
            </Button>
          </>
        )}
      </div>

      {isLoading ? <p className="text-xs text-muted-foreground">A carregar anexos…</p>
        : isError ? <p className="text-xs text-destructive">Não foi possível carregar os anexos.</p>
        : anexos.length === 0 ? <p className="text-xs text-muted-foreground">Ainda não existem ficheiros anexados.</p>
        : (
          <ul className="space-y-1">
            {anexos.map((anexo) => (
              <li key={anexo.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                <span className="min-w-0 break-all">
                  {anexo.versao.nome_ficheiro} · {formatarTamanho(anexo.versao.tamanho_bytes)} · {new Date(anexo.created_at).toLocaleString('pt-PT')}
                </span>
                {anexo.signedUrl
                  ? <a href={anexo.signedUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />Abrir</a>
                  : <span className="text-muted-foreground">Ficheiro indisponível</span>}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
