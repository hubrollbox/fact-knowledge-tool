-- Verify FKT Inspect help-centre integration.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO extensions, public;
BEGIN;
SELECT plan(4);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.fkt_support_faq'::regclass
      AND conname='fkt_support_faq_module_check'
      AND pg_get_constraintdef(oid) LIKE '%inspect%'
  ),
  'FAQ accepts the Inspect module'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.fkt_support_tickets'::regclass
      AND conname='fkt_support_tickets_module_check'
      AND pg_get_constraintdef(oid) LIKE '%inspect%'
  ),
  'support tickets accept the Inspect module'
);

SELECT is(
  (SELECT count(*)::integer FROM public.fkt_support_faq
   WHERE module='inspect' AND is_published),
  7,
  'seven verified Inspect FAQs are published'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.fkt_support_faq
    WHERE module='inspect'
      AND (answer ILIKE '%já disponível%' OR answer ILIKE '%garante conformidade%')
      AND is_published
  ),
  'published Inspect FAQs do not claim availability or automatic compliance'
);

SELECT * FROM finish();
ROLLBACK;
