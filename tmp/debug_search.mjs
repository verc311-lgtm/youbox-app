import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simulateSearch(searchTerm) {
    console.log(`Simulating search for: "${searchTerm}"`);

    let allClientes = [];
    let from = 0;
    const BATCH_SIZE = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('clientes')
            .select(`id, locker_id, created_at`)
            .order('created_at', { ascending: false })
            .range(from, from + BATCH_SIZE - 1);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allClientes = [...allClientes, ...data];
        console.log(`Batch ${Math.floor(from / BATCH_SIZE) + 1}: got ${data.length} items. Total so far: ${allClientes.length}`);
        if (data.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
    }

    const ids = allClientes.map(c => c.id);
    const uniqueIds = new Set(ids);
    console.log(`Unique IDs: ${uniqueIds.size} / Total fetched: ${ids.length}`);

    const targetId = 'c52606cd-0e07-4b12-b081-2dc9693cdadd';
    const hasTarget = allClientes.find(c => c.id === targetId);
    console.log(`Target ID (YBG1675) found in fetched list? ${!!hasTarget}`);

    if (!hasTarget) {
        // Double check if it exists at all with a clean query
        const { data: direct } = await supabase.from('clientes').select('id, locker_id').eq('id', targetId).single();
        console.log('Direct lookup result:', direct ? `Found: ${direct.locker_id}` : 'NOT FOUND IN DB EITHER AT THIS MOMENT');
    }

    // Check for duplicates
    if (uniqueIds.size < ids.length) {
        console.log('DUPLICATES DETECTED! This happens if rows shift during paged fetching.');
        const counts = {};
        allClientes.forEach(c => { counts[c.id] = (counts[c.id] || 0) + 1; });
        const dups = Object.entries(counts).filter(([id, count]) => count > 1);
        console.log('Sample duplicates:', dups.slice(0, 3));
    }
}

simulateSearch('ybg1675');
