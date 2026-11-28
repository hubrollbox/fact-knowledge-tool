import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Link2, FileText, Loader2, Upload } from 'lucide-react';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDocumentos, useUploadDocumento } from '../hooks/useDocumentos';
import {
  usePartes, useCreateParte, useDeleteParte,
  useFactos, useCreateFacto, useFactosDocumentos, useLinkFactoDocumento, useUnlinkFactoDocumento,
  useQuestoes, useCreateQuestao, useQuestaoFactos, useQuestaoFontes,
  useLinkQuestaoFacto, useUnlinkQuestaoFacto, useLinkQuestaoFonte, useUnlinkQuestaoFonte,
  useFontes, useCreateFonte,
  useAplicacoes, useCreateAplicacao, useAplicacaoFactos, useAplicacaoFontes,
  useLinkAplicacaoFacto, useLinkAplicacaoFonte,
  useConclusoes, useConclusaoEventos, useConclusaoSnapshots, useCreateConclusao, useTransicaoConclusao,
} from '../hooks/useFIRAC';

function EmptyState({ children }: { children: string }) {
  return <p className="py-5 text-sm text-muted-foreground">{children}</p>;
}

function AuthorMeta({ id }: { id: string | null }) {
  return <span className="text-xs text-muted-foreground">{id ? `Autor: ${id.slice(0, 8)}…` : 'Autor não identificado'}</span>;
}

function ErrorToast(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback);
}

