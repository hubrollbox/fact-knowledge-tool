import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, LifeBuoy, MessageSquare, Plus, Search, Send, ShieldCheck, Ticket, ChevronLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ModuleKey = 'core' | 'works' | 'lex' | 'vet' | 'dev';
type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved';
type FAQ = {
  id: string; module: ModuleKey; category: string; question: string; answer: string;
  is_published: boolean; sort_order: number; reviewed_at: string | null;
};
type SupportTicket = {
  id: string; reference_code: string; created_by: string; module: ModuleKey;
  category: string; subject: string; description: string; status: TicketStatus;
  created_at: string; updated_at: string;
};
type SupportMessage = { id: string; ticket_id: string; author_id: string; body: string; created_at: string };
type TicketEvent = { id: string; ticket_id: string; actor_id: string | null; event_type: 'created' | 'status_changed'; old_status: TicketStatus | null; new_status: TicketStatus; created_at: string };

const db = supabase as any;
const modules: { value: ModuleKey; label: string }[] = [
  { value: 'core', label: 'Geral / Plataforma' },
  { value: 'works', label: 'FKT Works' },
  { value: 'lex', label: 'FKT Lex' },
  { value: 'vet', label: 'FKT Vet' },
  { value: 'dev', label: 'FKT Dev' },
];
const statusLabels: Record<TicketStatus, string> = {
  open: 'Aberto', in_progress: 'Em análise', waiting_user: 'A aguardar resposta', resolved: 'Resolvido',
};
const statusStyles: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  waiting_user: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  resolved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};
const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AjudaSuporte() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'faq' | 'tickets' | 'manage'>('faq');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<ModuleKey | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [ticketEvents, setTicketEvents] = useState<TicketEvent[]>([]);
  const [reply, setReply] = useState('');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ module: 'core' as ModuleKey, category: 'Dúvida', subject: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<Array<{id:string;file_name:string;storage_path:string;file_size:number}>>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string,string>>({});
  const [faqForm, setFaqForm] = useState({ id: '', module: 'core' as ModuleKey, category: 'Utilização', question: '', answer: '', is_published: false });
  const [editingFaq, setEditingFaq] = useState(false);

  const loadFaqs = useCallback(async () => {
    const { data, error } = await db.from('fkt_support_faq').select('*').order('sort_order').order('created_at', { ascending: false });
    if (error) throw error;
    setFaqs((data ?? []) as FAQ[]);
  }, []);

  const loadTickets = useCallback(async () => {
    const { data, error } = await db.from('fkt_support_tickets').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    setTickets((data ?? []) as SupportTicket[]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: adminValue, error: adminError }] = await Promise.all([
        db.rpc('is_fkt_global_admin'),
      ]);
      if (adminError) throw adminError;
      setIsAdmin(adminValue === true);
      await Promise.all([loadFaqs(), loadTickets()]);
    } catch (error: any) {
      toast.error(error.message || 'Não foi possível carregar a área de suporte.');
    } finally {
      setLoading(false);
    }
  }, [loadFaqs, loadTickets]);

  useEffect(() => { if (user) void refresh(); }, [user, refresh]);

  const filteredFaqs = useMemo(() => faqs.filter(faq => {
    const matchesModule = moduleFilter === 'all' || faq.module === moduleFilter;
    const text = `${faq.question} ${faq.answer} ${faq.category}`.toLocaleLowerCase('pt-PT');
    return matchesModule && text.includes(query.toLocaleLowerCase('pt-PT'));
  }), [faqs, moduleFilter, query]);

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    const [{ data, error }, events] = await Promise.all([
      db.from('fkt_support_messages').select('*').eq('ticket_id', ticket.id).order('created_at'),
      db.from('fkt_support_ticket_events').select('*').eq('ticket_id', ticket.id).order('created_at'),
    ]);
    if (error) { toast.error('Não foi possível carregar as mensagens.'); return; }
    if (events.error) { toast.error('Não foi possível carregar o histórico do pedido.'); return; }
    setMessages((data ?? []) as SupportMessage[]);
    setTicketEvents((events.data ?? []) as TicketEvent[]);
    const { data: fileRows, error: fileError } = await db.from('fkt_support_attachments').select('*').eq('ticket_id', ticket.id).order('created_at');
    if (fileError) { toast.error('Não foi possível carregar os anexos.'); return; }
    const storedFiles = (fileRows ?? []) as Array<{id:string;file_name:string;storage_path:string;file_size:number}>;
    setAttachments(storedFiles);
    const urls: Record<string,string> = {};
    await Promise.all(storedFiles.map(async file => {
      const result = await db.storage.from('fkt-support-attachments').createSignedUrl(file.storage_path, 3600);
      if (result.data?.signedUrl) urls[file.id] = result.data.signedUrl;
    }));
    setAttachmentUrls(urls);
  };

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !ticketForm.subject.trim() || !ticketForm.description.trim()) return;
    if (selectedFiles.some(file => file.size > 10 * 1024 * 1024)) { toast.error('Cada anexo deve ter no máximo 10 MB.'); return; }
    setSaving(true);
    const { data, error } = await db.from('fkt_support_tickets').insert({
      created_by: user.id, module: ticketForm.module, category: ticketForm.category,
      subject: ticketForm.subject.trim(), description: ticketForm.description.trim(),
    }).select('*').single();
    if (!error && data && selectedFiles.length) {
      for (const file of selectedFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = user.id + '/' + data.id + '/' + crypto.randomUUID() + '-' + safeName;
        const upload = await db.storage.from('fkt-support-attachments').upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (upload.error) { toast.error('Pedido criado, mas o anexo ' + file.name + ' não foi enviado.'); continue; }
        const record = await db.from('fkt_support_attachments').insert({ ticket_id: data.id, uploaded_by: user.id, file_name: file.name, storage_path: storagePath, content_type: file.type || null, file_size: file.size });
        if (record.error) toast.error('Pedido criado, mas não foi possível registar o anexo ' + file.name + '.');
      }
    }
    setSaving(false);
    if (error) { toast.error(error.message || 'Não foi possível enviar o pedido.'); return; }
    setSelectedFiles([]);
    setTicketForm({ module: 'core', category: 'Dúvida', subject: '', description: '' });
    setNewTicketOpen(false);
    await loadTickets();
    toast.success(`Pedido ${data.reference_code} criado.`);
    await openTicket(data as SupportTicket);
    setTab('tickets');
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedTicket || !reply.trim()) return;
    setSaving(true);
    const { error } = await db.from('fkt_support_messages').insert({
      ticket_id: selectedTicket.id, author_id: user.id, body: reply.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message || 'Não foi possível enviar a resposta.'); return; }
    setReply('');
    if (selectedTicket.status === 'resolved' && !isAdmin) {
      toast.message('A resposta foi enviada. O pedido ficará visível para análise.');
    }
    await openTicket(selectedTicket);
    await loadTickets();
  };

  const changeStatus = async (status: TicketStatus) => {
    if (!isAdmin || !selectedTicket) return;
    const { error } = await db.from('fkt_support_tickets').update({ status }).eq('id', selectedTicket.id);
    if (error) { toast.error(error.message || 'Não foi possível alterar o estado.'); return; }
    const updated = { ...selectedTicket, status };
    setSelectedTicket(updated);
    setTickets(current => current.map(ticket => ticket.id === updated.id ? updated : ticket));
    toast.success('Estado actualizado.');
  };

  const saveFaq = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || !user || !faqForm.question.trim() || !faqForm.answer.trim() || !faqForm.category.trim()) return;
    setSaving(true);
    const payload = {
      module: faqForm.module, category: faqForm.category.trim(), question: faqForm.question.trim(),
      answer: faqForm.answer.trim(), is_published: faqForm.is_published,
      updated_by: user.id, reviewed_at: faqForm.is_published ? new Date().toISOString() : null,
      ...(faqForm.id ? {} : { created_by: user.id }),
    };
    const result = faqForm.id
      ? await db.from('fkt_support_faq').update(payload).eq('id', faqForm.id)
      : await db.from('fkt_support_faq').insert(payload);
    setSaving(false);
    if (result.error) { toast.error(result.error.message || 'Não foi possível guardar a FAQ.'); return; }
    setFaqForm({ id: '', module: 'core', category: 'Utilização', question: '', answer: '', is_published: false });
    setEditingFaq(false);
    await loadFaqs();
    toast.success('FAQ guardada.');
  };

  const editFaq = (faq: FAQ) => {
    setFaqForm({ id: faq.id, module: faq.module, category: faq.category, question: faq.question, answer: faq.answer, is_published: faq.is_published });
    setEditingFaq(true);
  };

  const deleteFaq = async (faq: FAQ) => {
    if (!isAdmin || !window.confirm('Eliminar definitivamente esta FAQ?')) return;
    const { error } = await db.from('fkt_support_faq').delete().eq('id', faq.id);
    if (error) { toast.error(error.message || 'Não foi possível eliminar a FAQ.'); return; }
    await loadFaqs();
    toast.success('FAQ eliminada.');
  };

  const visibleTickets = tickets;
  const moduleName = (key: ModuleKey) => modules.find(item => item.value === key)?.label ?? key;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">A carregar Ajuda e Suporte…</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><LifeBuoy className="h-4 w-4" /> FKT · Área comum</div>
          <h1 className="text-2xl font-semibold tracking-tight">Ajuda e Suporte</h1>
          <p className="mt-1 text-sm text-muted-foreground">Respostas, orientações e acompanhamento de pedidos para toda a plataforma FKT.</p>
        </div>
        <button className={buttonClass} onClick={() => { setNewTicketOpen(true); setTab('tickets'); }}>
          <Plus className="h-4 w-4" /> Novo pedido
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button className={tab === 'faq' ? buttonClass : secondaryButton} onClick={() => { setTab('faq'); setSelectedTicket(null); }}><BookOpen className="h-4 w-4" /> Perguntas frequentes</button>
        <button className={tab === 'tickets' ? buttonClass : secondaryButton} onClick={() => setTab('tickets')}><Ticket className="h-4 w-4" /> Os meus pedidos</button>
        {isAdmin && <button className={tab === 'manage' ? buttonClass : secondaryButton} onClick={() => { setTab('manage'); setSelectedTicket(null); }}><ShieldCheck className="h-4 w-4" /> Administração</button>}
      </nav>

      {tab === 'faq' && (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className={inputClass + ' pl-9'} placeholder="Pesquisar perguntas e respostas…" value={query} onChange={event => setQuery(event.target.value)} /></div>
            <select className={inputClass} value={moduleFilter} onChange={event => setModuleFilter(event.target.value as ModuleKey | 'all')}><option value="all">Todos os módulos</option>{modules.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredFaqs.map(faq => (
              <article key={faq.id} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{moduleName(faq.module)}</span><span className="text-xs text-muted-foreground">{faq.category}</span></div>
                <h2 className="font-medium">{faq.question}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                <p className="mt-4 text-xs text-muted-foreground">Revisto: {faq.reviewed_at ? formatDate(faq.reviewed_at) : 'Data não indicada'}</p>
              </article>
            ))}
          </div>
          {filteredFaqs.length === 0 && <div className="rounded-lg border border-dashed border-border p-10 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Não encontrámos resultados.</p><p className="mt-1 text-sm text-muted-foreground">Experimente outros termos ou seleccione todos os módulos.</p></div>}
        </section>
      )}

      {tab === 'tickets' && (
        <section className="space-y-4">
          {selectedTicket ? (
            <div className="space-y-4">
              <button className={secondaryButton} onClick={() => setSelectedTicket(null)}><ChevronLeft className="h-4 w-4" /> Voltar aos pedidos</button>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs text-muted-foreground">{selectedTicket.reference_code} · {moduleName(selectedTicket.module)} · {selectedTicket.category}</p><h2 className="mt-1 text-lg font-semibold">{selectedTicket.subject}</h2></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[selectedTicket.status]}`}>{statusLabels[selectedTicket.status]}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{selectedTicket.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">Criado em {formatDate(selectedTicket.created_at)}</p>
                {attachments.length > 0 && <div className="mt-4 border-t border-border pt-4"><h3 className="mb-2 text-sm font-medium">Anexos</h3><ul className="space-y-2">{attachments.map(file => <li key={file.id} className="text-sm">{attachmentUrls[file.id] ? <a className="text-primary underline" href={attachmentUrls[file.id]} target="_blank" rel="noreferrer">{file.file_name}</a> : <span>{file.file_name}</span>} <span className="text-xs text-muted-foreground">({(file.file_size / 1024).toFixed(0)} KB)</span></li>)}</ul></div>}
                {isAdmin && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4"><label htmlFor="ticket-status" className="text-sm font-medium">Estado:</label><select id="ticket-status" className={inputClass + ' max-w-xs'} value={selectedTicket.status} onChange={event => void changeStatus(event.target.value as TicketStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Histórico do pedido</h3>
                <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                  {ticketEvents.map(event => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{event.event_type === 'created' ? 'Pedido submetido' : 'Estado alterado: ' + (event.old_status ? statusLabels[event.old_status] : '—') + ' → ' + statusLabels[event.new_status]}</span><span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span></div>)}
                </div>
                <h3 className="font-semibold">Conversação</h3>
                {messages.map(message => <div key={message.id} className={`max-w-3xl rounded-lg border border-border p-4 ${message.author_id === selectedTicket.created_by ? 'bg-card' : 'bg-muted/60'}`}><div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{message.author_id === selectedTicket.created_by ? 'Utilizador' : 'Suporte FKT'}</span><span>{formatDate(message.created_at)}</span></div><p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p></div>)}
                {messages.length === 0 && <p className="text-sm text-muted-foreground">Ainda não existem respostas neste pedido.</p>}
              </div>
              <form onSubmit={submitReply} className="space-y-3 rounded-lg border border-border bg-card p-4">
                <label className="text-sm font-medium" htmlFor="support-reply">Escrever resposta</label>
                <textarea id="support-reply" className={inputClass} rows={4} value={reply} onChange={event => setReply(event.target.value)} placeholder="Escreva a sua mensagem…" required />
                <button className={buttonClass} disabled={saving || !reply.trim()}><Send className="h-4 w-4" /> Enviar resposta</button>
              </form>
            </div>
          ) : (
            <>
              {newTicketOpen && <form onSubmit={submitTicket} className="space-y-4 rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between"><h2 className="font-semibold">Novo pedido de suporte</h2><button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setNewTicketOpen(false)}>Cancelar</button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">Módulo<select className={inputClass} value={ticketForm.module} onChange={event => setTicketForm({ ...ticketForm, module: event.target.value as ModuleKey })}>{modules.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                  <label className="space-y-1 text-sm">Tipo de pedido<select className={inputClass} value={ticketForm.category} onChange={event => setTicketForm({ ...ticketForm, category: event.target.value })}>{['Dúvida', 'Problema técnico', 'Acesso e permissões', 'Sugestão', 'Outro'].map(item => <option key={item}>{item}</option>)}</select></label>
                </div>
                <label className="block space-y-1 text-sm">Assunto<input className={inputClass} value={ticketForm.subject} onChange={event => setTicketForm({ ...ticketForm, subject: event.target.value })} maxLength={160} required /></label>
                <label className="block space-y-1 text-sm">Descrição<textarea className={inputClass} rows={5} value={ticketForm.description} onChange={event => setTicketForm({ ...ticketForm, description: event.target.value })} required /></label>
                <label className="block space-y-1 text-sm">Anexos (PDF, JPG, PNG, WEBP ou TXT; até 10 MB por ficheiro)<input className={inputClass} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain" onChange={event => setSelectedFiles(Array.from(event.target.files ?? []))} />{selectedFiles.length > 0 && <span className="block text-xs text-muted-foreground">{selectedFiles.map(file => file.name).join(', ')}</span>}</label>
                <button className={buttonClass} disabled={saving}><Send className="h-4 w-4" /> Submeter pedido</button>
              </form>}
              <div className="space-y-2">
                {visibleTickets.map(ticket => <button key={ticket.id} onClick={() => void openTicket(ticket)} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs text-muted-foreground">{ticket.reference_code} · {moduleName(ticket.module)} · {ticket.category}</p><p className="mt-1 font-medium">{ticket.subject}</p><p className="mt-1 text-xs text-muted-foreground">Actualizado em {formatDate(ticket.updated_at)}</p></div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusStyles[ticket.status]}`}>{statusLabels[ticket.status]}</span>
                </button>)}
                {tickets.length === 0 && <div className="rounded-lg border border-dashed border-border p-10 text-center"><MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Ainda não existem pedidos.</p><p className="mt-1 text-sm text-muted-foreground">Quando submeter um pedido, poderá acompanhar aqui o estado e as respostas.</p></div>}
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'manage' && isAdmin && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Gestão central</h2><p className="text-sm text-muted-foreground">Apenas o Administrador Global pode gerir FAQ e pedidos.</p></div><button className={secondaryButton} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /> Actualizar</button></div>
          <form onSubmit={saveFaq} className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{editingFaq ? 'Editar FAQ' : 'Criar FAQ'}</h3>{editingFaq && <button type="button" className="text-sm text-muted-foreground" onClick={() => { setEditingFaq(false); setFaqForm({ id: '', module: 'core', category: 'Utilização', question: '', answer: '', is_published: false }); }}>Cancelar edição</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">Módulo<select className={inputClass} value={faqForm.module} onChange={event => setFaqForm({ ...faqForm, module: event.target.value as ModuleKey })}>{modules.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="space-y-1 text-sm">Categoria<input className={inputClass} value={faqForm.category} onChange={event => setFaqForm({ ...faqForm, category: event.target.value })} required /></label>
            </div>
            <label className="block space-y-1 text-sm">Pergunta<input className={inputClass} value={faqForm.question} onChange={event => setFaqForm({ ...faqForm, question: event.target.value })} required /></label>
            <label className="block space-y-1 text-sm">Resposta<textarea className={inputClass} rows={5} value={faqForm.answer} onChange={event => setFaqForm({ ...faqForm, answer: event.target.value })} required /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={faqForm.is_published} onChange={event => setFaqForm({ ...faqForm, is_published: event.target.checked })} /> Publicar FAQ</label>
            <button className={buttonClass} disabled={saving}><Plus className="h-4 w-4" /> Guardar FAQ</button>
          </form>
          <div className="space-y-2"><h3 className="font-semibold">FAQ existentes ({faqs.length})</h3>{faqs.map(faq => <div key={faq.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{faq.question}</p><p className="mt-1 text-xs text-muted-foreground">{moduleName(faq.module)} · {faq.category} · {faq.is_published ? 'Publicada' : 'Rascunho'}</p></div><div className="flex gap-2"><button className={secondaryButton} onClick={() => editFaq(faq)}>Editar</button><button className={secondaryButton} onClick={() => void deleteFaq(faq)}>Eliminar</button></div></div>)}</div>
          <div className="space-y-2"><h3 className="font-semibold">Pedidos de todos os utilizadores ({tickets.length})</h3>{tickets.map(ticket => <button key={ticket.id} onClick={() => { setTab('tickets'); void openTicket(ticket); }} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-muted-foreground">{ticket.reference_code} · {moduleName(ticket.module)}</p><p className="font-medium">{ticket.subject}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusStyles[ticket.status]}`}>{statusLabels[ticket.status]}</span></button>)}</div>
        </section>
      )}
    </div>
  );
}
