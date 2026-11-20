import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, History } from 'lucide-react';

const CAMPOS: Record<string, string> = {
  titulo: 'Título',
  descricao: 'Descrição',
  localizacao: 'Localização',
  gravidade: 'Gravidade',
  estado: 'Estado',
  interpretacao: 'Interpretação',
  conclusao: 'Conclusão',
  recomendacao: 'Recomendação',
  informacao_em_falta: 'Informação em falta',
  descricao_facto: 'Facto',
  responsavel: 'Responsável',
  prazo: 'Prazo',
  tipo: 'Tipo',
  titulo_referencia: 'Referência',
  notas: 'Notas',
};

const OPERACOES: Record<string, string> = {
  INSERT: 'Registo criado',
  UPDATE: 'Registo alterado',
  DELETE: 'Registo eliminado',
};

const valor = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

function resumo(antes: Record<string, unknown> | null, depois: Record<string, unknown> | null) {
  const a = antes ?? {};
  const d = depois ?? {};
  const keys = [...new Set([...Object.keys(a), ...Object.keys(d)])]
    .filter((key) => !['id', 'workspace_id', 'created_at', 'updated_at', 'created_by', 'updated_by'].includes(key))
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(d[key]));
  return keys.slice(0, 5).map((key) => ({
    label: CAMPOS[key] ?? key.replace(/_/g, ' '),
    before: a[key],
    after: d[key],
  }));
}

export function HistoricoOcorrencia({ ocorrenciaId }: { ocorrenciaId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['obras_historico_ocorrencia', ocorrenciaId],
    enabled: !!ocorrenciaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('obras_historico_eventos')
        .select('id, entidade, entidade_id, operacao, actor_id, ocorrido_em, dados_anteriores, dados_novos')
        .eq('entidade_pai', 'obras_ocorrencias')
        .eq('entidade_pai_id', ocorrenciaId)
        .order('ocorrido_em', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar histórico…</div>;
  if (isError) return <p className="text-xs text-destructive">Não foi possível carregar o histórico.</p>;

  return (
    <section className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4" />
        <h4 className="text-sm font-semibold">Histórico e rastreabilidade</h4>
        <span className="text-xs text-muted-foreground">({data?.length ?? 0})</span>
      </div>
      {!data?.length ? (
        <p className="text-xs text-muted-foreground">Ainda não existem eventos registados.</p>
      ) : (
        <ol className="space-y-3">
          {data.map((event: any) => {
            const changes = resumo(event.dados_anteriores, event.dados_novos);
            return (
              <li key={event.id} className="border-l-2 border-muted pl-3 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-xs font-medium">{OPERACOES[event.operacao] ?? event.operacao} · {event.entidade.replace(/_/g, ' ')}</span>
                  <time className="text-[11px] text-muted-foreground">{new Date(event.ocorrido_em).toLocaleString('pt-PT')}</time>
                </div>
                {changes.length > 0 && (
                  <ul className="space-y-1">
                    {changes.map((change) => (
                      <li key={change.label} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{change.label}:</span>{' '}
                        {event.operacao === 'INSERT' ? valor(change.after) : event.operacao === 'DELETE' ? valor(change.before) : <>{valor(change.before)} → {valor(change.after)}</>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-muted-foreground">Utilizador: {event.actor_id ?? 'Não identificado'}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
