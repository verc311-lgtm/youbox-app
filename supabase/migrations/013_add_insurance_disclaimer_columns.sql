-- Migration to add insurance disclaimer columns to prealertas table
ALTER TABLE prealertas ADD COLUMN IF NOT EXISTS firma_url TEXT;
ALTER TABLE prealertas ADD COLUMN IF NOT EXISTS renuncia_url TEXT;

-- Optional: Add comments to the columns for better documentation in Supabase
COMMENT ON COLUMN prealertas.firma_url IS 'URL de la imagen de la firma del cliente (Base64 o Storage path)';
COMMENT ON COLUMN prealertas.renuncia_url IS 'URL del documento PDF de renuncia de responsabilidad generado';
