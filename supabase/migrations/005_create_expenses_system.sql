-- 005_create_expenses_system.sql

-- 1. Create Expenses Table
CREATE TABLE IF NOT EXISTS public.gastos_financieros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria TEXT NOT NULL,
    concepto TEXT NOT NULL,
    monto_q NUMERIC(10, 2) NOT NULL,
    fecha_pago DATE NOT NULL,
    recibo_url TEXT,
    estado TEXT DEFAULT 'pagado' CHECK (estado IN ('pagado', 'pendiente', 'verificado')),
    metodo_pago TEXT,
    numero_cuenta TEXT, -- optional for verified payments
    notas TEXT,
    registrado_por UUID REFERENCES public.usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gastos_financieros ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and insert
CREATE POLICY "Enable read access for all users" ON public.gastos_financieros FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.gastos_financieros FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for auth users" ON public.gastos_financieros FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Create Storage Bucket for Receipts Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recibos_gastos', 'recibos_gastos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Setup Storage Policies for the new Bucket
-- Allow public read access to receipts
CREATE POLICY "Public Receipt Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'recibos_gastos' );

-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id = 'recibos_gastos'
);

-- Allow users to delete their own uploaded receipts if needed
CREATE POLICY "Authenticated users can update/delete receipts"
ON storage.objects FOR UPDATE
USING ( auth.role() = 'authenticated' AND bucket_id = 'recibos_gastos' );

CREATE POLICY "Authenticated users can delete receipts"
ON storage.objects FOR DELETE
USING ( auth.role() = 'authenticated' AND bucket_id = 'recibos_gastos' );
