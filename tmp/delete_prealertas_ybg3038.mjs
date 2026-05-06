import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const lockerId = 'YBG3038';
    
    // Find client
    const { data: clients, error: clientError } = await supabase
        .from('clientes')
        .select('id, nombre, apellido')
        .eq('locker_id', lockerId);
        
    if (clientError || !clients || clients.length === 0) {
        console.log(`Client not found for locker: ${lockerId}`);
        return;
    }
    
    const client = clients[0];
    console.log(`Found client ${lockerId}: ${client.nombre} ${client.apellido}`);
    
    // Find rejected pre-alerts for this client
    const { data: prealertas, error: paError } = await supabase
        .from('prealertas')
        .select('*')
        .eq('cliente_id', client.id)
        .eq('estado', 'rechazada');
        
    if (paError) {
        console.error(`Error fetching prealertas:`, paError);
        return;
    }
    
    console.log(`Found ${prealertas?.length} rejected prealertas for ${lockerId}`);
    
    let totalDeducted = 0;

    if (prealertas && prealertas.length > 0) {
        for (const pa of prealertas) {
            console.log(`\nProcessing prealerta ID: ${pa.id}, tracking: ${pa.tracking}, seguro: ${pa.monto_seguro}`);
            
            // Check for fondo_seguros record
            const { data: fondo, error: fondoError } = await supabase
                .from('fondo_seguros')
                .select('*')
                .eq('prealerta_id', pa.id);
                
            if (fondoError) {
                console.error(`  Error checking fondo_seguros:`, fondoError);
            } else if (fondo && fondo.length > 0) {
                console.log(`  Found ${fondo.length} fondo_seguros records. Total monto: ${fondo.reduce((a, b) => a + Number(b.monto_ingreso), 0)}`);
                for (const f of fondo) {
                    console.log(`  Deleting fondo_seguros ID: ${f.id}`);
                    const { error: delFondoError } = await supabase.from('fondo_seguros').delete().eq('id', f.id);
                    if (delFondoError) {
                        console.error(`  Error deleting fondo_seguros ${f.id}:`, delFondoError);
                    } else {
                        console.log(`  Successfully deleted fondo_seguros ${f.id}`);
                        totalDeducted += Number(f.monto_ingreso);
                    }
                }
            } else {
                console.log(`  No fondo_seguros records found.`);
            }
            
            // Delete prealerta
            console.log(`  Deleting prealerta...`);
            const { error: delPaError } = await supabase.from('prealertas').delete().eq('id', pa.id);
            if (delPaError) {
                console.error(`  Error deleting prealerta ${pa.id}:`, delPaError);
            } else {
                console.log(`  Successfully deleted prealerta ${pa.id}`);
            }
        }
    }
    
    console.log(`\nTotal deducted from fondo_seguros (principal): $${totalDeducted.toFixed(2)}`);
}

main();
