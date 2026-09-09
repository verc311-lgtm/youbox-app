-- 020_create_iphone_sales.sql
-- Migración para el módulo de Venta y Pre-Orden de iPhones

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ventas_iphone (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_orden TEXT UNIQUE NOT NULL,
    tipo_orden TEXT NOT NULL CHECK (tipo_orden IN ('pre_orden', 'orden')),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    cliente_email TEXT,
    locker_id TEXT,
    modelo TEXT NOT NULL,
    capacidad TEXT NOT NULL,
    color TEXT,
    estado_equipo TEXT DEFAULT 'nuevo',
    precio_total NUMERIC(10, 2) NOT NULL,
    anticipo_pagado NUMERIC(10, 2) NOT NULL,
    saldo_pendiente NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    metodo_pago TEXT CHECK (metodo_pago IN ('transferencia', 'efectivo', 'deposito', 'visalink', 'otro')),
    referencia_pago TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente_compra' CHECK (estado IN ('pendiente_compra', 'comprado', 'en_transito', 'en_bodega', 'entregado', 'cancelado')),
    imei_serie TEXT,
    tracking_proveedor TEXT,
    notas TEXT,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_ventas_iphone_numero ON public.ventas_iphone (numero_orden);
CREATE INDEX IF NOT EXISTS idx_ventas_iphone_estado ON public.ventas_iphone (estado);
CREATE INDEX IF NOT EXISTS idx_ventas_iphone_cliente_id ON public.ventas_iphone (cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_iphone_created_at ON public.ventas_iphone (created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE public.ventas_iphone ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Permitir lectura para usuarios autenticados o publico interno"
    ON public.ventas_iphone FOR SELECT
    USING (true);

CREATE POLICY "Permitir insercion para usuarios autenticados"
    ON public.ventas_iphone FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir actualizacion para usuarios autenticados"
    ON public.ventas_iphone FOR UPDATE
    USING (true);

CREATE POLICY "Permitir eliminacion para usuarios autenticados"
    ON public.ventas_iphone FOR DELETE
    USING (true);
