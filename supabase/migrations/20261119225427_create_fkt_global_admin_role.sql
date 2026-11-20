create table if not exists public.fkt_global_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  note text
);
alter table public.fkt_global_admins enable row level security;
revoke all on table public.fkt_global_admins from anon, authenticated;
grant select on table public.fkt_global_admins to authenticated;

create or replace function public.is_fkt_global_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fkt_global_admins a
    where a.user_id = auth.uid()
  );
$$;
revoke all on function public.is_fkt_global_admin() from public;
grant execute on function public.is_fkt_global_admin() to authenticated;

drop policy if exists fkt_global_admins_select_self_or_admin on public.fkt_global_admins;
create policy fkt_global_admins_select_self
on public.fkt_global_admins for select to authenticated
using (user_id = (select auth.uid()));


-- Global administrator membership is provisioned separately after the
-- intended Auth user exists. Migrations must not depend on a hard-coded
-- production email or fail when replayed in a clean local environment.
