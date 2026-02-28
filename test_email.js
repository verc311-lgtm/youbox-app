import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmail() {
    console.log("Fetching a valid client...");
    // Let's get a client that might have a real or test email
    const { data: clients } = await supabase.from('clientes').select('*').limit(1);
    if (!clients || clients.length === 0) {
        console.log("No clients found");
        return;
    }

    const client = clients[0];
    console.log("Using client:", client.nombre, "email:", client.email);

    console.log("Inserting notification...");
    const { data, error } = await supabase.from('notificaciones').insert([{
        cliente_id: client.id,
        tipo: 'email',
        asunto: 'Test Automático de Factura - Ignore por favor',
        mensaje: 'Esto es una prueba del sistema de alertas automatizadas de correos a traves de Webhooks via Resend.',
        estado: 'pendiente'
    }]).select();

    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Inserted perfectly. Trigger should have fired. ID:", data[0].id);
    }
}

testEmail();
