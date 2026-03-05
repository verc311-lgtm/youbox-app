-- =============================================
-- FIX 009: Disable RLS for custom Auth System on Billing Tables
-- Ejecutar en: Supabase SQL Editor
-- =============================================

-- Desactivar RLS en facturas, pagos, conceptos y notificaciones por el custom auth
ALTER TABLE public.facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conceptos_factura DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;

-- Confirmar resultado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('facturas', 'conceptos_factura', 'pagos', 'notificaciones');
