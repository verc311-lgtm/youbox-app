-- =============================================
-- MIGRATION: 011_multi_branch.sql
-- Description: Create Sucursales table and add references to existing tables
-- =============================================

-- 1. Create Sucursales Table
CREATE TABLE IF NOT EXISTS sucursales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    prefijo_casillero TEXT NOT NULL,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Branches
INSERT INTO sucursales (nombre, prefijo_casillero) 
VALUES 
    ('Sede Central', 'YBG'),
    ('Sede Quiché', 'YBQ')
ON CONFLICT DO NOTHING;

-- 3. In order to alter existing tables, we need to know the default YBG branch ID
DO $$
DECLARE
    central_id UUID;
    quiche_id UUID;
BEGIN
    SELECT id INTO central_id FROM sucursales WHERE prefijo_casillero = 'YBG' LIMIT 1;

    -- 4. Alter Usuarios
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'sucursal_id') THEN
        ALTER TABLE usuarios ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);
        UPDATE usuarios SET sucursal_id = central_id WHERE sucursal_id IS NULL;
    END IF;

    -- 5. Alter Clientes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'sucursal_id') THEN
        ALTER TABLE clientes ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);
        UPDATE clientes SET sucursal_id = central_id WHERE sucursal_id IS NULL;
    END IF;

    -- 6. Alter Gastos Financieros
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gastos_financieros' AND column_name = 'sucursal_id') THEN
        ALTER TABLE gastos_financieros ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);
        UPDATE gastos_financieros SET sucursal_id = central_id WHERE sucursal_id IS NULL;
    END IF;

END $$;
