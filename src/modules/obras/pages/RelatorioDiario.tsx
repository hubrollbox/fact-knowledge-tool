import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useObra, useVisitas } from '../hooks/useObras';
import './relatorio-visita.css';
import { formatDiaryAuthor } from '../utils/formatDiaryAuthor';

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

  const visitaIds = useMemo(() => registos.map((item) => item.id), [registos]);
  const { data: anexos = { photos: [], documents: [] }, isLoading: anexosLoading, isError: anexosError } = useQuery({
    queryKey: ['obras-diario-anexos-relatorio', visitaIds],
    enabled: !visitasLoading && visitaIds.length > 0,
    queryFn: async () => {
      const { data: occurrences, error: occurrencesError } = await supabase.from('obras_ocorrencias')
        .select('id,visita_id').in('visita_id', visitaIds);
      if (occurrencesError) throw occurrencesError;
      const occurrenceIds = (occurrences ?? []).map((item) => item.id);
      const [visitPhotos, occurrencePhotos, visitLinks, occurrenceLinks] = await Promise.all([
        supabase.from('obras_fotos').select('id,visita_id,ocorrencia_id,storage_path,legenda,capturada_em,latitude,longitude')
          .in('visita_id', visitaIds).order('capturada_em', { ascending: true }),
        occurrenceIds.length
          ? supabase.from('obras_fotos').select('id,visita_id,ocorrencia_id,storage_path,legenda,capturada_em,latitude,longitude')
              .in('ocorrencia_id', occurrenceIds).order('capturada_em', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        supabase.from('obras_documentos_ligacoes').select('documento_id,visita_id,ocorrencia_id')
          .in('visita_id', visitaIds),
        occurrenceIds.length
          ? supabase.from('obras_documentos_ligacoes').select('documento_id,visita_id,ocorrencia_id')
              .in('ocorrencia_id', occurrenceIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of [visitPhotos, occurrencePhotos, visitLinks, occurrenceLinks]) {
        if (result.error) throw result.error;
      }
      const photos = [...new Map([...(visitPhotos.data ?? []), ...(occurrencePhotos.data ?? [])].map((photo) => [photo.id, photo])).values()];
      const links = [...new Map([...(visitLinks.data ?? []), ...(occurrenceLinks.data ?? [])].map((link) => [`${link.documento_id}:${link.visita_id ?? ''}:${link.ocorrencia_id ?? ''}`, link])).values()];
      const photoUrls = photos.length
        ? await supabase.storage.from('obras-fotos').createSignedUrls(photos.map((photo) => photo.storage_path), 300)
        : { data: [], error: null };
      if (photoUrls.error) throw photoUrls.error;
      const photosWithUrls = photos.map((photo, index) => ({
        ...photo, url: photoUrls.data?.[index]?.signedUrl ?? null,
      }));
      const documentIds = [...new Set(links.map((link) => link.documento_id))];
      if (!documentIds.length) return { photos: photosWithUrls, documents: [] as any[] };
      const [documentsResult, versionsResult] = await Promise.all([
        supabase.from('obras_documentos').select('id,titulo,categoria,entidade_origem,identificador').in('id', documentIds),
        supabase.from('obras_documento_versoes').select('id,documento_id,numero_versao,nome_ficheiro,storage_path,created_at')
          .in('documento_id', documentIds).order('numero_versao', { ascending: false }),
      ]);
      if (documentsResult.error) throw documentsResult.error;
      if (versionsResult.error) throw versionsResult.error;
      const versions = versionsResult.data ?? [];
      const signed = versions.length
        ? await supabase.storage.from('obras-documentos').createSignedUrls(versions.map((version) => version.storage_path), 900)
        : { data: [], error: null };
      if (signed.error) throw signed.error;
      const versionsWithUrls = versions.map((version, index) => ({
        ...version, signedUrl: signed.data?.[index]?.signedUrl ?? null,
      }));
      return {
        photos: photosWithUrls,
        documents: (documentsResult.data ?? []).map((document) => ({
          ...document,
          visitaIds: [...new Set(links.filter((link) => link.documento_id === document.id).map((link) => link.visita_id ?? (occurrences ?? []).find((item) => item.id === link.ocorrencia_id)?.visita_id).filter(Boolean))],
          versions: versionsWithUrls.filter((version) => version.documento_id === document.id),
        })),
      };
    },
  });
  const anexosPorVisita = useMemo(() => Object.fromEntries(visitaIds.map((visitaId) => [
    visitaId,
    {
      photos: anexos.photos.filter((photo: any) => photo.visita_id === visitaId),
      documents: anexos.documents.filter((document: any) => document.visitaIds.includes(visitaId)),
    },
  ])), [anexos, visitaIds]);

  if (obraLoading || visitasLoading || anexosLoading) return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A preparar diário de obra…</div>;
  if (!obra) return <div className="p-8">Obra não encontrada.</div>;
  if (isError) return <div className="p-8">Não foi possível carregar os registos do diário. Não emita o relatório até confirmar os dados.</div>;
  if (anexosError) return <div className="p-8">Não foi possível carregar fotografias ou documentos associados. Não emita o relatório até confirmar os anexos.</div>;

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
          const row = registo as typeof registo & { tipo_registo?: string; trabalhos_executados?: string | null; equipa_intervenientes?: string | null; equipamentos?: string | null; materiais?: string | null; condicionantes?: string | null; atrasos?: string | null; created_by?: string | null; created_by_name?: string | null };
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
              <div><dt>Autoria</dt><dd>{formatDiaryAuthor(row.created_by, row.created_by_name)}</dd></div>
            </dl>
            {campos.map(([label, value]) => <div className="report-notes" key={label}><span>{label}</span><p>{value || 'Não registado.'}</p></div>)}
            {anexosPorVisita[registo.id]?.photos.length > 0 && <div className="report-notes"><span>Registo fotográfico</span><div className="report-photo-grid">{anexosPorVisita[registo.id].photos.map((photo: any) => <figure className="report-photo" key={photo.id}>{photo.url ? <img src={photo.url} alt={photo.legenda || 'Fotografia da obra'} /> : <div className="report-photo-missing">Imagem indisponível</div>}<figcaption>{photo.legenda && <strong>{photo.legenda}<br /></strong>}{photo.capturada_em ? new Date(photo.capturada_em).toLocaleString('pt-PT') : 'Data/hora não registada'}{photo.latitude != null && <><br />Coordenadas: {photo.latitude.toFixed(5)}, {photo.longitude?.toFixed(5)}</>}</figcaption></figure>)}</div></div>}
            {anexosPorVisita[registo.id]?.documents.length > 0 && <div className="report-notes"><span>Documentos associados</span><ul className="space-y-2">{anexosPorVisita[registo.id].documents.map((document: any) => <li key={document.id}><strong>{document.titulo}</strong><p>{[document.categoria, document.entidade_origem, document.identificador].filter(Boolean).join(' · ')}</p>{document.versions.map((version: any) => <p key={version.id}>V{version.numero_versao} · {version.nome_ficheiro}{version.signedUrl && <> · <a href={version.signedUrl} target="_blank" rel="noreferrer">Abrir documento</a></>}</p>)}</li>)}</ul></div>}
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
