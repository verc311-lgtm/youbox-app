-- Add manual client data to facturas table
ALTER TABLE public.facturas
ADD COLUMN IF NOT EXISTS cliente_manual_nombre TEXT,
ADD COLUMN IF NOT EXISTS cliente_manual_nit TEXT;

-- Update the foreign key for cliente_id so it can be null for manual invoices
ALTER TABLE public.facturas
ALTER COLUMN cliente_id DROP NOT NULL;
