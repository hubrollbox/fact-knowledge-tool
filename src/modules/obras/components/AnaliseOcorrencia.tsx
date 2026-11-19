import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFotos } from '../hooks/useFotosObra';
import {
  useActualizarFactoOcorrencia,
  useAdicionarFactoOcorrencia,
  useAnaliseOcorrencia,
  useEliminarFactoOcorrencia,
  useEliminarReferenciaOcorrencia,
  useGuardarAnaliseOcorrencia,
  useGuardarReferenciaOcorrencia,
} from '../hooks/useAnaliseOcorrencia';

const TIPOS_REFERENCIA = {
  norma: 'Norma',
  regulamento: 'Regulamento',
  projeto: 'Projecto',
  ficha_tecnica: 'Ficha técnica',
  outro: 'Outro',
} as const;

type ReferenciaForm = {
  tipo: keyof typeof TIPOS_REFERENCIA;
  titulo: string;
  entidade_origem: string;
  identificador: string;
  versao: string;
  data_documento: string;
  url: string;
  notas: string;
};

const REFERENCIA_VAZIA: ReferenciaForm = {
  tipo: 'outro',
  titulo: '',
  entidade_origem: '',
  identificador: '',
  versao: '',
  data_documento: '',
  url: '',
  notas: '',
};

