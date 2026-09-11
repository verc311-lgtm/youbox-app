import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Smartphone, Plus, Search, Filter, FileDown, Loader2,
    CheckCircle2, Clock, Truck, Package, XCircle, DollarSign,
    User, Phone, Mail, Hash, AlertCircle, ShoppingCart, RefreshCw,
    ChevronDown, Trash2, Edit3, ShieldAlert, FileSpreadsheet, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
    iphoneSalesService, OrdenIphone, TipoOrden, EstadoOrden, ItemIphone
} from '../services/iphoneSalesService';
import { downloadIphoneOrderPDF } from '../utils/generateIphoneOrderPDF';
import { exportIphoneOrdersExcel } from '../utils/exportIphoneOrdersExcel';
import { generateIphoneReportPDF } from '../utils/generateIphoneReportPDF';

const IPHONE_MODELS = [
    'iPhone Pro 18',
    'iPhone Pro Max 18',
    'iPhone Duo'
];

const CAPACITIES = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB'];

const COLORS = [
    'Glacier',
    'Burgundy',
    'Silver',
    'Black',
    'Star White',
    'Night Sky'
];

export interface TelefonoFormItem {
    id: string;
    modelo: string;
    otro_modelo: string;
    capacidad: string;
    color: string;
    otro_color: string;
    estado_equipo: string;
    precio_unitario: string;
}

export const defaultTelefonoItem = (): TelefonoFormItem => ({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'item-' + Math.random().toString(36).slice(2, 9),
    modelo: 'iPhone Pro 18',
    otro_modelo: '',
    capacidad: '256 GB',
    color: 'Glacier',
    otro_color: '',
    estado_equipo: 'nuevo',
    precio_unitario: ''
});

