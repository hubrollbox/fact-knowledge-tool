CREATE TABLE public.countdown_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  target_date timestamptz NOT NULL,
  settings jsonb NOT NULL DEFAULT '{"colorTheme":"#2563eb","showSeconds":true,"modeAfterEnd":"finished"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.countdown_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own countdown events"
  ON public.countdown_events
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_countdown_events_updated_at
  BEFORE UPDATE ON public.countdown_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
