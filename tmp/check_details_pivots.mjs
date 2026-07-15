import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    // Query consolidations
    const { data: cons, error: consError } = await supabase
        .from('consolidaciones')
        .select('*')
        .in('codigo', ['LDO-13726', 'LDO-PRIME-13726']);

    if (consError) {
        console.error(consError);
    } else {
        console.log('Consolidations:');
        cons.forEach(c => {
            console.log(`- ID: ${c.id}`);
            console.log(`  Codigo: ${c.codigo}`);
            console.log(`  Estado: ${c.estado}`);
            console.log(`  Weight: ${c.peso_total_lbs}`);
            console.log(`  Created at: ${c.created_at}`);
        });
    }

    // Query pivot rows for the two packages
    const packageIds = [
        '4ba67cb7-89e3-45d1-9b13-004eb0519c04',
        '2520e4ff-3c82-46cb-83e2-4b4990ae847b'
    ];

    const { data: pivots, error: pivotError } = await supabase
        .from('consolidacion_paquetes')
        .select(`
            *,
            consolidaciones(codigo)
        `)
        .in('paquete_id', packageIds);

    if (pivotError) {
        console.error(pivotError);
    } else {
        console.log('\nPivot rows for these packages:');
        pivots.forEach(p => {
            console.log(`- ID: ${p.id}`);
            console.log(`  Package ID: ${p.paquete_id}`);
            console.log(`  Consolidation: ${p.consolidaciones?.codigo} (${p.consolidacion_id})`);
        });
    }
}

main();
