-- Create storage bucket for closet items
INSERT INTO storage.buckets (id, name, public)
VALUES ('closet-items', 'closet-items', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own closet item images
CREATE POLICY "Users can upload closet items"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'closet-items');

-- Allow authenticated users to view closet item images
CREATE POLICY "Anyone can view closet items"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'closet-items');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their closet items"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'closet-items');