export function PartesTab({ processoId }: { processoId: string }) {
  const { data: partes = [], isLoading } = usePartes(processoId);
  const create = useCreateParte(processoId);
  const remove = useDeleteParte(processoId);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [nif, setNif] = useState('');
  const [contacto, setContacto] = useState('');
  const [mandatario, setMandatario] = useState('');
  const [notas, setNotas] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ nome, tipo, nif: nif || null, contacto: contacto || null, mandatario: mandatario || null, notas: notas || null });
      toast.success('Parte adicionada ao processo');
      setOpen(false); setNome(''); setNif(''); setContacto(''); setMandatario(''); setNotas('');
    } catch (error) { ErrorToast(error, 'Não foi possível adicionar a parte'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Partes e intervenientes</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Adicionar parte</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : partes.length === 0 ? <EmptyState>Não existem partes registadas neste processo.</EmptyState> : (
          <div className="space-y-2">
            {partes.map(parte => (
              <div key={parte.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{parte.nome}</span><Badge variant="secondary">{parte.tipo}</Badge></div>
                  <p className="text-xs text-muted-foreground">{[parte.nif && `NIF: ${parte.nif}`, parte.contacto, parte.mandatario && `Mandatário: ${parte.mandatario}`].filter(Boolean).join(' · ') || 'Sem contactos adicionais'}</p>
                  {parte.notas && <p className="mt-1 whitespace-pre-wrap text-sm">{parte.notas}</p>}
                </div>
                <Button size="icon" variant="ghost" aria-label="Eliminar parte" disabled={remove.isPending} onClick={async () => { try { await remove.mutateAsync(parte.id); toast.success('Parte removida'); } catch (error) { ErrorToast(error, 'Não foi possível remover a parte'); } }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar parte ou interveniente</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input required value={nome} onChange={e => setNome(e.target.value)} /></div>
            <div className="space-y-1"><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['cliente','contraparte','testemunha','perito','outro'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>NIF</Label><Input value={nif} onChange={e => setNif(e.target.value)} /></div><div className="space-y-1"><Label>Contacto</Label><Input value={contacto} onChange={e => setContacto(e.target.value)} /></div></div>
            <div className="space-y-1"><Label>Mandatário</Label><Input value={mandatario} onChange={e => setMandatario(e.target.value)} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'A guardar…' : 'Guardar parte'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function DocumentosTab({ processoId }: { processoId: string }) {
  const { data: documentos = [], isLoading } = useDocumentos(processoId);
  const upload = useUploadDocumento();
  const { workspace } = useModuloActivo();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('prova');
  const [dataDocumento, setDataDocumento] = useState('');
  const [notas, setNotas] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !workspace?.id) { toast.error('Seleccione um ficheiro e confirme o workspace activo'); return; }
    try {
      await upload.mutateAsync({ file, meta: { processo_id: processoId, workspace_id: workspace.id, nome: nome.trim() || file.name, categoria, data_documento: dataDocumento || null, notas: notas || null } });
      toast.success('Documento carregado');
      setOpen(false); setFile(null); setNome(''); setDataDocumento(''); setNotas('');
    } catch (error) { ErrorToast(error, 'Não foi possível carregar o documento'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Documentos e evidências</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Upload className="mr-1.5 h-4 w-4" />Carregar documento</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : documentos.length === 0 ? <EmptyState>Não existem documentos associados a este processo.</EmptyState> : (
          <div className="space-y-2">
            {documentos.map(doc => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0"><div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate font-medium">{doc.nome}</span><Badge variant="outline">{doc.signed_url ? 'Disponível' : 'Sem ficheiro'}</Badge></div><p className="text-xs text-muted-foreground">{[doc.categoria, doc.data_documento, `Versão ${doc.versao}`, doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-PT') : null].filter(Boolean).join(' · ')}</p><AuthorMeta id={doc.ficheiro_url?.split('/')[0] ?? null} />{doc.notas && <p className="text-xs text-muted-foreground">{doc.notas}</p>}</div>
                {doc.signed_url ? <a href={doc.signed_url} target="_blank" rel="noreferrer" className="shrink-0 text-sm text-primary underline">Abrir</a> : <Badge variant="outline">Sem ficheiro</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Carregar documento para o processo</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Ficheiro</Label><Input type="file" required onChange={e => { const selected = e.target.files?.[0] ?? null; setFile(selected); if (selected && !nome) setNome(selected.name); }} /></div>
            <div className="space-y-1"><Label>Nome a apresentar</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do documento" /></div>
            <div className="space-y-1"><Label>Categoria</Label><Select value={categoria} onValueChange={setCategoria}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['peticao','contestacao','replica','despacho','sentenca','acordao','correspondencia','prova','outro'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Data do documento</Label><Input type="date" value={dataDocumento} onChange={e => setDataDocumento(e.target.value)} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={upload.isPending}>{upload.isPending ? 'A carregar…' : 'Carregar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function FactosTab({ processoId }: { processoId: string }) {
  const { data: factos = [], isLoading } = useFactos(processoId);
  const { data: documentos = [] } = useDocumentos(processoId);
  const { data: links = [] } = useFactosDocumentos(processoId);
  const create = useCreateFacto(processoId);
  const link = useLinkFactoDocumento(processoId);
  const unlink = useUnlinkFactoDocumento(processoId);
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [estado, setEstado] = useState('por_confirmar');
  const [dataFacto, setDataFacto] = useState('');
  const [origem, setOrigem] = useState('');
  const [notas, setNotas] = useState('');
  const [selected, setSelected] = useState<Record<string,string>>({});
  const docsById = useMemo(() => new Map(documentos.map(d => [d.id,d])), [documentos]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ descricao, estado, data_facto: dataFacto || null, origem: origem || null, notas: notas || null });
      toast.success('Facto registado'); setOpen(false); setDescricao(''); setDataFacto(''); setOrigem(''); setNotas('');
    } catch (error) { ErrorToast(error, 'Não foi possível registar o facto'); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Factos e evidências</CardTitle><Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Registar facto</Button></CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : factos.length === 0 ? <EmptyState>Ainda não foram registados factos. Registe cada acontecimento separadamente e indique o seu estado de validação.</EmptyState> : (
          <div className="space-y-3">
            {factos.map(facto => {
              const evidence = links.filter(l => l.facto_id === facto.id);
              return <div id={`facto-${facto.id}`} key={facto.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-start justify-between gap-2"><div><p className="font-medium">{facto.descricao}</p><p className="text-xs text-muted-foreground">{[facto.data_facto, facto.origem].filter(Boolean).join(' · ') || 'Sem data ou origem indicada'}</p><AuthorMeta id={facto.created_by} /></div><Badge variant={facto.estado === 'confirmado' ? 'default' : 'secondary'}>{facto.estado.replace(/_/g, ' ')}</Badge></div>
                {facto.notas && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{facto.notas}</p>}
                <div className="space-y-1"><Label className="text-xs">Documentos que sustentam este facto</Label>
                  {evidence.map(item => <div key={item.documento_id} className="flex items-center justify-between text-sm">{docsById.get(item.documento_id)?.signed_url ? <a className="text-primary underline" href={docsById.get(item.documento_id)?.signed_url ?? undefined} target="_blank" rel="noreferrer">{docsById.get(item.documento_id)?.nome ?? 'Documento associado'}</a> : <span>{docsById.get(item.documento_id)?.nome ?? 'Documento associado'}</span>}<Button size="icon" variant="ghost" aria-label="Desligar documento" onClick={async () => { try { await unlink.mutateAsync({ factoId: facto.id, documentoId: item.documento_id }); } catch (error) { ErrorToast(error, 'Não foi possível desligar o documento'); } }}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}
                  {documentos.length > 0 && <div className="flex gap-2"><Select value={selected[facto.id] ?? ''} onValueChange={v => setSelected(prev => ({...prev,[facto.id]:v}))}><SelectTrigger className="h-9"><SelectValue placeholder="Escolher documento" /></SelectTrigger><SelectContent>{documentos.filter(d => !evidence.some(e => e.documento_id === d.id)).map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" disabled={!selected[facto.id] || link.isPending} onClick={async () => { try { await link.mutateAsync({ factoId: facto.id, documentoId: selected[facto.id] }); setSelected(prev => ({...prev,[facto.id]:''})); toast.success('Evidência ligada ao facto'); } catch (error) { ErrorToast(error, 'Não foi possível ligar a evidência'); } }}><Link2 className="mr-1 h-3.5 w-3.5" />Ligar</Button></div>}
                </div>
              </div>;
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Registar facto</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3">
        <div className="space-y-1"><Label>Descrição factual</Label><Textarea required value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Estado de validação</Label><Select value={estado} onValueChange={setEstado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['por_confirmar','confirmado','contestado','nao_provado'].map(v => <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Data do facto</Label><Input type="date" value={dataFacto} onChange={e => setDataFacto(e.target.value)} /></div></div>
        <div className="space-y-1"><Label>Origem</Label><Input value={origem} onChange={e => setOrigem(e.target.value)} placeholder="Ex.: depoimento, documento, alegação" /></div>
        <div className="space-y-1"><Label>Notas</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Guardar facto</Button></DialogFooter>
      </form></DialogContent></Dialog>
    </Card>
  );
}

export function QuestoesTab({ processoId, onNavigate }: { processoId: string; onNavigate?: (tab: string, anchor: string) => void }) {
  const { data: questoes = [], isLoading } = useQuestoes(processoId);
  const { data: factos = [] } = useFactos(processoId);
  const { data: fontes = [] } = useFontes(processoId);
  const { data: factLinks = [] } = useQuestaoFactos(processoId);
  const { data: sourceLinks = [] } = useQuestaoFontes(processoId);
  const create = useCreateQuestao(processoId);
  const linkFact = useLinkQuestaoFacto(processoId);
  const unlinkFact = useUnlinkQuestaoFacto(processoId);
  const linkSource = useLinkQuestaoFonte(processoId);
  const unlinkSource = useUnlinkQuestaoFonte(processoId);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [pergunta, setPergunta] = useState('');
  const [ordem, setOrdem] = useState('0');
  const [selectedFact, setSelectedFact] = useState<Record<string,string>>({});
  const [selectedSource, setSelectedSource] = useState<Record<string,string>>({});

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { await create.mutateAsync({ titulo, pergunta, ordem: Number(ordem) || 0 }); toast.success('Questão jurídica criada'); setOpen(false); setTitulo(''); setPergunta(''); setOrdem('0'); }
    catch (error) { ErrorToast(error, 'Não foi possível criar a questão'); }
  }

  return <Card>
    <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Questões jurídicas</CardTitle><Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Nova questão</Button></CardHeader>
    <CardContent>{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : questoes.length === 0 ? <EmptyState>Divida o problema em questões jurídicas concretas. Cada questão pode reunir vários factos e fontes.</EmptyState> : <div className="space-y-3">
      {questoes.map(q => {
        const linkedFacts = factLinks.filter(x => x.questao_id === q.id);
        const linkedSources = sourceLinks.filter(x => x.questao_id === q.id);
        return <div key={q.id} className="space-y-2 rounded-md border p-3">
          <div className="flex items-start justify-between"><div><p className="font-medium">{q.ordem + 1}. {q.titulo}</p><p className="text-sm">{q.pergunta}</p><AuthorMeta id={q.created_by} /></div><Badge variant="secondary">{q.estado.replace(/_/g, ' ')}</Badge></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Factos relacionados</Label>{linkedFacts.map(x => <div key={x.facto_id} className="flex items-center justify-between text-sm"><a className="text-primary underline" href={`#facto-${x.facto_id}`} onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate("factos", `facto-${x.facto_id}`); } }}>{factos.find(f => f.id === x.facto_id)?.descricao ?? 'Facto'}</a><Button size="icon" variant="ghost" onClick={async () => { try { await unlinkFact.mutateAsync({questaoId:q.id,factoId:x.facto_id}); } catch(error) { ErrorToast(error,'Não foi possível desligar o facto'); } }}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}
              <div className="flex gap-1"><Select value={selectedFact[q.id] ?? ''} onValueChange={v => setSelectedFact(p => ({...p,[q.id]:v}))}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar facto" /></SelectTrigger><SelectContent>{factos.filter(f => !linkedFacts.some(x=>x.facto_id===f.id)).map(f=><SelectItem key={f.id} value={f.id}>{f.descricao.slice(0,70)}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" disabled={!selectedFact[q.id]} onClick={async()=>{try{await linkFact.mutateAsync({questaoId:q.id,factoId:selectedFact[q.id]});setSelectedFact(p=>({...p,[q.id]:''}));}catch(error){ErrorToast(error,'Não foi possível ligar o facto');}}}>Ligar</Button></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Fontes relacionadas</Label>{linkedSources.map(x=><div key={x.fonte_id} className="flex items-center justify-between text-sm"><a className="text-primary underline" href={`#fonte-${x.fonte_id}`} onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate("fontes", `fonte-${x.fonte_id}`); } }}>{fontes.find(f=>f.id===x.fonte_id)?.titulo ?? 'Fonte'}</a><Button size="icon" variant="ghost" onClick={async()=>{try{await unlinkSource.mutateAsync({questaoId:q.id,fonteId:x.fonte_id});}catch(error){ErrorToast(error,'Não foi possível desligar a fonte');}}}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}
              <div className="flex gap-1"><Select value={selectedSource[q.id] ?? ''} onValueChange={v=>setSelectedSource(p=>({...p,[q.id]:v}))}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar fonte" /></SelectTrigger><SelectContent>{fontes.filter(f=>!linkedSources.some(x=>x.fonte_id===f.id)).map(f=><SelectItem key={f.id} value={f.id}>{f.titulo}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" disabled={!selectedSource[q.id]} onClick={async()=>{try{await linkSource.mutateAsync({questaoId:q.id,fonteId:selectedSource[q.id]});setSelectedSource(p=>({...p,[q.id]:''}));}catch(error){ErrorToast(error,'Não foi possível ligar a fonte');}}}>Ligar</Button></div>
            </div>
          </div>
        </div>;
      })}
    </div>}</CardContent>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nova questão jurídica</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3"><div className="space-y-1"><Label>Título</Label><Input required value={titulo} onChange={e=>setTitulo(e.target.value)} /></div><div className="space-y-1"><Label>Pergunta jurídica</Label><Textarea required value={pergunta} onChange={e=>setPergunta(e.target.value)} rows={3} /></div><div className="space-y-1"><Label>Ordem</Label><Input type="number" value={ordem} onChange={e=>setOrdem(e.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Guardar questão</Button></DialogFooter></form></DialogContent></Dialog>
  </Card>;
}

export function FontesTab({ processoId }: { processoId: string }) {
  const { data: fontes = [], isLoading } = useFontes(processoId);
  const { data: documentos = [] } = useDocumentos(processoId);
  const create = useCreateFonte(processoId);
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState('legislacao');
  const [titulo, setTitulo] = useState('');
  const [entidade, setEntidade] = useState('');
  const [referencia, setReferencia] = useState('');
  const [jurisdicao, setJurisdicao] = useState('Portugal');
  const [url, setUrl] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [notas, setNotas] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { await create.mutateAsync({ tipo, titulo, entidade: entidade || null, referencia: referencia || null, jurisdicao, url_origem: url || null, documento_id: documentoId || null, notas: notas || null }); toast.success('Fonte registada'); setOpen(false); setTitulo(''); setEntidade(''); setReferencia(''); setUrl(''); setDocumentoId(''); setNotas(''); }
    catch(error) { ErrorToast(error,'Não foi possível registar a fonte'); }
  }

  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Fontes e regras</CardTitle><Button size="sm" onClick={()=>setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Adicionar fonte</Button></CardHeader><CardContent>
    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : fontes.length===0 ? <EmptyState>Registe legislação, jurisprudência, doutrina ou outras fontes relevantes. Sempre que possível, identifique a referência e o documento de origem.</EmptyState> : <div className="space-y-2">{fontes.map(f=><div id={`fonte-${f.id}`} key={f.id} className="rounded-md border p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{f.titulo}</span><Badge variant="secondary">{f.tipo}</Badge></div><p className="text-xs text-muted-foreground">{[f.entidade,f.referencia,f.jurisdicao].filter(Boolean).join(' · ')}</p><AuthorMeta id={f.created_by} />{f.documento_id && <p className="text-xs text-muted-foreground">Documento: {documentos.find(d=>d.id===f.documento_id)?.nome ?? 'Associado'}</p>}{f.url_origem && <a className="text-xs text-primary underline" href={f.url_origem} target="_blank" rel="noreferrer">Consultar origem</a>}{f.notas && <p className="mt-1 text-sm">{f.notas}</p>}</div>)}</div>}
  </CardContent><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Registar fonte jurídica</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3"><div className="space-y-1"><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['legislacao','jurisprudencia','doutrina','outro'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Título</Label><Input required value={titulo} onChange={e=>setTitulo(e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Entidade</Label><Input value={entidade} onChange={e=>setEntidade(e.target.value)} /></div><div className="space-y-1"><Label>Referência</Label><Input value={referencia} onChange={e=>setReferencia(e.target.value)} /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Jurisdição</Label><Input value={jurisdicao} onChange={e=>setJurisdicao(e.target.value)} /></div><div className="space-y-1"><Label>URL de origem</Label><Input type="url" value={url} onChange={e=>setUrl(e.target.value)} /></div></div><div className="space-y-1"><Label>Documento do processo (opcional)</Label><Select value={documentoId} onValueChange={setDocumentoId}><SelectTrigger><SelectValue placeholder="Sem documento associado" /></SelectTrigger><SelectContent>{documentos.map(d=><SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Notas</Label><Textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} /></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Guardar fonte</Button></DialogFooter></form></DialogContent></Dialog></Card>;
}

export function AplicacoesTab({ processoId, onNavigate }: { processoId: string; onNavigate?: (tab: string, anchor: string) => void }) {
  const { data: aplicacoes = [], isLoading } = useAplicacoes(processoId);
  const { data: questoes = [] } = useQuestoes(processoId);
  const { data: factos = [] } = useFactos(processoId);
  const { data: fontes = [] } = useFontes(processoId);
  const { data: qFactLinks = [] } = useQuestaoFactos(processoId);
  const { data: qSourceLinks = [] } = useQuestaoFontes(processoId);
  const { data: aFactLinks = [] } = useAplicacaoFactos(processoId);
  const { data: aSourceLinks = [] } = useAplicacaoFontes(processoId);
  const create = useCreateAplicacao(processoId);
  const linkFact = useLinkAplicacaoFacto(processoId);
  const linkSource = useLinkAplicacaoFonte(processoId);
  const [open,setOpen] = useState(false);
  const [questaoId,setQuestaoId] = useState('');
  const [raciocinio,setRaciocinio] = useState('');
  const [favoraveis,setFavoraveis] = useState('');
  const [contrarios,setContrarios] = useState('');
  const [pressupostos,setPressupostos] = useState('');
  const [lacunas,setLacunas] = useState('');
  const [selectedFact,setSelectedFact] = useState<Record<string,string>>({});
  const [selectedSource,setSelectedSource] = useState<Record<string,string>>({});

  async function save(e:React.FormEvent) {
    e.preventDefault();
    if(!questaoId){toast.error('Seleccione a questão jurídica');return;}
    try{await create.mutateAsync({questao_id:questaoId,raciocinio,argumentos_favoraveis:favoraveis||null,argumentos_contrarios:contrarios||null,pressupostos:pressupostos||null,lacunas:lacunas||null});toast.success('Aplicação jurídica registada');setOpen(false);setRaciocinio('');setFavoraveis('');setContrarios('');setPressupostos('');setLacunas('');}
    catch(error){ErrorToast(error,'Não foi possível guardar a aplicação');}
  }

  return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Aplicação e raciocínio jurídico</CardTitle><Button size="sm" onClick={()=>setOpen(true)} disabled={questoes.length===0}><Plus className="mr-1.5 h-4 w-4" />Nova aplicação</Button></CardHeader><CardContent>
    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : aplicacoes.length===0 ? <EmptyState>Associe uma aplicação a cada questão jurídica. O raciocínio deve identificar pressupostos, argumentos favoráveis e contrários e lacunas.</EmptyState> : <div className="space-y-3">{aplicacoes.map(a=>{
      const questionFacts=qFactLinks.filter(x=>x.questao_id===a.questao_id);
      const questionSources=qSourceLinks.filter(x=>x.questao_id===a.questao_id);
      const linkedFacts=aFactLinks.filter(x=>x.aplicacao_id===a.id);
      const linkedSources=aSourceLinks.filter(x=>x.aplicacao_id===a.id);
      return <div id={`aplicacao-${a.id}`} key={a.id} className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2"><p className="font-medium">{questoes.find(q=>q.id===a.questao_id)?.titulo ?? 'Questão'}</p><Badge variant="secondary">{a.estado}</Badge></div>
        <AuthorMeta id={a.autor_id} /><p className="whitespace-pre-wrap text-sm">{a.raciocinio}</p>
        <div className="grid gap-2 md:grid-cols-2">{[['Argumentos favoráveis',a.argumentos_favoraveis],['Argumentos contrários',a.argumentos_contrarios],['Pressupostos',a.pressupostos],['Lacunas',a.lacunas]].map(([label,value])=><div key={String(label)} className="rounded bg-muted/40 p-2"><p className="text-xs font-medium">{label}</p><p className="whitespace-pre-wrap text-sm">{value || 'Não registado'}</p></div>)}</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label className="text-xs">Factos considerados</Label>{linkedFacts.map(x=><a key={x.facto_id} className="block text-sm text-primary underline" href={`#facto-${x.facto_id}`} onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate("factos", `facto-${x.facto_id}`); } }}>{factos.find(f=>f.id===x.facto_id)?.descricao ?? 'Facto'}</a>)}<div className="mt-1 flex gap-1"><Select value={selectedFact[a.id]??''} onValueChange={v=>setSelectedFact(p=>({...p,[a.id]:v}))}><SelectTrigger className="h-9"><SelectValue placeholder="Facto ligado à questão" /></SelectTrigger><SelectContent>{questionFacts.filter(x=>!linkedFacts.some(l=>l.facto_id===x.facto_id)).map(x=><SelectItem key={x.facto_id} value={x.facto_id}>{factos.find(f=>f.id===x.facto_id)?.descricao.slice(0,60) ?? 'Facto'}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" disabled={!selectedFact[a.id]} onClick={async()=>{try{await linkFact.mutateAsync({aplicacaoId:a.id,questaoId:a.questao_id,factoId:selectedFact[a.id]});setSelectedFact(p=>({...p,[a.id]:''}));}catch(error){ErrorToast(error,'Ligue primeiro o facto à questão');}}}>Ligar</Button></div></div>
          <div><Label className="text-xs">Fontes consideradas</Label>{linkedSources.map(x=><a key={x.fonte_id} className="block text-sm text-primary underline" href={`#fonte-${x.fonte_id}`} onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate("fontes", `fonte-${x.fonte_id}`); } }}>{fontes.find(f=>f.id===x.fonte_id)?.titulo ?? 'Fonte'}</a>)}<div className="mt-1 flex gap-1"><Select value={selectedSource[a.id]??''} onValueChange={v=>setSelectedSource(p=>({...p,[a.id]:v}))}><SelectTrigger className="h-9"><SelectValue placeholder="Fonte ligada à questão" /></SelectTrigger><SelectContent>{questionSources.filter(x=>!linkedSources.some(l=>l.fonte_id===x.fonte_id)).map(x=><SelectItem key={x.fonte_id} value={x.fonte_id}>{fontes.find(f=>f.id===x.fonte_id)?.titulo ?? 'Fonte'}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" disabled={!selectedSource[a.id]} onClick={async()=>{try{await linkSource.mutateAsync({aplicacaoId:a.id,questaoId:a.questao_id,fonteId:selectedSource[a.id]});setSelectedSource(p=>({...p,[a.id]:''}));}catch(error){ErrorToast(error,'Ligue primeiro a fonte à questão');}}}>Ligar</Button></div></div>
        </div>
      </div>;
    })}</div>}
  </CardContent><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nova aplicação jurídica</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3"><div className="space-y-1"><Label>Questão jurídica</Label><Select value={questaoId} onValueChange={setQuestaoId}><SelectTrigger><SelectValue placeholder="Seleccione a questão" /></SelectTrigger><SelectContent>{questoes.map(q=><SelectItem key={q.id} value={q.id}>{q.titulo}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Raciocínio</Label><Textarea required value={raciocinio} onChange={e=>setRaciocinio(e.target.value)} rows={4} /></div><div className="space-y-1"><Label>Argumentos favoráveis</Label><Textarea value={favoraveis} onChange={e=>setFavoraveis(e.target.value)} rows={2} /></div><div className="space-y-1"><Label>Argumentos contrários</Label><Textarea value={contrarios} onChange={e=>setContrarios(e.target.value)} rows={2} /></div><div className="space-y-1"><Label>Pressupostos</Label><Textarea value={pressupostos} onChange={e=>setPressupostos(e.target.value)} rows={2} /></div><div className="space-y-1"><Label>Lacunas</Label><Textarea value={lacunas} onChange={e=>setLacunas(e.target.value)} rows={2} /></div><DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Guardar aplicação</Button></DialogFooter></form></DialogContent></Dialog></Card>;
}

export function ConclusoesTab({ processoId, onNavigate }: { processoId: string; onNavigate?: (tab: string, anchor: string) => void }) {
  const { data: conclusoes = [], isLoading } = useConclusoes(processoId);
  const { data: eventos = [], isLoading: eventosLoading, isError: eventosError } = useConclusaoEventos(processoId);
  const { data: snapshots = [] } = useConclusaoSnapshots(processoId);
  const { data: questoes = [] } = useQuestoes(processoId);
  const { data: aplicacoes = [] } = useAplicacoes(processoId);
  const { data: factos = [] } = useFactos(processoId);
  const { data: fontes = [] } = useFontes(processoId);
  const { data: appFacts = [] } = useAplicacaoFactos(processoId);
  const { data: appSources = [] } = useAplicacaoFontes(processoId);
  const create = useCreateConclusao(processoId);
  const transition = useTransicaoConclusao(processoId);
  const [open,setOpen] = useState(false);
  const [questaoId,setQuestaoId] = useState('');
  const [aplicacaoId,setAplicacaoId] = useState('');
  const [texto,setTexto] = useState('');
  const [expandedComparison,setExpandedComparison] = useState<string | null>(null);
  const availableApplications=aplicacoes.filter(a=>!questaoId || a.questao_id===questaoId);

  const eventLabels: Record<string,string> = {
    criada: 'Criada',
    submetida_revisao: 'Submetida para revisão',
    devolvida: 'Devolvida para correcção',
    aprovada: 'Aprovada',
    reaberta: 'Reaberta',
  };
  const stateLabels: Record<string,string> = {
    rascunho: 'Rascunho',
    em_revisao: 'Em revisão',
    final: 'Final',
    revista: 'Revista (registo anterior)',
  };

  async function save(e:React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({questao_id:questaoId||null,aplicacao_id:aplicacaoId||null,texto});
      toast.success('Conclusão registada como rascunho');
      setOpen(false);setQuestaoId('');setAplicacaoId('');setTexto('');
    } catch(error) {
      ErrorToast(error,'Não foi possível registar a conclusão');
    }
  }

  async function changeState(conclusaoId:string, novoEstado:'rascunho'|'em_revisao'|'final') {
    try {
      await transition.mutateAsync({conclusaoId,novoEstado});
      const messages: Record<string,string> = {
        em_revisao:'Conclusão submetida para revisão',
        rascunho:'Conclusão devolvida/reaberta como rascunho',
        final:'Conclusão aprovada',
      };
      toast.success(messages[novoEstado]);
    } catch(error) {
      ErrorToast(error,'Não foi possível alterar o estado da conclusão');
    }
  }

  return <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base">Conclusões</CardTitle>
      <Button size="sm" onClick={()=>setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Nova conclusão</Button>
    </CardHeader>
    <CardContent>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : conclusoes.length===0 ? <EmptyState>As conclusões devem remeter para a questão e para a aplicação que as fundamenta. Cada nova versão começa como rascunho.</EmptyState> : (
        <div className="space-y-3">
          {conclusoes.map(c=>{
            const history=eventos.filter(event=>event.conclusao_id===c.id);
            const latest=history.length ? history[history.length-1] : null;
            const currentState=latest?.estado_novo ?? (c.estado==='revista'?'em_revisao':c.estado);
            const canTransition=!!latest && !eventosError;
            const previousVersion = conclusoes
              .filter(item => item.questao_id === c.questao_id && item.versao < c.versao)
              .sort((a,b) => b.versao - a.versao)[0];
            const currentSnapshot: any = snapshots.find(item => item.conclusao_id === c.id);
            const previousSnapshot: any = previousVersion ? snapshots.find(item => item.conclusao_id === previousVersion.id) : null;
            const expanded = expandedComparison === c.id;
            const jsonList = (value: unknown) => Array.isArray(value) ? value as any[] : [];
            return <div key={c.id} className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">v{c.versao}</Badge>
                <Badge>{stateLabels[currentState] ?? currentState}</Badge>
                <span className="text-xs text-muted-foreground">{c.questao_id ? questoes.find(q=>q.id===c.questao_id)?.titulo ?? 'Questão' : 'Conclusão do processo'}</span>
              </div>
              <AuthorMeta id={c.autor_id} />
              <p className="whitespace-pre-wrap text-sm">{c.texto}</p>
              {previousVersion && <div className="space-y-2">
                <Button type="button" size="sm" variant="outline" onClick={()=>setExpandedComparison(expanded ? null : c.id)}>
                  {expanded ? 'Fechar comparação' : `Comparar com v${previousVersion.versao}`}
                </Button>
                {expanded && <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Versão anterior · v{previousVersion.versao}</p>
                    <p className="whitespace-pre-wrap text-sm">{previousVersion.texto}</p>
                    <p className="text-xs text-muted-foreground">Factos: {jsonList(previousSnapshot?.factos_aplicacao).length} · Fontes: {jsonList(previousSnapshot?.fontes_aplicacao).length}</p>
                    {!previousSnapshot && <p className="text-xs text-amber-700">Snapshot histórico indisponível.</p>}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Versão actual · v{c.versao}</p>
                    <p className="whitespace-pre-wrap text-sm">{c.texto}</p>
                    <p className="text-xs text-muted-foreground">Factos: {jsonList(currentSnapshot?.factos_aplicacao).length} · Fontes: {jsonList(currentSnapshot?.fontes_aplicacao).length}</p>
                    {!currentSnapshot && <p className="text-xs text-amber-700">Snapshot histórico indisponível.</p>}
                  </div>
                  <p className="text-xs text-muted-foreground md:col-span-2">Comparação lado a lado do texto e do número de factos/fontes associados à aplicação em cada versão. Não substitui uma comparação semântica detalhada.</p>
                </div>}
              </div>}
              {c.aplicacao_id && <div className="space-y-1 text-xs">
                <a className="text-primary underline" href={`#aplicacao-${c.aplicacao_id}`} onClick={e=>{if(onNavigate){e.preventDefault();onNavigate("analise",`aplicacao-${c.aplicacao_id}`);}}}>Abrir aplicação que fundamenta</a>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {appFacts.filter(x=>x.aplicacao_id===c.aplicacao_id).map(x=><a key={x.facto_id} className="text-primary underline" href={`#facto-${x.facto_id}`} onClick={e=>{if(onNavigate){e.preventDefault();onNavigate("factos",`facto-${x.facto_id}`);}}}>Facto: {factos.find(f=>f.id===x.facto_id)?.descricao.slice(0,55) ?? 'ver facto'}</a>)}
                  {appSources.filter(x=>x.aplicacao_id===c.aplicacao_id).map(x=><a key={x.fonte_id} className="text-primary underline" href={`#fonte-${x.fonte_id}`} onClick={e=>{if(onNavigate){e.preventDefault();onNavigate("fontes",`fonte-${x.fonte_id}`);}}}>Fonte: {fontes.find(f=>f.id===x.fonte_id)?.titulo ?? 'ver fonte'}</a>)}
                </div>
              </div>}
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {currentState==='rascunho' && <Button size="sm" variant="outline" disabled={!canTransition||transition.isPending} onClick={()=>changeState(c.id,'em_revisao')}>Submeter para revisão</Button>}
                {currentState==='em_revisao' && <>
                  <Button size="sm" variant="outline" disabled={!canTransition||transition.isPending} onClick={()=>changeState(c.id,'rascunho')}>Devolver para correcção</Button>
                  <Button size="sm" disabled={!canTransition||transition.isPending} onClick={()=>changeState(c.id,'final')}>Aprovar conclusão</Button>
                </>}
                {currentState==='final' && <Button size="sm" variant="outline" disabled={!canTransition||transition.isPending} onClick={()=>changeState(c.id,'rascunho')}>Reabrir conclusão</Button>}
                {!canTransition && <span className="self-center text-xs text-muted-foreground">{eventosError ? 'Não foi possível carregar o histórico; transições desactivadas.' : eventosLoading ? 'A carregar histórico…' : 'Sem histórico de auditoria. Esta conclusão não pode ser transitada até ser reconciliada.'}</span>}
              </div>
              <div className="space-y-2 rounded-md bg-muted/30 p-3">
                <p className="text-xs font-semibold">Histórico de revisão</p>
                {history.length===0 ? <p className="text-xs text-muted-foreground">Não existem eventos registados para esta conclusão.</p> : (
                  <ol className="space-y-2">
                    {[...history].reverse().map(event=><li key={event.id} className="border-l-2 pl-3">
                      <p className="text-xs font-medium">{eventLabels[event.evento] ?? event.evento} · {stateLabels[event.estado_novo] ?? event.estado_novo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('pt-PT')} · <AuthorMeta id={event.actor_id} /></p>
                      {event.notas && <p className="text-xs">{event.notas}</p>}
                    </li>)}
                  </ol>
                )}
              </div>
            </div>;
          })}
        </div>
      )}
      {eventos.length > 0 && <div className="mt-6 space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Histórico transversal do processo</h3>
        <ol className="space-y-2">
          {[...eventos].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(event => {
            const conclusion = conclusoes.find(item => item.id === event.conclusao_id);
            const issue = conclusion?.questao_id ? questoes.find(item => item.id === conclusion.questao_id) : null;
            return <li key={event.id} className="flex flex-col gap-1 border-l-2 pl-3">
              <p className="text-xs font-medium">{eventLabels[event.evento] ?? event.evento} · {issue?.titulo ?? 'Conclusão do processo'}{conclusion ? ` · v${conclusion.versao}` : ''}</p>
              <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('pt-PT')} · <AuthorMeta id={event.actor_id} /></p>
              {event.notas && <p className="text-xs">{event.notas}</p>}
            </li>;
          })}
        </ol>
      </div>}
      {eventosError && <p className="mt-3 text-sm text-destructive">Não foi possível consultar o histórico de auditoria. As operações de revisão ficam bloqueadas.</p>}
    </CardContent>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova conclusão</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label>Questão (opcional)</Label><Select value={questaoId} onValueChange={v=>{setQuestaoId(v);setAplicacaoId('');}}><SelectTrigger><SelectValue placeholder="Conclusão geral do processo" /></SelectTrigger><SelectContent>{questoes.map(q=><SelectItem key={q.id} value={q.id}>{q.titulo}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Aplicação que fundamenta (opcional)</Label><Select value={aplicacaoId} onValueChange={setAplicacaoId} disabled={!questaoId}><SelectTrigger><SelectValue placeholder={questaoId?"Sem aplicação associada":"Seleccione primeiro a questão"} /></SelectTrigger><SelectContent>{availableApplications.map(a=><SelectItem key={a.id} value={a.id}>{questoes.find(q=>q.id===a.questao_id)?.titulo ?? 'Aplicação'}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Texto da conclusão</Label><Textarea required value={texto} onChange={e=>setTexto(e.target.value)} rows={4} /></div>
          <p className="text-xs text-muted-foreground">A conclusão será criada como rascunho. A submissão para revisão e a aprovação ficam registadas no histórico.</p>
          <DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending?'A guardar…':'Guardar rascunho'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </Card>;
}
