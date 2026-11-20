import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObra, useVisita, useOcorrencias, useAcoes } from '../hooks/useObras';
import { useFotos } from '../hooks/useFotosObra';
import { ESTADOS_ACAO, ESTADOS_OCORRENCIA, GRAVIDADES } from '../types/obras';
import type { Ocorrencia } from '../types/obras';
import './relatorio-visita.css';

function dataPt(value?: string | null) {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-PT');
}

function dataHoraPt(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('pt-PT');
}

function FotosOcorrencia({ ocorrenciaId }: { ocorrenciaId: string }) {
  const { data: fotos, isLoading } = useFotos({ ocorrenciaId });
  if (isLoading) return <p className="report-muted">A carregar fotografias…</p>;
  if (!fotos?.length) return null;
  return (
    <div className="report-photo-grid">
      {fotos.map((foto) => (
        <figure className="report-photo" key={foto.id}>
          {foto.url ? <img src={foto.url} alt={foto.legenda || 'Fotografia da ocorrência'} /> : <div className="report-photo-missing">Imagem indisponível</div>}
          <figcaption>
            {foto.legenda && <strong>{foto.legenda}<br /></strong>}
            {foto.capturada_em ? dataHoraPt(foto.capturada_em) : 'Data/hora não registada'}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

type AnaliseRelatorio = { analise: any; factos: any[]; referencias: any[]; versoes: any[]; documentos: any[] };

function BlocoAnalise({ dados }: { dados: AnaliseRelatorio }) {
  const { analise, factos, referencias, versoes, documentos } = dados;
  const versaoPorId = new Map(versoes.map((item) => [item.id, item]));
  const documentoPorId = new Map(documentos.map((item) => [item.id, item]));
  const confirmados = factos.filter((facto) => facto.estado === 'confirmado');
  const porConfirmar = factos.filter((facto) => facto.estado === 'por_confirmar');
  return (
    <div className="report-analysis">
      <h4>Análise técnica</h4>
      {analise.interpretacao && <div className="report-analysis-block"><strong>Interpretação técnica</strong><p>{analise.interpretacao}</p></div>}
      <div className="report-fact-columns">
        <div><strong>Factos confirmados ({confirmados.length})</strong>{confirmados.length ? <ul>{confirmados.map((f) => <li key={f.id}>{f.descricao}</li>)}</ul> : <p className="report-muted">Não foram registados factos confirmados.</p>}</div>
        <div><strong>Factos por confirmar ({porConfirmar.length})</strong>{porConfirmar.length ? <ul>{porConfirmar.map((f) => <li key={f.id}>{f.descricao}</li>)}</ul> : <p className="report-muted">Não existem factos assinalados como por confirmar.</p>}</div>
      </div>
      {analise.informacao_em_falta && <div className="report-analysis-block"><strong>Informação em falta / pontos por confirmar</strong><p>{analise.informacao_em_falta}</p></div>}
      {referencias.length > 0 && <div className="report-analysis-block"><strong>Normas e referências técnicas</strong><ul className="report-references">{referencias.map((ref) => { const versao = ref.documento_versao_id ? versaoPorId.get(ref.documento_versao_id) : null; const documento = versao ? documentoPorId.get(versao.documento_id) : null; return <li key={ref.id}><span>{ref.titulo}</span><small>{[ref.tipo, ref.entidade_origem, ref.identificador, ref.versao, ref.data_documento ? dataPt(ref.data_documento) : null].filter(Boolean).join(' · ')}</small>{versao && <small>Documento arquivado: {documento?.titulo || versao.nome_ficheiro} — versão {versao.numero_versao} ({versao.nome_ficheiro})</small>}{versao?.signedUrl && <a href={versao.signedUrl} target="_blank" rel="noreferrer">Abrir documento arquivado</a>}{ref.notas && <small>{ref.notas}</small>}{ref.url && <a href={ref.url} target="_blank" rel="noreferrer">{ref.url}</a>}</li>; })}</ul></div>}
      {analise.conclusao && <div className="report-analysis-block"><strong>Conclusão</strong><p>{analise.conclusao}</p></div>}
      {analise.recomendacao && <div className="report-analysis-block"><strong>Recomendação</strong><p>{analise.recomendacao}</p></div>}
    </div>
  );
}
function BlocoOcorrencia({ ocorrencia, index, analise }: { ocorrencia: Ocorrencia; index: number; analise?: AnaliseRelatorio }) {
  return (
    <article className="report-occurrence">
      <div className="report-occurrence-heading">
        <h3>{index + 1}. {ocorrencia.titulo}</h3>
        <span className={`report-severity severity-${ocorrencia.gravidade}`}>{GRAVIDADES[ocorrencia.gravidade as keyof typeof GRAVIDADES] ?? ocorrencia.gravidade}</span>
      </div>
      <dl className="report-facts">
        <div><dt>Localização</dt><dd>{ocorrencia.localizacao || 'Não indicada'}</dd></div>
        <div><dt>Estado</dt><dd>{ESTADOS_OCORRENCIA[ocorrencia.estado as keyof typeof ESTADOS_OCORRENCIA] ?? ocorrencia.estado}</dd></div>
      </dl>
      {ocorrencia.descricao && <p className="report-description">{ocorrencia.descricao}</p>}
      <FotosOcorrencia ocorrenciaId={ocorrencia.id} />
      {analise && <BlocoAnalise dados={analise} />}
    </article>
  );
}

export function RelatorioVisita() {
  const { id, visitaId } = useParams();
  const { data: obra, isLoading: obraLoading } = useObra(id);
  const { data: visita, isLoading: visitaLoading } = useVisita(visitaId);
  const { data: ocorrencias, isLoading: ocorrenciasLoading } = useOcorrencias(id);
  const { data: acoes, isLoading: acoesLoading } = useAcoes(id);
  const { data: fotosVisita, isLoading: fotosLoading } = useFotos({ visitaId });
  const idsOcorrenciasRelatorio = (ocorrencias ?? []).filter((o) => o.visita_id === visita?.id).map((o) => o.id);
  const { data: analisesRelatorio, isLoading: analisesLoading, isError: analisesError } = useQuery({
    queryKey: ['obras_relatorio_analises', visitaId, idsOcorrenciasRelatorio],
    enabled: !!visita?.id && !ocorrenciasLoading && idsOcorrenciasRelatorio.length > 0,
    queryFn: async () => {
      const { data: analises, error } = await supabase.from('obras_ocorrencia_analises').select('*').in('ocorrencia_id', idsOcorrenciasRelatorio);
      if (error) throw error;
      const analiseIds = (analises ?? []).map((item) => item.id);
      if (!analiseIds.length) return [];
      const [factosResult, refsResult] = await Promise.all([
        supabase.from('obras_ocorrencia_factos').select('*').in('analise_id', analiseIds).order('created_at'),
        supabase.from('obras_ocorrencia_referencias').select('*').in('analise_id', analiseIds).order('created_at'),
      ]);
      if (factosResult.error) throw factosResult.error;
      if (refsResult.error) throw refsResult.error;
      const refs = refsResult.data ?? [];
      const versaoIds = [...new Set(refs.map((ref) => ref.documento_versao_id).filter(Boolean))] as string[];
      const versoesResult = versaoIds.length ? await supabase.from('obras_documento_versoes').select('id, documento_id, numero_versao, nome_ficheiro, storage_path').in('id', versaoIds) : { data: [], error: null };
      if (versoesResult.error) throw versoesResult.error;
      const paths = (versoesResult.data ?? []).map((versao) => versao.storage_path);
      const signedResult = paths.length ? await supabase.storage.from('obras-documentos').createSignedUrls(paths, 900) : { data: [], error: null };
      if (signedResult.error) throw signedResult.error;
      const signedByPath = new Map((signedResult.data ?? []).map((item) => [item.path, item.signedUrl]));
      const versoes = (versoesResult.data ?? []).map((versao) => ({ ...versao, signedUrl: signedByPath.get(versao.storage_path) ?? null }));
      const documentoIds = [...new Set(versoes.map((versao) => versao.documento_id))];
      const documentosResult = documentoIds.length ? await supabase.from('obras_documentos').select('id, titulo').in('id', documentoIds) : { data: [], error: null };
      if (documentosResult.error) throw documentosResult.error;
      return (analises ?? []).map((analise) => ({ analise, factos: (factosResult.data ?? []).filter((f) => f.analise_id === analise.id), referencias: refs.filter((ref) => ref.analise_id === analise.id), versoes, documentos: documentosResult.data ?? [] }));
    },
  });
  const analisePorOcorrencia = new Map((analisesRelatorio ?? []).map((item) => [item.analise.ocorrencia_id, item as AnaliseRelatorio]));
  const geradoEm = new Date();

  if (obraLoading || visitaLoading || ocorrenciasLoading || acoesLoading || analisesLoading) return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A preparar relatório…</div>;
  if (!obra || !visita || visita.obra_id !== obra.id) {
    return <div className="p-8 space-y-3"><p className="text-sm text-muted-foreground">Não foi possível localizar esta visita e a respectiva obra.</p><Button asChild variant="outline"><Link to={id ? `/obras/${id}` : '/obras'}>Voltar</Link></Button></div>;
  }

  const ocorrenciasVisita = (ocorrencias ?? []).filter((o) => o.visita_id === visita.id);
  const idsOcorrencias = new Set(ocorrenciasVisita.map((o) => o.id));
  const acoesVisita = (acoes ?? []).filter((a) => a.ocorrencia_id && idsOcorrencias.has(a.ocorrencia_id));
  const acoesPendentes = acoesVisita.filter((a) => a.estado !== 'concluida');
  const gravidades = ['critica', 'alta', 'media', 'baixa'] as const;

  return (
    <main className="fkt-print-report">
      <div className="report-toolbar no-print">
        <Button asChild variant="ghost" size="sm"><Link to={`/obras/${obra.id}/visita/${visita.id}`}><ArrowLeft className="h-4 w-4 mr-1" />Voltar à visita</Link></Button>
        <Button onClick={() => window.print()} size="sm"><Printer className="h-4 w-4 mr-2" />Imprimir / Guardar PDF</Button>
      </div>

      <header className="report-header">
        <div>
          <p className="report-eyebrow">FKT WORKS · FISCALIZAÇÃO</p>
          <h1>Relatório de Visita</h1>
          <p className="report-subtitle">Registo de observações, ocorrências e acções de acompanhamento</p>
        </div>
        <div className="report-number">
          <span>DATA DA VISITA</span>
          <strong>{dataPt(visita.data_visita)}</strong>
          <small>{visita.hora_inicio?.slice(0, 5) || 'Hora não indicada'}{visita.hora_fim ? ` – ${visita.hora_fim.slice(0, 5)}` : ''}</small>
        </div>
      </header>

      <section className="report-section">
        <h2>1. Identificação da obra</h2>
        <div className="report-grid">
          <div><span>Obra</span><strong>{obra.nome}</strong></div>
          <div><span>Código</span><strong>{obra.codigo || '—'}</strong></div>
          <div><span>Morada</span><strong>{obra.morada || '—'}</strong></div>
          <div><span>Dono de obra</span><strong>{obra.dono_obra || '—'}</strong></div>
        </div>
      </section>

      <section className="report-section">
        <h2>2. Dados da visita</h2>
        <div className="report-grid">
          <div><span>Técnico / Fiscal</span><strong>{visita.tecnico || '—'}</strong></div>
          <div><span>Condições meteorológicas</span><strong>{visita.condicoes_meteo || '—'}</strong></div>
        </div>
        <div className="report-notes"><span>Notas gerais da visita</span><p>{visita.notas || 'Não foram registadas notas gerais.'}</p></div>
      </section>

      <section className="report-section">
        <h2>3. Quadro-resumo da fiscalização</h2>
        <div className="report-summary">
          <div><strong>{ocorrenciasVisita.length}</strong><span>Ocorrências</span></div>
          {gravidades.map((g) => <div key={g}><strong>{ocorrenciasVisita.filter((o) => o.gravidade === g).length}</strong><span>{GRAVIDADES[g]}</span></div>)}
          <div><strong>{acoesPendentes.length}</strong><span>Acções pendentes</span></div>
        </div>
      </section>

      <section className="report-section">
        <h2>4. Registo de ocorrências</h2>
        {!ocorrenciasVisita.length ? <p className="report-muted">Não foram registadas ocorrências nesta visita.</p> : (
          <div className="report-occurrences">
            {ocorrenciasVisita.map((o, index) => <BlocoOcorrencia key={o.id} ocorrencia={o} index={index} analise={analisePorOcorrencia.get(o.id)} />)}
          </div>
        )}
      </section>

      {analisesError && <p className="report-muted">Não foi possível carregar toda a análise técnica. Confirme os dados antes de emitir o relatório.</p>}

      <section className="report-section">
        <h2>5. Registo fotográfico da visita</h2>
        {fotosLoading ? <p className="report-muted">A carregar fotografias…</p> : !fotosVisita?.length ? (
          <p className="report-muted">Não foram adicionadas fotografias directamente à visita.</p>
        ) : (
          <div className="report-photo-grid">
            {fotosVisita.map((foto) => (
              <figure className="report-photo" key={foto.id}>
                {foto.url ? <img src={foto.url} alt={foto.legenda || 'Fotografia da visita'} /> : <div className="report-photo-missing">Imagem indisponível</div>}
                <figcaption>{foto.legenda && <strong>{foto.legenda}<br /></strong>}{foto.capturada_em ? dataHoraPt(foto.capturada_em) : 'Data/hora não registada'}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="report-section">
        <h2>6. Plano de acções correctivas</h2>
        {!acoesVisita.length ? <p className="report-muted">Não existem acções associadas às ocorrências desta visita.</p> : (
          <table className="report-table">
            <thead><tr><th>Acção</th><th>Responsável</th><th>Prazo</th><th>Estado</th></tr></thead>
            <tbody>
              {acoesVisita.map((a) => <tr key={a.id}><td>{a.descricao}</td><td>{a.responsavel || '—'}</td><td>{dataPt(a.prazo)}</td><td>{ESTADOS_ACAO[a.estado as keyof typeof ESTADOS_ACAO] ?? a.estado}</td></tr>)}
            </tbody>
          </table>
        )}
      </section>

      <section className="report-section report-validation">
        <h2>7. Validação e assinaturas</h2>
        <p className="report-muted">A assinatura neste documento confirma a recepção ou validação do relatório, não substituindo os procedimentos contratuais aplicáveis.</p>
        <div className="report-signatures">
          <div><strong>Fiscal / Técnico</strong><span>Nome:</span><span>Assinatura:</span><small>Data: ____ / ____ / ______</small></div>
          <div><strong>Recepção — Empreiteiro / Direcção de obra</strong><span>Nome:</span><span>Assinatura:</span><small>Data: ____ / ____ / ______</small></div>
        </div>
      </section>

      <footer className="report-footer">
        <span>FKT Works · Relatório de visita</span>
        <span>Documento gerado em {geradoEm.toLocaleString('pt-PT')}</span>
      </footer>
    </main>
  );
}
