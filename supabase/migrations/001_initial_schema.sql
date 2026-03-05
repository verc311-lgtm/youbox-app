-- =============================================
-- YOUBOX GT - SCHEMA COMPLETO DE BASE DE DATOS
-- Ejecutar en: Supabase SQL Editor
-- Project: pznponymhusxgrwbahid
-- =============================================

-- 1. BODEGAS (Warehouses)
CREATE TABLE IF NOT EXISTS bodegas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  pais TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ZONAS GEOGRÁFICAS
CREATE TABLE IF NOT EXISTS zonas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  pais TEXT DEFAULT 'Guatemala',
  departamento TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROLES DE USUARIO
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  permisos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USUARIOS DEL SISTEMA (Staff)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  rol_id UUID REFERENCES roles(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  locker_id TEXT UNIQUE NOT NULL,
  zona_id UUID REFERENCES zonas(id),
  direccion_entrega TEXT,
  nit TEXT,
  password_hash TEXT,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRANSPORTISTAS (Carriers)
CREATE TABLE IF NOT EXISTS transportistas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAQUETES
CREATE TABLE IF NOT EXISTS paquetes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  bodega_id UUID REFERENCES bodegas(id),
  transportista_id UUID REFERENCES transportistas(id),
  peso_lbs NUMERIC(10,2),
  largo_in NUMERIC(10,2),
  ancho_in NUMERIC(10,2),
  alto_in NUMERIC(10,2),
  peso_volumetrico NUMERIC(10,2),
  piezas INTEGER DEFAULT 1,
  valor_declarado NUMERIC(10,2),
  es_fragil BOOLEAN DEFAULT false,
  reempaque BOOLEAN DEFAULT false,
  estado TEXT DEFAULT 'recibido' CHECK (estado IN ('recibido','en_bodega','listo_consolidar','consolidado','en_transito','entregado','devuelto','perdido')),
  fecha_recepcion TIMESTAMPTZ DEFAULT NOW(),
  notas TEXT,
  usuario_recepcion UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FOTOS DE PAQUETES
CREATE TABLE IF NOT EXISTS fotos_paquetes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paquete_id UUID REFERENCES paquetes(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT DEFAULT 'llegada' CHECK (tipo IN ('llegada','danio','entrega','otro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HISTORIAL DE ESTADOS
CREATE TABLE IF NOT EXISTS historial_estados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paquete_id UUID REFERENCES paquetes(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONSOLIDACIONES
CREATE TABLE IF NOT EXISTS consolidaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  bodega_id UUID REFERENCES bodegas(id),
  zona_destino_id UUID REFERENCES zonas(id),
  estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada','en_transito','entregada')),
  peso_total_lbs NUMERIC(10,2),
  agente_envio TEXT,
  fecha_cierre TIMESTAMPTZ,
  fecha_envio TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PAQUETES EN CONSOLIDACIÓN (tabla pivote)
CREATE TABLE IF NOT EXISTS consolidacion_paquetes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consolidacion_id UUID REFERENCES consolidaciones(id) ON DELETE CASCADE,
  paquete_id UUID REFERENCES paquetes(id),
  UNIQUE(consolidacion_id, paquete_id)
);

-- 12. TARIFAS
CREATE TABLE IF NOT EXISTS tarifas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bodega_id UUID REFERENCES bodegas(id),
  zona_id UUID REFERENCES zonas(id),
  peso_min_lbs NUMERIC(10,2) DEFAULT 0,
  peso_max_lbs NUMERIC(10,2),
  precio_por_libra NUMERIC(10,2) NOT NULL,
  cargo_minimo NUMERIC(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CARGOS ADICIONALES
CREATE TABLE IF NOT EXISTS cargos_adicionales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  costo_fijo NUMERIC(10,2) DEFAULT 0,
  porcentaje NUMERIC(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. FACTURAS
CREATE TABLE IF NOT EXISTS facturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  consolidacion_id UUID REFERENCES consolidaciones(id),
  monto_subtotal NUMERIC(10,2) DEFAULT 0,
  monto_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  moneda TEXT DEFAULT 'GTQ',
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','verificado','anulado','devuelto')),
  fecha_emision TIMESTAMPTZ DEFAULT NOW(),
  fecha_vencimiento TIMESTAMPTZ,
  notas TEXT,
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CONCEPTOS DE FACTURA
CREATE TABLE IF NOT EXISTS conceptos_factura (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID REFERENCES facturas(id) ON DELETE CASCADE,
  paquete_id UUID REFERENCES paquetes(id),
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. PAGOS
CREATE TABLE IF NOT EXISTS pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID REFERENCES facturas(id),
  monto NUMERIC(10,2) NOT NULL,
  metodo TEXT CHECK (metodo IN ('stripe','square','transferencia','efectivo','deposito','otro')),
  referencia TEXT,
  comprobante_url TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','verificado','rechazado')),
  fecha_pago TIMESTAMPTZ DEFAULT NOW(),
  verificado_por UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  paquete_id UUID REFERENCES paquetes(id),
  tipo TEXT CHECK (tipo IN ('whatsapp','email','sms','push')),
  asunto TEXT,
  mensaje TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviado','fallido')),
  fecha_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SEED DATA - Datos Iniciales
-- =============================================

INSERT INTO bodegas (nombre, pais, ciudad, direccion) VALUES
  ('Laredo', 'USA', 'Laredo, TX', '1234 International Blvd, Laredo TX 78040'),
  ('Greensboro', 'USA', 'Greensboro, NC', '567 Distribution Dr, Greensboro NC 27401'),
  ('Tapachula', 'Mexico', 'Tapachula, Chiapas', 'Av. Central Norte 890, Tapachula 30700')
ON CONFLICT DO NOTHING;

INSERT INTO transportistas (nombre) VALUES
  ('Amazon Logistics'), ('UPS'), ('FedEx'), ('USPS'), ('DHL')
ON CONFLICT DO NOTHING;

INSERT INTO roles (nombre, permisos) VALUES
  ('admin', '{"all": true}'),
  ('operador', '{"paquetes": true, "clientes": true, "consolidaciones": true}'),
  ('facturador', '{"facturas": true, "pagos": true}'),
  ('viewer', '{"read": true}')
ON CONFLICT DO NOTHING;

INSERT INTO zonas (nombre, departamento) VALUES
  ('Guatemala Ciudad', 'Guatemala'),
  ('Mixco', 'Guatemala'),
  ('Villa Nueva', 'Guatemala'),
  ('Quetzaltenango', 'Quetzaltenango'),
  ('Escuintla', 'Escuintla'),
  ('Cobán', 'Alta Verapaz'),
  ('Huehuetenango', 'Huehuetenango')
ON CONFLICT DO NOTHING;
