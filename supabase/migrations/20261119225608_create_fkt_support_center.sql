create sequence if not exists public.fkt_support_ticket_ref_seq;

create table if not exists public.fkt_support_faq (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('core', 'works', 'lex', 'vet', 'dev')),
  category text not null,
  question text not null,
  answer text not null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fkt_support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default (
    'FKT-' || to_char(now(), 'YYMM') || '-' ||
    lpad(nextval('public.fkt_support_ticket_ref_seq')::text, 6, '0')
  ),
  created_by uuid not null references auth.users(id) on delete restrict,
  module text not null check (module in ('core', 'works', 'lex', 'vet', 'dev')),
  category text not null,
  subject text not null,
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_user', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fkt_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.fkt_support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists fkt_support_faq_module_published_idx on public.fkt_support_faq (module, is_published, sort_order);
create index if not exists fkt_support_tickets_owner_updated_idx on public.fkt_support_tickets (created_by, updated_at desc);
create index if not exists fkt_support_tickets_status_updated_idx on public.fkt_support_tickets (status, updated_at desc);
create index if not exists fkt_support_messages_ticket_created_idx on public.fkt_support_messages (ticket_id, created_at);

create or replace function public.fkt_support_set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists fkt_support_faq_updated_at on public.fkt_support_faq;
create trigger fkt_support_faq_updated_at before update on public.fkt_support_faq
for each row execute function public.fkt_support_set_updated_at();
drop trigger if exists fkt_support_tickets_updated_at on public.fkt_support_tickets;
create trigger fkt_support_tickets_updated_at before update on public.fkt_support_tickets
for each row execute function public.fkt_support_set_updated_at();

alter table public.fkt_support_faq enable row level security;
alter table public.fkt_support_tickets enable row level security;
alter table public.fkt_support_messages enable row level security;
revoke all on public.fkt_support_faq, public.fkt_support_tickets, public.fkt_support_messages from anon, authenticated;
grant select, insert, update, delete on public.fkt_support_faq to authenticated;
grant select, insert, update on public.fkt_support_tickets to authenticated;
grant select, insert on public.fkt_support_messages to authenticated;
grant usage, select on sequence public.fkt_support_ticket_ref_seq to authenticated;

create policy fkt_support_faq_read on public.fkt_support_faq for select to authenticated
using (is_published or public.is_fkt_global_admin());
create policy fkt_support_faq_admin_insert on public.fkt_support_faq for insert to authenticated
with check (public.is_fkt_global_admin() and (created_by is null or created_by = (select auth.uid())));
create policy fkt_support_faq_admin_update on public.fkt_support_faq for update to authenticated
using (public.is_fkt_global_admin()) with check (public.is_fkt_global_admin());
create policy fkt_support_faq_admin_delete on public.fkt_support_faq for delete to authenticated
using (public.is_fkt_global_admin());

create policy fkt_support_tickets_read_own_or_admin on public.fkt_support_tickets for select to authenticated
using (created_by = (select auth.uid()) or public.is_fkt_global_admin());
create policy fkt_support_tickets_create_own on public.fkt_support_tickets for insert to authenticated
with check (created_by = (select auth.uid()) and status = 'open');
create policy fkt_support_tickets_admin_update on public.fkt_support_tickets for update to authenticated
using (public.is_fkt_global_admin()) with check (public.is_fkt_global_admin());

create policy fkt_support_messages_read_ticket_access on public.fkt_support_messages for select to authenticated
using (exists (select 1 from public.fkt_support_tickets t where t.id = ticket_id
and (t.created_by = (select auth.uid()) or public.is_fkt_global_admin())));
create policy fkt_support_messages_insert_ticket_access on public.fkt_support_messages for insert to authenticated
with check (author_id = (select auth.uid()) and exists (
  select 1 from public.fkt_support_tickets t where t.id = ticket_id
  and (t.created_by = (select auth.uid()) or public.is_fkt_global_admin())
));