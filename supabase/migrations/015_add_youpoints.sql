-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agregar columna de puntos a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS puntos INTEGER DEFAULT 0;

-- Crear tabla de historial de puntos
CREATE TABLE IF NOT EXISTS historial_puntos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
    tipo TEXT CHECK (tipo IN ('ganado', 'canjeado', 'ajuste')),
    puntos INTEGER NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES perfiles(id) ON DELETE SET NULL
);

-- Habilitar RLS en historial_puntos
ALTER TABLE historial_puntos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Admins y clientes pueden ver su propio historial" ON historial_puntos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin')
    OR cliente_id = auth.uid()
  );

CREATE POLICY "Solo admins pueden insertar historial de puntos" ON historial_puntos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND perfiles.role = 'admin')
  );

-- Actualizar constraint de métodos de pago para incluir 'youpoints'
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_check 
  CHECK (metodo IN ('stripe','square','transferencia','efectivo','deposito','otro','youpoints','cheque','visalink'));
