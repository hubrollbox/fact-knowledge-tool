ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS docente text,
  ADD COLUMN IF NOT EXISTS docente_telm text,
  ADD COLUMN IF NOT EXISTS docente_email text,
  ADD COLUMN IF NOT EXISTS regente text,
  ADD COLUMN IF NOT EXISTS regente_telm text,
  ADD COLUMN IF NOT EXISTS regente_email text;