export function IphoneSales() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<OrdenIphone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLocalMode, setIsLocalMode] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | TipoOrden>('all');
    const [filterState, setFilterState] = useState<'all' | EstadoOrden>('all');

    // Modal Nueva Orden
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal Cambiar Estado / Detalles
    const [selectedOrder, setSelectedOrder] = useState<OrdenIphone | null>(null);
    const [newStatus, setNewStatus] = useState<EstadoOrden>('pendiente_compra');
    const [newImei, setNewImei] = useState('');
    const [newTracking, setNewTracking] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Búsqueda de clientes existentes
    const [clientSearch, setClientSearch] = useState('');
    const [searchingClients, setSearchingClients] = useState(false);
    const [clientResults, setClientResults] = useState<any[]>([]);
    const [selectedExistingClient, setSelectedExistingClient] = useState<any | null>(null);
    const [manualClient, setManualClient] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    // Estados de exportación de reportes
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Formulario de Nueva Orden
    const [formData, setFormData] = useState({
        tipo_orden: 'pre_orden' as TipoOrden,
        cliente_nombre: '',
        cliente_telefono: '',
        cliente_email: '',
        locker_id: '',
        telefonos: [defaultTelefonoItem()] as TelefonoFormItem[],
        precio_total: '',
        anticipo_pagado: '',
        metodo_pago: 'transferencia',
        referencia_pago: '',
        notas: ''
    });

    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        setLoading(true);
        try {
            const { orders: loaded, isLocal } = await iphoneSalesService.getOrders();
            setOrders(loaded);
            setIsLocalMode(isLocal);
        } catch (e) {
            console.error('Error cargando órdenes:', e);
            toast.error('Error al cargar órdenes de iPhone');
        } finally {
            setLoading(false);
        }
    }

    // Manejo de múltiples teléfonos en el formulario
    const handleAddTelefono = () => {
        setFormData(prev => ({
            ...prev,
            telefonos: [...prev.telefonos, defaultTelefonoItem()]
        }));
    };

    const handleRemoveTelefono = (index: number) => {
        setFormData(prev => {
            if (prev.telefonos.length <= 1) return prev;
            const newTels = prev.telefonos.filter((_, i) => i !== index);

            // Si se ingresaron precios unitarios, recalcular totales automáticamente
            let newTotal = prev.precio_total;
            let newAnticipo = prev.anticipo_pagado;
            const hasUnitPrices = newTels.some(t => parseFloat(t.precio_unitario) > 0);
            if (hasUnitPrices) {
                const sum = newTels.reduce((acc, t) => acc + (parseFloat(t.precio_unitario) || 0), 0);
                newTotal = sum > 0 ? sum.toFixed(2) : '';
                if (sum > 0) {
                    newAnticipo = prev.tipo_orden === 'pre_orden' ? sum.toFixed(2) : (sum * 0.5).toFixed(2);
                } else {
                    newAnticipo = '';
                }
            }

            return {
                ...prev,
                telefonos: newTels,
                precio_total: newTotal,
                anticipo_pagado: newAnticipo
            };
        });
    };

    const handleUpdateTelefono = (index: number, field: keyof TelefonoFormItem, value: string) => {
        setFormData(prev => {
            const updated = prev.telefonos.map((item, i) => {
                if (i !== index) return item;
                return { ...item, [field]: value };
            });

            let newTotal = prev.precio_total;
            let newAnticipo = prev.anticipo_pagado;

            // Recalcular precio total si se edita precio unitario
            if (field === 'precio_unitario') {
                const hasUnitPrices = updated.some(t => parseFloat(t.precio_unitario) > 0);
                if (hasUnitPrices) {
                    const sum = updated.reduce((acc, t) => acc + (parseFloat(t.precio_unitario) || 0), 0);
                    newTotal = sum > 0 ? sum.toFixed(2) : '';
                    if (sum > 0) {
                        newAnticipo = prev.tipo_orden === 'pre_orden' ? sum.toFixed(2) : (sum * 0.5).toFixed(2);
                    } else {
                        newAnticipo = '';
                    }
                }
            }

            return {
                ...prev,
                telefonos: updated,
                precio_total: newTotal,
                anticipo_pagado: newAnticipo
            };
        });
    };

    // Actualiza el cálculo de anticipo según tipo de orden (100% vs 50%)
    const handlePrecioChange = (val: string, tipo: TipoOrden = formData.tipo_orden) => {
        const precio = parseFloat(val) || 0;
        let anticipoCalculado = '';
        if (precio > 0) {
            if (tipo === 'pre_orden') {
                anticipoCalculado = precio.toFixed(2); // 100%
            } else {
                anticipoCalculado = (precio * 0.5).toFixed(2); // 50%
            }
        }
        setFormData(prev => ({
            ...prev,
            precio_total: val,
            anticipo_pagado: anticipoCalculado
        }));
    };

    const handleTipoOrdenChange = (nuevoTipo: TipoOrden) => {
        const precio = parseFloat(formData.precio_total) || 0;
        let anticipoCalculado = formData.anticipo_pagado;
        if (precio > 0) {
            if (nuevoTipo === 'pre_orden') {
                anticipoCalculado = precio.toFixed(2); // 100%
            } else {
                anticipoCalculado = (precio * 0.5).toFixed(2); // 50%
            }
        }
        setFormData(prev => ({
            ...prev,
            tipo_orden: nuevoTipo,
            anticipo_pagado: anticipoCalculado
        }));
    };

    // Búsqueda en tiempo real de clientes de YouBox
    const handleClientSearchChange = (val: string) => {
        setClientSearch(val);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (val.trim().length < 2) {
            setClientResults([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setSearchingClients(true);
            try {
                const query = val.trim().toLowerCase();
                const { data, error } = await supabase
                    .from('clientes')
                    .select('id, nombre, apellido, locker_id, telefono, email')
                    .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,locker_id.ilike.%${query}%,telefono.ilike.%${query}%`)
                    .limit(6);

                if (!error && data) {
                    setClientResults(data);
                }
            } catch (err) {
                console.error('Error buscando clientes:', err);
            } finally {
                setSearchingClients(false);
            }
        }, 300);
    };

    const selectExistingClient = (c: any) => {
        setSelectedExistingClient(c);
        setFormData(prev => ({
            ...prev,
            cliente_nombre: `${c.nombre || ''} ${c.apellido || ''}`.trim(),
            cliente_telefono: c.telefono || '',
            cliente_email: c.email || '',
            locker_id: c.locker_id || ''
        }));
        setClientResults([]);
        setClientSearch('');
    };

    const handleCreateOrder = async (e: React.FormEvent, descargarPdfInmediato: boolean = false) => {
        e.preventDefault();

        const nombreFinal = formData.cliente_nombre.trim();
        if (!nombreFinal) {
            toast.error('Por favor ingresa el nombre del cliente.');
            return;
        }

        const precio = parseFloat(formData.precio_total);
        if (isNaN(precio) || precio <= 0) {
            toast.error('Por favor ingresa un precio total válido.');
            return;
        }

        const anticipo = parseFloat(formData.anticipo_pagado);
        if (isNaN(anticipo) || anticipo <= 0) {
            toast.error('Por favor ingresa el monto de anticipo recibido.');
            return;
        }

        // Validación de reglas de negocio:
        // Pre-orden: 100%
        // Orden: mínimo 50%
        if (formData.tipo_orden === 'pre_orden' && anticipo < precio) {
            toast.error(`Las pre-órdenes requieren el pago del 100% anticipado (Q${precio.toFixed(2)}).`);
            return;
        }

        if (formData.tipo_orden === 'orden' && anticipo < (precio * 0.5)) {
            toast.error(`Las órdenes regulares requieren al menos el 50% de anticipo (mínimo Q${(precio * 0.5).toFixed(2)}).`);
            return;
        }

        // Validación de teléfonos
        if (!formData.telefonos || formData.telefonos.length === 0) {
            toast.error('Debes agregar al menos un iPhone al pedido.');
            return;
        }

        for (let i = 0; i < formData.telefonos.length; i++) {
            const tel = formData.telefonos[i];
            const m = tel.modelo === 'Otro' ? tel.otro_modelo.trim() : tel.modelo.trim();
            if (!m) {
                toast.error(`Por favor especifica el modelo para el iPhone #${i + 1}.`);
                return;
            }
        }

        const itemsParsed: ItemIphone[] = formData.telefonos.map(t => {
            const m = t.modelo === 'Otro' ? t.otro_modelo.trim() : t.modelo.trim();
            const c = t.color === 'Otro' ? (t.otro_color.trim() || null) : (t.color.trim() || null);
            const p = parseFloat(t.precio_unitario);
            return {
                modelo: m,
                capacidad: t.capacidad,
                color: c,
                estado_equipo: t.estado_equipo,
                precio_unitario: !isNaN(p) && p > 0 ? p : undefined
            };
        });

        // Resúmenes para compatibilidad y listados
        const modeloSummary = itemsParsed.length === 1
            ? itemsParsed[0].modelo
            : `${itemsParsed.length} iPhones: ${itemsParsed.map(i => i.modelo).join(', ')}`;

        const capacidadSummary = itemsParsed.every(i => i.capacidad === itemsParsed[0].capacidad)
            ? itemsParsed[0].capacidad
            : itemsParsed.map(i => i.capacidad).join(' / ');

        const colorSummary = itemsParsed.length === 1
            ? itemsParsed[0].color
            : (itemsParsed.every(i => i.color === itemsParsed[0].color) ? itemsParsed[0].color : 'Varios');

        const estadoSummary = itemsParsed.every(i => i.estado_equipo === itemsParsed[0].estado_equipo)
            ? itemsParsed[0].estado_equipo
            : 'varios';

        setSubmitting(true);
        try {
            const nuevaOrden = await iphoneSalesService.createOrder({
                tipo_orden: formData.tipo_orden,
                cliente_id: selectedExistingClient?.id || null,
                cliente_nombre: nombreFinal,
                cliente_telefono: formData.cliente_telefono.trim() || null,
                cliente_email: formData.cliente_email.trim() || null,
                locker_id: formData.locker_id.trim() || null,
                modelo: modeloSummary,
                capacidad: capacidadSummary,
                color: colorSummary,
                estado_equipo: estadoSummary,
                cantidad_equipos: itemsParsed.length,
                items: itemsParsed,
                precio_total: precio,
                anticipo_pagado: anticipo,
                metodo_pago: formData.metodo_pago,
                referencia_pago: formData.referencia_pago.trim() || null,
                estado: 'pendiente_compra',
                notas: formData.notas.trim() || null,
                creado_por: user?.id || null,
                sucursal_id: user?.sucursal_id || null
            });

            toast.success(`Orden ${nuevaOrden.numero_orden} registrada correctamente.`);
            setOrders(prev => [nuevaOrden, ...prev]);
            setIsModalOpen(false);

            // Reset form
            setFormData({
                tipo_orden: 'pre_orden',
                cliente_nombre: '',
                cliente_telefono: '',
                cliente_email: '',
                locker_id: '',
                telefonos: [defaultTelefonoItem()],
                precio_total: '',
                anticipo_pagado: '',
                metodo_pago: 'transferencia',
                referencia_pago: '',
                notas: ''
            });
            setSelectedExistingClient(null);

            if (descargarPdfInmediato) {
                try {
                    await downloadIphoneOrderPDF(nuevaOrden);
                    toast.success('Comprobante PDF generado');
                } catch (pdfErr) {
                    console.error('Error generando PDF:', pdfErr);
                }
            }
        } catch (err: any) {
            console.error('Error creando orden:', err);
            toast.error('Error al registrar la orden: ' + (err.message || 'Desconocido'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        setUpdatingStatus(true);
        try {
            await iphoneSalesService.updateOrderStatus(selectedOrder.id, newStatus, {
                imei_serie: newImei.trim() || selectedOrder.imei_serie,
                tracking_proveedor: newTracking.trim() || selectedOrder.tracking_proveedor,
                notas: newNotes.trim() || selectedOrder.notas
            });

            setOrders(prev => prev.map(o => {
                if (o.id === selectedOrder.id) {
                    return {
                        ...o,
                        estado: newStatus,
                        imei_serie: newImei.trim() || o.imei_serie,
                        tracking_proveedor: newTracking.trim() || o.tracking_proveedor,
                        notas: newNotes.trim() || o.notas
                    };
                }
                return o;
            }));

            toast.success('Estado de orden actualizado.');
            setSelectedOrder(null);
        } catch (err: any) {
            toast.error('Error actualizando orden: ' + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDeleteOrder = async (id: string, numero: string) => {
        if (!window.confirm(`¿Seguro que deseas eliminar la orden ${numero}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await iphoneSalesService.deleteOrder(id);
            setOrders(prev => prev.filter(o => o.id !== id));
            toast.success(`Orden ${numero} eliminada.`);
        } catch (err: any) {
            toast.error('Error al eliminar orden: ' + err.message);
        }
    };

    // Filtros calculados
    const filteredOrders = useMemo(() => {
        const query = searchTerm.toLowerCase();
        return orders.filter(o => {
            const matchesSearch =
                o.numero_orden.toLowerCase().includes(query) ||
                o.cliente_nombre.toLowerCase().includes(query) ||
                (o.locker_id && o.locker_id.toLowerCase().includes(query)) ||
                o.modelo.toLowerCase().includes(query) ||
                (o.items && o.items.some(it =>
                    it.modelo.toLowerCase().includes(query) ||
                    (it.color && it.color.toLowerCase().includes(query)) ||
                    it.capacidad.toLowerCase().includes(query)
                )) ||
                (o.cliente_telefono && o.cliente_telefono.includes(query));

            const matchesType = filterType === 'all' || o.tipo_orden === filterType;
            const matchesState = filterState === 'all' || o.estado === filterState;

            return matchesSearch && matchesType && matchesState;
        });
    }, [orders, searchTerm, filterType, filterState]);

    // Métricas
    const metrics = useMemo(() => {
        const total = orders.length;
        const totalEquipos = orders.reduce((acc, o) => acc + (o.cantidad_equipos || (o.items && o.items.length) || 1), 0);
        const pendientesCompra = orders
            .filter(o => o.estado === 'pendiente_compra')
            .reduce((acc, o) => acc + (o.cantidad_equipos || (o.items && o.items.length) || 1), 0);
        const totalAnticipos = orders.reduce((acc, o) => acc + (Number(o.anticipo_pagado) || 0), 0);
        const totalSaldosPendientes = orders.reduce((acc, o) => acc + (Number(o.saldo_pendiente) || 0), 0);

        return { total, totalEquipos, pendientesCompra, totalAnticipos, totalSaldosPendientes };
    }, [orders]);

    const getEstadoBadge = (estado: EstadoOrden) => {
        switch (estado) {
            case 'pendiente_compra':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" /> Pendiente de Compra
                    </span>
                );
            case 'comprado':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        <ShoppingCart className="w-3.5 h-3.5" /> Comprado en USA
                    </span>
                );
            case 'en_transito':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        <Truck className="w-3.5 h-3.5" /> En Tránsito
                    </span>
                );
            case 'en_bodega':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        <Package className="w-3.5 h-3.5" /> En Bodega YouBox
                    </span>
                );
            case 'entregado':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Entregado
                    </span>
                );
            case 'cancelado':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" /> Cancelado
                    </span>
                );
        }
    };

    const formatQ = (amount: number) => `Q ${Number(amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getFilterDescription = () => {
        const parts: string[] = [];
        if (filterType !== 'all') {
            parts.push(filterType === 'pre_orden' ? 'Pre-Órdenes (100% Anticipo)' : 'Órdenes (50% Anticipo)');
        }
        if (filterState !== 'all') {
            const labels: Record<string, string> = {
                pendiente_compra: 'Pendiente de Compra',
                comprado: 'Comprado en USA',
                en_transito: 'En Tránsito',
                en_bodega: 'En Bodega YouBox',
                entregado: 'Entregado al Cliente',
                cancelado: 'Cancelado'
            };
            parts.push(labels[filterState] || filterState);
        }
        if (searchTerm.trim()) {
            parts.push(`Búsqueda: "${searchTerm.trim()}"`);
        }
        return parts.length > 0 ? parts.join(' • ') : 'Todas las órdenes';
    };

    const handleExportExcel = () => {
        if (filteredOrders.length === 0) {
            toast.error('No hay órdenes para exportar con los filtros actuales.');
            return;
        }
        setExportingExcel(true);
        try {
            exportIphoneOrdersExcel(filteredOrders, getFilterDescription());
            toast.success(`Reporte Excel generado (${filteredOrders.length} órdenes)`);
        } catch (err: any) {
            console.error('Error exportando reporte Excel:', err);
            toast.error('Error al generar Excel: ' + (err.message || 'Desconocido'));
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        if (filteredOrders.length === 0) {
            toast.error('No hay órdenes para exportar con los filtros actuales.');
            return;
        }
        setExportingPdf(true);
        try {
            await generateIphoneReportPDF(filteredOrders, {
                filterDescription: getFilterDescription()
            });
            toast.success(`Reporte PDF generado (${filteredOrders.length} órdenes)`);
        } catch (err: any) {
            console.error('Error exportando reporte PDF:', err);
            toast.error('Error al generar PDF: ' + (err.message || 'Desconocido'));
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-md shadow-blue-500/20">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                Venta y Pre-Orden de iPhone
                            </h1>
                            <p className="text-sm font-medium text-slate-500 mt-0.5">
                                Gestión de solicitudes, compras en USA y control de anticipos (Pre-orden 100% / Orden 50%)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                    {/* Botón Descargar PDF */}
                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf || loading || filteredOrders.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-red-600 hover:border-red-300 shadow-sm transition-all disabled:opacity-50"
                        title="Descargar reporte general de ventas en PDF"
                    >
                        <FileText className={`w-4 h-4 text-red-600 ${exportingPdf ? 'animate-bounce' : ''}`} />
                        <span>Reporte PDF</span>
                    </button>

                    {/* Botón Descargar Excel */}
                    <button
                        onClick={handleExportExcel}
                        disabled={exportingExcel || loading || filteredOrders.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 shadow-sm transition-all disabled:opacity-50"
                        title="Descargar reporte completo en Excel (.xlsx)"
                    >
                        <FileSpreadsheet className={`w-4 h-4 text-emerald-600 ${exportingExcel ? 'animate-bounce' : ''}`} />
                        <span>Excel</span>
                    </button>

                    <button
                        onClick={loadOrders}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all"
                        title="Refrescar lista"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nueva Venta / Pre-Orden</span>
                        <span className="sm:hidden">Nueva Venta</span>
                    </button>
                </div>
            </div>

            {/* Banner de modo local si la migración de Supabase no ha sido corrida aún */}
            {isLocalMode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold">Almacenamiento Local Activo</p>
                        <p className="text-amber-700 text-xs mt-0.5">
                            Tus órdenes se están guardando localmente en este navegador. Para sincronizarlas en la base de datos de Supabase compartida, ejecuta la migración <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">020_create_iphone_sales.sql</code> en el editor SQL de Supabase.
                        </p>
                    </div>
                </div>
            )}

            {/* Métricas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-wider">Total Órdenes</span>
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                            <Smartphone className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">{metrics.total}</p>
                    <p className="text-xs text-slate-500 mt-1">Registradas en el sistema</p>
                </div>

                <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between text-amber-800">
                        <span className="text-xs font-bold uppercase tracking-wider">Pendientes de Compra</span>
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                            <ShoppingCart className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2 font-mono">{metrics.pendientesCompra}</p>
                    <p className="text-xs text-amber-700 font-medium mt-1">Teléfonos listos para comprar</p>
                </div>

                <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-xs font-bold uppercase tracking-wider">Anticipos Recaudados</span>
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2 font-mono">{formatQ(metrics.totalAnticipos)}</p>
                    <p className="text-xs text-emerald-700 font-medium mt-1">Fondos disponibles para compras</p>
                </div>

                <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5 shadow-sm">
                    <div className="flex items-center justify-between text-blue-800">
                        <span className="text-xs font-bold uppercase tracking-wider">Saldos por Cobrar</span>
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                            <Truck className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-2 font-mono">{formatQ(metrics.totalSaldosPendientes)}</p>
                    <p className="text-xs text-blue-700 font-medium mt-1">A liquidar contra entrega (50%)</p>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, casillero, No. de orden o modelo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value as any)}
                            className="flex-1 md:flex-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        >
                            <option value="all">Todas las Modalidades</option>
                            <option value="pre_orden">Pre-Orden (100% Anticipo)</option>
                            <option value="orden">Orden (50% Anticipo)</option>
                        </select>

                        <select
                            value={filterState}
                            onChange={e => setFilterState(e.target.value as any)}
                            className="flex-1 md:flex-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="pendiente_compra">Pendiente de Compra</option>
                            <option value="comprado">Comprado en USA</option>
                            <option value="en_transito">En Tránsito</option>
                            <option value="en_bodega">En Bodega YouBox</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla de Órdenes */}
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm font-bold text-slate-500">Cargando órdenes de iPhone...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center px-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                            <Smartphone className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No se encontraron órdenes de iPhone</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                            {searchTerm || filterType !== 'all' || filterState !== 'all'
                                ? 'Prueba ajustando los filtros de búsqueda.'
                                : 'Comienza registrando la primera venta o pre-orden de iPhone con el botón "+ Nueva Venta / Pre-Orden".'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-3.5 px-4">No. Orden</th>
                                    <th className="py-3.5 px-4">Modalidad</th>
                                    <th className="py-3.5 px-4">Cliente</th>
                                    <th className="py-3.5 px-4">Dispositivo</th>
                                    <th className="py-3.5 px-4">Total</th>
                                    <th className="py-3.5 px-4">Anticipo</th>
                                    <th className="py-3.5 px-4">Saldo Pendiente</th>
                                    <th className="py-3.5 px-4">Estado</th>
                                    <th className="py-3.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                            {order.numero_orden}
                                            <span className="block text-[11px] font-normal text-slate-400 font-sans">
                                                {new Date(order.created_at).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 whitespace-nowrap">
                                            {order.tipo_orden === 'pre_orden' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                                    PRE-ORDEN (100%)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                    ORDEN (50%)
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <p className="font-bold text-slate-800 truncate max-w-[180px]">{order.cliente_nombre}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                {order.locker_id && (
                                                    <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-mono">
                                                        {order.locker_id}
                                                    </span>
                                                )}
                                                {order.cliente_telefono && <span>{order.cliente_telefono}</span>}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            {order.items && order.items.length > 1 ? (
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                                            {order.items.length} iPhones
                                                        </span>
                                                        <span className="font-bold text-slate-800 text-xs truncate max-w-[200px]" title={order.modelo}>
                                                            {order.modelo}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 space-y-0.5">
                                                        {order.items.slice(0, 2).map((item, itIdx) => (
                                                            <div key={itIdx} className="truncate max-w-[220px]">
                                                                • {item.modelo} {item.capacidad} {item.color ? `(${item.color})` : ''}
                                                            </div>
                                                        ))}
                                                        {order.items.length > 2 && (
                                                            <span className="text-[10px] text-blue-600 font-semibold">
                                                                +{order.items.length - 2} equipo(s) más...
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="font-bold text-slate-900">{order.modelo}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {order.capacidad} {order.color ? `• ${order.color}` : ''}
                                                    </p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                            {formatQ(order.precio_total)}
                                        </td>
                                        <td className="py-4 px-4 font-mono font-bold text-emerald-600 whitespace-nowrap">
                                            {formatQ(order.anticipo_pagado)}
                                            {order.metodo_pago && (
                                                <span className="block text-[10px] font-medium text-slate-400 uppercase font-sans">
                                                    {order.metodo_pago}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 font-mono font-bold whitespace-nowrap">
                                            {order.saldo_pendiente > 0 ? (
                                                <span className="text-amber-600">{formatQ(order.saldo_pendiente)}</span>
                                            ) : (
                                                <span className="text-emerald-600 text-xs">Liquidado</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 whitespace-nowrap">
                                            {getEstadoBadge(order.estado)}
                                        </td>
                                        <td className="py-4 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => downloadIphoneOrderPDF(order)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                                                    title="Descargar Comprobante PDF"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setNewStatus(order.estado);
                                                        setNewImei(order.imei_serie || '');
                                                        setNewTracking(order.tracking_proveedor || '');
                                                        setNewNotes(order.notas || '');
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                                                    title="Gestionar Estado y Detalles"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id, order.numero_orden)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                                                    title="Eliminar Orden"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Nueva Venta / Pre-Orden */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Registrar Venta / Pre-Orden de iPhone</h2>
                                    <p className="text-xs text-slate-500">Asigna correlativo y comprobante PDF oficial automáticamente</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={(e) => handleCreateOrder(e, false)} className="p-6 space-y-6">
                            {/* Selector de Modalidad: Pre-Orden vs Orden */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Modalidad del Pedido *
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleTipoOrdenChange('pre_orden')}
                                        className={`p-4 rounded-xl border text-left transition-all relative ${formData.tipo_orden === 'pre_orden'
                                            ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-900 text-sm">Pre-Orden</span>
                                            <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded">100% Anticipo</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            El cliente paga la totalidad antes de la compra para asegurar el equipo en USA.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTipoOrdenChange('orden')}
                                        className={`p-4 rounded-xl border text-left transition-all relative ${formData.tipo_orden === 'orden'
                                            ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-900 text-sm">Orden Regular</span>
                                            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">50% Anticipo</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Anticipo del 50%. El 50% restante se liquida al entregar el teléfono en Guatemala.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Datos del Cliente */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Cliente *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setManualClient(!manualClient);
                                            setSelectedExistingClient(null);
                                        }}
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                    >
                                        {manualClient ? 'Buscar en clientes de YouBox' : 'Ingresar cliente manual / nuevo'}
                                    </button>
                                </div>

                                {!manualClient && !selectedExistingClient ? (
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente por casillero (ej. YBG123) o nombre..."
                                            value={clientSearch}
                                            onChange={e => handleClientSearchChange(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        />
                                        {searchingClients && (
                                            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                                        )}

                                        {clientResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 divide-y divide-slate-100 z-10 max-h-48 overflow-y-auto">
                                                {clientResults.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => selectExistingClient(c)}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 transition-colors flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">{c.nombre} {c.apellido}</p>
                                                            <p className="text-xs text-slate-500">{c.telefono || 'Sin teléfono'}</p>
                                                        </div>
                                                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                            {c.locker_id}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : selectedExistingClient ? (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                                {selectedExistingClient.locker_id ? selectedExistingClient.locker_id.substring(0, 3) : 'CL'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">
                                                    {selectedExistingClient.nombre} {selectedExistingClient.apellido}
                                                </p>
                                                <p className="text-xs text-blue-700 font-mono">
                                                    Casillero: {selectedExistingClient.locker_id} • Tel: {selectedExistingClient.telefono || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedExistingClient(null)}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-1">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Nombre Completo *"
                                                value={formData.cliente_nombre}
                                                onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Teléfono / WhatsApp"
                                                value={formData.cliente_telefono}
                                                onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Casillero (Opcional)"
                                                value={formData.locker_id}
                                                onChange={e => setFormData({ ...formData, locker_id: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white uppercase font-mono"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Especificaciones de los iPhones */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Equipos iPhone ({formData.telefonos.length} {formData.telefonos.length === 1 ? 'dispositivo' : 'dispositivos'}) *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddTelefono}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all border border-blue-200 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Agregar Teléfono</span>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.telefonos.map((tel, idx) => (
                                        <div key={tel.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 relative space-y-3">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                                                    Dispositivo #{idx + 1}
                                                </span>
                                                {formData.telefonos.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTelefono(idx)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                                                        title="Eliminar este teléfono"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Quitar</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                                        Modelo de iPhone *
                                                    </label>
                                                    <select
                                                        value={tel.modelo}
                                                        onChange={e => handleUpdateTelefono(idx, 'modelo', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                                    >
                                                        {IPHONE_MODELS.map(m => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                        <option value="Otro">Otro modelo...</option>
                                                    </select>
                                                    {tel.modelo === 'Otro' && (
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Especifica el modelo exacto..."
                                                            value={tel.otro_modelo}
                                                            onChange={e => handleUpdateTelefono(idx, 'otro_modelo', e.target.value)}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-blue-500"
                                                        />
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                                        Color
                                                    </label>
                                                    <select
                                                        value={tel.color}
                                                        onChange={e => handleUpdateTelefono(idx, 'color', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                                                    >
                                                        {COLORS.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                        <option value="Otro">Otro color...</option>
                                                    </select>
                                                    {tel.color === 'Otro' && (
                                                        <input
                                                            type="text"
                                                            placeholder="Especifica el color..."
                                                            value={tel.otro_color}
                                                            onChange={e => handleUpdateTelefono(idx, 'otro_color', e.target.value)}
                                                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-blue-500"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Capacidad</label>
                                                    <select
                                                        value={tel.capacidad}
                                                        onChange={e => handleUpdateTelefono(idx, 'capacidad', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                                                    >
                                                        {CAPACITIES.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Condición</label>
                                                    <select
                                                        value={tel.estado_equipo}
                                                        onChange={e => handleUpdateTelefono(idx, 'estado_equipo', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                                                    >
                                                        <option value="nuevo">Nuevo Sellado</option>
                                                        <option value="reacondicionado">Reacondicionado (Grado A)</option>
                                                        <option value="seminuevo">Seminuevo</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                                        Precio Estimado (Q) <span className="font-normal text-slate-400">(Opc.)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Q</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            value={tel.precio_unitario}
                                                            onChange={e => handleUpdateTelefono(idx, 'precio_unitario', e.target.value)}
                                                            className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm font-bold font-mono text-slate-800 outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddTelefono}
                                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>+ Agregar Otro iPhone a esta Orden</span>
                                </button>
                            </div>

                            {/* Precio y Anticipo */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Precios y Anticipo *
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Precio Total (Q) *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Q</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                required
                                                placeholder="0.00"
                                                value={formData.precio_total}
                                                onChange={e => handlePrecioChange(e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Anticipo a Pagar ({formData.tipo_orden === 'pre_orden' ? '100%' : '50% Mínimo'}) *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Q</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                required
                                                placeholder="0.00"
                                                value={formData.anticipo_pagado}
                                                onChange={e => setFormData({ ...formData, anticipo_pagado: e.target.value })}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-4 py-2.5 text-base font-bold font-mono text-emerald-700 outline-none focus:border-blue-500 focus:bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Resumen de saldos interactivo */}
                                {parseFloat(formData.precio_total) > 0 && (
                                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-500">Valor Total:</span>
                                            <span className="font-bold text-slate-900 ml-1 font-mono">{formatQ(parseFloat(formData.precio_total))}</span>
                                        </div>
                                        <div>
                                            <span className="text-emerald-600">Anticipo:</span>
                                            <span className="font-bold text-emerald-700 ml-1 font-mono">{formatQ(parseFloat(formData.anticipo_pagado) || 0)}</span>
                                        </div>
                                        <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                            <span className="text-slate-500">Saldo Contra Entrega:</span>
                                            <span className="font-bold text-amber-700 ml-1 font-mono">
                                                {formatQ(Math.max(0, (parseFloat(formData.precio_total) || 0) - (parseFloat(formData.anticipo_pagado) || 0)))}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Método de Pago del Anticipo</label>
                                        <select
                                            value={formData.metodo_pago}
                                            onChange={e => setFormData({ ...formData, metodo_pago: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                                        >
                                            <option value="transferencia">Transferencia Bancaria</option>
                                            <option value="deposito">Depósito Bancario</option>
                                            <option value="efectivo">Efectivo en Sucursal</option>
                                            <option value="visalink">Tarjeta / VisaLink</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">No. de Boleta / Referencia</label>
                                        <input
                                            type="text"
                                            placeholder="No. de confirmación bancaria"
                                            value={formData.referencia_pago}
                                            onChange={e => setFormData({ ...formData, referencia_pago: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notas u Observaciones */}
                            <div className="pt-2 border-t border-slate-100">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Notas u Observaciones (Opcional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Detalles sobre el pedido, accesorios requeridos o especificaciones..."
                                    value={formData.notas}
                                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white"
                                />
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Registrar Orden
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={(e) => handleCreateOrder(e, true)}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    Registrar y Generar PDF
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Estado / Seguimiento */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">
                                    Gestionar Orden {selectedOrder.numero_orden}
                                </h3>
                                <p className="text-xs text-slate-500">{selectedOrder.cliente_nombre} • {selectedOrder.cantidad_equipos || selectedOrder.items?.length || 1} {((selectedOrder.cantidad_equipos || selectedOrder.items?.length || 1) === 1 ? 'iPhone' : 'iPhones')}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Lista de equipos si hay más de 1 */}
                            {selectedOrder.items && selectedOrder.items.length > 1 && (
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                                    <p className="font-bold text-slate-700 flex items-center justify-between">
                                        <span>Equipos en esta orden ({selectedOrder.items.length}):</span>
                                        <span className="font-mono text-slate-900">Total: {formatQ(selectedOrder.precio_total)}</span>
                                    </p>
                                    <div className="space-y-1 divide-y divide-slate-200/60 max-h-36 overflow-y-auto pr-1">
                                        {selectedOrder.items.map((it, idx) => (
                                            <div key={idx} className="pt-1 first:pt-0 flex items-center justify-between text-slate-600">
                                                <span>
                                                    <strong className="text-slate-800">#{idx + 1} {it.modelo}</strong> {it.capacidad} {it.color ? `• ${it.color}` : ''} ({it.estado_equipo})
                                                </span>
                                                {it.precio_unitario ? (
                                                    <span className="font-mono font-bold text-slate-700 ml-2">{formatQ(it.precio_unitario)}</span>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Estado de la Orden
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={e => setNewStatus(e.target.value as EstadoOrden)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                >
                                    <option value="pendiente_compra">Pendiente de Compra</option>
                                    <option value="comprado">Comprado en USA</option>
                                    <option value="en_transito">En Tránsito hacia Guatemala</option>
                                    <option value="en_bodega">En Bodega YouBox (Listo para entrega)</option>
                                    <option value="entregado">Entregado al Cliente (Liquidado)</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">No. Serie / IMEI (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ingresar cuando el equipo ya esté comprado..."
                                    value={newImei}
                                    onChange={e => setNewImei(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tracking Proveedor USA (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Número de rastreo de Apple, Amazon, etc."
                                    value={newTracking}
                                    onChange={e => setNewTracking(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Notas adicionales</label>
                                <textarea
                                    rows={2}
                                    value={newNotes}
                                    onChange={e => setNewNotes(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={handleUpdateStatus}
                                    disabled={updatingStatus}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition-all flex items-center gap-2"
                                >
                                    {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
