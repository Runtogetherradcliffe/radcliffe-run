-- ================================================================
-- radcliffe.run — Email system migration
-- Run in Supabase SQL Editor
-- ================================================================

-- ── Add email defaults to site_settings ──────────────────────────
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS email_default_subject  text NOT NULL DEFAULT 'This Thursday with RTR 🏃',
  ADD COLUMN IF NOT EXISTS email_default_opening  text NOT NULL DEFAULT 'Hi everyone,

Here''s what''s on this Thursday — hope to see you there. As always, we meet at 7pm and everyone is welcome regardless of pace or experience.',
  ADD COLUMN IF NOT EXISTS email_default_closing  text NOT NULL DEFAULT 'See you Thursday!

The RTR team

—
Run Together Radcliffe meets every Thursday at 7pm at Radcliffe Market. Free to join, open to all.';


-- ── SCHEDULED EMAILS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Which Thursday this email is about (null = not run-related)
  thursday_date     date,

  -- Scheduling
  scheduled_for     timestamptz,                       -- null = draft only
  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),

  -- Content
  subject           text        NOT NULL DEFAULT '',
  show_opening      boolean     NOT NULL DEFAULT true,
  opening_text      text,                              -- null = use site_settings default
  show_route_block  boolean     NOT NULL DEFAULT true,
  custom_text       text,
  show_closing      boolean     NOT NULL DEFAULT true,
  closing_text      text,                              -- null = use site_settings default

  -- Recipients
  recipient_filter  text        NOT NULL DEFAULT 'all',  -- 'all' | 'c25k' | etc.

  -- Send record
  sent_at           timestamptz,
  recipient_count   integer
);

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_scheduled_emails_updated_at ON public.scheduled_emails;
CREATE TRIGGER set_scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: only authenticated (admin) can read/write
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emails_all_authenticated"
  ON public.scheduled_emails FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── EMAIL SENDS LOG ───────────────────────────────────────────────
-- Records each individual send for auditing
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id      uuid        NOT NULL REFERENCES public.scheduled_emails(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  recipient     text        NOT NULL,
  status        text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error         text
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_log_all_authenticated"
  ON public.email_send_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
