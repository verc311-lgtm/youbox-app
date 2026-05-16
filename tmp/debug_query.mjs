import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery() {
    console.log('Testing simple select...');
    const simple = await supabase.from('paquetes').select('id, tracking').limit(5);
    if (simple.error) {
        console.error('Simple query error:', simple.error);
    } else {
        console.log('Simple query count:', simple.data?.length);
    }

    console.log('Testing full query from Inventory.tsx...');
    const full = await supabase
        .from('paquetes')
        .select(`
          id, tracking, peso_lbs, piezas, estado, fecha_recepcion, notas,
          bodega_id,
          bodegas (id, nombre),
          clientes!inner (nombre, apellido, locker_id, sucursal_id),
          transportistas (nombre)
        `)
        .order('fecha_recepcion', { ascending: false })
        .limit(5);

    if (full.error) {
        console.error('Full query error:', full.error);
    } else {
        console.log('Full query count:', full.data?.length);
        if (full.data?.length > 0) {
            console.log('Sample row:', JSON.stringify(full.data[0], null, 2));
        }
    }
}

testQuery();
