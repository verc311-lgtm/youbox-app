import { createClient } from '@supabase/supabase-js';

// Credenciales embebidas directamente para asegurar funcionamiento en producción (Hostinger)
// La anon/publishable key es segura de exponer en el frontend
const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types for the database tables
export type Bodega = {
    id: string;
    nombre: string;
    pais: string;
    ciudad: string;
    direccion?: string;
    activo: boolean;
    created_at: string;
};

export type Zona = {
    id: string;
    nombre: string;
    pais: string;
    departamento?: string;
    activo: boolean;
};

export type Cliente = {
    id: string;
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string;
    locker_id: string;
    zona_id?: string;
    direccion_entrega?: string;
    nit?: string;
    activo: boolean;
    notas?: string;
    created_at: string;
};

export type Paquete = {
    id: string;
    tracking: string;
    cliente_id?: string;
    bodega_id?: string;
    transportista_id?: string;
    peso_lbs?: number;
    largo_in?: number;
    ancho_in?: number;
    alto_in?: number;
    peso_volumetrico?: number;
    piezas: number;
    valor_declarado?: number;
    es_fragil: boolean;
    reempaque: boolean;
    estado: 'recibido' | 'en_bodega' | 'listo_consolidar' | 'consolidado' | 'en_transito' | 'entregado' | 'devuelto' | 'perdido';
    fecha_recepcion: string;
    notas?: string;
    created_at: string;
    updated_at: string;
};

export type Factura = {
    id: string;
    numero: string;
    cliente_id?: string;
    consolidacion_id?: string;
    monto_subtotal: number;
    monto_total: number;
    moneda: string;
    estado: 'pendiente' | 'verificado' | 'anulado' | 'devuelto';
    fecha_emision: string;
    fecha_vencimiento?: string;
    notas?: string;
};

export type Pago = {
    id: string;
    factura_id?: string;
    monto: number;
    metodo: 'stripe' | 'square' | 'transferencia' | 'efectivo' | 'deposito' | 'otro';
    referencia?: string;
    comprobante_url?: string;
    estado: 'pendiente' | 'verificado' | 'rechazado';
    fecha_pago: string;
    notas?: string;
};

export type Consolidacion = {
    id: string;
    codigo: string;
    bodega_id?: string;
    zona_destino_id?: string;
    estado: 'abierta' | 'cerrada' | 'en_transito' | 'entregada';
    peso_total_lbs?: number;
    agente_envio?: string;
    fecha_cierre?: string;
    fecha_envio?: string;
    notas?: string;
};
