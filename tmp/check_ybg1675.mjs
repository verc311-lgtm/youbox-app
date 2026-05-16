import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser(lockerId) {
    console.log(`Checking client with locker_id: ${lockerId}`);
    const { data, error } = await supabase
        .from('clientes')
        .select('*, sucursales(nombre)')
        .ilike('locker_id', lockerId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No client found with that Locker ID.');
        return;
    }

    console.log('Client Data:', JSON.stringify(data, null, 2));
}

checkUser('ybg1675');
