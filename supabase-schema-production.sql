-- ================================================================
-- radcliffe.run — Production schema
-- Single file consolidating all migrations for a fresh Supabase project.
--
-- Run this in the Supabase SQL Editor on a brand-new project.
--
-- NOTE: Storage bucket policies are in supabase-schema-storage.sql.
--       Create the 'site-images' bucket in the Supabase dashboard first,
--       then run that file.
-- ================================================================


-- ── FUNCTIONS ─────────────────────────────────────────────────────

-- Auto-update updated_at on any table that uses it
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-generate slug for posts from title + date
CREATE OR REPLACE FUNCTION public.posts_set_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; counter int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN RETURN NEW; END IF;
  base := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base := regexp_replace(trim(base), '\s+', '-', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  IF NEW.published_at IS NOT NULL THEN
    base := to_char(NEW.published_at, 'YYYY-MM-DD') || '-' || base;
  END IF;
  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.posts WHERE slug = candidate AND id != NEW.id);
    counter := counter + 1;
    candidate := base || '-' || counter;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;


-- ── CORE TABLES ───────────────────────────────────────────────────

-- Members (registered runners)
CREATE TABLE IF NOT EXISTS public.members (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  first_name               text        NOT NULL,
  last_name                text        NOT NULL,
  email                    text        NOT NULL,
  mobile                   text,
  emergency_name           text        NOT NULL DEFAULT '',
  emergency_phone          text        NOT NULL DEFAULT '',
  emergency_relationship   text        NOT NULL DEFAULT '',
  medical_info             text,
  consent_medical          boolean     NOT NULL DEFAULT false,
  consent_data             boolean     NOT NULL DEFAULT false,
  health_declaration       boolean     NOT NULL DEFAULT false,
  email_opt_out            boolean     NOT NULL DEFAULT false,
  photo_consent            boolean     NOT NULL DEFAULT false,
  status                   text        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive')),
  cohort                   text,
  is_run_leader            boolean     NOT NULL DEFAULT false,
  uka_number               text
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can register"
  ON public.members FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated full access to members"
  ON public.members FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Public member count (anon-callable, no PII exposed)
-- Defined after members table so the relation exists
CREATE OR REPLACE FUNCTION public.get_member_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.members;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_count() TO anon;


-- Run schedule
CREATE TABLE IF NOT EXISTS public.runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  date             date        NOT NULL,
  title            text        NOT NULL,
  description      text,
  route_slug       text,
  distance_km      numeric,
  terrain          text        CHECK (terrain IN ('road', 'trail')),
  meeting_point    text        NOT NULL DEFAULT 'Radcliffe Market',
  leader_name      text,
  cancelled        boolean     NOT NULL DEFAULT false,
  on_tour          boolean     NOT NULL DEFAULT false,
  has_jeffing      boolean     NOT NULL DEFAULT false,
  meeting_map_url  text,
  run_type         text        NOT NULL DEFAULT 'regular',
  google_event_id  text        UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS runs_google_event_id_idx
  ON public.runs (google_event_id)
  WHERE google_event_id IS NOT NULL;

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read runs"
  ON public.runs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated full access to runs"
  ON public.runs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- Site settings (single-row config)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id                     int  PRIMARY KEY DEFAULT 1,
  hero_image_url         text,
  sync_thursday_sheet    boolean NOT NULL DEFAULT true,
  sync_social_sheet      boolean NOT NULL DEFAULT true,
  show_social_calendar   boolean NOT NULL DEFAULT false,
  email_default_subject  text    NOT NULL DEFAULT 'This Thursday with RTR 🏃',
  email_default_opening  text    NOT NULL DEFAULT 'Hi everyone,

Here''s what''s on this Thursday — hope to see you there. As always, we meet at 7pm and everyone is welcome regardless of pace or experience.',
  email_default_closing  text    NOT NULL DEFAULT 'See you Thursday!

The RTR team

—
Run Together Radcliffe meets every Thursday at 7pm at Radcliffe Market. Free to join, open to all.',
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.site_settings (id, sync_thursday_sheet, sync_social_sheet)
VALUES (1, true, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read settings"
  ON public.site_settings FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated can update settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (true);


-- Scheduled member emails
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  thursday_date     date,
  scheduled_for     timestamptz,
  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  subject           text        NOT NULL DEFAULT '',
  show_opening      boolean     NOT NULL DEFAULT true,
  opening_text      text,
  show_route_block  boolean     NOT NULL DEFAULT true,
  custom_text       text,
  show_closing      boolean     NOT NULL DEFAULT true,
  closing_text      text,
  recipient_filter  text        NOT NULL DEFAULT 'all',
  sent_at           timestamptz,
  recipient_count   integer
);

CREATE TRIGGER set_scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access to emails"
  ON public.scheduled_emails FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- Email send audit log
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id    uuid        NOT NULL REFERENCES public.scheduled_emails(id) ON DELETE CASCADE,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  recipient   text        NOT NULL,
  status      text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error       text
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access to email log"
  ON public.email_send_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- Reusable email snippets
CREATE TABLE IF NOT EXISTS public.email_snippets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title      text        NOT NULL,
  body       text        NOT NULL,
  active     boolean     NOT NULL DEFAULT true
);

ALTER TABLE public.email_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access to snippets"
  ON public.email_snippets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- Posts (roundups + news)
CREATE TABLE IF NOT EXISTS public.posts (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  published_at  date,
  type          text NOT NULL CHECK (type IN ('roundup', 'news')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  title         text NOT NULL,
  summary       text,
  content       text NOT NULL DEFAULT '',
  photo_urls    text[] NOT NULL DEFAULT '{}',
  slug          text UNIQUE
);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER posts_auto_slug
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_set_slug();

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read published posts"
  ON public.posts FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated full access to posts"
  ON public.posts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- PWA push notification subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  member_id   uuid        REFERENCES public.members(id) ON DELETE SET NULL
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can unsubscribe by endpoint"
  ON public.push_subscriptions FOR DELETE
  USING (true);

CREATE POLICY "Authenticated can manage subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (true);
