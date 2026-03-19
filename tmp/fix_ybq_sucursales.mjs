import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    // 1. Get Quiche branch ID
    const { data: sucursales, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .ilike('nombre', '%Quich%');

    if (sucursalesError) {
        console.error('Error fetching sucursales:', sucursalesError);
        return;
    }

    if (!sucursales || sucursales.length === 0) {
        console.log(' Branch Quiche not found.');
        return;
    }

    console.log('Sucursales found:', sucursales);
    const quicheId = sucursales[0].id;
    console.log('Using Quiche ID:', quicheId);

    // 2. Find YBQ users without a branch
    const { data: users, error: usersError } = await supabase
        .from('clientes')
        .select('id, locker_id, nombre, apellido, email')
        .ilike('locker_id', 'YBQ%')
        .is('sucursal_id', null);

    if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
    }

    console.log(`Found ${users?.length || 0} YBQ users without a branch.`);

    if (users && users.length > 0) {
        console.log('Sample users to update:', users.slice(0, 5));

        // 3. Update the users
        const { error: updateError } = await supabase
            .from('clientes')
            .update({ sucursal_id: quicheId })
            .ilike('locker_id', 'YBQ%')
            .is('sucursal_id', null);

        if (updateError) {
            console.error('Error updating users:', updateError);
        } else {
            console.log('Successfully updated users to Quiche branch.');
        }
    }
}

main();
