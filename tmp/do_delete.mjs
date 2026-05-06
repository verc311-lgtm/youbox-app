import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const lockerIds = ['YBG1843', 'YBG346', 'YBQ2784'];
    
    for (const lockerId of lockerIds) {
        // Find client
        const { data: clients, error: clientError } = await supabase
            .from('clientes')
            .select('id, nombre, apellido, locker_id')
            .eq('locker_id', lockerId);
            
        if (clientError || !clients || clients.length === 0) {
            console.log(`Client not found for locker: ${lockerId}`);
            continue;
        }
        
        const client = clients[0];
        console.log(`Found client ${lockerId}: ${client.nombre} ${client.apellido}`);
        
        // Find packages
        const { data: packages, error: pkgError } = await supabase
            .from('paquetes')
            .select('*')
            .eq('cliente_id', client.id);
            
        if (pkgError) {
            console.error(`Error fetching packages for ${lockerId}:`, pkgError);
            continue;
        }
        
        console.log(`Found ${packages?.length} packages for ${lockerId}`);
        if (packages && packages.length > 0) {
            for (const pkg of packages) {
                console.log(`  Deleting package ID: ${pkg.id}, tracking: ${pkg.tracking}`);
                
                // Un-comment to actually delete
                const { error: delError } = await supabase.from('paquetes').delete().eq('id', pkg.id);
                if (delError) console.error(`  Error deleting ${pkg.id}:`, delError);
                else console.log(`  Successfully deleted ${pkg.id}`);
            }
        }
    }
}

main();
