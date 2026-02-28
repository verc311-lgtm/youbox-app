import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

interface FacturaDatos {
    id: string;
    numero: string;
    monto_total: number;
    moneda: string;
    estado: string;
    fecha_emision: string;
    clientes?: { nombre: string; apellido: string; locker_id?: string; nit?: string; direccion_entrega?: string };
}

export const downloadInvoicePDF = async (factura: FacturaDatos) => {
    try {
        // Fetch invoice concepts (line items)
        const { data: conceptos, error } = await supabase
            .from('conceptos_factura')
            .select('*')
            .eq('factura_id', factura.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Initialize PDF document
        const doc = new jsPDF();
        
        // --- Header Section ---
        // Logo Placeholder or Text
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // Blue-600
        doc.text('YOUBOX GT', 14, 22);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text('Logística y Casilleros Internacionales', 14, 28);
        doc.text('PBX: +502 0000-0000', 14, 33);
        doc.text('hola@youbox.gt', 14, 38);

        // Invoice Info (Top Right)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text('FACTURA', 150, 22);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`No. de Recibo: ${factura.numero}`, 150, 28);
        doc.text(`Fecha: ${format(new Date(factura.fecha_emision), 'dd MMM yyyy', { locale: es })}`, 150, 33);
        
        const estadoPrint = factura.estado === 'verificado' ? 'PAGADA' : factura.estado.toUpperCase();
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(factura.estado === 'verificado' ? 22 : 217, factura.estado === 'verificado' ? 163 : 119, factura.estado === 'verificado' ? 74 : 6); 
        doc.text(`Estado: ${estadoPrint}`, 150, 38);

        // Horizontal Line
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.5);
        doc.line(14, 45, 196, 45);

        // --- Client Info Section ---
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Facturar a:', 14, 55);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text(`Cliente: ${factura?.clientes?.nombre || ''} ${factura?.clientes?.apellido || ''}`, 14, 62);
        doc.text(`Casillero: ${factura?.clientes?.locker_id || 'N/A'}`, 14, 67);
        doc.text(`NIT: ${factura?.clientes?.nit || 'C/F'}`, 14, 72);
        
        if (factura.clientes?.direccion_entrega) {
            doc.text(`Dirección: ${factura.clientes.direccion_entrega}`, 14, 77);
        }

        // --- Table Section ---
        const tableData = (conceptos || []).map((c, index) => [
            index + 1,
            c.descripcion,
            c.cantidad,
            `${factura.moneda} ${c.precio_unitario.toFixed(2)}`,
            `${factura.moneda} ${c.subtotal.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 85,
            head: [['#', 'Descripción / Cargo', 'Cant.', 'Precio Unitario', 'Subtotal']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' }, // index
                1: { cellWidth: 80 }, // desc
                2: { cellWidth: 20, halign: 'center' }, // qty
                3: { cellWidth: 35, halign: 'right' }, // price
                4: { cellWidth: 35, halign: 'right' }, // total
            }
        });

        // --- Total Section ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Total a Pagar:', 130, finalY);
        
        doc.setFontSize(14);
        doc.text(`${factura.moneda} ${factura.monto_total.toFixed(2)}`, 160, finalY);

        // --- Footer Section ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text('Gracias por su preferencia.', 105, 280, { align: 'center' });
        doc.text('Este documento es un comprobante de servicio de envío internacional.', 105, 285, { align: 'center' });

        // Generate and save
        doc.save(`${factura.numero}.pdf`);

    } catch (e: any) {
        console.error("Error generating PDF:", e);
        alert("Ocurrió un error al tratar de generar el PDF de la factura.");
    }
};
