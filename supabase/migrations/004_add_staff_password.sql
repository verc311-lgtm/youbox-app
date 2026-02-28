-- ========================================================
-- YOUBOX GT - MIGRATION: ADD STAFF PASSWORD
-- Ejecutar en: Supabase SQL Editor
-- ========================================================

-- Añadir columna password_hash a la tabla de usuarios (staff)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Crear el usuario inicial "admin / 1234" si no existe aún en la tabla de usuarios
DO $$
DECLARE
    admin_rol_id UUID;
BEGIN
    SELECT id INTO admin_rol_id FROM roles WHERE nombre = 'admin' LIMIT 1;
    
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@youbox.gt') THEN
        INSERT INTO usuarios (nombre, apellido, email, rol_id, password_hash, activo)
        VALUES ('Administrador', 'YOUBOX', 'admin@youbox.gt', admin_rol_id, '1234', true);
    ELSE
        -- Solo asegurarse de que tenga la contraseña si ya existía
        UPDATE usuarios SET password_hash = '1234' WHERE email = 'admin@youbox.gt' AND password_hash IS NULL;
    END IF;
END $$;
