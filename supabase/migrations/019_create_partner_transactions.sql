-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de transacciones de socios para control de capital
CREATE TABLE IF NOT EXISTS partner_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    tipo TEXT CHECK (tipo IN ('deposit', 'payment', 'withdrawal', 'referral_commission', 'transfer_to_main')),
    amount NUMERIC(10,2) NOT NULL,
    reference TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en partner_transactions
ALTER TABLE partner_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para partner_transactions
CREATE POLICY "Admins y partners pueden ver sus transacciones" ON partner_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR partner_id = auth.uid()
  );

CREATE POLICY "Solo admins o el sistema pueden insertar transacciones" ON partner_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR auth.uid() IS NOT NULL
  );

-- Actualizar constraint de métodos de pago en pagos para incluir 'youbox_partner'
ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_check;
ALTER TABLE pagos ADD CONSTRAINT pagos_metodo_check 
  CHECK (metodo IN ('stripe','square','transferencia','efectivo','deposito','otro','youpoints','cheque','visalink','youbox_partner'));
