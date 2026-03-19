import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function check() {
    let query = supabase
        .from('pagos')
        .select(`
            id, monto, metodo, created_at,
            facturas (
                numero, estado, cliente_manual_nombre, cliente_manual_nit,
                clientes (nombre, apellido, locker_id, sucursal_id, sucursales(nombre))
            )
        `);

    const { data, error } = await query;
    if (error) { console.error(error); return; }

    let sinSedeTotal = 0;
    const sinSedeDetails = [];

    data.forEach(p => {
        const fact = Array.isArray(p.facturas) ? p.facturas[0] : p.facturas;
        if (!fact) return;
        if (!['verificado', 'pagado'].includes((fact.estado || '').toLowerCase())) return;

        const cls = fact?.clientes;
        const client = Array.isArray(cls) ? cls[0] : cls;
        const sucs = client?.sucursales;
        const sucursal = Array.isArray(sucs) ? sucs[0] : sucs;

        const branchName = sucursal?.nombre || 'Sin Sede';
        if (branchName === 'Sin Sede') {
            sinSedeTotal += Number(p.monto) || 0;
            sinSedeDetails.push({
                monto: p.monto,
                cliente_manual: fact.cliente_manual_nombre,
                cliente_rec: client ? `${client.nombre} ${client.apellido}` : null
            });
        }
    });

    console.log("Total Sin Sede:", sinSedeTotal);
    console.table(sinSedeDetails);
}
check();
