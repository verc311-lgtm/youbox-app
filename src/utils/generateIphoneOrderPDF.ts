import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { YOUBOX_LOGO_BASE64 } from './logoBase64';
import { OrdenIphone } from '../services/iphoneSalesService';

export const downloadIphoneOrderPDF = async (orden: OrdenIphone) => {
    try {
        const doc = new jsPDF({ format: 'a4', unit: 'mm' });
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();

        // Colores YouBox GT
        const colorNavy: [number, number, number] = [11, 79, 179];      // #0b4fb3
        const colorDarkNavy: [number, number, number] = [8, 43, 102];    // #082b66
        const colorOrange: [number, number, number] = [255, 90, 31];     // #ff5a1f
        const colorTextDark: [number, number, number] = [16, 32, 58];    // #10203a
        const colorMuted: [number, number, number] = [98, 112, 138];     // #62708a
        const colorGreen: [number, number, number] = [10, 164, 94];      // #0aa45e
        const colorBorder: [number, number, number] = [219, 227, 238];   // #dbe3ee

        // --- Decoración superior ---
        // Banda azul superior
        doc.setFillColor(...colorNavy);
        doc.rect(0, 0, W, 4, 'F');
        // Esquina naranja superior derecha
        doc.setFillColor(...colorOrange);
        doc.triangle(W, 0, W, 38, W - 42, 0, 'F');

        // --- Encabezado ---
        // Logo
        if (YOUBOX_LOGO_BASE64) {
            doc.addImage(YOUBOX_LOGO_BASE64, 'PNG', 12, 8, 38, 28, '', 'FAST');
        }

        // Datos de la empresa
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...colorDarkNavy);
        doc.text('YOUBOX GT', 54, 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colorMuted);
        doc.text('13 AVENIDA 4-60 ZONA 3 LOCAL 106 PLAZA MONTERREY', 54, 20);
        doc.text('Quetzaltenango, Guatemala, 09001', 54, 24);
        doc.text('WhatsApp: 56466611  •  Email: info@youboxgt.com', 54, 28);
        doc.text('Web: youboxgt.com', 54, 32);

        // --- Badge de Orden a la derecha ---
        const isPreorden = orden.tipo_orden === 'pre_orden';
        const boxX = W - 78;
        const boxY = 12;
        const boxW = 66;
        const boxH = 26;

        // Tarjeta azul con número de orden
        doc.setFillColor(...colorDarkNavy);
        doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text('COMPROBANTE DE ORDEN', boxX + boxW / 2, boxY + 7, { align: 'center' });

        doc.setFontSize(13);
        doc.text(orden.numero_orden, boxX + boxW / 2, boxY + 14, { align: 'center' });

        // Badge de modalidad (Pre-orden 100% vs Orden 50%)
        if (isPreorden) {
            doc.setFillColor(...colorOrange);
            doc.roundedRect(boxX + 4, boxY + 18, boxW - 8, 5.5, 1.5, 1.5, 'F');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text('PRE-ORDEN (100% ANTICIPO)', boxX + boxW / 2, boxY + 22, { align: 'center' });
        } else {
            doc.setFillColor(37, 99, 235); // Blue 600
            doc.roundedRect(boxX + 4, boxY + 18, boxW - 8, 5.5, 1.5, 1.5, 'F');
            doc.setFontSize(7.5);
            doc.setTextColor(255, 255, 255);
            doc.text('ORDEN (50% ANTICIPO)', boxX + boxW / 2, boxY + 22, { align: 'center' });
        }

        // --- Datos generales (Cliente y Fecha) ---
        let currentY = 44;

        // Tarjeta Datos Cliente
        doc.setDrawColor(...colorBorder);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(12, currentY, 110, 26, 2.5, 2.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...colorNavy);
        doc.text('DATOS DEL CLIENTE', 16, currentY + 5.5);

        doc.setFontSize(10);
        doc.setTextColor(...colorTextDark);
        doc.text(orden.cliente_nombre || 'Cliente Final', 16, currentY + 11.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colorMuted);
        const contactInfo = [
            orden.locker_id ? `Casillero: ${orden.locker_id}` : null,
            orden.cliente_telefono ? `Tel: ${orden.cliente_telefono}` : null,
            orden.cliente_email ? `Email: ${orden.cliente_email}` : null
        ].filter(Boolean).join('  •  ');
        doc.text(contactInfo || 'Sin información adicional de contacto', 16, currentY + 17);
        doc.text('Gestión para importación directa', 16, currentY + 22);

        // Tarjeta Fecha y Estado
        doc.roundedRect(128, currentY, W - 140, 26, 2.5, 2.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...colorNavy);
        doc.text('FECHA Y ESTADO', 132, currentY + 5.5);

        doc.setFontSize(9);
        doc.setTextColor(...colorTextDark);
        const fechaFormateada = orden.created_at
            ? format(new Date(orden.created_at), "dd 'de' MMMM, yyyy", { locale: es })
            : format(new Date(), "dd 'de' MMMM, yyyy", { locale: es });
        doc.text(fechaFormateada, 132, currentY + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...colorMuted);
        const estadoLabels: Record<string, string> = {
            pendiente_compra: 'Pendiente de Compra',
            comprado: 'Comprado en USA',
            en_transito: 'En Tránsito a Guatemala',
            en_bodega: 'Listo en Bodega',
            entregado: 'Entregado al Cliente',
            cancelado: 'Orden Cancelada'
        };
        doc.text(`Estado actual: ${estadoLabels[orden.estado] || orden.estado}`, 132, currentY + 17);
        if (orden.metodo_pago) {
            doc.text(`Pago: ${orden.metodo_pago.toUpperCase()}${orden.referencia_pago ? ` (${orden.referencia_pago})` : ''}`, 132, currentY + 22);
        }

        // --- Especificaciones del iPhone ---
        currentY = 75;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...colorDarkNavy);
        doc.text('DETALLES DEL DISPOSITIVO SOLICITADO', 12, currentY);

        currentY += 3;
        autoTable(doc, {
            startY: currentY,
            margin: { left: 12, right: 12 },
            head: [['PRODUCTO / MODELO', 'CAPACIDAD', 'COLOR', 'CONDICIÓN', 'SERIE / IMEI']],
            body: [[
                orden.modelo,
                orden.capacidad,
                orden.color || 'No especificado',
                orden.estado_equipo ? orden.estado_equipo.toUpperCase() : 'NUEVO',
                orden.imei_serie || 'Asignado al comprar'
            ]],
            theme: 'grid',
            headStyles: {
                fillColor: colorDarkNavy,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
                cellPadding: 3
            },
            bodyStyles: {
                textColor: colorTextDark,
                fontSize: 8.5,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: 4
            },
            styles: {
                lineColor: colorBorder,
                lineWidth: 0.2
            }
        });

        // --- Desglose Financiero ---
        currentY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...colorDarkNavy);
        doc.text('DESGLOSE FINANCIERO Y ANTICIPO', 12, currentY);

        currentY += 3;

        const formatoQ = (val: number) => `Q ${Number(val || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const porcentajeAnticipo = isPreorden ? '100%' : '50%';
        const anticipoDesc = isPreorden
            ? 'Anticipo Requerido / Pagado (100% Pre-orden)'
            : 'Anticipo Requerido / Pagado (50% Orden)';

        autoTable(doc, {
            startY: currentY,
            margin: { left: 12, right: 12 },
            head: [['CONCEPTO', 'MODALIDAD', 'MONTO EN QUETZALES']],
            body: [
                ['Precio Total del Equipo Apple iPhone', 'Valor Total', formatoQ(orden.precio_total)],
                [anticipoDesc, `Anticipo ${porcentajeAnticipo}`, formatoQ(orden.anticipo_pagado)],
                ['Saldo Pendiente por Liquidar (Contra Entrega)', isPreorden ? 'Completado' : 'Contra Entrega', formatoQ(orden.saldo_pendiente)]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: colorNavy,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 95, fontSize: 8.5 },
                1: { cellWidth: 45, halign: 'center', fontSize: 8 },
                2: { halign: 'right', fontStyle: 'bold', fontSize: 9 }
            },
            styles: {
                lineColor: colorBorder,
                lineWidth: 0.2,
                cellPadding: 3.5
            }
        });

        // --- Resumen de saldos destacado ---
        currentY = (doc as any).lastAutoTable.finalY + 6;
        const totalBoxW = 75;
        const totalBoxX = W - 12 - totalBoxW;

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(...colorBorder);
        doc.roundedRect(totalBoxX, currentY, totalBoxW, 24, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...colorMuted);
        doc.text('TOTAL DE LA COMPRA:', totalBoxX + 4, currentY + 6);
        doc.setTextColor(...colorTextDark);
        doc.text(formatoQ(orden.precio_total), totalBoxX + totalBoxW - 4, currentY + 6, { align: 'right' });

        doc.setTextColor(...colorGreen);
        doc.text('ANTICIPO PAGADO:', totalBoxX + 4, currentY + 12);
        doc.text(formatoQ(orden.anticipo_pagado), totalBoxX + totalBoxW - 4, currentY + 12, { align: 'right' });

        doc.setFillColor(254, 242, 242);
        doc.rect(totalBoxX + 1, currentY + 15, totalBoxW - 2, 8, 'F');
        doc.setTextColor(orden.saldo_pendiente > 0 ? colorOrange[0] : colorGreen[0], orden.saldo_pendiente > 0 ? colorOrange[1] : colorGreen[1], orden.saldo_pendiente > 0 ? colorOrange[2] : colorGreen[2]);
        doc.setFontSize(9);
        doc.text('SALDO PENDIENTE:', totalBoxX + 4, currentY + 20.5);
        doc.text(formatoQ(orden.saldo_pendiente), totalBoxX + totalBoxW - 4, currentY + 20.5, { align: 'right' });

        // --- Notas y Condiciones de Compra ---
        const notesBoxW = totalBoxX - 16;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...colorBorder);
        doc.roundedRect(12, currentY, notesBoxW, 36, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...colorDarkNavy);
        doc.text('POLÍTICAS DE PRE-ORDEN Y COMPRA iPHONE:', 16, currentY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...colorMuted);
        doc.text('1. PRE-ORDEN: Requiere el pago del 100% por adelantado para asegurar precio y disponibilidad en USA.', 16, currentY + 10.5);
        doc.text('2. ORDEN REGULAR: Requiere el 50% de anticipo. El 50% restante se cancela contra entrega en Guatemala.', 16, currentY + 15);
        doc.text('3. TIEMPO ESTIMADO: 5 a 10 días hábiles a partir de la confirmación de compra y arribo a casillero USA.', 16, currentY + 19.5);
        doc.text('4. GARANTÍA: Todos los equipos son verificados físicamente y cuentan con garantía de funcionamiento.', 16, currentY + 24);

        if (orden.notas) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colorTextDark);
            doc.text(`Observaciones: ${orden.notas.substring(0, 70)}`, 16, currentY + 30);
        }

        // --- Footer ---
        doc.setDrawColor(...colorBorder);
        doc.line(12, H - 18, W - 12, H - 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...colorMuted);
        doc.text('YouBox GT — Soluciones Logísticas, Courier y Compras Internacionales en Guatemala', 12, H - 13);
        doc.text(`Comprobante generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, W - 12, H - 13, { align: 'right' });

        doc.setFontSize(6.5);
        doc.text('Este documento sirve como comprobante formal de orden y anticipo para compra de equipo iPhone.', 12, H - 9);

        // Descargar el archivo
        doc.save(`Orden_${orden.numero_orden}_${orden.modelo.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error('Error generando comprobante PDF de iPhone:', error);
        throw error;
    }
};
