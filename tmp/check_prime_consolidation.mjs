import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const id = '4f29ac72-76e7-4b0f-826a-53b77ac28073'; // LDO-PRIME-13726
    const { data, error } = await supabase
        .from('consolidacion_paquetes')
        .select(`
            id,
            paquete_id,
            paquetes(tracking, peso_lbs, estado, clientes(locker_id, nombre, apellido))
        `)
        .eq('consolidacion_id', id);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Linked packages for LDO-PRIME-13726 (${data.length}):`);
    data.forEach(row => {
        const p = row.paquetes;
        console.log(`  - Pivot ID: ${row.id}`);
        console.log(`    Package ID: ${row.paquete_id}`);
        console.log(`    Tracking: ${p?.tracking}`);
        console.log(`    Weight: ${p?.peso_lbs}`);
        console.log(`    State: ${p?.estado}`);
        console.log(`    Client: ${p?.clientes?.locker_id} - ${p?.clientes?.nombre} ${p?.clientes?.apellido}`);
    });
}

main();
