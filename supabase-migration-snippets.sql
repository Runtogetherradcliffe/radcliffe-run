-- ================================================================
-- radcliffe.run — Email snippets migration
-- Run in Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS public.email_snippets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title      text        NOT NULL,
  body       text        NOT NULL,
  active     boolean     NOT NULL DEFAULT true
);

ALTER TABLE public.email_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snippets_all_authenticated"
  ON public.email_snippets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
