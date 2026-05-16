import { createClient } from '@supabase/supabase-js';

// Hardcoded for utility script
const supabaseUrl = 'https://pznponymhusxgrwbahid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
    console.log("==========================================");
    console.log("🛠️ FIXING DISCREPANCIES IN 'VERIFICADO' INVOICES");
    console.log("==========================================\n");

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

    let fixedCount = 0;

    for (const inv of facturas) {
        const totalBilled = Number(inv.monto_total) || 0;
        const totalPaid = inv.pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

        const diff = totalBilled - totalPaid;

        // Difference is significant
        if (Math.abs(diff) > 0.01) {
            console.log(`\nFactura: ${inv.numero} | Billed: Q${totalBilled.toFixed(2)} | Paid: Q${totalPaid.toFixed(2)} | Diff: Q${diff.toFixed(2)}`);

            if (diff > 0) {
                // Missing payment (underpaid)
                console.log(` -> Faltan Q${diff.toFixed(2)}. Creando registro de pago por esta cantidad...`);
                const { error: insertErr } = await supabase
                    .from('pagos')
                    .insert({
                        factura_id: inv.id,
                        monto: diff,
                        metodo: 'efectivo',
                        referencia: 'Pago de Ajuste Automático por Diferencia',
                        created_at: new Date().toISOString()
                    });

                if (insertErr) {
                    console.error(`    ❌ Error inserting missing payment for ${inv.numero}:`, insertErr);
                } else {
                    console.log(`    ✅ Pago de ajuste insertado con éxito.`);
                    fixedCount++;
                }

            } else {
                // Overpaid
                console.log(` -> Sobran Q${Math.abs(diff).toFixed(2)}. Esto significa que se cobró más del total. Aplicando Concepto de 'Cargo Extra Manual' para igualar el total de la factura al pago...`);

                // Add an invoice concept to balance the invoice Total Billed upwards to match the payments
                const { error: conceptErr } = await supabase
                    .from('conceptos_factura')
                    .insert({
                        factura_id: inv.id,
                        descripcion: 'Ajuste / Cargo Extra Manual Automático',
                        cantidad: 1,
                        precio_unitario: Math.abs(diff),
                        subtotal: Math.abs(diff)
                    });

                if (conceptErr) {
                    console.error(`    ❌ Error adding adjustment concept for ${inv.numero}:`, conceptErr);
                } else {
                    // Update main invoice total
                    const newTotal = totalBilled + Math.abs(diff);
                    const { error: updateErr } = await supabase
                        .from('facturas')
                        .update({ monto_total: newTotal })
                        .eq('id', inv.id);

                    if (updateErr) {
                        console.error(`    ❌ Error updating total for ${inv.numero}:`, updateErr);
                    } else {
                        console.log(`    ✅ Factura ajustada a Q${newTotal.toFixed(2)} para cuadrar con el cobro en sobrepago.`);
                        fixedCount++;
                    }
                }
            }
        }
    }

    console.log(`\n==========================================`);
    console.log(`🏁 FIX COMPLETED: ${fixedCount} invoices adjusted.`);
    console.log(`==========================================\n`);

    console.log("Running final verification pass...");

    const { data: facturasRecheck } = await supabase
        .from('facturas')
        .select(`id, monto_total, pagos (monto)`)
        .in('estado', ['pagado', 'verificado']);

    let discrepanciesRemaining = 0;
    for (const inv of facturasRecheck || []) {
        const tb = Number(inv.monto_total) || 0;
        const tp = inv.pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
        if (Math.abs(tb - tp) > 0.01) {
            discrepanciesRemaining++;
        }
    }

    console.log(`\nDiscrepancias restantes: ${discrepanciesRemaining} (Debería ser 0)`);
}

runFix().catch(console.error);
