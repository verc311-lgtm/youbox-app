import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { YOUBOX_LOGO_BASE64 } from './logoBase64';

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

        const doc = new jsPDF({ format: 'a4', unit: 'mm' });
        
        let logoData = null;
        if (config.logo_url) {
            try {
                if (config.logo_url.includes('youboxgt.online/wp-content')) {
                    logoData = YOUBOX_LOGO_BASE64;
                } else {
                    logoData = await getBase64ImageFromUrl(config.logo_url);
                }
            } catch (e) {
                logoData = YOUBOX_LOGO_BASE64;
            }
        } else {
            logoData = YOUBOX_LOGO_BASE64;
        }

        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        
        // --- Document Constants & Colors ---
        const colorPrimary: [number, number, number] = [37, 99, 235]; // Blue 600
        const colorDark: [number, number, number] = [15, 23, 42]; // Slate 900
        const colorText: [number, number, number] = [71, 85, 105]; // Slate 600
        const colorLight: [number, number, number] = [248, 250, 252]; // Slate 50
        const colorWarning: [number, number, number] = [234, 88, 12]; // Orange 600
        const colorSuccess: [number, number, number] = [16, 185, 129]; // Emerald 500

        // Background Accent
        doc.setFillColor(...colorLight);
        doc.rect(0, 0, W, 50, 'F');
        doc.setFillColor(...colorPrimary);
        doc.rect(0, 0, W, 4, 'F');

        let currentY = 15;
        
        // --- LOGO ---
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 10, 45, 30, '', 'FAST');
        } else {
            doc.setFontSize(26);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colorPrimary);
            doc.text(config.nombre_empresa, 14, 25);
        }

        // --- COMPANY INFO ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(config.nombre_empresa.toUpperCase(), W - 14, 18, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        const dirLines = doc.splitTextToSize(config.direccion, 65);
        doc.text(dirLines, W - 14, 23, { align: 'right' });
        
        let contactY = 23 + (dirLines.length * 4);
        doc.text(`Email: ${config.email}`, W - 14, contactY, { align: 'right' });
        doc.text(`Tel: ${config.telefono}`, W - 14, contactY + 4, { align: 'right' });
        doc.text(`Web: ${config.sitio_web}`, W - 14, contactY + 8, { align: 'right' });

        currentY = 65;

        // --- INVOICE TITLE & STATUS ---
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(`FACTURA`, 14, currentY);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        doc.text(`Nº ${factura.numero}`, 15, currentY + 7);

        // Status Badge
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const estadoPrint = factura.estado === 'verificado' || factura.estado === 'pagada' ? 'PAGADA' : factura.estado.toUpperCase();
        if (factura.estado === 'verificado' || factura.estado === 'pagada') {
            doc.setFillColor(209, 250, 229); // green-100
            doc.setTextColor(...colorSuccess);
        } else {
            doc.setFillColor(255, 237, 213); // orange-100
            doc.setTextColor(...colorWarning);
        }
        doc.roundedRect(W - 40, currentY - 8, 26, 8, 1, 1, 'F');
        doc.text(estadoPrint, W - 27, currentY - 2.5, { align: 'center' });

        currentY += 20;

        // --- BILL TO / DATE SECTION ---
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, currentY - 5, W - 14, currentY - 5);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorText);
        doc.text('FACTURAR A:', 14, currentY);
        doc.text('FECHA DE EMISIÓN:', W - 14, currentY, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        
        const clientName = factura.clientes ? `${factura.clientes.nombre} ${factura.clientes.apellido}` : (factura.cliente_manual_nombre || 'Consumidor Final');
        const clientEmail = factura.clientes?.email || '';
        const clientPhone = factura.clientes?.telefono || '';
        const clientNit = factura.clientes ? (factura.clientes.nit || 'C/F') : (factura.cliente_manual_nit || 'C/F');

        doc.text(clientName, 14, currentY + 6);
        doc.text(format(new Date(factura.fecha_emision), 'dd MMMM, yyyy', { locale: es }), W - 14, currentY + 6, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colorText);
        let clientY = currentY + 11;
        doc.text(`NIT: ${clientNit}`, 14, clientY);
        if (clientEmail) { clientY += 5; doc.text(clientEmail, 14, clientY); }
        if (clientPhone) { clientY += 5; doc.text(clientPhone, 14, clientY); }

        currentY = clientY + 15;

        // --- INVOICE ITEMS TABLE ---
        // Clean up tracking string to allow wrapping in jsPDF without character spacing bugs
        // Replacing ' — ' with a newline makes it look much cleaner too.
        const formatDesc = (desc: string) => {
            let res = desc.replace(' — ', '\n');
            res = res.replace('Detalle: ', '\nDetalle: ');
            // Replace right arrow and other non-ASCII chars that break jsPDF kerning
            res = res.replace(/→/g, '->');
            return res;
        };

        const tableData = (conceptos || []).map((c) => [
            formatDesc(c.descripcion),
            c.cantidad,
            `Q ${c.precio_unitario.toFixed(2)}`,
            `Q ${c.subtotal.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Descripción / Servicio', 'Cant.', 'Precio Unit.', 'Subtotal']],
            body: tableData,
            theme: 'plain',
            styles: { 
                fontSize: 9, 
                cellPadding: 5, 
                textColor: [71, 85, 105],
                overflow: 'linebreak'
            },
            headStyles: { 
                fillColor: [248, 250, 252], 
                textColor: [15, 23, 42], 
                fontStyle: 'bold',
                lineWidth: { bottom: 0.5 },
                lineColor: [226, 232, 240]
            }, 
            bodyStyles: {
                lineWidth: { bottom: 0.1 },
                lineColor: [241, 245, 249]
            },
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
            },
        });

        // --- TOTALS AREA ---
        let finalY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(W - 85, finalY, 71, 42, 2, 2, 'F');

        let textY = finalY + 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        doc.text('Subtotal', W - 45, textY, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(`Q ${montoTotalNeto.toFixed(2)}`, W - 18, textY, { align: 'right' });
        
        textY += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        doc.text('Pagado', W - 45, textY, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorSuccess);
        doc.text(`Q ${totalPagado.toFixed(2)}`, W - 18, textY, { align: 'right' });

        // Divider
        textY += 6;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(W - 80, textY, W - 18, textY);
        
        textY += 9;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text('Total a Pagar', W - 45, textY, { align: 'right' });
        
        if (saldoPendiente > 0) {
            doc.setTextColor(...colorWarning);
            doc.text(`Q ${saldoPendiente.toFixed(2)}`, W - 18, textY, { align: 'right' });
        } else {
            doc.setTextColor(...colorSuccess);
            doc.text(`Q 0.00`, W - 18, textY, { align: 'right' });
        }

        // --- FOOTER SECTION ---
        doc.setFillColor(...colorPrimary);
        doc.rect(0, H - 20, W, 20, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Gracias por preferir a YOUBOX GT.', W / 2, H - 11, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Generado electrónicamente por el sistema YOUBOX GT', W / 2, H - 6, { align: 'center' });

        // Generar el archivo
        doc.save(`Factura_${factura.numero}.pdf`);

    } catch (e: any) {
        console.error("Error generating PDF:", e);
        alert("Ocurrió un error al tratar de generar el PDF de la factura.");
    }
};
