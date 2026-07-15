import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const invoiceIds = [
        '6b50f3df-f741-460f-8510-ed8b6fad1404', // FAC-G63JYH
        '49bad7b9-a25d-43d6-bdb1-232ef86528ab'  // FAC-ZOKQLG
    ];

    const { data: pagos, error } = await supabase
        .from('pagos')
        .select('*')
        .in('factura_id', invoiceIds);

    if (error) {
        console.error(error);
    } else {
        console.log(`Found ${pagos?.length} payments:`);
        pagos?.forEach(p => {
            console.log(`Payment ID: ${p.id}, Factura ID: ${p.factura_id}, Monto: ${p.monto}, Estado: ${p.estado}`);
        });
    }
}

main();
