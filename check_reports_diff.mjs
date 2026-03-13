import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pznponymhusxgrwbahid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReports() {
    console.log("=== CHECKING REPORTS LOGIC ===");

    // Simulate Reports logic
    const { data: pagos } = await supabase
        .from('pagos')
        .select('monto, created_at, facturas!inner(estado)')
        .eq('estado', 'verificado'); // Note: This checks pago.estado, not factura.estado!

    let reportsMarchIngresos = 0;

    pagos.forEach(p => {
        const month = p.created_at.slice(0, 7);
        if (month === '2026-03') {
            reportsMarchIngresos += Number(p.monto) || 0;
        }
    });

    console.log(`Reports Logic (pago.estado == 'verificado'): ${reportsMarchIngresos}`);

    // Check reality: Payments logic (factura.estado == 'verificado' or 'pagado')
    const { data: allPagos } = await supabase
        .from('pagos')
        .select('monto, created_at, estado, facturas!inner(estado)');

    let paymentLogicMarchIngresos = 0;
    let mismatchedPagos = 0;

    allPagos.forEach(p => {
        const month = p.created_at.slice(0, 7);
        const f = Array.isArray(p.facturas) ? p.facturas[0] : p.facturas;
        let isCompleteInvoice = f && ['verificado', 'pagado'].includes((f.estado || '').toLowerCase());

        if (month === '2026-03') {
            if (isCompleteInvoice) {
                paymentLogicMarchIngresos += Number(p.monto) || 0;
            }
            if (p.estado !== 'verificado' && isCompleteInvoice) {
                console.log(`Mismatch: Pago is ${p.estado}, but Factura is ${f.estado}. Amount: ${p.monto}`);
                mismatchedPagos += Number(p.monto) || 0;
            }
        }
    });

    console.log(`Payment / Billing Logic (factura.estado == 'verificado'|'pagado'): ${paymentLogicMarchIngresos}`);
    console.log(`Total mismatch due to pago.estado vs factura.estado: ${mismatchedPagos}`);
}

checkReports().catch(console.error);
