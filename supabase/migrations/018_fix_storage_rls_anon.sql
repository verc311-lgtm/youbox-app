-- 018_fix_storage_rls_anon.sql
-- The app uses custom auth (not Supabase auth), so users have 'anon' role, not 'authenticated'.
-- Previous migration 016 restricted INSERT/UPDATE/DELETE to 'authenticated' only, which blocks all uploads.
-- This migration replaces those policies to allow both anon and authenticated roles.

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Public Read Access on Gastos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload Gastos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update Gastos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete Gastos" ON storage.objects;

-- Also drop any other possible legacy policies on this bucket
DROP POLICY IF EXISTS "Public Receipt Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update/delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('recibos_gastos', 'recibos_gastos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read (anyone can view receipt images via URL)
CREATE POLICY "recibos_gastos_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'recibos_gastos');

-- Allow ALL roles (anon + authenticated) to INSERT files
CREATE POLICY "recibos_gastos_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recibos_gastos');

-- Allow ALL roles to UPDATE files
CREATE POLICY "recibos_gastos_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recibos_gastos');

-- Allow ALL roles to DELETE files
CREATE POLICY "recibos_gastos_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'recibos_gastos');
