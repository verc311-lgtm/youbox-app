import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase
        .from('prealertas')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching prealertas columns:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in prealertas:', Object.keys(data[0]));
    } else {
        console.log('No data in prealertas to infer columns.');
        // Try to get columns via RPC or just assume we might need to add one
    }
}

checkSchema();
