-- Posts table: roundups + news/announcements
CREATE TABLE IF NOT EXISTS public.posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS posts_updated_at ON public.posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate slug from title + date if not provided
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
END; $$;

DROP TRIGGER IF EXISTS posts_auto_slug ON public.posts;
CREATE TRIGGER posts_auto_slug
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_set_slug();

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Anon can read published posts
CREATE POLICY "Public can read published posts"
  ON public.posts FOR SELECT TO anon
  USING (status = 'published');

-- Authenticated (admin) full access
CREATE POLICY "Authenticated full access to posts"
  ON public.posts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
