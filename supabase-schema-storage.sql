-- ================================================================
-- radcliffe.run — Storage bucket policies
--
-- Prerequisites:
--   1. Create a bucket named 'site-images' in the Supabase dashboard
--      (Storage → New bucket → name: site-images, public: yes)
--   2. Then run this file in the SQL Editor
-- ================================================================

CREATE POLICY "Authenticated users can upload site images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images');

CREATE POLICY "Authenticated users can update site images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images');

CREATE POLICY "Authenticated users can delete site images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-images');

CREATE POLICY "Public can read site images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'site-images');
