import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useObra, useVisitas } from '../hooks/useObras';
import './relatorio-visita.css';

const TIPOS: Record<string, string> = {
  diario: 'Diário de obra',
  visita: 'Visita',
  reuniao: 'Reunião',
  fiscalizacao: 'Fiscalização',
};

function dataPt(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-PT');
}

export function RelatorioDiario() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const desde = params.get('desde') || '';
  const ate = params.get('ate') || '';
  const { data: obra, isLoading: obraLoading } = useObra(id);
  const { data: visitas = [], isLoading: visitasLoading, isError } = useVisitas(id);

  const registos = useMemo(() => visitas.filter((item) =>
    (!desde || item.data_visita >= desde) && (!ate || item.data_visita <= ate),
  ).sort((a, b) => a.data_visita.localeCompare(b.data_visita) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')), [visitas, desde, ate]);

  if (obraLoading || visitasLoading) return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A preparar diário de obra…</div>;
  if (!obra) return <div className="p-8">Obra não encontrada.</div>;
  if (isError) return <div className="p-8">Não foi possível carregar os registos do diário. Não emita o relatório até confirmar os dados.</div>;

  const periodo = desde || ate
    ? `${desde ? dataPt(desde) : 'Início não definido'} — ${ate ? dataPt(ate) : 'Sem data final'}`
    : registos.length
      ? `${dataPt(registos[0].data_visita)} — ${dataPt(registos[registos.length - 1].data_visita)}`
      : 'Sem registos';

  return (
    <main className="fkt-print-report">
      <div className="report-toolbar no-print">
        <Button asChild variant="ghost" size="sm"><Link to={`/obras/${obra.id}`}><ArrowLeft className="h-4 w-4 mr-1" />Voltar à obra</Link></Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir / Guardar PDF</Button>
      </div>
      <header className="report-header">
        <div>
          <p className="report-eyebrow">FKT WORKS · DIÁRIO DE OBRA</p>
          <h1>Relatório do diário de obra</h1>
          <p className="report-subtitle">{obra.nome}</p>
        </div>
        <div className="report-number"><span>PERÍODO ABRANGIDO</span><strong>{periodo}</strong><small>{registos.length} registo(s)</small></div>
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
        <h2>2. Registos cronológicos</h2>
        {!registos.length ? <p className="report-muted">Não existem registos no período indicado.</p> : registos.map((registo, index) => {
          const row = registo as typeof registo & { tipo_registo?: string; trabalhos_executados?: string | null; equipa_intervenientes?: string | null; equipamentos?: string | null; materiais?: string | null; condicionantes?: string | null; atrasos?: string | null; created_by?: string | null };
          const campos: [string, string | null | undefined][] = [
            ['Trabalhos executados', row.trabalhos_executados],
            ['Equipas e intervenientes', row.equipa_intervenientes],
            ['Equipamentos', row.equipamentos],
            ['Materiais', row.materiais],
            ['Condicionantes', row.condicionantes],
            ['Atrasos e motivos', row.atrasos],
            ['Notas complementares', registo.notas],
          ];
          return <article className="report-occurrence" key={registo.id}>
            <div className="report-occurrence-heading">
              <h3>{index + 1}. {dataPt(registo.data_visita)}{registo.hora_inicio ? ` · ${registo.hora_inicio.slice(0, 5)}` : ''}</h3>
              <span className="report-severity">{TIPOS[row.tipo_registo ?? 'visita'] ?? 'Visita'}</span>
            </div>
            <dl className="report-facts">
              <div><dt>Responsável / técnico</dt><dd>{registo.tecnico || '—'}</dd></div>
              <div><dt>Condições meteorológicas</dt><dd>{registo.condicoes_meteo || '—'}</dd></div>
              <div><dt>Autor (ID)</dt><dd>{row.created_by || 'Não identificado nos dados disponíveis'}</dd></div>
            </dl>
            {campos.map(([label, value]) => <div className="report-notes" key={label}><span>{label}</span><p>{value || 'Não registado.'}</p></div>)}
          </article>;
        })}
      </section>
      <footer className="report-footer">
        <span>FKT Works · Diário de obra · {obra.nome}</span>
        <span>Gerado em {new Date().toLocaleString('pt-PT')}</span>
      </footer>
    </main>
  );
}
