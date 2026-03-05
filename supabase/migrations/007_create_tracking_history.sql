-- 007_create_tracking_history.sql

-- 1. Eliminar la restricción CHECK de estado en consolidaciones para permitir Estados Dinámicos
DO $$ 
DECLARE
    const_name text;
BEGIN
    SELECT conname INTO const_name
    FROM pg_constraint 
    WHERE conrelid = 'public.consolidaciones'::regclass AND contype = 'c';
    
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.consolidaciones DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

-- 2. Crear tabla de Bitácora / Historial de Estados
CREATE TABLE IF NOT EXISTS public.historial_consolidaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consolidacion_id UUID NOT NULL REFERENCES public.consolidaciones(id) ON DELETE CASCADE,
    estado TEXT NOT NULL,
    ciudad TEXT,
    comentario TEXT,
    notificar_wa BOOLEAN DEFAULT false,
    notificar_email BOOLEAN DEFAULT false,
    creado_por UUID REFERENCES public.usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fecha_evento TIMESTAMPTZ DEFAULT NOW() -- En caso de que se necesite poner fechas pasadas/futuras manually
);

-- Habilitar RLS
ALTER TABLE public.historial_consolidaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activar lectura para administradores" ON public.historial_consolidaciones FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Activar escritura para administradores" ON public.historial_consolidaciones FOR ALL USING (auth.role() = 'authenticated');
