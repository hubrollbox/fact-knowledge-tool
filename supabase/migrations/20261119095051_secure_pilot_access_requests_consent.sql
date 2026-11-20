alter table public.pilot_access_requests
  add column if not exists privacy_consent boolean not null default false,
  add column if not exists privacy_consent_at timestamptz;

update public.pilot_access_requests
set privacy_consent_at = created_at
where privacy_consent_at is null;

alter table public.pilot_access_requests
  alter column privacy_consent_at set default now(),
  alter column privacy_consent_at set not null;

alter table public.pilot_access_requests
  drop constraint if exists pilot_access_requests_privacy_consent_check;
alter table public.pilot_access_requests
  add constraint pilot_access_requests_privacy_consent_check check (privacy_consent = true);

drop policy if exists "Public can submit pilot access requests" on public.pilot_access_requests;
create policy "Public can submit pilot access requests"
on public.pilot_access_requests
for insert
to anon, authenticated
with check (
  privacy_consent = true
  and privacy_consent_at <= now()
  and privacy_consent_at >= now() - interval '5 minutes'
  and status = 'pending'
);

revoke all on table public.pilot_access_requests from anon, authenticated;
grant insert on table public.pilot_access_requests to anon, authenticated;
