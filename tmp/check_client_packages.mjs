import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    // Find client
    const { data: client } = await supabase
        .from('clientes')
        .select('id')
        .eq('locker_id', 'YBG1091')
        .single();

    if (!client) {
        console.log('Client not found');
        return;
    }

    const { data: packages, error } = await supabase
        .from('paquetes')
        .select(`
            id,
            tracking,
            peso_lbs,
            estado,
            created_at,
            consolidacion_paquetes(
                consolidacion_id,
                consolidaciones(codigo)
            )
        `)
        .eq('cliente_id', client.id);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Client YBG1091 has ${packages.length} packages in total:`);
    packages.forEach(p => {
        console.log(`- ID: ${p.id}`);
        console.log(`  Tracking: ${p.tracking}`);
        console.log(`  Weight: ${p.peso_lbs}`);
        console.log(`  State: ${p.estado}`);
        console.log(`  Created at: ${p.created_at}`);
        console.log(`  Consolidations:`, JSON.stringify(p.consolidacion_paquetes));
    });
}

main();
