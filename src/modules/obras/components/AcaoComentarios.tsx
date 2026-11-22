import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = { acaoId: string; obraId: string; workspaceId: string };

export function AcaoComentarios({ acaoId, obraId, workspaceId }: Props) {
  const [mensagem, setMensagem] = useState('');
  const { user } = useAuth();
  const { canWrite } = useWorkspaceRole();
  const qc = useQueryClient();
  const queryKey = ['obras_acao_comentarios', acaoId];

  const { data: comentarios = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('obras_acoes_comentarios')
        .select('id, autor_id, mensagem, created_at')
        .eq('acao_id', acaoId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('É necessário iniciar sessão.');
      const texto = mensagem.trim();
      if (!texto) throw new Error('Escreva uma mensagem.');
      const { error } = await (supabase as any).from('obras_acoes_comentarios').insert({
        acao_id: acaoId,
        obra_id: obraId,
        workspace_id: workspaceId,
        autor_id: user.id,
        mensagem: texto,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMensagem('');
      await qc.invalidateQueries({ queryKey });
    },
  });

  return (
    <section className="space-y-2 border-t pt-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />Comentários ({comentarios.length})
      </div>
      {isLoading ? <p className="text-xs text-muted-foreground">A carregar comentários…</p>
        : error ? <p className="text-xs text-destructive">Não foi possível carregar os comentários.</p>
        : comentarios.length === 0 ? <p className="text-xs text-muted-foreground">Ainda não existem comentários.</p>
        : <ol className="space-y-2">{comentarios.map((c: any) => (
          <li key={c.id} className="rounded-md bg-muted/40 px-3 py-2">
            <p className="whitespace-pre-wrap text-sm">{c.mensagem}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {c.autor_id === user?.id ? 'Eu' : `Membro · ${String(c.autor_id).slice(0, 8)}`}
              {' · '}{new Date(c.created_at).toLocaleString('pt-PT')}
            </p>
          </li>
        ))}</ol>}
      {canWrite && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); enviar.mutate(); }}>
        <Input value={mensagem} onChange={e => setMensagem(e.target.value)} maxLength={10000} placeholder="Escrever comentário…" />
        <Button type="submit" size="icon" disabled={!mensagem.trim() || enviar.isPending} aria-label="Enviar comentário">
          <Send className="h-4 w-4" />
        </Button>
      </form>}
      {enviar.isError && <p className="text-xs text-destructive">{(enviar.error as Error).message}</p>}
    </section>
  );
}
