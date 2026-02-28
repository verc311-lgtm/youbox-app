-- =============================================
-- FIX 008: Disable RLS for custom Auth System
-- Ejecutar en: Supabase SQL Editor
-- =============================================

-- Problema: La App utiliza un sistema de autenticación custom (tabla 'usuarios' 
-- y 'clientes') en lugar de Supabase Auth nativo. Esto hace que auth.role() 
-- siempre sea 'anon', bloqueando tablas con RLS como 'tarifas'.

-- Desactivar RLS en las tablas afectadas por migraciones recientes
ALTER TABLE public.tarifas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_financieros DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_consolidaciones DISABLE ROW LEVEL SECURITY;

-- Confirmar resultado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tarifas', 'gastos_financieros', 'historial_consolidaciones');
