create table if not exists public.fkt_support_ticket_events (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.fkt_support_tickets(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 event_type text not null check (event_type in ('created','status_changed')),
 old_status text,
 new_status text not null,
 created_at timestamptz not null default now()
);
create index if not exists fkt_support_ticket_events_ticket_created_idx on public.fkt_support_ticket_events(ticket_id,created_at);
alter table public.fkt_support_ticket_events enable row level security;
revoke all on public.fkt_support_ticket_events from anon, authenticated;
grant select on public.fkt_support_ticket_events to authenticated;
create policy fkt_support_ticket_events_read on public.fkt_support_ticket_events for select to authenticated
using (exists (select 1 from public.fkt_support_tickets t where t.id=ticket_id and (t.created_by=(select auth.uid()) or private.is_fkt_global_admin())));
create or replace function private.fkt_support_log_ticket_event()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' then
  insert into public.fkt_support_ticket_events(ticket_id,actor_id,event_type,new_status) values(new.id,new.created_by,'created',new.status);
 elsif new.status is distinct from old.status then
  insert into public.fkt_support_ticket_events(ticket_id,actor_id,event_type,old_status,new_status) values(new.id,(select auth.uid()),'status_changed',old.status,new.status);
 end if;
 return new;
end;
$$;
revoke all on function private.fkt_support_log_ticket_event() from public,anon,authenticated;
drop trigger if exists fkt_support_ticket_event_log on public.fkt_support_tickets;
create trigger fkt_support_ticket_event_log after insert or update of status on public.fkt_support_tickets for each row execute function private.fkt_support_log_ticket_event();

create table if not exists public.fkt_support_attachments (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.fkt_support_tickets(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id) on delete restrict,
 file_name text not null,
 storage_path text not null unique,
 content_type text,
 file_size bigint not null check(file_size>0 and file_size<=10485760),
 created_at timestamptz not null default now()
);
create index if not exists fkt_support_attachments_ticket_idx on public.fkt_support_attachments(ticket_id);
alter table public.fkt_support_attachments enable row level security;
revoke all on public.fkt_support_attachments from anon,authenticated;
grant select,insert on public.fkt_support_attachments to authenticated;
create policy fkt_support_attachments_read on public.fkt_support_attachments for select to authenticated
using(exists(select 1 from public.fkt_support_tickets t where t.id=ticket_id and (t.created_by=(select auth.uid()) or private.is_fkt_global_admin())));
create policy fkt_support_attachments_insert on public.fkt_support_attachments for insert to authenticated
with check(uploaded_by=(select auth.uid()) and exists(select 1 from public.fkt_support_tickets t where t.id=ticket_id and t.created_by=(select auth.uid())));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fkt-support-attachments','fkt-support-attachments',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists fkt_support_files_read on storage.objects;
create policy fkt_support_files_read on storage.objects for select to authenticated
using(bucket_id='fkt-support-attachments' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_fkt_global_admin()));
drop policy if exists fkt_support_files_insert on storage.objects;
create policy fkt_support_files_insert on storage.objects for insert to authenticated
with check(bucket_id='fkt-support-attachments' and (storage.foldername(name))[1]=(select auth.uid())::text);