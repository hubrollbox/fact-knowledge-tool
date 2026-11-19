
create table public.pilot_access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null check (
    char_length(email) <= 254
    and email = lower(btrim(email))
    and email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  role_company text not null check (char_length(btrim(role_company)) between 2 and 180),
  works_count integer check (works_count is null or works_count between 0 and 100000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.pilot_access_requests enable row level security;

revoke all on table public.pilot_access_requests from anon, authenticated;
grant insert (name, email, role_company, works_count)
  on table public.pilot_access_requests to anon, authenticated;

create policy "Public can submit pilot access requests"
on public.pilot_access_requests
for insert
to anon, authenticated
with check (
  char_length(btrim(name)) between 2 and 120
  and char_length(btrim(role_company)) between 2 and 180
  and email = lower(btrim(email))
  and email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  and (works_count is null or works_count between 0 and 100000)
);

create index pilot_access_requests_created_at_idx
on public.pilot_access_requests (created_at desc);
