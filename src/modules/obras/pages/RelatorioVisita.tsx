import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileCheck, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObra, useVisita, useOcorrencias, useAcoes } from '../hooks/useObras';
import { useFotos } from '../hooks/useFotosObra';
import { useAuth } from '@/contexts/AuthContext';
import { useEmitirRelatorioVisita, useRelatoriosEmitidos } from '../hooks/useRelatoriosEmitidos';
import { fetchAnaliseOcorrencia } from '../hooks/useAnaliseOcorrencia';
import { ESTADOS_ACAO, ESTADOS_OCORRENCIA, GRAVIDADES } from '../types/obras';
import type { Foto, Ocorrencia } from '../types/obras';
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

type FotoRelatorio = Foto & { url: string | null };

function FotosOcorrencia({ fotos, isLoading }: { fotos?: FotoRelatorio[]; isLoading: boolean }) {
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

type AnaliseData = Awaited<ReturnType<typeof fetchAnaliseOcorrencia>>;
type AnaliseRelatorio = AnaliseData & { analise: NonNullable<AnaliseData['analise']> };

function BlocoAnalise({ dados, fotos }: { dados: AnaliseRelatorio; fotos: FotoRelatorio[] }) {
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
        {[{ titulo: `Factos confirmados (${confirmados.length})`, items: confirmados, vazio: 'Não foram registados factos confirmados.' }, { titulo: `Factos por confirmar (${porConfirmar.length})`, items: porConfirmar, vazio: 'Não existem factos assinalados como por confirmar.' }].map((grupo) => (
          <div key={grupo.titulo}>
            <strong>{grupo.titulo}</strong>
            {grupo.items.length ? (
              <ul>{grupo.items.map((facto) => {
                const foto = fotos.find((item) => item.id === facto.evidencia_foto_id);
                const referencia = referencias.find((item) => item.id === facto.referencia_id);
                return (
                  <li key={facto.id}>
                    <p>{facto.descricao}</p>
                    {foto ? (
                      <div className="report-fact-evidence">
                        {foto.url ? <a href={foto.url} target="_blank" rel="noreferrer"><img src={foto.url} alt={foto.legenda || 'Evidência fotográfica do facto'} /></a> : <span>Imagem da evidência indisponível.</span>}
                        <span><strong>Evidência:</strong> {foto.legenda || 'Fotografia associada'} · {foto.capturada_em ? dataHoraPt(foto.capturada_em) : 'Data/hora não registada'}</span>
                      </div>
                    ) : facto.evidencia_foto_id ? (
                      <p className="report-muted">A fotografia associada não está disponível no relatório.</p>
                    ) : (
                      <p className="report-muted">Sem evidência fotográfica associada.</p>
                    )}
                    {referencia ? <p className="report-fact-reference"><strong>Referência:</strong> {referencia.titulo}</p> : facto.referencia_id ? <p className="report-muted">A referência associada não está disponível no relatório.</p> : <p className="report-muted">Sem referência técnica associada.</p>}
                  </li>
                );
              })}</ul>
            ) : <p className="report-muted">{grupo.vazio}</p>}
          </div>
        ))}
      </div>
      {analise.informacao_em_falta && <div className="report-analysis-block"><strong>Informação em falta / pontos por confirmar</strong><p>{analise.informacao_em_falta}</p></div>}
      <div className="report-analysis-block"><strong>Normas e referências técnicas</strong>{referencias.length ? <ul className="report-references">{referencias.map((ref) => { const versao = ref.documento_versao_id ? versaoPorId.get(ref.documento_versao_id) : null; const documento = versao ? documentoPorId.get(versao.documento_id) : null; return <li key={ref.id}><span>{ref.titulo}</span><small>{[ref.tipo, ref.entidade_origem, ref.identificador, ref.versao, ref.data_documento ? dataPt(ref.data_documento) : null].filter(Boolean).join(' · ')}</small>{versao && <small>Documento arquivado: {documento?.titulo || versao.nome_ficheiro} — versão {versao.numero_versao} ({versao.nome_ficheiro})</small>}{versao?.signedUrl && <a href={versao.signedUrl} target="_blank" rel="noreferrer">Abrir documento arquivado</a>}{ref.notas && <small>{ref.notas}</small>}{ref.url && <a href={ref.url} target="_blank" rel="noreferrer">{ref.url}</a>}</li>; })}</ul> : <p className="report-muted">Não foram registadas referências técnicas ou documentais.</p>}</div>
      <div className="report-analysis-block"><strong>Conclusão</strong><p>{analise.conclusao || 'Não foi registada uma conclusão.'}</p></div>
      <div className="report-analysis-block"><strong>Recomendação</strong><p>{analise.recomendacao || 'Não foi registada uma recomendação.'}</p></div>
    </div>
  );
}
function BlocoOcorrencia({ ocorrencia, index, analise, fotos }: { ocorrencia: Ocorrencia; index: number; analise?: AnaliseRelatorio; fotos: FotoRelatorio[] }) {
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
      <FotosOcorrencia fotos={fotos} isLoading={false} />
      {analise ? <BlocoAnalise dados={analise} fotos={fotos ?? []} /> : <div className="report-analysis"><h4>Análise técnica</h4><p className="report-muted">Não foi registada análise técnica para esta ocorrência.</p></div>}
    </article>
  );
}

