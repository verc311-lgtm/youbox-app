import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pznponymhusxgrwbahid.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnBvbnltaHVzeGdyd2JhaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDQzNDgsImV4cCI6MjA4Nzc4MDM0OH0.C4pasGLfayXa2g7vKfjvlB4NMsntSe-kAwUtFAZjdmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const targetConsolidationId = '4f29ac72-76e7-4b0f-826a-53b77ac28073'; // LDO-PRIME-13726
    const packageIds = [
        '4ba67cb7-89e3-45d1-9b13-004eb0519c04', // 420780419361289717365544915658
        '2520e4ff-3c82-46cb-83e2-4b4990ae847b'  // 420780419361289717365551255921
    ];
    const targetInvoiceNumber = 'FAC-ZOKQLG';

    console.log('1. Deleting duplicate packages from LDO-PRIME-13726...');
    const { error: delPivotError } = await supabase
        .from('consolidacion_paquetes')
        .delete()
        .eq('consolidacion_id', targetConsolidationId)
        .in('paquete_id', packageIds);

    if (delPivotError) {
        console.error('Error deleting pivots:', delPivotError);
    } else {
        console.log('Successfully deleted duplicate package links.');
    }

    console.log('\n2. Recalculating weight for LDO-PRIME-13726...');
    const { data: remainingPivots, error: fetchError } = await supabase
        .from('consolidacion_paquetes')
        .select('paquetes(peso_lbs)')
        .eq('consolidacion_id', targetConsolidationId);

    if (fetchError) {
        console.error('Error fetching remaining packages:', fetchError);
    } else {
        const totalWeight = remainingPivots.reduce((acc, row) => acc + (Number(row.paquetes?.peso_lbs) || 0), 0);
        console.log(`New weight: ${totalWeight} lbs`);

        const { error: updateWeightError } = await supabase
            .from('consolidaciones')
            .update({ peso_total_lbs: totalWeight })
            .eq('id', targetConsolidationId);

        if (updateWeightError) {
            console.error('Error updating weight:', updateWeightError);
        } else {
            console.log('Weight updated successfully.');
        }
    }

    console.log(`\n3. Deleting duplicate invoice ${targetInvoiceNumber}...`);
    // Delete conceptos first due to foreign keys
    const { data: invoice, error: fetchInvoiceError } = await supabase
        .from('facturas')
        .select('id')
        .eq('numero', targetInvoiceNumber)
        .single();

    if (fetchInvoiceError || !invoice) {
        console.error('Error finding invoice:', fetchInvoiceError);
    } else {
        console.log(`Deleting concepts for invoice ${invoice.id}...`);
        const { error: delConceptError } = await supabase
            .from('conceptos_factura')
            .delete()
            .eq('factura_id', invoice.id);

        if (delConceptError) {
            console.error('Error deleting concepts:', delConceptError);
        } else {
            console.log('Concepts deleted.');
            console.log(`Deleting invoice ${invoice.id}...`);
            const { error: delInvoiceError } = await supabase
                .from('facturas')
                .delete()
                .eq('id', invoice.id);

            if (delInvoiceError) {
                console.error('Error deleting invoice:', delInvoiceError);
            } else {
                console.log('Invoice deleted successfully.');
            }
        }
    }
}

main();
