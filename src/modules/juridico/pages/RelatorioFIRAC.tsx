import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProcesso } from '../hooks/useProcessos';
import { usePartes, useFactos, useQuestoes, useFontes, useAplicacoes, useConclusoes, useQuestaoFactos, useQuestaoFontes } from '../hooks/useFIRAC';
import '@/modules/obras/pages/relatorio-visita.css';

const dataPt = (v?: string | null) => (v ? new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString('pt-PT') : '—');

export function RelatorioFIRAC() {
  const { id = '' } = useParams();
  const { data: processo, isLoading } = useProcesso(id);
  const partes = usePartes(id).data ?? [];
  const factos = useFactos(id).data ?? [];
  const questoes = useQuestoes(id).data ?? [];
  const fontes = useFontes(id).data ?? [];
  const aplicacoes = useAplicacoes(id).data ?? [];
  const conclusoes = useConclusoes(id).data ?? [];
  const qFactos = (useQuestaoFactos(id).data ?? []) as any[];
  const qFontes = (useQuestaoFontes(id).data ?? []) as any[];

  if (isLoading || !processo) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const factoMap = new Map(factos.map((f: any) => [f.id, f]));
  const fonteMap = new Map(fontes.map((f: any) => [f.id, f]));

  return (
    <div className="fkt-print-report">
      <div className="report-toolbar no-print print:hidden">
        <Button variant="outline" size="sm" asChild><Link to={`/juridico/${id}`}><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar</Link></Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Imprimir / Guardar PDF</Button>
      </div>
      <header className="report-header">
        <div>
          <p className="report-eyebrow">FKT LEX · MINUTA FIRAC</p>
          <h1>{processo.titulo}</h1>
          <p className="report-subtitle">{[processo.numero_processo && `Proc. ${processo.numero_processo}`, processo.estado].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="report-number"><small>Emitido em</small><br /><strong>{dataPt(new Date().toISOString())}</strong></div>
      </header>

      {partes.length > 0 && <section><h2>Partes</h2><ul>{partes.map((p: any) => <li key={p.id}><strong>{p.nome}</strong> — {p.tipo}{p.mandatario ? ` (mandatário: ${p.mandatario})` : ''}</li>)}</ul></section>}

      <section><h2>F — Factos</h2>{factos.length ? <ol>{factos.map((f: any) => <li key={f.id}>{f.descricao} <small className="report-muted">[{f.estado}{f.data_facto ? ` · ${dataPt(f.data_facto)}` : ''}{f.origem ? ` · ${f.origem}` : ''}]</small></li>)}</ol> : <p className="report-muted">Sem factos registados.</p>}</section>

      <section><h2>I / R / A / C — Questões</h2>
        {questoes.length ? questoes.map((q: any, i: number) => {
          const fs = qFactos.filter((l) => l.questao_id === q.id).map((l) => factoMap.get(l.facto_id)).filter(Boolean) as any[];
          const rs = qFontes.filter((l) => l.questao_id === q.id).map((l) => fonteMap.get(l.fonte_id)).filter(Boolean) as any[];
          const aps = aplicacoes.filter((a: any) => a.questao_id === q.id);
          const cs = conclusoes.filter((c: any) => c.questao_id === q.id);
          return (
            <article key={q.id} className="report-occurrence">
              <h3>{i + 1}. {q.titulo} <small className="report-muted">({q.estado})</small></h3>
              <p><strong>Questão:</strong> {q.pergunta}</p>
              <div className="report-analysis-block"><strong>Factos relevantes</strong>{fs.length ? <ul>{fs.map((f) => <li key={f.id}>{f.descricao}</li>)}</ul> : <p className="report-muted">Nenhum facto associado.</p>}</div>
              <div className="report-analysis-block"><strong>Enquadramento normativo</strong>{rs.length ? <ul>{rs.map((r) => <li key={r.id}>{r.titulo}{r.referencia ? ` — ${r.referencia}` : ''} <small>({r.tipo}{r.entidade ? ` · ${r.entidade}` : ''})</small></li>)}</ul> : <p className="report-muted">Sem fontes associadas.</p>}</div>
              <div className="report-analysis-block"><strong>Aplicação</strong>{aps.length ? aps.map((a: any) => <div key={a.id}><p>{a.raciocinio}</p>{a.argumentos_favoraveis && <p><em>Favoráveis:</em> {a.argumentos_favoraveis}</p>}{a.argumentos_contrarios && <p><em>Contrários:</em> {a.argumentos_contrarios}</p>}{a.lacunas && <p><em>Lacunas:</em> {a.lacunas}</p>}</div>) : <p className="report-muted">Sem aplicação registada.</p>}</div>
              <div className="report-analysis-block"><strong>Conclusão</strong>{cs.length ? cs.map((c: any) => <p key={c.id}>{c.texto} <small className="report-muted">(v{c.versao} · {c.estado})</small></p>) : <p className="report-muted">Sem conclusão registada.</p>}</div>
            </article>
          );
        }) : <p className="report-muted">Sem questões registadas.</p>}
      </section>

      <footer className="report-muted" style={{ marginTop: 32, borderTop: '1px solid #ccc', paddingTop: 12, fontSize: 11 }}>
        Este documento é uma organização factual e analítica produzida com o FKT. Não constitui aconselhamento jurídico nem substitui a apreciação de um profissional habilitado.
      </footer>
    </div>
  );
}
