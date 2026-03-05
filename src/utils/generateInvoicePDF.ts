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
    cliente_manual_nombre?: string;
    cliente_manual_nit?: string;
    clientes?: { nombre: string; apellido: string; locker_id?: string; nit?: string; direccion_entrega?: string; email?: string; telefono?: string };
}

// Convert image url to base64 for jsPDF
const getBase64ImageFromUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error("No canvas context"));
            }
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

export const downloadInvoicePDF = async (factura: FacturaDatos) => {
    try {
        // Fetch invoice concepts (line items)
        const [conceptosRes, configRes, pagosRes] = await Promise.all([
            supabase.from('conceptos_factura').select('*').eq('factura_id', factura.id).order('created_at', { ascending: true }),
            supabase.from('configuracion_empresa').select('*').limit(1).single(),
            supabase.from('pagos').select('monto, estado').eq('factura_id', factura.id).eq('estado', 'verificado')
        ]);

        if (conceptosRes.error) throw conceptosRes.error;
        const conceptos = conceptosRes.data || [];
        const config = configRes.data || {
            nombre_empresa: 'YOUBOXGT',
            direccion: '13 AVENIDA 4-60 ZONA 3 LOCAL 106 PLAZA MONTERREY\nQuetzaltenango, Quezaltenango, 09001',
            telefono: '56466611',
            email: 'info@youboxgt.com',
            sitio_web: 'youboxgt.com',
            logo_url: ''
        };

        const totalPagado = (pagosRes.data || []).reduce((acc, p) => acc + Number(p.monto), 0);
        let montoTotalNeto = Number(factura.monto_total);
        const saldoPendiente = Math.max(0, montoTotalNeto - totalPagado);

        // Initialize PDF document
        const doc = new jsPDF();
        
        let logoData = null;
        if (config.logo_url) {
            try {
                logoData = await getBase64ImageFromUrl(config.logo_url);
            } catch (e) {
                console.warn("Could not load logo as base64 due to CORS or image error. Will fallback to text.", e);
            }
        }

        // --- Header Section ---
        let currentY = 20;

        // Logo (Left)
        if (logoData) {
            // Trying to maintain aspect ratio implicitly by setting w and h bounds
            doc.addImage(logoData, 'PNG', 14, currentY, 40, 40, '', 'FAST');
        } else {
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
            doc.text(config.nombre_empresa, 14, currentY + 15);
        }

        // Company Details (Right aligned)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(config.nombre_empresa, 196, currentY, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate-600
        const dirLines = doc.splitTextToSize(config.direccion, 100);
        doc.text(dirLines, 196, currentY + 5, { align: 'right' });
        
        let contactY = currentY + 5 + (dirLines.length * 4);
        doc.text(`${config.email}`, 196, contactY, { align: 'right' });
        doc.text(`${config.sitio_web}`, 196, contactY + 4, { align: 'right' });
        doc.text(`${config.telefono}`, 196, contactY + 8, { align: 'right' });

        currentY = Math.max(65, contactY + 20); // Move below logo/address

        // Invoice Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(`INVOICE ${factura.numero}`, 196, currentY - 5, { align: 'right' });

        // Horizontal Line
        doc.setDrawColor(148, 163, 184); // Slate-400
        doc.setLineWidth(0.5);
        doc.line(14, currentY + 2, 196, currentY + 2);
        
        currentY += 12;

        // --- Client Info & Invoice Details Section ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text('Facturada a:', 14, currentY);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        
        const clientName = factura.clientes ? `${factura.clientes.nombre} ${factura.clientes.apellido}` : (factura.cliente_manual_nombre || 'Consumidor Final');
        const clientEmail = factura.clientes?.email ? factura.clientes.email : '';
        const clientPhone = factura.clientes?.telefono ? factura.clientes.telefono : '';
        let clientAddress = factura.clientes?.direccion_entrega ? factura.clientes.direccion_entrega : '';
        let clientNit = factura.clientes ? (factura.clientes.nit || 'C/F') : (factura.cliente_manual_nit || 'C/F');

        const clientLines = doc.splitTextToSize(clientName, 80);
        doc.text(clientLines, 45, currentY);
        
        let clientDetailsY = currentY + (clientLines.length * 4);
        doc.setFont('helvetica', 'normal');
        if (clientEmail) { doc.text(clientEmail, 45, clientDetailsY); clientDetailsY += 4; }
        if (clientAddress) { 
            const addressLines = doc.splitTextToSize(clientAddress, 80);
            doc.text(addressLines, 45, clientDetailsY); 
            clientDetailsY += (addressLines.length * 4); 
        }
        if (clientPhone) { doc.text(clientPhone, 45, clientDetailsY); clientDetailsY += 4; }
        doc.text(`NIT: ${clientNit}`, 45, clientDetailsY);

        // Right side details
        doc.setFont('helvetica', 'normal');
        doc.text('Factura No:', 150, currentY, { align: 'right' });
        doc.text('Fecha:', 150, currentY + 5, { align: 'right' });
        doc.text('Estado:', 150, currentY + 10, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.text(factura.numero, 196, currentY, { align: 'right' });
        doc.text(format(new Date(factura.fecha_emision), 'MM/dd/yyyy', { locale: es }), 196, currentY + 5, { align: 'right' });
        
        const estadoPrint = factura.estado === 'verificado' ? 'PAGADA' : factura.estado.toUpperCase();
        doc.text(estadoPrint, 196, currentY + 10, { align: 'right' });

        currentY = Math.max(clientDetailsY + 10, currentY + 25);

        // --- Table Section ---
        const tableData = (conceptos || []).map((c) => [
            c.descripcion,
            'Lb', // Assuming units requested in example
            c.cantidad,
            `Q ${c.precio_unitario.toFixed(2)}`,
            `Q ${c.subtotal.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Descripción', 'Unidad', 'Cantidad', 'Tarifa', 'Monto']],
            body: tableData,
            theme: 'plain',
            headStyles: { fillColor: [0, 89, 161], textColor: 255, fontStyle: 'bold', halign: 'center' }, // Primary Blue
            styles: { fontSize: 10, cellPadding: {top: 2, right: 3, bottom: 2, left: 3}, textColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 70, halign: 'left' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 30, halign: 'right' },
                4: { halign: 'right' },
            },
            didDrawPage: (data) => {
                // Background color for header
                if (data.pageNumber === 1 && data.cursor) {
                  // doc.setFillColor(0, 89, 161);
                  // Left intentional empty as autotable fillcolor handles it
                }
            }
        });

        // --- Totals Section ---
        let finalY = (doc as any).lastAutoTable.finalY + 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal', 150, finalY);
        doc.text(`Q ${montoTotalNeto.toFixed(2)}`, 196, finalY, { align: 'right' });
        
        finalY += 5;
        doc.text('Total', 150, finalY);
        doc.text(`Q ${montoTotalNeto.toFixed(2)}`, 196, finalY, { align: 'right' });

        finalY += 5;
        doc.text('Pagado', 150, finalY);
        doc.text(`Q ${totalPagado.toFixed(2)}`, 196, finalY, { align: 'right' });

        finalY += 7;
        
        // Orange prominent rectangle for Saldo Pendiente
        doc.setFillColor(184, 115, 12); // Ocre/Orange color similar to sample
        doc.rect(100, finalY - 5, 96, 10, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('Saldo Pendiente', 150, finalY + 1.5, { align: 'right' });
        doc.text(`Q ${saldoPendiente.toFixed(2)}`, 194, finalY + 1.5, { align: 'right' });

        finalY += 20;

        // --- Footer Notes ---
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text('Comentarios', 14, finalY);
        
        finalY += 15;
        doc.text('Términos y Condiciones', 14, finalY);

        // Generate and save
        doc.save(`${factura.numero}.pdf`);

    } catch (e: any) {
        console.error("Error generating PDF:", e);
        alert("Ocurrió un error al tratar de generar el PDF de la factura.");
    }
};
