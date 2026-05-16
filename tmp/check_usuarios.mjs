import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsuarios() {
    console.log('Checking ybg1675 in usuarios table...');
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .or('nombre.ilike.%Astrid%,email.ilike.%astrid%');

    if (error) { console.error(error); return; }
    console.log('Results in usuarios:', JSON.stringify(data, null, 2));
}

checkUsuarios();
