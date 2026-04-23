-- Site settings table (single row config)
CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1,
  hero_image_url text,
  sync_thursday_sheet bool NOT NULL DEFAULT true,
  sync_social_sheet bool NOT NULL DEFAULT true,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed default row
INSERT INTO site_settings (id, sync_thursday_sheet, sync_social_sheet)
VALUES (1, true, true)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can read settings"           ON site_settings FOR SELECT TO anon        USING (true);
CREATE POLICY "Authenticated can update settings" ON site_settings FOR UPDATE TO authenticated USING (true);
