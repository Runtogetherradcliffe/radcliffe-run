-- Allow authenticated users to upload/replace/delete in site-images bucket
CREATE POLICY "Authenticated users can upload site images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images');

CREATE POLICY "Authenticated users can update site images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images');

CREATE POLICY "Authenticated users can delete site images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-images');

-- Public read (bucket is already public, but explicit policy is safer)
CREATE POLICY "Public can read site images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'site-images');
