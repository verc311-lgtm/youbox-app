import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { YOUBOX_LOGO_BASE64 } from './logoBase64';
import { OrdenIphone } from '../services/iphoneSalesService';

export interface IphoneReportOptions {
    filterDescription?: string;
}

export const generateIphoneReportPDF = async (
    orders: OrdenIphone[],
    options: IphoneReportOptions = {}
) => {
    if (!orders || orders.length === 0) {
        throw new Error('No hay órdenes para exportar');
    }

    const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' });
    const W = doc.internal.pageSize.getWidth();   // 297 mm
    const H = doc.internal.pageSize.getHeight();  // 210 mm

    // Colores YouBox GT
    const colorNavy: [number, number, number] = [11, 79, 179];      // #0b4fb3
    const colorDarkNavy: [number, number, number] = [8, 43, 102];    // #082b66
    const colorOrange: [number, number, number] = [255, 90, 31];     // #ff5a1f
    const colorTextDark: [number, number, number] = [16, 32, 58];    // #10203a
    const colorMuted: [number, number, number] = [98, 112, 138];     // #62708a
    const colorGreen: [number, number, number] = [10, 164, 94];      // #0aa45e
    const colorBorder: [number, number, number] = [219, 227, 238];   // #dbe3ee

    // --- Decoración Superior ---
    doc.setFillColor(...colorNavy);
    doc.rect(0, 0, W, 3.5, 'F');
    doc.setFillColor(...colorOrange);
    doc.triangle(W, 0, W, 28, W - 32, 0, 'F');

    // --- Encabezado ---
    // Logo
    if (YOUBOX_LOGO_BASE64) {
        try {
            doc.addImage(YOUBOX_LOGO_BASE64, 'PNG', 10, 7, 34, 25, '', 'FAST');
        } catch (e) {
            console.error('Error cargando logo en PDF:', e);
        }
    }

    // Título y datos de la empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...colorDarkNavy);
    doc.text('YOUBOX GT', 48, 14);

    doc.setFontSize(10);
    doc.setTextColor(...colorNavy);
    doc.text('REPORTE GENERAL DE VENTAS Y PRE-ÓRDENES DE iPHONE', 48, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorMuted);
    doc.text('Control consolidado de pedidos internacionales, compras en USA y estado de anticipos', 48, 25);
    if (options.filterDescription) {
        doc.text(`Filtros aplicados: ${options.filterDescription}`, 48, 30);
    }

    // Tarjeta derecha: Metadatos de Emisión
    const metaCardW = 68;
    const metaCardX = W - 10 - metaCardW;
    const metaCardY = 7;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...colorBorder);
    doc.roundedRect(metaCardX, metaCardY, metaCardW, 25, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...colorNavy);
    doc.text('INFORMACIÓN DEL REPORTE', metaCardX + 4, metaCardY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colorTextDark);
    doc.text(`Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, metaCardX + 4, metaCardY + 11);
    doc.text(`Total Registros: ${orders.length} órdenes`, metaCardX + 4, metaCardY + 16);

    const pendientesCount = orders.filter(o => o.estado === 'pendiente_compra').length;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colorOrange);
    doc.text(`Pendientes compra: ${pendientesCount} equipos`, metaCardX + 4, metaCardY + 21);

    // --- Métricas KPI Resumen ---
    const totalPrecio = orders.reduce((sum, o) => sum + Number(o.precio_total || 0), 0);
    const totalAnticipo = orders.reduce((sum, o) => sum + Number(o.anticipo_pagado || 0), 0);
    const totalSaldo = orders.reduce((sum, o) => sum + Number(o.saldo_pendiente || 0), 0);

    const formatoQ = (val: number) => `Q ${Number(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const kpiY = 35;
    const kpiH = 17;
    const kpiGap = 4;
    const totalKpiW = W - 20;
    const kpiW = (totalKpiW - (kpiGap * 3)) / 4;

    const kpis = [
        { label: 'TOTAL ÓRDENES', val: `${orders.length}`, sub: 'Registradas', color: colorTextDark, bg: [248, 250, 252] as [number, number, number] },
        { label: 'PENDIENTES COMPRA', val: `${pendientesCount}`, sub: 'Listos para comprar', color: colorOrange, bg: [255, 251, 235] as [number, number, number] },
        { label: 'TOTAL ANTICIPOS', val: formatoQ(totalAnticipo), sub: 'Fondos recaudados', color: colorGreen, bg: [240, 253, 244] as [number, number, number] },
        { label: 'SALDOS POR COBRAR', val: formatoQ(totalSaldo), sub: 'Contra entrega', color: colorNavy, bg: [239, 246, 255] as [number, number, number] },
    ];

    kpis.forEach((k, i) => {
        const kX = 10 + i * (kpiW + kpiGap);
        doc.setFillColor(...k.bg);
        doc.setDrawColor(...colorBorder);
        doc.roundedRect(kX, kpiY, kpiW, kpiH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...colorMuted);
        doc.text(k.label, kX + 3.5, kpiY + 4.5);

        doc.setFontSize(8.5);
        doc.setTextColor(...k.color);
        doc.text(k.val, kX + 3.5, kpiY + 10.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(...colorMuted);
        doc.text(k.sub, kX + 3.5, kpiY + 14.5);
    });

    // --- Tabla de Órdenes ---
    const estadoLabels: Record<string, string> = {
        pendiente_compra: 'Pendiente Compra',
        comprado: 'Comprado USA',
        en_transito: 'En Tránsito',
        en_bodega: 'En Bodega',
        entregado: 'Entregado',
        cancelado: 'Cancelado'
    };

    const tableBody = orders.map((o, idx) => {
        const fecha = o.created_at ? format(new Date(o.created_at), 'dd/MM/yy HH:mm') : '-';
        const clienteDesc = `${o.cliente_nombre || 'Cliente'}${o.cliente_telefono ? `\nTel: ${o.cliente_telefono}` : ''}`;
        const dispDesc = `${o.modelo} (${o.capacidad})${o.color ? `\nColor: ${o.color}` : ''}`;
        const modDesc = o.tipo_orden === 'pre_orden' ? 'Pre-Orden (100%)' : 'Orden (50%)';

        return [
            (idx + 1).toString(),
            o.numero_orden,
            fecha,
            clienteDesc,
            o.locker_id || 'S/C',
            dispDesc,
            modDesc,
            formatoQ(o.precio_total),
            formatoQ(o.anticipo_pagado),
            formatoQ(o.saldo_pendiente),
            estadoLabels[o.estado] || o.estado
        ];
    });

    autoTable(doc, {
        startY: 56,
        margin: { left: 10, right: 10, bottom: 14 },
        head: [['#', 'NO. ORDEN', 'FECHA', 'CLIENTE', 'CASILLERO', 'DISPOSITIVO SOLICITADO', 'MODALIDAD', 'TOTAL', 'ANTICIPO', 'SALDO PEND.', 'ESTADO']],
        body: tableBody,
        foot: [[
            '',
            'TOTALES',
            `${orders.length} órdenes`,
            '',
            '',
            '',
            '',
            formatoQ(totalPrecio),
            formatoQ(totalAnticipo),
            formatoQ(totalSaldo),
            ''
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: colorDarkNavy,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6.8,
            halign: 'center',
            cellPadding: 2.2
        },
        bodyStyles: {
            textColor: colorTextDark,
            fontSize: 6.5,
            cellPadding: 2.2,
            valign: 'middle'
        },
        footStyles: {
            fillColor: [226, 232, 240], // Slate 200
            textColor: colorDarkNavy,
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2.5
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 26, fontStyle: 'bold' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 44 },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 48 },
            6: { cellWidth: 26, halign: 'center' },
            7: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
            8: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: colorGreen },
            9: { cellWidth: 23, halign: 'right', fontStyle: 'bold', textColor: colorOrange },
            10: { cellWidth: 25, halign: 'center' }
        },
        styles: {
            lineColor: colorBorder,
            lineWidth: 0.18
        },
        didDrawPage: (data) => {
            // Pie de página en cada hoja
            const pageNumber = (doc as any).internal.getNumberOfPages();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(...colorMuted);
            doc.setDrawColor(...colorBorder);
            doc.line(10, H - 8, W - 10, H - 8);

            doc.text('YouBox GT — Soluciones Logísticas y Courier  •  Reporte de Ventas de iPhone', 10, H - 4.5);
            doc.text(`Página ${data.pageNumber} de ${pageNumber}`, W - 10, H - 4.5, { align: 'right' });
        }
    });

    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    doc.save(`Reporte_Ventas_iPhone_${dateStr}.pdf`);
};