export function AnaliseOcorrencia({
  ocorrenciaId,
  canWrite,
}: {
  ocorrenciaId: string;
  canWrite: boolean;
}) {
  const { data, isLoading, isError } = useAnaliseOcorrencia(ocorrenciaId);
  const { data: fotos } = useFotos({ ocorrenciaId });
  const guardar = useGuardarAnaliseOcorrencia();
  const adicionar = useAdicionarFactoOcorrencia();
  const actualizarFacto = useActualizarFactoOcorrencia();
  const eliminar = useEliminarFactoOcorrencia();
  const guardarReferencia = useGuardarReferenciaOcorrencia();
  const eliminarReferencia = useEliminarReferenciaOcorrencia();

  const [interpretacao, setInterpretacao] = useState('');
  const [conclusao, setConclusao] = useState('');
  const [recomendacao, setRecomendacao] = useState('');
  const [falta, setFalta] = useState('');

  const [descricao, setDescricao] = useState('');
  const [estado, setEstado] = useState<'confirmado' | 'por_confirmar'>('por_confirmar');
  const [fotoId, setFotoId] = useState('none');
  const [referenciaId, setReferenciaId] = useState('none');
  const [factoEmEdicao, setFactoEmEdicao] = useState<string | null>(null);
  const [factoEditado, setFactoEditado] = useState({
    descricao: '',
    estado: 'por_confirmar' as 'confirmado' | 'por_confirmar',
    evidencia_foto_id: 'none',
    referencia_id: 'none',
  });

  const [referenciaForm, setReferenciaForm] = useState<ReferenciaForm>(REFERENCIA_VAZIA);
  const [referenciaEmEdicao, setReferenciaEmEdicao] = useState<string | null>(null);

  const analise = data?.analise;
  const factos = data?.factos ?? [];
  const referencias = data?.referencias ?? [];

  useEffect(() => {
    setInterpretacao(analise?.interpretacao ?? '');
    setConclusao(analise?.conclusao ?? '');
    setRecomendacao(analise?.recomendacao ?? '');
    setFalta(analise?.informacao_em_falta ?? '');
  }, [analise?.id, analise?.updated_at]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />A carregar análise técnica…
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar a análise técnica.</p>;
  }

  const guardarAnalise = async (event: React.FormEvent) => {
    event.preventDefault();
    await guardar.mutateAsync({
      ocorrenciaId,
      analiseId: analise?.id,
      values: {
        interpretacao: interpretacao.trim() || null,
        conclusao: conclusao.trim() || null,
        recomendacao: recomendacao.trim() || null,
        informacao_em_falta: falta.trim() || null,
      },
    });
  };

  const adicionarFacto = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!analise || !descricao.trim()) return;
    await adicionar.mutateAsync({
      ocorrenciaId,
      analiseId: analise.id,
      values: {
        descricao: descricao.trim(),
        estado,
        evidencia_foto_id: fotoId === 'none' ? null : fotoId,
        referencia_id: referenciaId === 'none' ? null : referenciaId,
      },
    });
    setDescricao('');
    setEstado('por_confirmar');
    setFotoId('none');
    setReferenciaId('none');
  };

  const iniciarEdicaoFacto = (facto: (typeof factos)[number]) => {
    setFactoEmEdicao(facto.id);
    setFactoEditado({
      descricao: facto.descricao,
      estado: facto.estado as 'confirmado' | 'por_confirmar',
      evidencia_foto_id: facto.evidencia_foto_id ?? 'none',
      referencia_id: facto.referencia_id ?? 'none',
    });
  };

  const guardarFactoEditado = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!factoEmEdicao || !factoEditado.descricao.trim()) return;
    await actualizarFacto.mutateAsync({
      id: factoEmEdicao,
      ocorrenciaId,
      values: {
        descricao: factoEditado.descricao.trim(),
        estado: factoEditado.estado,
        evidencia_foto_id: factoEditado.evidencia_foto_id === 'none' ? null : factoEditado.evidencia_foto_id,
        referencia_id: factoEditado.referencia_id === 'none' ? null : factoEditado.referencia_id,
      },
    });
    setFactoEmEdicao(null);
  };

  const guardarRef = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!analise || !referenciaForm.titulo.trim()) return;
    await guardarReferencia.mutateAsync({
      ocorrenciaId,
      analiseId: analise.id,
      referenciaId: referenciaEmEdicao ?? undefined,
      values: {
        tipo: referenciaForm.tipo,
        titulo: referenciaForm.titulo.trim(),
        entidade_origem: referenciaForm.entidade_origem.trim() || null,
        identificador: referenciaForm.identificador.trim() || null,
        versao: referenciaForm.versao.trim() || null,
        data_documento: referenciaForm.data_documento || null,
        url: referenciaForm.url.trim() || null,
        notas: referenciaForm.notas.trim() || null,
      },
    });
    setReferenciaForm(REFERENCIA_VAZIA);
    setReferenciaEmEdicao(null);
  };

  const iniciarEdicaoReferencia = (referencia: (typeof referencias)[number]) => {
    setReferenciaEmEdicao(referencia.id);
    setReferenciaForm({
      tipo: referencia.tipo as keyof typeof TIPOS_REFERENCIA,
      titulo: referencia.titulo,
      entidade_origem: referencia.entidade_origem ?? '',
      identificador: referencia.identificador ?? '',
      versao: referencia.versao ?? '',
      data_documento: referencia.data_documento ?? '',
      url: referencia.url ?? '',
      notas: referencia.notas ?? '',
    });
  };

  const cancelarEdicaoReferencia = () => {
    setReferenciaEmEdicao(null);
    setReferenciaForm(REFERENCIA_VAZIA);
  };

  return (
    <section className="rounded-md border border-border p-3 space-y-5">
      <div>
        <h4 className="text-sm font-semibold">Análise técnica</h4>
        <p className="text-xs text-muted-foreground">
          Separe observações, interpretação e conclusão. Uma hipótese não deve ser registada como facto confirmado.
        </p>
      </div>

      <form onSubmit={guardarAnalise} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Interpretação técnica</Label>
          <Textarea rows={3} value={interpretacao} onChange={(event) => setInterpretacao(event.target.value)} disabled={!canWrite}
            placeholder="Interpretação dos factos observados. Identifique expressamente as hipóteses." />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Conclusão</Label>
            <Textarea rows={3} value={conclusao} onChange={(event) => setConclusao(event.target.value)} disabled={!canWrite} />
          </div>
          <div className="space-y-1.5">
            <Label>Recomendação</Label>
            <Textarea rows={3} value={recomendacao} onChange={(event) => setRecomendacao(event.target.value)} disabled={!canWrite} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Informação em falta / pontos por confirmar</Label>
          <Textarea rows={2} value={falta} onChange={(event) => setFalta(event.target.value)} disabled={!canWrite}
            placeholder="O que falta verificar antes de fechar a análise?" />
        </div>
        {canWrite && (
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={guardar.isPending}>
              {guardar.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Guardar análise
            </Button>
          </div>
        )}
      </form>

      <div className="space-y-3 border-t border-border pt-3">
        <div>
          <h5 className="text-sm font-semibold">Factos observados</h5>
          <p className="text-xs text-muted-foreground">Registe observações concretas e indique se estão confirmadas.</p>
        </div>
        {!factos.length ? (
          <p className="text-xs text-muted-foreground">Ainda não foram registados factos individuais.</p>
        ) : (
          <ul className="space-y-2">
            {factos.map((facto) => {
              const foto = fotos?.find((item) => item.id === facto.evidencia_foto_id);
              const referencia = referencias.find((item) => item.id === facto.referencia_id);
              const emEdicao = factoEmEdicao === facto.id;
              return (
                <li key={facto.id} className="rounded-md bg-muted/40 p-3 space-y-2">
                  {emEdicao ? (
                    <form onSubmit={guardarFactoEditado} className="space-y-2">
                      <Textarea required rows={2} value={factoEditado.descricao}
                        onChange={(event) => setFactoEditado({ ...factoEditado, descricao: event.target.value })} />
                      <div className="grid gap-2 md:grid-cols-3">
                        <Select value={factoEditado.estado} onValueChange={(value: 'confirmado' | 'por_confirmar') => setFactoEditado({ ...factoEditado, estado: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                            <SelectItem value="por_confirmar">Por confirmar</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={factoEditado.evidencia_foto_id} onValueChange={(value) => setFactoEditado({ ...factoEditado, evidencia_foto_id: value })}>
                          <SelectTrigger><SelectValue placeholder="Fotografia" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem fotografia</SelectItem>
                            {(fotos ?? []).map((fotoItem) => (
                              <SelectItem key={fotoItem.id} value={fotoItem.id}>{fotoItem.legenda || new Date(fotoItem.capturada_em ?? fotoItem.created_at).toLocaleString('pt-PT')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={factoEditado.referencia_id} onValueChange={(value) => setFactoEditado({ ...factoEditado, referencia_id: value })}>
                          <SelectTrigger><SelectValue placeholder="Referência" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem referência</SelectItem>
                            {referencias.map((ref) => <SelectItem key={ref.id} value={ref.id}>{ref.titulo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setFactoEmEdicao(null)}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                        <Button type="submit" size="sm" disabled={actualizarFacto.isPending}><Save className="mr-1 h-3.5 w-3.5" />Guardar</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="whitespace-pre-wrap text-sm">{facto.descricao}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant={facto.estado === 'confirmado' ? 'secondary' : 'outline'}>
                            {facto.estado === 'confirmado' ? 'Confirmado' : 'Por confirmar'}
                          </Badge>
                          {canWrite && (
                            <>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar facto" onClick={() => iniciarEdicaoFacto(facto)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Eliminar facto" disabled={eliminar.isPending}
                                onClick={() => eliminar.mutate({ id: facto.id, ocorrenciaId })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {foto && <p className="text-xs text-muted-foreground">Evidência fotográfica: {foto.legenda || 'Fotografia associada'}</p>}
                      {referencia && <p className="text-xs text-muted-foreground">Referência: {referencia.titulo}</p>}
                      <p className="text-[11px] text-muted-foreground">Registado em {new Date(facto.created_at).toLocaleString('pt-PT')}</p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canWrite && (
          <form onSubmit={adicionarFacto} className="space-y-2 rounded-md border border-dashed border-border p-3">
            <Label htmlFor={`facto-${ocorrenciaId}`}>Novo facto</Label>
            <Textarea id={`facto-${ocorrenciaId}`} required rows={2} value={descricao} onChange={(event) => setDescricao(event.target.value)}
              placeholder="Descreva uma observação concreta." />
            <div className="grid gap-2 md:grid-cols-3">
              <Select value={estado} onValueChange={(value: 'confirmado' | 'por_confirmar') => setEstado(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="por_confirmar">Por confirmar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fotoId} onValueChange={setFotoId}>
                <SelectTrigger><SelectValue placeholder="Fotografia" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fotografia</SelectItem>
                  {(fotos ?? []).map((fotoItem) => (
                    <SelectItem key={fotoItem.id} value={fotoItem.id}>{fotoItem.legenda || new Date(fotoItem.capturada_em ?? fotoItem.created_at).toLocaleString('pt-PT')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={referenciaId} onValueChange={setReferenciaId}>
                <SelectTrigger><SelectValue placeholder="Referência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem referência</SelectItem>
                  {referencias.map((ref) => <SelectItem key={ref.id} value={ref.id}>{ref.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!analise || adicionar.isPending}>
                {adicionar.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Adicionar facto
              </Button>
            </div>
            {!analise && <p className="text-xs text-muted-foreground">Guarde primeiro a análise para poder adicionar factos.</p>}
          </form>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div>
          <h5 className="text-sm font-semibold">Referências técnicas e documentais</h5>
          <p className="text-xs text-muted-foreground">Identifique a fonte utilizada, incluindo versão e data quando aplicável.</p>
        </div>
        {!referencias.length ? (
          <p className="text-xs text-muted-foreground">Ainda não foram associadas referências.</p>
        ) : (
          <ul className="space-y-2">
            {referencias.map((ref) => (
              <li key={ref.id} className="rounded-md bg-muted/40 p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{TIPOS_REFERENCIA[ref.tipo as keyof typeof TIPOS_REFERENCIA] ?? 'Outro'}</Badge>
                      <span className="text-sm font-medium">{ref.titulo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[ref.entidade_origem, ref.identificador, ref.versao, ref.data_documento].filter(Boolean).join(' · ')}
                    </p>
                    {ref.url && <a className="break-all text-xs text-primary underline" href={ref.url} target="_blank" rel="noreferrer">{ref.url}</a>}
                    {ref.notas && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{ref.notas}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0">
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar referência" onClick={() => iniciarEdicaoReferencia(ref)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Eliminar referência" disabled={eliminarReferencia.isPending}
                        onClick={() => eliminarReferencia.mutate({ id: ref.id, ocorrenciaId })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Registada em {new Date(ref.created_at).toLocaleString('pt-PT')}</p>
              </li>
            ))}
          </ul>
        )}

        {canWrite && (
          <form onSubmit={guardarRef} className="space-y-2 rounded-md border border-dashed border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>{referenciaEmEdicao ? 'Editar referência' : 'Nova referência'}</Label>
              {referenciaEmEdicao && <Button type="button" size="sm" variant="ghost" onClick={cancelarEdicaoReferencia}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={referenciaForm.tipo} onValueChange={(value: keyof typeof TIPOS_REFERENCIA) => setReferenciaForm({ ...referenciaForm, tipo: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS_REFERENCIA).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Título / designação</Label><Input required value={referenciaForm.titulo} onChange={(event) => setReferenciaForm({ ...referenciaForm, titulo: event.target.value })} /></div>
              <div className="space-y-1"><Label>Entidade / origem</Label><Input value={referenciaForm.entidade_origem} onChange={(event) => setReferenciaForm({ ...referenciaForm, entidade_origem: event.target.value })} /></div>
              <div className="space-y-1"><Label>Número / identificador</Label><Input value={referenciaForm.identificador} onChange={(event) => setReferenciaForm({ ...referenciaForm, identificador: event.target.value })} /></div>
              <div className="space-y-1"><Label>Versão / edição</Label><Input value={referenciaForm.versao} onChange={(event) => setReferenciaForm({ ...referenciaForm, versao: event.target.value })} /></div>
              <div className="space-y-1"><Label>Data do documento</Label><Input type="date" value={referenciaForm.data_documento} onChange={(event) => setReferenciaForm({ ...referenciaForm, data_documento: event.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>URL da fonte (opcional)</Label><Input type="url" value={referenciaForm.url} onChange={(event) => setReferenciaForm({ ...referenciaForm, url: event.target.value })} placeholder="https://" /></div>
            <div className="space-y-1"><Label>Notas / localização no documento</Label><Textarea rows={2} value={referenciaForm.notas} onChange={(event) => setReferenciaForm({ ...referenciaForm, notas: event.target.value })} placeholder="Página, artigo, cláusula, desenho ou observações." /></div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={guardarReferencia.isPending || !analise}>
                {guardarReferencia.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                {referenciaEmEdicao ? 'Guardar alterações' : 'Adicionar referência'}
              </Button>
            </div>
            {!analise && <p className="text-xs text-muted-foreground">Guarde primeiro a análise para poder adicionar referências.</p>}
          </form>
        )}
      </div>

      {analise && (
        <div className="space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <p>Criada em {new Date(analise.created_at).toLocaleString('pt-PT')} · Actualizada em {new Date(analise.updated_at).toLocaleString('pt-PT')}</p>
          {analise.created_by && <p>Autor (ID de utilizador): {analise.created_by}</p>}
          {analise.updated_by && <p>Última alteração por (ID de utilizador): {analise.updated_by}</p>}
        </div>
      )}
    </section>
  );
}
