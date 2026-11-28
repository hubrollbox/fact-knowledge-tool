import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProcesso } from '../hooks/useProcessos';
import { usePartes, useFactos, useQuestoes, useConclusoes, useConclusaoSnapshots } from '../hooks/useFIRAC';
import '@/modules/obras/pages/relatorio-visita.css';

const dataPt = (v?: string | null) => (v ? new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('pt-PT') : '—');
const list = (value: unknown): any[] => Array.isArray(value) ? value as any[] : [];

export function RelatorioFIRAC() {
  const { id = '' } = useParams();
  const { data: processo, isLoading } = useProcesso(id);
  const partes = usePartes(id).data ?? [];
  const factos = useFactos(id).data ?? [];
  const questoes = useQuestoes(id).data ?? [];
  const conclusoes = useConclusoes(id).data ?? [];
  const snapshots = useConclusaoSnapshots(id).data ?? [];

  if (isLoading || !processo) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const snapshotByConclusion = new Map(snapshots.map((snapshot: any) => [snapshot.conclusao_id, snapshot]));
  const conclusionsByIssue = new Map<string, any[]>();
  conclusoes.forEach((conclusao: any) => {
    const key = conclusao.questao_id ?? '__sem_questao__';
    conclusionsByIssue.set(key, [...(conclusionsByIssue.get(key) ?? []), conclusao]);
  });

  return (
    <div className="fkt-print-report">
      <div className="report-toolbar no-print print:hidden">
        <Button variant="outline" size="sm" asChild><Link to={`/juridico/${id}`}><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar</Link></Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Imprimir / Guardar PDF</Button>
      </div>
      <header className="report-header">
        <div>
          <p className="report-eyebrow">FKT LEX · RELATÓRIO FIRAC</p>
          <h1>{processo.titulo}</h1>
          <p className="report-subtitle">{[processo.numero_processo && `Proc. ${processo.numero_processo}`, processo.estado].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="report-number"><small>Emitido em</small><br /><strong>{dataPt(new Date().toISOString())}</strong></div>
      </header>

      {partes.length > 0 && <section><h2>Partes</h2><ul>{partes.map((p: any) => <li key={p.id}><strong>{p.nome}</strong> — {p.tipo}{p.mandatario ? ` (mandatário: ${p.mandatario})` : ''}</li>)}</ul></section>}

      <section>
        <h2>F — Factos do processo</h2>
        <p className="report-muted">Lista actual dos factos registados. A fundamentação de cada versão de conclusão é apresentada separadamente através do respectivo snapshot histórico.</p>
        {factos.length ? <ol>{factos.map((f: any) => <li key={f.id}>{f.descricao} <small className="report-muted">[{f.estado}{f.data_facto ? ` · ${dataPt(f.data_facto)}` : ''}{f.origem ? ` · ${f.origem}` : ''}]</small></li>)}</ol> : <p className="report-muted">Sem factos registados.</p>}
      </section>

      <section><h2>I / R / A / C — Questões e fundamentação</h2>
        {questoes.length ? questoes.map((q: any, i: number) => {
          const versions = conclusionsByIssue.get(q.id) ?? [];
          return (
            <article key={q.id} className="report-occurrence">
              <h3>{i + 1}. {q.titulo} <small className="report-muted">({q.estado})</small></h3>
              <p><strong>Questão:</strong> {q.pergunta}</p>
              {versions.length ? versions.map((c: any) => {
                const snapshot: any = snapshotByConclusion.get(c.id);
                const qFacts = list(snapshot?.factos_questao);
                const qSources = list(snapshot?.fontes_questao);
                const applicationFacts = list(snapshot?.factos_aplicacao);
                const applicationSources = list(snapshot?.fontes_aplicacao);
                const application = snapshot?.aplicacao;
                return (
                  <section key={c.id} className="report-analysis-block">
                    <h4>Conclusão v{c.versao} — {c.estado}</h4>
                    <p className="report-muted">Criada em {dataPt(c.created_at)} · Versão {c.versao} · {snapshot ? `Contexto capturado em ${dataPt(snapshot.captured_at)}` : 'Snapshot histórico indisponível — não é possível reconstruir com segurança a fundamentação desta versão.'}</p>
                    <div><strong>Factos considerados na questão</strong>
                      {qFacts.length ? <ul>{qFacts.map((f: any) => <li key={f.facto_id}>{f.descricao} <small>({f.estado}{f.data_facto ? ` · ${dataPt(f.data_facto)}` : ''})</small></li>)}</ul> : <p className="report-muted">Nenhum facto associado no momento da captura.</p>}
                    </div>
                    <div><strong>Fontes consideradas na questão</strong>
                      {qSources.length ? <ul>{qSources.map((s: any) => <li key={s.fonte_id}>{s.titulo}{s.referencia ? ` — ${s.referencia}` : ''} <small>({s.tipo}{s.entidade ? ` · ${s.entidade}` : ''}{s.versao ? ` · ${s.versao}` : ''})</small>{s.segmento_aplicavel && <p>{s.segmento_aplicavel}</p>}</li>)}</ul> : <p className="report-muted">Nenhuma fonte associada no momento da captura.</p>}
                    </div>
                    <div><strong>Aplicação do direito</strong>
                      {application ? <>
                        <p>{application.raciocinio || '—'}</p>
                        {application.pressupostos && <p><em>Pressupostos:</em> {application.pressupostos}</p>}
                        {application.argumentos_favoraveis && <p><em>Argumentos favoráveis:</em> {application.argumentos_favoraveis}</p>}
                        {application.argumentos_contrarios && <p><em>Argumentos contrários:</em> {application.argumentos_contrarios}</p>}
                        {application.lacunas && <p><em>Lacunas:</em> {application.lacunas}</p>}
                      </> : <p className="report-muted">Sem aplicação capturada nesta versão.</p>}
                    </div>
                    <div><strong>Factos efectivamente usados na aplicação</strong>
                      {applicationFacts.length ? <ul>{applicationFacts.map((f: any) => <li key={f.facto_id}>{f.descricao}{f.ligacao_notas ? ` — ${f.ligacao_notas}` : ''}</li>)}</ul> : <p className="report-muted">Nenhum facto associado à aplicação.</p>}
                    </div>
                    <div><strong>Fontes efectivamente usadas na aplicação</strong>
                      {applicationSources.length ? <ul>{applicationSources.map((s: any) => <li key={s.fonte_id}>{s.titulo}{s.referencia ? ` — ${s.referencia}` : ''}{s.segmento_aplicavel ? ` — ${s.segmento_aplicavel}` : ''}{s.ligacao_notas ? ` — ${s.ligacao_notas}` : ''}</li>)}</ul> : <p className="report-muted">Nenhuma fonte associada à aplicação.</p>}
                    </div>
                    <div><strong>Conclusão</strong><p>{c.texto}</p></div>
                  </section>
                );
              }) : <p className="report-muted">Ainda não existe uma conclusão versionada para esta questão.</p>}
            </article>
          );
        }) : <p className="report-muted">Sem questões registadas.</p>}
      </section>

      <footer className="report-muted" style={{ marginTop: 32, borderTop: '1px solid #ccc', paddingTop: 12, fontSize: 11 }}>
        Este documento apresenta a versão e o contexto de fundamentação preservado no momento da criação da conclusão. Não constitui aconselhamento jurídico nem substitui a apreciação de um profissional habilitado.
      </footer>
    </div>
  );
}
