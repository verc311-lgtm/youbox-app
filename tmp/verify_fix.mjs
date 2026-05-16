import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyAscFetch() {
    console.log(`Starting fetch with stable ASC ordering...`);

    let allClientes = [];
    let from = 0;
    const BATCH_SIZE = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('clientes')
            .select(`id, locker_id`)
            .order('created_at', { ascending: true }) // The new logic
            .range(from, from + BATCH_SIZE - 1);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allClientes = [...allClientes, ...data];
        if (data.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
    }

    console.log(`Total fetched: ${allClientes.length}`);
    const uniqueIds = new Set(allClientes.map(c => c.id));
    console.log(`Unique count: ${uniqueIds.size}`);

    const hasYBG1675 = allClientes.find(c => c.locker_id.toUpperCase() === 'YBG1675');
    console.log(`YBG1675 found in list? ${!!hasYBG1675}`);
}

verifyAscFetch();
