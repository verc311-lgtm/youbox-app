import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { OrdenIphone } from '../services/iphoneSalesService';

export const exportIphoneOrdersExcel = (orders: OrdenIphone[], filterDescription?: string) => {
    if (!orders || orders.length === 0) {
        throw new Error('No hay órdenes para exportar');
    }

    const estadoLabels: Record<string, string> = {
        pendiente_compra: 'Pendiente de Compra',
        comprado: 'Comprado en USA',
        en_transito: 'En Tránsito a Guatemala',
        en_bodega: 'En Bodega YouBox',
        entregado: 'Entregado al Cliente',
        cancelado: 'Cancelado'
    };

    // =========================================================================
    // HOJA 1: ASIGNACIÓN DE COMPRAS (CELDA POR CELDA / TELÉFONO POR TELÉFONO)
    // =========================================================================
    // Genera una fila limpia por cada equipo individual para asignar directamente
    // quién lo va a comprar, tienda en USA, número de pedido y su seguimiento.
    let itemCounter = 1;
    const assignmentRows: any[] = [];

    orders.forEach((o) => {
        const items = (Array.isArray(o.items) && o.items.length > 0)
            ? o.items
            : [{
                modelo: o.modelo,
                capacidad: o.capacidad,
                color: o.color,
                estado_equipo: o.estado_equipo,
                precio_unitario: o.precio_total,
                imei_serie: o.imei_serie,
                tracking_proveedor: o.tracking_proveedor,
                comprador_asignado: o.comprador_asignado
            }];

        const totalEquiposEnOrden = items.length;

        items.forEach((item, itemIdx) => {
            const precioUnit = item.precio_unitario && item.precio_unitario > 0
                ? Number(item.precio_unitario)
                : (totalEquiposEnOrden > 1
                    ? Number((Number(o.precio_total || 0) / totalEquiposEnOrden).toFixed(2))
                    : Number(o.precio_total || 0));

            const anticipoUnit = totalEquiposEnOrden > 1
                ? Number((Number(o.anticipo_pagado || 0) / totalEquiposEnOrden).toFixed(2))
                : Number(o.anticipo_pagado || 0);

            const saldoUnit = Math.max(0, precioUnit - anticipoUnit);
            const comprador = item.comprador_asignado || o.comprador_asignado || '';

            assignmentRows.push({
                'No.': itemCounter++,
                'No. Orden': o.numero_orden,
                'Equipo #': totalEquiposEnOrden > 1 ? `${itemIdx + 1} de ${totalEquiposEnOrden}` : '1 de 1',
                'Fecha Orden': o.created_at ? format(new Date(o.created_at), 'dd/MM/yyyy HH:mm') : '',
                'Modalidad': o.tipo_orden === 'pre_orden' ? 'Pre-Orden (100% Anticipo)' : 'Orden Regular (50% Anticipo)',
                'Cliente': o.cliente_nombre || 'Cliente Final',
                'Casillero': o.locker_id || 'S/C',
                'Teléfono': o.cliente_telefono || '',
                
                // ESPECIFICACIONES CELDA POR CELDA
                'Modelo iPhone': item.modelo,
                'Capacidad': item.capacidad,
                'Color': item.color || 'No especificado',
                'Condición': (item.estado_equipo || 'NUEVO').toUpperCase(),
                
                // ASIGNACIÓN DE COMPRA
                'Comprador Asignado': comprador || 'Por Asignar',
                'Estado de Compra': estadoLabels[o.estado] || o.estado,
                'Tienda / Proveedor USA': '', // Celda lista para completar: Apple Store, Amazon, BestBuy, Swappa, etc.
                'No. Pedido / Tracking USA': item.tracking_proveedor || o.tracking_proveedor || '',
                'IMEI / No. Serie': item.imei_serie || o.imei_serie || '',
                
                // MONTOS MONETARIOS NUMÉRICOS
                'Precio Estimado (Q)': precioUnit,
                'Anticipo Pagado (Q)': anticipoUnit,
                'Saldo Pendiente (Q)': saldoUnit,
                'Método Pago': (o.metodo_pago || '').toUpperCase(),
                'Ref. Pago': o.referencia_pago || '',
                'Notas / Observaciones': o.notas || ''
            });
        });
    });

    // Fila de totales para Hoja 1
    const totalPrecioItems = assignmentRows.reduce((sum, r) => sum + (Number(r['Precio Estimado (Q)']) || 0), 0);
    const totalAnticipoItems = assignmentRows.reduce((sum, r) => sum + (Number(r['Anticipo Pagado (Q)']) || 0), 0);
    const totalSaldoItems = assignmentRows.reduce((sum, r) => sum + (Number(r['Saldo Pendiente (Q)']) || 0), 0);

    const totalsAssignmentRow = {
        'No.': '',
        'No. Orden': 'TOTALES',
        'Equipo #': `${assignmentRows.length} equipos`,
        'Fecha Orden': `${orders.length} órdenes`,
        'Modalidad': '',
        'Cliente': '',
        'Casillero': '',
        'Teléfono': '',
        'Modelo iPhone': '',
        'Capacidad': '',
        'Color': '',
        'Condición': '',
        'Comprador Asignado': '',
        'Estado de Compra': '',
        'Tienda / Proveedor USA': '',
        'No. Pedido / Tracking USA': '',
        'IMEI / No. Serie': '',
        'Precio Estimado (Q)': Number(totalPrecioItems.toFixed(2)),
        'Anticipo Pagado (Q)': Number(totalAnticipoItems.toFixed(2)),
        'Saldo Pendiente (Q)': Number(totalSaldoItems.toFixed(2)),
        'Método Pago': '',
        'Ref. Pago': '',
        'Notas / Observaciones': filterDescription ? `Filtro: ${filterDescription}` : ''
    };

    const worksheet1 = XLSX.utils.json_to_sheet([...assignmentRows, totalsAssignmentRow]);

    // Ancho de columnas optimizado para lectura y llenado cómodo
    worksheet1['!cols'] = [
        { wch: 6 },   // No.
        { wch: 16 },  // No. Orden
        { wch: 12 },  // Equipo #
        { wch: 18 },  // Fecha Orden
        { wch: 25 },  // Modalidad
        { wch: 28 },  // Cliente
        { wch: 12 },  // Casillero
        { wch: 15 },  // Teléfono
        { wch: 22 },  // Modelo iPhone
        { wch: 12 },  // Capacidad
        { wch: 14 },  // Color
        { wch: 16 },  // Condición
        { wch: 24 },  // Comprador Asignado
        { wch: 22 },  // Estado de Compra
        { wch: 24 },  // Tienda / Proveedor USA
        { wch: 26 },  // No. Pedido / Tracking USA
        { wch: 20 },  // IMEI / No. Serie
        { wch: 18 },  // Precio Estimado (Q)
        { wch: 18 },  // Anticipo Pagado (Q)
        { wch: 18 },  // Saldo Pendiente (Q)
        { wch: 16 },  // Método Pago
        { wch: 18 },  // Ref. Pago
        { wch: 30 }   // Notas / Observaciones
    ];

    // Activar autofiltro para permitir filtros interactivos por Comprador, Estado, etc.
    const lastRowIndex1 = assignmentRows.length + 1;
    worksheet1['!autofilter'] = { ref: `A1:W${lastRowIndex1}` };

    // =========================================================================
    // HOJA 2: RESUMEN POR ÓRDENES
    // =========================================================================
    const orderRows = orders.map((o, index) => {
        const cant = o.cantidad_equipos || (o.items ? o.items.length : 1);
        const modeloSummary = Array.isArray(o.items) && o.items.length > 1
            ? o.items.map((it, idx) => `#${idx + 1}: ${it.modelo} ${it.capacidad} (${it.color || 'S/C'})`).join(', ')
            : `${o.modelo} ${o.capacidad} (${o.color || 'S/C'})`;

        return {
            '#': index + 1,
            'No. Orden': o.numero_orden,
            'Fecha': o.created_at ? format(new Date(o.created_at), 'dd/MM/yyyy HH:mm') : '',
            'Modalidad': o.tipo_orden === 'pre_orden' ? 'Pre-Orden (100% Anticipo)' : 'Orden Regular (50% Anticipo)',
            'Cliente': o.cliente_nombre || 'Cliente Final',
            'Casillero': o.locker_id || 'S/C',
            'Cant. Equipos': cant,
            'Teléfono': o.cliente_telefono || '',
            'Email': o.cliente_email || '',
            'Resumen Equipos': modeloSummary,
            'Comprador Asignado': o.comprador_asignado || 'Por Asignar',
            'Estado': estadoLabels[o.estado] || o.estado,
            'Precio Total (Q)': Number(o.precio_total || 0),
            'Anticipo Pagado (Q)': Number(o.anticipo_pagado || 0),
            'Saldo Pendiente (Q)': Number(o.saldo_pendiente || 0),
            'Método Pago': (o.metodo_pago || '').toUpperCase(),
            'Ref. Pago': o.referencia_pago || '',
            'Tracking USA': o.tracking_proveedor || '',
            'IMEI / Serie': o.imei_serie || '',
            'Observaciones': o.notas || ''
        };
    });

    const totalOrdersPrecio = orders.reduce((sum, o) => sum + Number(o.precio_total || 0), 0);
    const totalOrdersAnticipo = orders.reduce((sum, o) => sum + Number(o.anticipo_pagado || 0), 0);
    const totalOrdersSaldo = orders.reduce((sum, o) => sum + Number(o.saldo_pendiente || 0), 0);

    const totalsOrderRow = {
        '#': '',
        'No. Orden': 'TOTALES',
        'Fecha': `${orders.length} órdenes`,
        'Modalidad': '',
        'Cliente': '',
        'Casillero': '',
        'Cant. Equipos': assignmentRows.length,
        'Teléfono': '',
        'Email': '',
        'Resumen Equipos': '',
        'Comprador Asignado': '',
        'Estado': '',
        'Precio Total (Q)': Number(totalOrdersPrecio.toFixed(2)),
        'Anticipo Pagado (Q)': Number(totalOrdersAnticipo.toFixed(2)),
        'Saldo Pendiente (Q)': Number(totalOrdersSaldo.toFixed(2)),
        'Método Pago': '',
        'Ref. Pago': '',
        'Tracking USA': '',
        'IMEI / Serie': '',
        'Observaciones': filterDescription ? `Filtro: ${filterDescription}` : ''
    };

    const worksheet2 = XLSX.utils.json_to_sheet([...orderRows, totalsOrderRow]);

    worksheet2['!cols'] = [
        { wch: 6 },   // #
        { wch: 16 },  // No. Orden
        { wch: 18 },  // Fecha
        { wch: 25 },  // Modalidad
        { wch: 28 },  // Cliente
        { wch: 12 },  // Casillero
        { wch: 14 },  // Cant. Equipos
        { wch: 15 },  // Teléfono
        { wch: 24 },  // Email
        { wch: 35 },  // Resumen Equipos
        { wch: 24 },  // Comprador Asignado
        { wch: 22 },  // Estado
        { wch: 16 },  // Precio Total
        { wch: 16 },  // Anticipo Pagado
        { wch: 16 },  // Saldo Pendiente
        { wch: 16 },  // Método Pago
        { wch: 18 },  // Ref. Pago
        { wch: 22 },  // Tracking USA
        { wch: 20 },  // IMEI / Serie
        { wch: 30 }   // Observaciones
    ];

    const lastRowIndex2 = orderRows.length + 1;
    worksheet2['!autofilter'] = { ref: `A1:T${lastRowIndex2}` };

    // =========================================================================
    // CREAR LIBRO Y GUARDAR
    // =========================================================================
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet1, 'Asignación de Compras');
    XLSX.utils.book_append_sheet(workbook, worksheet2, 'Resumen por Órdenes');

    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    const fileName = `Asignacion_Compras_iPhone_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
