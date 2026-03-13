import { createClient } from '@supabase/supabase-js';

// Hardcoded for utility script
const supabaseUrl = 'https://pznponymhusxgrwbahid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTotals() {
    console.log("=== CHECKING TOTALS ===");

    // 1. ALL Facturas without any limit (like Billing.tsx)
    const { data: allFacturas } = await supabase
        .from('facturas')
        .select('id, numero, estado, monto_total, fecha_emision, pagos(monto, created_at)');

    let facturasCobrado = 0;
    let numFacturas = 0;
    let montoTotal = 0;
    let abonosEnPendientes = 0;

    allFacturas.forEach(f => {
        if (['anulado', 'devuelto'].includes(f.estado)) return;
        numFacturas++;
        montoTotal += Number(f.monto_total) || 0;

        let abonoFactura = 0;
        f.pagos.forEach(p => {
            abonoFactura += Number(p.monto) || 0;
            facturasCobrado += Number(p.monto) || 0;

            if (f.estado === 'pendiente') {
                abonosEnPendientes += Number(p.monto) || 0;
            }
        });
    });

    console.log(`Billing Page Output Simulation:`);
    console.log(`- Número de Facturas: ${numFacturas}`);
    console.log(`- Monto Total: ${montoTotal}`);
    console.log(`- Cobrado: ${facturasCobrado}`);
    console.log(`- Por Cobrar: ${montoTotal - facturasCobrado}`);
    console.log(`  (De este Cobrado, abonos en facturas 'pendiente' = ${abonosEnPendientes})`);

    // 2. ALL Pagos with limit 1000 (like Payments.tsx)
    const { data: allPagosFirst1000 } = await supabase
        .from('pagos')
        .select(`
          id, monto, created_at,
          facturas!inner (estado)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

    let paymentsTotal = 0;
    let paymentsVerifiedOrPagadoTotal = 0;

    allPagosFirst1000.forEach(p => {
        const fact = Array.isArray(p.facturas) ? p.facturas[0] : p.facturas;
        paymentsTotal += Number(p.monto) || 0;
        if (fact && ['verificado', 'pagado'].includes((fact.estado || '').toLowerCase())) {
            paymentsVerifiedOrPagadoTotal += Number(p.monto) || 0;
        }
    });

    console.log(`\nPayments Page Output Simulation (First 1000 sorted by created_at DESC):`);
    console.log(`- Total Sum (No Filters): ${paymentsTotal}`);
    console.log(`- Total Sum (Only verificado/pagado): ${paymentsVerifiedOrPagadoTotal}`);

    // 3. Payments Page with March 2026 filter
    let paymentsMarch2026 = 0;
    allPagosFirst1000.forEach(p => {
        const fact = Array.isArray(p.facturas) ? p.facturas[0] : p.facturas;
        if (fact && ['verificado', 'pagado'].includes((fact.estado || '').toLowerCase())) {
            const month = p.created_at.slice(0, 7);
            if (month === '2026-03') {
                paymentsMarch2026 += Number(p.monto) || 0;
            }
        }
    });

    console.log(`- Total Sum in March 2026 (Only verificado/pagado): ${paymentsMarch2026}`);
}

checkTotals().catch(console.error);
