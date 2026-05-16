CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa TEXT NOT NULL DEFAULT 'YOUBOXGT',
    direccion TEXT NOT NULL DEFAULT '13 AVENIDA 4-60 ZONA 3 LOCAL 106 PLAZA MONTERREY
Quetzaltenango, Quezaltenango, 09001',
    telefono TEXT NOT NULL DEFAULT '56466611',
    email TEXT NOT NULL DEFAULT 'info@youboxgt.com',
    sitio_web TEXT NOT NULL DEFAULT 'youboxgt.com',
    logo_url TEXT NOT NULL DEFAULT 'https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-04-2.png',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO configuracion_empresa (nombre_empresa) 
SELECT 'YOUBOXGT' 
WHERE NOT EXISTS (SELECT 1 FROM configuracion_empresa);

ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to configuracion_empresa"
    ON configuracion_empresa FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to update configuracion_empresa"
    ON configuracion_empresa FOR UPDATE
    USING (auth.role() = 'authenticated');