export function RelatorioVisita() {
  const { id, visitaId } = useParams();
  const { user } = useAuth();
  const emitirRelatorio = useEmitirRelatorioVisita(visitaId);
  const { data: relatoriosEmitidos = [] } = useRelatoriosEmitidos(visitaId);
  const { data: obra, isLoading: obraLoading } = useObra(id);
  const { data: visita, isLoading: visitaLoading } = useVisita(visitaId);
  const { data: ocorrencias, isLoading: ocorrenciasLoading } = useOcorrencias(id);
  const { data: acoes, isLoading: acoesLoading } = useAcoes(id);
  const idsOcorrenciasRelatorio = (ocorrencias ?? []).filter((o) => o.visita_id === visita?.id).map((o) => o.id);
  const { data: fotosVisita, isLoading: fotosLoading } = useFotos({ visitaId });
  const { data: fotosOcorrencias, isLoading: fotosOcorrenciasLoading } = useFotos({ ocorrenciaIds: idsOcorrenciasRelatorio });
  const { data: analisesRelatorio, isLoading: analisesLoading, isError: analisesError } = useQuery({
    queryKey: ['obras_relatorio_analises', visitaId, idsOcorrenciasRelatorio],
    enabled: !!visita?.id && !ocorrenciasLoading && idsOcorrenciasRelatorio.length > 0,
    queryFn: async () => Promise.all(idsOcorrenciasRelatorio.map(async (ocorrenciaId) => ({
      ocorrenciaId,
      ...(await fetchAnaliseOcorrencia(ocorrenciaId)),
    }))),
  });
  const analisePorOcorrencia = new Map(
    (analisesRelatorio ?? [])
      .filter((item): item is typeof item & { analise: NonNullable<typeof item.analise> } => !!item.analise)
      .map((item) => [item.ocorrenciaId, { analise: item.analise, factos: item.factos, referencias: item.referencias, versoes: item.versoes, documentos: item.documentos } as AnaliseRelatorio]),
  );
  const geradoEm = new Date();

  if (obraLoading || visitaLoading || ocorrenciasLoading || acoesLoading || fotosLoading || fotosOcorrenciasLoading || analisesLoading) return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A preparar relatório…</div>;
  if (!obra || !visita || visita.obra_id !== obra.id) {
    return <div className="p-8 space-y-3"><p className="text-sm text-muted-foreground">Não foi possível localizar esta visita e a respectiva obra.</p><Button asChild variant="outline"><Link to={id ? `/obras/${id}` : '/obras'}>Voltar</Link></Button></div>;
  }

  const ocorrenciasVisita = (ocorrencias ?? []).filter((o) => o.visita_id === visita.id);
  const idsOcorrencias = new Set(ocorrenciasVisita.map((o) => o.id));
  const acoesVisita = (acoes ?? []).filter((a) => a.ocorrencia_id && idsOcorrencias.has(a.ocorrencia_id));
  const acoesPendentes = acoesVisita.filter((a) => a.estado !== 'concluida');
  const gravidades = ['critica', 'alta', 'media', 'baixa'] as const;
  const podeEmitir = !!user && !analisesError && !analisesLoading && !fotosLoading && !fotosOcorrenciasLoading;
  const emitir = () => {
    if (!obra || !visita || !podeEmitir) return;
    const semUrl = (fotos: FotoRelatorio[]) => fotos.map(({ url: _url, ...foto }) => foto);
    const snapshot = {
      schema_version: 1,
      obra_id: obra.id,
      visita_id: visita.id,
      emitido_em_cliente: new Date().toISOString(),
      emitido_por: user.id,
      obra,
      visita,
      ocorrencias: ocorrenciasVisita,
      acoes: acoesVisita,
      fotos_visita: semUrl(fotosVisita ?? []),
      fotos_ocorrencias: semUrl(fotosOcorrencias ?? []),
      analises: [...analisePorOcorrencia.entries()].map(([ocorrencia_id, dados]) => ({
        ocorrencia_id,
        ...dados,
        versoes: dados.versoes.map(({ signedUrl: _signedUrl, ...versao }) => versao),
      })),
    };
    emitirRelatorio.mutate(snapshot);
  };

  return (
    <main className="fkt-print-report">
      <div className="report-toolbar no-print">
        <Button asChild variant="ghost" size="sm"><Link to={`/obras/${obra.id}/visita/${visita.id}`}><ArrowLeft className="h-4 w-4 mr-1" />Voltar à visita</Link></Button>
        <div className="flex items-center gap-2">
          <Button onClick={emitir} size="sm" disabled={!podeEmitir || emitirRelatorio.isPending}>
            {emitirRelatorio.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
            {emitirRelatorio.isPending ? 'A emitir…' : 'Emitir relatório'}
          </Button>
          <Button onClick={() => window.print()} size="sm"><Printer className="h-4 w-4 mr-2" />Imprimir / Guardar PDF</Button>
        </div>
      </div>

      <section className="report-section no-print">
        <h2>Emissões e versões</h2>
        {!relatoriosEmitidos.length ? <p className="report-muted">Este relatório ainda não foi emitido.</p> : (
          <ol className="space-y-2">
            {relatoriosEmitidos.map((relatorio) => (
              <li key={relatorio.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>Versão {relatorio.numero_versao} · {relatorio.estado === 'emitido' ? 'Emitido' : 'Rascunho'}</strong>
                  <span className="text-sm text-muted-foreground">{dataHoraPt(relatorio.emitido_em)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Emitido por: {relatorio.emitido_por}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Consultar snapshot desta versão</summary>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 text-xs">{JSON.stringify(relatorio.snapshot, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>

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
            {ocorrenciasVisita.map((o, index) => <BlocoOcorrencia key={o.id} ocorrencia={o} index={index} analise={analisePorOcorrencia.get(o.id)} fotos={(fotosOcorrencias ?? []).filter((foto) => foto.ocorrencia_id === o.id)} />)}
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
