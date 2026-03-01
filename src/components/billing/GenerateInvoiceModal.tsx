import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2, Calculator } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Tarifa {
    id: string;
    nombre_servicio: string;
    tarifa_q: number;
    tipo_cobro: string;
}

interface Bodega {
    id: string;
    nombre: string;
}

interface Cliente {
    id: string;
    nombre: string;
    apellido: string;
    locker_id: string;
    email: string;
}

interface GenerateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GenerateInvoiceModal({ isOpen, onClose, onSuccess }: GenerateInvoiceModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);

    const [selectedCliente, setSelectedCliente] = useState('');
    const [selectedBodega, setSelectedBodega] = useState('');

    const [isManualClient, setIsManualClient] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualNit, setManualNit] = useState('');
    const [clientSearchTerm, setClientSearchTerm] = useState('');

    const [conceptos, setConceptos] = useState<{ id: string, descripcion: string, cantidad: number, precio_unitario: number }[]>([]);
    const [sendEmail, setSendEmail] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            resetForm();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedBodega) {
            fetchTarifas(selectedBodega);
        } else {
            setTarifas([]);
        }
    }, [selectedBodega]);

    const resetForm = () => {
        setIsManualClient(false);
        setManualName('');
        setManualNit('');
        setClientSearchTerm('');
        setSelectedCliente('');
        setSelectedBodega('');
        setConceptos([]);
        setSendEmail(true);
    };

    const fetchInitialData = async () => {
        try {
            const [clientesRes, bodegasRes] = await Promise.all([
                supabase.from('clientes').select('id, nombre, apellido, locker_id, email').eq('activo', true).order('nombre'),
                supabase.from('bodegas').select('id, nombre').eq('activo', true).order('nombre')
            ]);

            if (clientesRes.data) setClientes(clientesRes.data);
            if (bodegasRes.data) setBodegas(bodegasRes.data);
        } catch (error) {
            console.error('Error fetching initial data for invoice', error);
        }
    };

    const fetchTarifas = async (bodegaId: string) => {
        try {
            const { data } = await supabase.from('tarifas').select('id, nombre_servicio, tarifa_q, tipo_cobro').eq('bodega_id', bodegaId).eq('activa', true);
            if (data) setTarifas(data);
        } catch (error) {
            console.error('Error fetching tarifas', error);
        }
    };

    const addConcepto = () => {
        setConceptos([...conceptos, { id: crypto.randomUUID(), descripcion: '', cantidad: 1, precio_unitario: 0 }]);
    };

    const removeConcepto = (id: string) => {
        setConceptos(conceptos.filter(c => c.id !== id));
    };

    const updateConcepto = (id: string, field: string, value: any) => {
        setConceptos(conceptos.map(c => {
            if (c.id === id) {
                const updated = { ...c, [field]: value };

                // Auto-fill price if a tariff is selected
                if (field === 'descripcion') {
                    const matchingTarifa = tarifas.find(t => t.nombre_servicio === value);
                    if (matchingTarifa) {
                        updated.precio_unitario = matchingTarifa.tarifa_q;
                    }
                }
                return updated;
            }
            return c;
        }));
    };

    const getTotal = () => {
        return conceptos.reduce((sum, c) => sum + (c.cantidad * c.precio_unitario), 0);
    };

    const handleSave = async () => {
        if (!isManualClient && !selectedCliente) {
            alert("Seleccione un cliente registrado o use la opción de cliente manual.");
            return;
        }

        if (isManualClient && !manualName.trim()) {
            alert("Ingrese el nombre del cliente manual.");
            return;
        }

        if (conceptos.length === 0) {
            alert("Agregue al menos un concepto a la factura.");
            return;
        }

        if (conceptos.some(c => !c.descripcion || c.cantidad <= 0 || c.precio_unitario < 0)) {
            alert("Revise que todos los conceptos tengan descripción, cantidad válida y precio válido.");
            return;
        }

        setLoading(true);
        try {
            const numeroFactura = `FAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const total = getTotal();

            // 1. Create Factura
            const { data: facturaData, error: facturaError } = await supabase
                .from('facturas')
                .insert([{
                    numero: numeroFactura,
                    cliente_id: isManualClient ? null : selectedCliente,
                    cliente_manual_nombre: isManualClient ? manualName.trim() : null,
                    cliente_manual_nit: isManualClient ? manualNit.trim() : null,
                    monto_subtotal: total,
                    monto_total: total,
                    moneda: 'GTQ',
                    estado: 'pendiente',
                    creado_por: user?.id
                }])
                .select()
                .single();

            if (facturaError) throw facturaError;

            // 2. Create Conceptos
            const conceptosToInsert = conceptos.map(c => ({
                factura_id: facturaData.id,
                descripcion: c.descripcion,
                cantidad: c.cantidad,
                precio_unitario: c.precio_unitario,
                subtotal: c.cantidad * c.precio_unitario
            }));

            const { error: conceptosError } = await supabase.from('conceptos_factura').insert(conceptosToInsert);
            if (conceptosError) throw conceptosError;

            // 3. Queue Email if requested (mock saving notification logic)
            if (sendEmail && !isManualClient) {
                const targetCliente = clientes.find(c => c.id === selectedCliente);
                if (targetCliente?.email) {
                    await supabase.from('notificaciones').insert([{
                        cliente_id: selectedCliente,
                        tipo: 'email',
                        asunto: `Nueva Factura Generada - ${numeroFactura}`,
                        mensaje: `Se ha generado una nueva factura por el monto de Q${total.toFixed(2)}. Por favor ingrese a su portal para revisar detalles o contactarnos para el pago.`,
                        estado: 'pendiente'
                    }]);
                }
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert('Error al generar la factura: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Generar Factura Manual</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="clientType"
                                    checked={!isManualClient}
                                    onChange={() => setIsManualClient(false)}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Cliente Registrado</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="clientType"
                                    checked={isManualClient}
                                    onChange={() => setIsManualClient(true)}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Factura Manual / Consumidor Final</span>
                            </label>
                        </div>

                        {!isManualClient ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Buscar y Seleccionar Cliente *</label>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, locker o email..."
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    className="w-full mb-2 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                                <select
                                    value={selectedCliente}
                                    onChange={(e) => setSelectedCliente(e.target.value)}
                                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm max-h-40 overflow-y-auto"
                                    size={4}
                                >
                                    {clientes
                                        .filter(c => `${c.nombre} ${c.apellido} ${c.locker_id} ${c.email}`.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                        .map(c => (
                                            <option key={c.id} value={c.id} className="p-2 border-b border-slate-100 last:border-0 hover:bg-slate-100 cursor-pointer">
                                                {c.locker_id} - {c.nombre} {c.apellido} ({c.email})
                                            </option>
                                        ))
                                    }
                                    {clientes.filter(c => `${c.nombre} ${c.apellido} ${c.locker_id} ${c.email}`.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && (
                                        <option disabled className="p-2 text-slate-500 text-center">No se encontraron clientes</option>
                                    )}
                                </select>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Facturación *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Consumidor Final o Nombre"
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value)}
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">NIT</label>
                                    <input
                                        type="text"
                                        placeholder="Opcional"
                                        value={manualNit}
                                        onChange={(e) => setManualNit(e.target.value)}
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cargar Tarifas de Bodega</label>
                            <select
                                value={selectedBodega}
                                onChange={(e) => setSelectedBodega(e.target.value)}
                                className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="">-- Sin Bodega / Cargos Manuales --</option>
                                {bodegas.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">Conceptos (Cargos) *</label>
                            <button
                                type="button"
                                onClick={addConcepto}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                                <Plus className="h-3 w-3" /> Agregar Elemento
                            </button>
                        </div>

                        <div className="space-y-3">
                            {conceptos.map((concepto, index) => (
                                <div key={concepto.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="Descripción o Seleccionar Tarifa"
                                            value={concepto.descripcion}
                                            onChange={(e) => updateConcepto(concepto.id, 'descripcion', e.target.value)}
                                            list="tarifas-list"
                                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div className="w-24">
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            placeholder="Cant."
                                            value={concepto.cantidad}
                                            onChange={(e) => updateConcepto(concepto.id, 'cantidad', parseFloat(e.target.value))}
                                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-slate-500 sm:text-sm">Q</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="Precio"
                                                value={concepto.precio_unitario}
                                                onChange={(e) => updateConcepto(concepto.id, 'precio_unitario', parseFloat(e.target.value))}
                                                className="w-full rounded-md border-slate-300 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-24 text-right flex flex-col justify-center py-2">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Q{(concepto.cantidad * concepto.precio_unitario).toFixed(2)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeConcepto(concepto.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {conceptos.length === 0 && (
                                <div className="text-center py-4 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                                    No hay conceptos agregados.
                                </div>
                            )}
                        </div>

                        <datalist id="tarifas-list">
                            <option value="Servicios de Compras">Servicios Extras de Bodega</option>
                            <option value="Seguro de Envío">Cargo Fijo</option>
                            <option value="Tarifa de Manejo">Cargo Administrativo</option>
                            <option value="Otros Cargos">Cargo Variable</option>
                            {tarifas.map(t => (
                                <option key={t.id} value={t.nombre_servicio}>Q{t.tarifa_q} ({t.tipo_cobro.replace('_', ' ')})</option>
                            ))}
                        </datalist>
                    </div>

                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="sendEmail"
                                checked={sendEmail}
                                onChange={(e) => setSendEmail(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                            />
                            <label htmlFor="sendEmail" className="text-sm text-slate-700 font-medium">
                                Enviar Notificación por Correo al Cliente (Si está registrado)
                            </label>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-500">Monto Total</p>
                            <p className="text-2xl font-bold text-slate-900">Q{getTotal().toFixed(2)}</p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || conceptos.length === 0 || (!isManualClient && !selectedCliente) || (isManualClient && !manualName.trim())}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Factura
                    </button>
                </div>
            </div>
        </div>
    );
}
