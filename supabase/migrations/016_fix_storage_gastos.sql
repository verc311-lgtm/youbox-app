-- 016_fix_storage_gastos.sql

-- Drop potentially conflicting old policies
DROP POLICY IF EXISTS "Public Receipt Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update/delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recibos_gastos', 'recibos_gastos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Give full SELECT access to anyone for the bucket
CREATE POLICY "Public Read Access on Gastos"
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recibos_gastos');

-- Allow authenticated users to INSERT
CREATE POLICY "Authenticated users can upload Gastos"
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'recibos_gastos');

-- Allow authenticated users to UPDATE
CREATE POLICY "Authenticated users can update Gastos"
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'recibos_gastos');

-- Allow authenticated users to DELETE
CREATE POLICY "Authenticated users can delete Gastos"
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'recibos_gastos');
