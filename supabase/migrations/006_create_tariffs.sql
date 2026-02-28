-- 006_create_tariffs.sql

DROP TABLE IF EXISTS public.tarifas CASCADE;

CREATE TABLE public.tarifas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bodega_id UUID REFERENCES public.bodegas(id) ON DELETE CASCADE,
    nombre_servicio TEXT NOT NULL DEFAULT 'Flete General',
    tipo_cobro TEXT NOT NULL DEFAULT 'por_libra' CHECK (tipo_cobro IN ('por_libra', 'por_paquete')),
    tarifa_q NUMERIC(10, 2) NOT NULL,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.tarifas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write for authenticated users" ON public.tarifas FOR ALL USING (auth.role() = 'authenticated');

-- Semillas de datos solicitadas por el cliente
INSERT INTO public.tarifas (bodega_id, nombre_servicio, tipo_cobro, tarifa_q)
SELECT id, 'Flete General', 'por_libra', 80.00 FROM bodegas WHERE nombre ILIKE '%Laredo%';

INSERT INTO public.tarifas (bodega_id, nombre_servicio, tipo_cobro, tarifa_q)
SELECT id, 'Flete General', 'por_libra', 55.00 FROM bodegas WHERE nombre ILIKE '%Greensboro%';

INSERT INTO public.tarifas (bodega_id, nombre_servicio, tipo_cobro, tarifa_q)
SELECT id, 'Flete General', 'por_libra', 35.00 FROM bodegas WHERE nombre ILIKE '%Tapachula%';

INSERT INTO public.tarifas (bodega_id, nombre_servicio, tipo_cobro, tarifa_q)
SELECT id, 'Shein Sobre', 'por_paquete', 20.00 FROM bodegas WHERE nombre ILIKE '%Tapachula%';

INSERT INTO public.tarifas (bodega_id, nombre_servicio, tipo_cobro, tarifa_q)
SELECT id, 'Shein Bolsa', 'por_paquete', 55.00 FROM bodegas WHERE nombre ILIKE '%Tapachula%';

INSERT INTO public.tarifas (bodega_id, nombre_servicio, tipo_cobro, tarifa_q)
SELECT id, 'Shein Caja', 'por_paquete', 100.00 FROM bodegas WHERE nombre ILIKE '%Tapachula%';
