-- 022_add_comprador_to_iphone_sales.sql
-- Agrega columna comprador_asignado a ventas_iphone para asignar quién comprará el equipo

ALTER TABLE public.ventas_iphone 
    ADD COLUMN IF NOT EXISTS comprador_asignado TEXT DEFAULT NULL;

COMMENT ON COLUMN public.ventas_iphone.comprador_asignado IS 'Persona o comprador asignado para adquirir el equipo en USA';
