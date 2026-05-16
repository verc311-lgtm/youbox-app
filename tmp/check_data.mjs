import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
    console.log('Counting packages total...');
    const total = await supabase.from('paquetes').select('id', { count: 'exact', head: true });
    console.log('Total packages:', total.count);

    console.log('Counting packages with clients...');
    const withClients = await supabase.from('paquetes').select('id, clientes!inner(id)', { count: 'exact', head: true });
    console.log('Packages with clients:', withClients.count);

    console.log('Sucursales distribution in clientes...');
    const sucursales = await supabase.from('clientes').select('sucursal_id');
    const counts = {};
    sucursales.data?.forEach(c => {
        counts[c.sucursal_id] = (counts[c.sucursal_id] || 0) + 1;
    });
    console.log('Clients per sucursal:', counts);

    console.log('Checking a few packages and their clients sucursal...');
    const sample = await supabase.from('paquetes').select('id, clientes!inner(sucursal_id)').limit(5);
    console.log('Sample sucursals:', sample.data?.map(s => s.clientes?.sucursal_id));
}

checkData();
