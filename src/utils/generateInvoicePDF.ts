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

        const doc = new jsPDF();
        
        let logoData = null;
        if (config.logo_url) {
            try {
                if (config.logo_url.includes('youboxgt.online/wp-content')) {
                    logoData = YOUBOX_LOGO_BASE64;
                } else {
                    logoData = await getBase64ImageFromUrl(config.logo_url);
                }
            } catch (e) {
                console.warn("Could not load logo as base64. Falling back to local Base64.", e);
                logoData = YOUBOX_LOGO_BASE64;
            }
        } else {
            logoData = YOUBOX_LOGO_BASE64;
        }

        const W = doc.internal.pageSize.getWidth();
        
        // --- Document Constants & Colors ---
        const colorPrimary: [number, number, number] = [30, 64, 175]; // Blue 800
        const colorDark: [number, number, number] = [15, 23, 42]; // Slate 900
        const colorText: [number, number, number] = [71, 85, 105]; // Slate 600
        const colorLight: [number, number, number] = [241, 245, 249]; // Slate 100
        const colorWarning: [number, number, number] = [234, 88, 12]; // Orange 600
        const colorSuccess: [number, number, number] = [16, 185, 129]; // Emerald 500

        let currentY = 15;

        // --- BACKGROUND BAND HEADER ---
        doc.setFillColor(colorLight[0], colorLight[1], colorLight[2]);
        doc.rect(0, 0, W, 45, 'F');
        
        // --- LOGO ---
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 8, 45, 30, '', 'FAST');
        } else {
            doc.setFontSize(26);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colorPrimary);
            doc.text(config.nombre_empresa, 14, 25);
        }

        // --- COMPANY INFO ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(config.nombre_empresa.toUpperCase(), W - 14, 15, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        const dirLines = doc.splitTextToSize(config.direccion, 65);
        doc.text(dirLines, W - 14, 20, { align: 'right' });
        
        let contactY = 20 + (dirLines.length * 3.5);
        doc.text(`${config.email}`, W - 14, contactY, { align: 'right' });
        doc.text(`${config.telefono}`, W - 14, contactY + 4, { align: 'right' });
        doc.text(`${config.sitio_web}`, W - 14, contactY + 8, { align: 'right' });

        currentY = 55;

        // --- INVOICE TITLE BORDER & DETAILS ---
        doc.setDrawColor(...colorPrimary);
        doc.setLineWidth(1.5);
        doc.line(14, currentY, 14, currentY + 12);
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(`INVOICE`, 18, currentY + 8);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        doc.text(`# ${factura.numero}`, 60, currentY + 8);

        // --- INVOICE META BLOCK (RIGHT ALIGNED) ---
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(W - 74, currentY, 60, 16, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('DATE', W - 70, currentY + 5);
        doc.text('STATUS', W - 40, currentY + 5);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(format(new Date(factura.fecha_emision), 'MM/dd/yyyy', { locale: es }), W - 70, currentY + 11);
        
        const estadoPrint = factura.estado === 'verificado' ? 'PAGADA' : factura.estado.toUpperCase();
        if (factura.estado === 'verificado' || factura.estado === 'pagada') {
            doc.setTextColor(...colorSuccess);
        } else {
            doc.setTextColor(...colorWarning);
        }
        doc.text(estadoPrint, W - 40, currentY + 11);

        currentY += 25;

        // --- BILL TO SECTION ---
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorPrimary);
        doc.text('FACTURADO A:', 14, currentY);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        
        const clientName = factura.clientes ? `${factura.clientes.nombre} ${factura.clientes.apellido}` : (factura.cliente_manual_nombre || 'Consumidor Final');
        const clientEmail = factura.clientes?.email || '';
        const clientPhone = factura.clientes?.telefono || '';
        const clientNit = factura.clientes ? (factura.clientes.nit || 'C/F') : (factura.cliente_manual_nit || 'C/F');

        doc.text(clientName, 14, currentY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colorText);
        let clientY = currentY + 10;
        doc.text(`NIT: ${clientNit}`, 14, clientY);
        if (clientEmail) { clientY += 4; doc.text(clientEmail, 14, clientY); }
        if (clientPhone) { clientY += 4; doc.text(clientPhone, 14, clientY); }

        currentY = clientY + 15;

        // --- INVOICE ITEMS TABLE ---
        // Clean up descriptions to insert spaces to allow autoTable to line-break properly
        const formatDesc = (desc: string) => desc.replace(/([0-9A-Za-z]{15,})/g, '$1 ');

        const tableData = (conceptos || []).map((c) => [
            formatDesc(c.descripcion),
            c.cantidad,
            `Q${c.precio_unitario.toFixed(2)}`,
            `Q${c.subtotal.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Descripción / Servicio', 'Cant.', 'Tarifa', 'Subtotal']],
            body: tableData,
            theme: 'grid',
            styles: { 
                fontSize: 9, 
                cellPadding: 4, 
                textColor: [30, 41, 59],
                lineColor: [226, 232, 240], // slate-200
                lineWidth: 0.1,
                overflow: 'linebreak'
            },
            headStyles: { 
                fillColor: [248, 250, 252], 
                textColor: [15, 23, 42], 
                fontStyle: 'bold', 
                halign: 'center',
                lineColor: [203, 213, 225]
            }, 
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 35, halign: 'right' },
            },
        });

        // --- TOTALS AREA ---
        let finalY = (doc as any).lastAutoTable.finalY + 8;
        
        // Draw a neat summary box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(W - 84, finalY, 70, 38, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.roundedRect(W - 84, finalY, 70, 38, 3, 3, 'S');

        let textY = finalY + 7;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        doc.text('Subtotal:', W - 45, textY, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(`Q${montoTotalNeto.toFixed(2)}`, W - 18, textY, { align: 'right' });
        
        textY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorText);
        doc.text('Pagado:', W - 45, textY, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text(`Q${totalPagado.toFixed(2)}`, W - 18, textY, { align: 'right' });

        // Divider
        textY += 4;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(W - 80, textY, W - 18, textY);
        
        textY += 7;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        if (saldoPendiente > 0) {
            doc.setTextColor(...colorWarning);
            doc.text('SALDO PENDIENTE:', W - 45, textY, { align: 'right' });
            doc.text(`Q${saldoPendiente.toFixed(2)}`, W - 18, textY, { align: 'right' });
        } else {
            doc.setTextColor(...colorSuccess);
            doc.text('SALDO PENDIENTE:', W - 45, textY, { align: 'right' });
            doc.text(`Q0.00`, W - 18, textY, { align: 'right' });
        }

        // --- FOOTER SECTION ---
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.setFillColor(...colorPrimary);
        doc.rect(0, pageHeight - 15, W, 15, 'F');
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text('Gracias por preferir a YOUBOX GT.', W / 2, pageHeight - 6, { align: 'center' });

        // Generar el archivo
        doc.save(`${factura.numero}.pdf`);

    } catch (e: any) {
        console.error("Error generating PDF:", e);
        alert("Ocurrió un error al tratar de generar el PDF de la factura.");
    }
};
