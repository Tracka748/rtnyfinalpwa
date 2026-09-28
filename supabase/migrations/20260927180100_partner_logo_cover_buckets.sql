INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-covers', 'partner-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "partner_logo_write" ON storage.objects
FOR ALL
USING (
  bucket_id = 'partner-logos'
  AND (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id::text = (storage.foldername(name))[1]
        AND partners.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'partner-logos'
  AND (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id::text = (storage.foldername(name))[1]
        AND partners.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
);

CREATE POLICY "partner_cover_write" ON storage.objects
FOR ALL
USING (
  bucket_id = 'partner-covers'
  AND (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id::text = (storage.foldername(name))[1]
        AND partners.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'partner-covers'
  AND (
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.id::text = (storage.foldername(name))[1]
        AND partners.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
);
