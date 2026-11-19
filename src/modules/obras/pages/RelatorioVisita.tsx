import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObra, useVisita, useOcorrencias, useAcoes } from '../hooks/useObras';
import { useFotos } from '../hooks/useFotosObra';
import { ESTADOS_ACAO, ESTADOS_OCORRENCIA, GRAVIDADES } from '../types/obras';
import type { Ocorrencia } from '../types/obras';
import './relatorio-visita.css';

function dataPt(value?: string | null) {
  if (!value) return '—';
  const d = /^\\d{4}-\\d{2}-\\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
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

function BlocoOcorrencia({ ocorrencia, index }: { ocorrencia: Ocorrencia; index: number }) {
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
    </article>
  );
}

export function RelatorioVisita() {
  const { id, visitaId } = useParams();
  const { data: obra, isLoading: obraLoading } = useObra(id);
  const { data: visita, isLoading: visitaLoading } = useVisita(visitaId);
  const { data: ocorrencias } = useOcorrencias(id);
  const { data: acoes } = useAcoes(id);
  const { data: fotosVisita, isLoading: fotosLoading } = useFotos({ visitaId });
  const geradoEm = new Date();

  if (obraLoading || visitaLoading) return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A preparar relatório…</div>;
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
          <p className="report-eyebrow">FKT OBRAS · FISCALIZAÇÃO</p>
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
            {ocorrenciasVisita.map((o, index) => <BlocoOcorrencia key={o.id} ocorrencia={o} index={index} />)}
          </div>
        )}
      </section>

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
        <span>FKT Obras · Relatório de visita</span>
        <span>Documento gerado em {geradoEm.toLocaleString('pt-PT')}</span>
      </footer>
    </main>
  );
}
