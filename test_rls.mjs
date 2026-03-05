import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

// Using the exact anon key the frontend uses
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('Testing RLS policies for anon user...');

    // Try to query the exact same query the frontend builds
    let cleanInput = '4202740663419400108106245787016508'.replace(/[\s\-_]/g, '');
    let searchTarget = cleanInput;
    if (cleanInput.length > 15) {
        searchTarget = cleanInput.slice(-12);
    }

    console.log('Search target generated:', searchTarget);

    const { data, error } = await supabase
        .from('paquetes')
        .select(`
        id, tracking, peso_lbs, estado, fecha_recepcion, descripcion,
        bodegas (nombre),
        clientes (nombre, apellido, locker_id),
        transportistas (nombre),
        historial_estados (id, estado_nuevo, notas, created_at)
      `)
        .ilike('tracking', `%${searchTarget}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    console.log('Complex frontend query result:', data, error);
}

run();
