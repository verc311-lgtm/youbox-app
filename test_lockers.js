import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pznponymhusxgrwbahid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLocker() {
    const prefix = 'YBG';
    const { data, error } = await supabase
        .from('clientes')
        .select('locker_id')
        .like('locker_id', `${prefix}%`)
        .order('locker_id', { ascending: false })
        .limit(3000);

    if (error) {
        console.error("Error:", error);
        return;
    }

    // Parse numeric suffix and find the actual highest number
    const maxNum = data.reduce((max, row) => {
        const match = row.locker_id.replace(prefix, '').match(/^(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
        }
        return max;
    }, 0);

    console.log("Actual Max Num in DB is:", maxNum);
    console.log("Next locker should be:", `${prefix}${maxNum + 1}`);

    const checkYBG1000 = data.find(c => c.locker_id === 'YBG1000');
    console.log("Does YBG1000 exist?", !!checkYBG1000);
}
checkLocker();
