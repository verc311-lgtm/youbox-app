import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('Searching for tracking...');

    // 1. Search for the tracking directly using the exact last 12 digits
    const { data: d1, error: e1 } = await supabase.from('paquetes').select('tracking, estado, created_at').ilike('tracking', '%75078861%').limit(5);
    console.log('Result for %75078861%:', d1, e1);

    const { data: d2 } = await supabase.from('paquetes').select('tracking, estado, created_at').ilike('tracking', '%19860775078861%').limit(5);
    console.log('Result for %19860775078861%:', d2);

    const { data: d4 } = await supabase.from('paquetes').select('tracking, estado, created_at').ilike('tracking', '%420274066341940%').limit(5);
    console.log('Result for USPS prefix %420274066341940%:', d4);

    // 2. Just get the last 5 packages added to see what format they are in
    const { data: d3 } = await supabase.from('paquetes').select('tracking, created_at').order('created_at', { ascending: false }).limit(10);
    console.log('Last 10 packages added to DB:', d3);
}

run();
