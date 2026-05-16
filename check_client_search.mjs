import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkClientSearch() {
  const query = 'YBG217';
  const { data, error } = await supabase
    .from('clientes')
    .select('id, locker_id, nombre, apellido')
    .or(`locker_id.ilike.%${query}%,nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
    .eq('activo', true)
    .limit(8);
    
  if (error) console.error("Search YBG217 Error:", error);
  else console.log("Search YBG217 Data:", JSON.stringify(data, null, 2));
  
  const query2 = 'Avila';
  const { data: data2 } = await supabase
    .from('clientes')
    .select('id, locker_id, nombre, apellido')
    .or(`locker_id.ilike.%${query2}%,nombre.ilike.%${query2}%,apellido.ilike.%${query2}%`)
    .eq('activo', true)
    .limit(8);
  console.log("Search Avila Data:", JSON.stringify(data2, null, 2));

  const query3 = 'Ávila';
  const { data: data3 } = await supabase
    .from('clientes')
    .select('id, locker_id, nombre, apellido')
    .or(`locker_id.ilike.%${query3}%,nombre.ilike.%${query3}%,apellido.ilike.%${query3}%`)
    .eq('activo', true)
    .limit(8);
  console.log("Search Ávila Data:", JSON.stringify(data3, null, 2));
}

checkClientSearch();
