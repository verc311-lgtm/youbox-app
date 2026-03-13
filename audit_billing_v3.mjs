import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

// Hardcoded for utility script
const supabaseUrl = 'https://pznponymhusxgrwbahid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFullAudit() {
    console.log("==========================================");
    console.log("🚀 STARTING FULL BILLING AUDIT & FIX");
    console.log("==========================================");

    // --- 1. AUDIT UNASSIGNED CLIENTS ---
    console.log("\n[1] Checking clients without a branch (sucursal_id is null)...");

    const { data: clientsNoBranch, error: errClients } = await supabase
        .from('clientes')
        .select('id, nombre, apellido, locker_id')
        .is('sucursal_id', null);

    if (errClients) {
        console.error("❌ Error fetching clients without branch:", errClients);
    } else {
        console.log(`Found ${clientsNoBranch.length} clients with no branch assigned.`);
        if (clientsNoBranch.length > 0) {
            console.log("Examples:");
            clientsNoBranch.slice(0, 5).forEach(c => console.log(` - ${c.locker_id || 'N/A'}: ${c.nombre} ${c.apellido}`));
            console.log("Note: To assign them, we'd need to know which branch to default to or update them manually.");
        }
    }


    // --- 2. AUDIT INVOICES VS PAYMENTS (VERIFICADO/PAGADO) ---
    console.log("\n[2] Checking discrepancies between Invoice Total vs Registered Payments (for 'verificado' or 'pagado' invoices)...");

    // Fetch all invoices that are considered paid or verified
    const { data: facturas, error: errFacturas } = await supabase
        .from('facturas')
        .select(`
      id, numero, estado, monto_total,
      pagos (id, monto, metodo)
    `)
        .in('estado', ['pagado', 'verificado']);

    if (errFacturas) {
        console.error("❌ Error fetching facturas:", errFacturas);
        return;
    }

    let totalDiscrepancies = 0;
    let totalPaymentsMissing = 0;
    const discrepanciesToFix = [];

    for (const inv of facturas) {
        const totalBilled = Number(inv.monto_total) || 0;

        // Sum all payments attached to this invoice
        const totalPaid = inv.pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

        const diff = Math.abs(totalBilled - totalPaid);

        // If difference is greater than 0.01 GTQ (to handle float rounding)
        if (diff > 0.01) {
            totalDiscrepancies++;

            if (inv.pagos.length === 0) {
                totalPaymentsMissing++;
            }

            discrepanciesToFix.push({
                id: inv.id,
                numero: inv.numero,
                estado: inv.estado,
                monto_total: totalBilled,
                monto_pagado: totalPaid,
                diferencia: totalBilled - totalPaid,
                num_pagos: inv.pagos.length
            });
        }
    }

    console.log(`Found ${totalDiscrepancies} invoices marked as 'verificado'/'pagado' but payment sum does NOT match invoice total.`);
    console.log(`Out of those, ${totalPaymentsMissing} invoices have NO payments recorded at all.`);

    // Write detailed log for top 10 discrepancies
    if (discrepanciesToFix.length > 0) {
        console.log("\n--- Top discrepancies (showing up to 10) ---");
        discrepanciesToFix.slice(0, 10).forEach(d => {
            console.log(`Factura: ${d.numero} | Estado: ${d.estado} | Total Factura: Q${d.monto_total.toFixed(2)} | Suma Pagos: Q${d.monto_pagado.toFixed(2)} | Diff: Q${d.diferencia.toFixed(2)} | Pagos Registrados: ${d.num_pagos}`);
        });
    }


    // --- 4. AUDIT PENDING INVOICES OVERPAID ---
    console.log("\n[3] Checking PENDING invoices that are fully paid...");
    const { data: pendingFacturas, error: errPending } = await supabase
        .from('facturas')
        .select(`
      id, numero, estado, monto_total,
      pagos (id, monto)
    `)
        .eq('estado', 'pendiente');

    if (errPending) {
        console.error("❌ Error fetching pending facturas:", errPending);
    } else {
        let pendingFullyPaid = 0;
        const pendingToMarkVerified = [];

        for (const inv of pendingFacturas) {
            const totalBilled = Number(inv.monto_total) || 0;
            const totalPaid = inv.pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

            // If totalPaid covers totalBilled
            if (totalBilled > 0 && totalPaid >= (totalBilled - 0.01)) {
                pendingFullyPaid++;
                pendingToMarkVerified.push(inv.id);
            }
        }

        console.log(`Found ${pendingFullyPaid} invoices marked as 'pendiente' but their payments sum matches or exceeds the total billed.`);
        if (pendingFullyPaid > 0) {
            console.log("These should probably be moved to 'verificado'.");
        }
    }


    console.log("\n==========================================");
    console.log("🏁 AUDIT COMPLETED");
    console.log("==========================================\n");
}

runFullAudit().catch(console.error);
