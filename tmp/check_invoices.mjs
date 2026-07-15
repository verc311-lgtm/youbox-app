import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const invoiceNumbers = ['FAC-G63JYH', 'FAC-ZOKQLG'];

    for (const num of invoiceNumbers) {
        console.log(`\n--- Querying invoice: ${num} ---`);
        const { data: invoice, error: invError } = await supabase
            .from('facturas')
            .select(`
                *,
                conceptos_factura(*)
            `)
            .eq('numero', num)
            .single();

        if (invError) {
            console.error(invError);
            continue;
        }

        console.log(`Invoice ID: ${invoice.id}`);
        console.log(`  Monto Total: ${invoice.monto_total}`);
        console.log(`  Consolidacion ID: ${invoice.consolidacion_id}`);
        console.log(`  Created at: ${invoice.created_at}`);
        console.log(`  Conceptos:`);
        invoice.conceptos_factura.forEach(c => {
            console.log(`    - ID: ${c.id}`);
            console.log(`      Descripcion: ${c.descripcion}`);
            console.log(`      Subtotal: ${c.subtotal}`);
        });
    }
}

main();
