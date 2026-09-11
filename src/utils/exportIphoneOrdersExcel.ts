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

    const rows = orders.map((o, index) => {
        const hasMultiple = Array.isArray(o.items) && o.items.length > 1;
        const cant = o.cantidad_equipos || (o.items ? o.items.length : 1);
        const modeloDesc = hasMultiple
            ? o.items!.map((it, idx) => `Item ${idx + 1}: ${it.modelo} (${it.capacidad}, ${it.color || 'S/C'})`).join(' | ')
            : o.modelo;
        const capacidadDesc = hasMultiple
            ? o.items!.map(it => it.capacidad).join(' | ')
            : o.capacidad;
        const colorDesc = hasMultiple
            ? o.items!.map(it => it.color || 'No especificado').join(' | ')
            : (o.color || 'No especificado');
        const condicionDesc = hasMultiple
            ? o.items!.map(it => (it.estado_equipo || 'NUEVO').toUpperCase()).join(' | ')
            : (o.estado_equipo ? o.estado_equipo.toUpperCase() : 'NUEVO');

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
            'Modelo': modeloDesc,
            'Capacidad': capacidadDesc,
            'Color': colorDesc,
            'Condición': condicionDesc,
            'Serie / IMEI': o.imei_serie || 'Pendiente',
            'Tracking Proveedor': o.tracking_proveedor || 'Pendiente',
            'Precio Total (Q)': Number(o.precio_total || 0),
            'Anticipo Pagado (Q)': Number(o.anticipo_pagado || 0),
            'Saldo Pendiente (Q)': Number(o.saldo_pendiente || 0),
            'Método Pago': (o.metodo_pago || '').toUpperCase(),
            'Ref. Pago': o.referencia_pago || '',
            'Estado': estadoLabels[o.estado] || o.estado,
            'Observaciones': o.notas || ''
        };
    });

    // Fila de totales
    const totalPrecio = orders.reduce((sum, o) => sum + Number(o.precio_total || 0), 0);
    const totalAnticipo = orders.reduce((sum, o) => sum + Number(o.anticipo_pagado || 0), 0);
    const totalSaldo = orders.reduce((sum, o) => sum + Number(o.saldo_pendiente || 0), 0);

    const totalsRow = {
        '#': '',
        'No. Orden': 'TOTALES',
        'Fecha': `${orders.length} órdenes`,
        'Modalidad': '',
        'Cliente': '',
        'Casillero': '',
        'Teléfono': '',
        'Email': '',
        'Modelo': '',
        'Capacidad': '',
        'Color': '',
        'Condición': '',
        'Serie / IMEI': '',
        'Tracking Proveedor': '',
        'Precio Total (Q)': totalPrecio,
        'Anticipo Pagado (Q)': totalAnticipo,
        'Saldo Pendiente (Q)': totalSaldo,
        'Método Pago': '',
        'Ref. Pago': '',
        'Estado': '',
        'Observaciones': filterDescription ? `Filtro: ${filterDescription}` : ''
    };

    const worksheet = XLSX.utils.json_to_sheet([...rows, totalsRow]);

    // Ancho de columnas optimizado
    worksheet['!cols'] = [
        { wch: 5 },   // #
        { wch: 16 },  // No. Orden
        { wch: 18 },  // Fecha
        { wch: 26 },  // Modalidad
        { wch: 28 },  // Cliente
        { wch: 12 },  // Casillero
        { wch: 14 },  // Teléfono
        { wch: 22 },  // Email
        { wch: 20 },  // Modelo
        { wch: 12 },  // Capacidad
        { wch: 14 },  // Color
        { wch: 14 },  // Condición
        { wch: 18 },  // IMEI
        { wch: 22 },  // Tracking
        { wch: 16 },  // Precio Total
        { wch: 16 },  // Anticipo Pagado
        { wch: 16 },  // Saldo Pendiente
        { wch: 16 },  // Método Pago
        { wch: 18 },  // Ref. Pago
        { wch: 22 },  // Estado
        { wch: 32 }   // Observaciones
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas iPhone');

    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    const fileName = `Reporte_Ventas_iPhone_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
