-- 021_add_items_to_iphone_sales.sql
-- Agrega soporte para múltiples teléfonos por orden en ventas_iphone

ALTER TABLE public.ventas_iphone 
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS cantidad_equipos INT DEFAULT 1;

COMMENT ON COLUMN public.ventas_iphone.items IS 'Lista detallada de teléfonos en la orden (modelo, capacidad, color, condición, imei, tracking, precio)';
COMMENT ON COLUMN public.ventas_iphone.cantidad_equipos IS 'Cantidad total de teléfonos incluidos en la orden';
