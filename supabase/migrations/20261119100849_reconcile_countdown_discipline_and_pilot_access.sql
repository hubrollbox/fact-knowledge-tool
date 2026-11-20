-- Restore the countdown defaults expected by the current UI.
ALTER TABLE public.countdown_events
  ALTER COLUMN settings
  SET DEFAULT '{"colorTheme":"#2563eb","showSeconds":true,"modeAfterEnd":"finished"}'::jsonb;

-- These contact fields are already used by the knowledge/discipline UI.
ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS docente text,
  ADD COLUMN IF NOT EXISTS docente_telm text,
  ADD COLUMN IF NOT EXISTS docente_email text,
  ADD COLUMN IF NOT EXISTS regente text,
  ADD COLUMN IF NOT EXISTS regente_telm text,
  ADD COLUMN IF NOT EXISTS regente_email text;

-- Public users may submit only the fields required by the form.
-- System-managed columns (id, status, created_at) remain default-controlled.
REVOKE ALL ON TABLE public.pilot_access_requests FROM anon, authenticated;
GRANT INSERT (name, email, role_company, works_count, privacy_consent, privacy_consent_at)
  ON TABLE public.pilot_access_requests TO anon, authenticated;

DROP POLICY IF EXISTS "Public can submit pilot access requests" ON public.pilot_access_requests;
CREATE POLICY "Public can submit pilot access requests"
ON public.pilot_access_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  privacy_consent = true
  AND privacy_consent_at <= now()
  AND privacy_consent_at >= now() - interval '5 minutes'
  AND status = 'new'
);