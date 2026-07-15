import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const trackings = [
        '420780419361289717365544915658',
        '420780419361289717365551255921'
    ];

    for (const t of trackings) {
        console.log(`\n--- Querying tracking: ${t} ---`);
        const { data, error } = await supabase
            .from('paquetes')
            .select(`
                *,
                clientes(nombre, apellido, locker_id),
                consolidacion_paquetes(
                    consolidacion_id,
                    consolidaciones(codigo, estado)
                )
            `)
            .eq('tracking', t);

        if (error) {
            console.error(error);
            continue;
        }

        console.log(`Found ${data.length} packages:`);
        data.forEach(p => {
            console.log(`Package ID: ${p.id}`);
            console.log(`  Weight: ${p.peso_lbs} lbs`);
            console.log(`  Client: ${p.clientes?.nombre} ${p.clientes?.apellido} (${p.clientes?.locker_id})`);
            console.log(`  Created at: ${p.created_at}`);
            console.log(`  State: ${p.estado}`);
            console.log(`  Notes: ${p.notas}`);
            console.log(`  Consolidations:`, JSON.stringify(p.consolidacion_paquetes));
        });
    }
}

main();
