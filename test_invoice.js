import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    console.log("Starting test invoice generation...");

    // 1. Get a random client
    const { data: clientes, error: clientesError } = await supabase.from('clientes').select('id').limit(1);
    if (clientesError) {
        console.error("Error fetching clientes:", clientesError);
        return;
    }
    if (!clientes || clientes.length === 0) {
        console.log("No clientes found.");
        return;
    }

    const clienteId = clientes[0].id;
    const numeroFactura = `FAC-TEST-${Date.now()}`;
    const total = 100.50;

    // 2. Insert factura
    console.log(`Inserting factura ${numeroFactura} for client ${clienteId}`);
    const { data: facturaData, error: facturaError } = await supabase
        .from('facturas')
        .insert([{
            numero: numeroFactura,
            cliente_id: clienteId,
            monto_subtotal: total,
            monto_total: total,
            moneda: 'GTQ',
            estado: 'pendiente'
        }])
        .select()
        .single();

    if (facturaError) {
        console.error("Error inserting factura:", facturaError);
        return;
    }

    console.log("Factura inserted successfully:", facturaData);

    // 3. Insert conceptos
    console.log("Inserting conceptos for factura", facturaData.id);
    const { error: conceptosError } = await supabase.from('conceptos_factura').insert([{
        factura_id: facturaData.id,
        descripcion: 'Test Concepto',
        cantidad: 1,
        precio_unitario: total,
        subtotal: total
    }]);

    if (conceptosError) {
        console.error("Error inserting conceptos:", conceptosError);
        return;
    }

    console.log("Conceptos inserted successfully.");
    console.log("Test completed without errors.");
}

test();
