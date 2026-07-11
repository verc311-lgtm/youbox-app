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
            direccion: '13 AVENIDA 4-60 ZONA 3 LOCAL 106 PLAZA MONTERREY\nQuetzaltenango, Quetzaltenango, 09001',
            telefono: '56466611',
            email: 'info@youboxgt.com',
            sitio_web: 'youboxgt.com',
            logo_url: ''
        };

        const totalPagado = (pagosRes.data || []).reduce((acc, p) => acc + Number(p.monto), 0);
        let montoTotalNeto = Number(factura.monto_total);
        const saldoPendiente = Math.max(0, montoTotalNeto - totalPagado);

        const doc = new jsPDF({ format: 'a4', unit: 'mm' });
        
        let logoData = YOUBOX_LOGO_BASE64;
        if (config.logo_url && !config.logo_url.includes('youboxgt.online/wp-content')) {
            try {
                logoData = await getBase64ImageFromUrl(config.logo_url);
            } catch (e) {
                logoData = YOUBOX_LOGO_BASE64;
            }
        }

        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        
        // --- Colors from SVG ---
        const colorNavy: [number, number, number] = [11, 79, 179]; // #0b4fb3 (Base of gradient)
        const colorDarkNavy: [number, number, number] = [8, 43, 102]; // #082b66
        const colorOrange: [number, number, number] = [255, 90, 31]; // #ff5a1f
        const colorTextDark: [number, number, number] = [16, 32, 58]; // #10203a
        const colorLabel: [number, number, number] = [22, 79, 165]; // #164fa5
        const colorMuted: [number, number, number] = [98, 112, 138]; // #62708a
        const colorGreen: [number, number, number] = [10, 164, 94]; // #0aa45e
        const colorBorder: [number, number, number] = [219, 227, 238]; // #dbe3ee
        
        // --- Top Decorations ---
        // Top navy band
        doc.setFillColor(...colorNavy);
        doc.rect(0, 0, W, 4, 'F');
        // Top right orange corner (approximate curve with triangle)
        doc.setFillColor(...colorOrange);
        doc.triangle(W, 0, W, 40, W - 45, 0, 'F');

        // --- Header ---
        // Logo
        if (logoData) {
            doc.addImage(logoData, 'PNG', 12, 8, 42, 32, '', 'FAST');
        }
        
        // Vertical divider
        doc.setDrawColor(...colorBorder);
        doc.setLineWidth(0.5);
        doc.line(58, 10, 58, 40);

        // Company Details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...colorTextDark);
        doc.text('YOUBOXGT', 63, 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('13 AVENIDA 4-60 ZONA 3 LOCAL 106 PLAZA MONTERREY', 63, 21);
        doc.text('Quetzaltenango, Quetzaltenango, 09001', 63, 25);
        doc.text('✉  info@youboxgt.com', 63, 31);
        doc.text('☎  56466611   •   youboxgt.com', 63, 35);

        // Factura Box
        doc.setFillColor(...colorNavy);
        doc.roundedRect(W - 65, 12, 53, 28, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('FACTURA', W - 38.5, 22, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`N° ${factura.numero}`, W - 38.5, 28, { align: 'center' });

        // Status Badge
        const esPagada = factura.estado === 'verificado' || factura.estado === 'pagada';
        const estadoPrint = esPagada ? '✓ PAGADA' : factura.estado.toUpperCase();
        doc.setFillColor(esPagada ? 217 : 255, esPagada ? 248 : 237, esPagada ? 232 : 213); 
        doc.roundedRect(W - 52, 33, 27, 7, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(esPagada ? colorGreen[0] : 234, esPagada ? colorGreen[1] : 88, esPagada ? colorGreen[2] : 12);
        doc.text(estadoPrint, W - 38.5, 37.8, { align: 'center' });

        // --- Client Info Box ---
        const clientY = 48;
        doc.setDrawColor(...colorBorder);
        doc.setFillColor(251, 252, 254); // #fbfcfe
        doc.roundedRect(12, clientY, W - 24, 25, 3, 3, 'FD');

        // Blue dot
        doc.setFillColor(237, 243, 255); // #edf3ff
        doc.circle(20, clientY + 12.5, 5, 'F');
        doc.setTextColor(...colorLabel);
        doc.setFontSize(10);
        doc.text('●', 20, clientY + 13.5, { align: 'center' });

        // Bill to details
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURAR A:', 28, clientY + 8);

        const clientName = factura.clientes ? `${factura.clientes.nombre} ${factura.clientes.apellido}` : (factura.cliente_manual_nombre || 'Consumidor Final');
        const clientNit = factura.clientes ? (factura.clientes.nit || 'C/F') : (factura.cliente_manual_nit || 'C/F');

        doc.setFontSize(11);
        doc.setTextColor(...colorTextDark);
        doc.text(clientName, 28, clientY + 14.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`NIT: ${clientNit}`, 28, clientY + 20);

        // Divider
        doc.setLineWidth(0.5);
        doc.line(110, clientY + 4, 110, clientY + 21);

        // Date
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...colorLabel);
        doc.text('FECHA DE EMISIÓN:', 116, clientY + 8);
        doc.setFontSize(11);
        doc.setTextColor(...colorTextDark);
        doc.text(format(new Date(factura.fecha_emision), 'dd MMMM, yyyy', { locale: es }), 116, clientY + 15);

        // --- Table ---
        const formatDesc = (desc: string) => {
            let res = desc.replace(' — ', '\n');
            res = res.replace('Detalle: ', '\nDetalle: ');
            res = res.replace(/→/g, '->'); // Fix font bug
            return res;
        };

        const tableData = (conceptos || []).map((c) => [
            formatDesc(c.descripcion),
            c.cantidad,
            `Q ${c.precio_unitario.toFixed(2)}`,
            `Q ${c.subtotal.toFixed(2)}`
        ]);

        let startY = 78;
        autoTable(doc, {
            startY,
            head: [['DESCRIPCIÓN / SERVICIO', 'CANT.', 'PRECIO UNIT.', 'SUBTOTAL']],
            body: tableData,
            theme: 'plain',
            styles: { 
                fontSize: 9, 
                cellPadding: 5, 
                textColor: colorTextDark,
                font: 'helvetica'
            },
            headStyles: { 
                fillColor: colorDarkNavy, 
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                lineWidth: { bottom: 0 },
            },
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },
                1: { cellWidth: 22, halign: 'center' },
                2: { cellWidth: 35, halign: 'center' },
                3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
            },
            margin: { left: 12, right: 12 },
            tableLineColor: colorBorder,
            tableLineWidth: 0.5,
            willDrawCell: (data) => {
                // Table header text overrides
                if (data.section === 'head' && data.column.index === 0) {
                    data.cell.styles.halign = 'left';
                }
            },
            didDrawCell: (data) => {
                // Vertical lines only inside the table
                if (data.section === 'body' && data.column.index > 0) {
                    doc.setDrawColor(...colorBorder);
                    doc.setLineWidth(0.3);
                    doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                }
                // Wrap border around the table body
                if (data.section === 'body' && data.column.index === 0) {
                    doc.setDrawColor(...colorBorder);
                    doc.setLineWidth(0.5);
                    doc.line(12, data.cell.y, 12, data.cell.y + data.cell.height); // Left
                }
                if (data.section === 'body' && data.column.index === 3) {
                    doc.setDrawColor(...colorBorder);
                    doc.setLineWidth(0.5);
                    doc.line(W - 12, data.cell.y, W - 12, data.cell.y + data.cell.height); // Right
                }
            },
            didDrawPage: (data) => {
                // Bottom border for the table
                doc.setDrawColor(...colorBorder);
                doc.setLineWidth(0.5);
                doc.line(12, data.cursor!.y, W - 12, data.cursor!.y);
            }
        });

        // --- Totals and Observations ---
        let finalY = (doc as any).lastAutoTable.finalY + 10;

        // Observations Box (Left)
        doc.setFillColor(245, 248, 253); // #f5f8fd
        doc.setDrawColor(255,255,255); // no border basically
        doc.roundedRect(12, finalY, 85, 32, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...colorLabel);
        doc.text('OBSERVACIONES', 18, finalY + 8);
        doc.setFillColor(...colorOrange);
        doc.circle(19, finalY + 15.5, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colorTextDark);
        doc.text('Gracias por confiar en YOUBOX GT.', 23, finalY + 16.5);

        // Summary Box (Right)
        doc.setFillColor(251, 252, 254);
        doc.setDrawColor(...colorBorder);
        doc.setLineWidth(0.5);
        doc.roundedRect(100, finalY, W - 112, 32, 3, 3, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colorTextDark);
        doc.text('SUBTOTAL', 108, finalY + 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Q ${montoTotalNeto.toFixed(2)}`, W - 18, finalY + 8, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('PAGADO', 108, finalY + 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...colorGreen);
        doc.text(`Q ${totalPagado.toFixed(2)}`, W - 18, finalY + 15, { align: 'right' });

        doc.setDrawColor(207, 216, 230); // #cfd8e6
        doc.setLineWidth(0.3);
        doc.line(108, finalY + 20, W - 18, finalY + 20);

        doc.setFontSize(10);
        doc.setTextColor(...colorTextDark);
        doc.text('TOTAL A PAGAR', 108, finalY + 26);
        doc.setFontSize(14);
        const finalColor = saldoPendiente > 0 ? [234, 88, 12] : colorGreen;
        doc.setTextColor(finalColor[0], finalColor[1], finalColor[2]); // Orange if pending, green if 0
        doc.text(`Q ${saldoPendiente.toFixed(2)}`, W - 18, finalY + 26, { align: 'right' });

        // --- Footer Services ---
        const footerY = H - 35;
        doc.setDrawColor(...colorBorder);
        doc.setLineWidth(0.5);
        doc.line(12, footerY, W - 12, footerY);

        const cols = [
            { t: 'ENVÍOS', s: 'USA & MÉXICO' },
            { t: 'COMPRAS POR TI', s: 'Servicio asistido' },
            { t: 'CASILLERO', s: 'En USA' },
            { t: 'SEGURO', s: 'Opcional' },
            { t: 'PAGO', s: 'Transferencia' },
        ];
        
        const colW = (W - 24) / cols.length;
        cols.forEach((col, i) => {
            const cx = 12 + (colW * i) + (colW / 2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...colorTextDark);
            doc.text(col.t, cx, footerY + 8, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...colorMuted);
            doc.text(col.s, cx, footerY + 12, { align: 'center' });
        });

        // --- Bottom Navy Band ---
        doc.setFillColor(...colorNavy);
        doc.rect(0, H - 15, W, 15, 'F');
        // Bottom Right Orange Corner
        doc.setFillColor(...colorOrange);
        doc.triangle(W - 25, H, W, H - 15, W, H, 'F');

        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('¡Gracias por preferir a YOUBOX GT!', W / 2, H - 8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('TU MUNDO, SIN FRONTERAS', W / 2, H - 3.5, { align: 'center' });

        doc.save(`Factura_${factura.numero}.pdf`);

    } catch (e: any) {
        console.error("Error generating PDF:", e);
        alert("Ocurrió un error al tratar de generar el PDF de la factura.");
    }
};
