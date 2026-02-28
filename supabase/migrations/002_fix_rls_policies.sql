-- =============================================
-- FIX: Row Level Security (RLS) Policies
-- Ejecutar en: Supabase SQL Editor
-- =============================================

-- 1. Desactivar RLS en clientes para permitir registro público
--    (Opción A: Sin RLS - más simple para desarrollo)
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;

-- 2. Si prefieres mantener RLS, usa las políticas (Opción B):
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- 
-- -- Permitir INSERT desde cualquier origen (registro de nuevos clientes)
-- CREATE POLICY "allow_public_register" ON clientes
--   FOR INSERT WITH CHECK (true);
-- 
-- -- Permitir SELECT para login
-- CREATE POLICY "allow_public_read" ON clientes
--   FOR SELECT USING (true);
-- 
-- -- Permitir UPDATE del cliente sobre sus propios datos
-- CREATE POLICY "allow_client_update" ON clientes
--   FOR UPDATE USING (true);

-- 3. Agregar columna password_hash si no existe
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 4. Verificar que las tablas principales no tienen RLS bloqueando
ALTER TABLE bodegas DISABLE ROW LEVEL SECURITY;
ALTER TABLE zonas DISABLE ROW LEVEL SECURITY;
ALTER TABLE transportistas DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Confirmar resultado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clientes','bodegas','zonas','transportistas');
