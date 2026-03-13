
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery() {
    console.log('Testing query with foto_url...');
    const { data, error } = await supabase
        .from('paquetes')
        .select('id, tracking, foto_url')
        .limit(1);

    if (error) {
        console.log('ERROR:', error.message);
        console.log('CODE:', error.code);
    } else {
        console.log('SUCCESS: foto_url exists!', data);
    }
}

testQuery();
