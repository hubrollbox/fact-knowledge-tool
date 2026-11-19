create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_fkt_global_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.fkt_global_admins a where a.user_id = (select auth.uid())); $$;
revoke all on function private.is_fkt_global_admin() from public, anon;
grant execute on function private.is_fkt_global_admin() to authenticated;

drop policy if exists fkt_global_admins_select_self_or_admin on public.fkt_global_admins;
drop policy if exists fkt_global_admins_select_self on public.fkt_global_admins;
create policy fkt_global_admins_select_self on public.fkt_global_admins
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists fkt_support_faq_read on public.fkt_support_faq;
create policy fkt_support_faq_read on public.fkt_support_faq for select to authenticated
using (is_published or private.is_fkt_global_admin());
drop policy if exists fkt_support_faq_admin_insert on public.fkt_support_faq;
create policy fkt_support_faq_admin_insert on public.fkt_support_faq for insert to authenticated
with check (private.is_fkt_global_admin() and (created_by is null or created_by = (select auth.uid())));
drop policy if exists fkt_support_faq_admin_update on public.fkt_support_faq;
create policy fkt_support_faq_admin_update on public.fkt_support_faq for update to authenticated
using (private.is_fkt_global_admin()) with check (private.is_fkt_global_admin());
drop policy if exists fkt_support_faq_admin_delete on public.fkt_support_faq;
create policy fkt_support_faq_admin_delete on public.fkt_support_faq for delete to authenticated
using (private.is_fkt_global_admin());

drop policy if exists fkt_support_tickets_read_own_or_admin on public.fkt_support_tickets;
create policy fkt_support_tickets_read_own_or_admin on public.fkt_support_tickets for select to authenticated
using (created_by = (select auth.uid()) or private.is_fkt_global_admin());
drop policy if exists fkt_support_tickets_admin_update on public.fkt_support_tickets;
create policy fkt_support_tickets_admin_update on public.fkt_support_tickets for update to authenticated
using (private.is_fkt_global_admin()) with check (private.is_fkt_global_admin());

drop policy if exists fkt_support_messages_read_ticket_access on public.fkt_support_messages;
create policy fkt_support_messages_read_ticket_access on public.fkt_support_messages for select to authenticated
using (exists (select 1 from public.fkt_support_tickets t where t.id = ticket_id
and (t.created_by = (select auth.uid()) or private.is_fkt_global_admin())));
drop policy if exists fkt_support_messages_insert_ticket_access on public.fkt_support_messages;
create policy fkt_support_messages_insert_ticket_access on public.fkt_support_messages for insert to authenticated
with check (author_id = (select auth.uid()) and exists (
  select 1 from public.fkt_support_tickets t where t.id = ticket_id
  and (t.created_by = (select auth.uid()) or private.is_fkt_global_admin())
));

create or replace function public.is_fkt_global_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_fkt_global_admin(); $$;
revoke all on function public.is_fkt_global_admin() from public, anon;
grant execute on function public.is_fkt_global_admin() to authenticated;