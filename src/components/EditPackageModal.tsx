import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Loader2, Save, Package } from 'lucide-react';

interface Cliente {
    id: string;
    nombre: string;
    apellido: string;
    locker_id: string;
}

interface Bodega {
    id: string;
    nombre: string;
}

interface Transportista {
    id: string;
    nombre: string;
}

interface EditPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    paqueteId: string | null;
    onSuccess: () => void;
}

export function EditPackageModal({ isOpen, onClose, paqueteId, onSuccess }: EditPackageModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [tracking, setTracking] = useState('');
    const [pesoLbs, setPesoLbs] = useState('');
    const [piezas, setPiezas] = useState('1');
    const [bodegaId, setBodegaId] = useState('');
    const [transportistaId, setTransportistaId] = useState('');
    const [estado, setEstado] = useState('en_bodega');
    const [notas, setNotas] = useState('');

    // Client Search State
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [clientSearchText, setClientSearchText] = useState('');
    const [clientResults, setClientResults] = useState<Cliente[]>([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Catalogs
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [transportistas, setTransportistas] = useState<Transportista[]>([]);

    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
            if (paqueteId) {
                fetchPackageData();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, paqueteId]);

    async function fetchCatalogs() {
        try {
            const [bodegasRes, transpRes] = await Promise.all([
                supabase.from('bodegas').select('id, nombre').eq('activo', true),
                supabase.from('transportistas').select('id, nombre').eq('activo', true)
            ]);
            setBodegas(bodegasRes.data || []);
            setTransportistas(transpRes.data || []);
        } catch (e) {
            console.error('Error fetching catalogs:', e);
        }
    }

    async function fetchPackageData() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('paquetes')
                .select(`
          tracking, peso_lbs, piezas, bodega_id, transportista_id, estado, notas,
          clientes (id, nombre, apellido, locker_id)
        `)
                .eq('id', paqueteId)
                .single();

            if (error) throw error;
            if (data) {
                setTracking(data.tracking);
                setPesoLbs(data.peso_lbs?.toString() || '');
                setPiezas(data.piezas?.toString() || '1');
                setBodegaId(data.bodega_id || '');
                setTransportistaId(data.transportista_id || '');
                setEstado(data.estado);
                setNotas(data.notas || '');

                if (data.clientes) {
                    const clientData = data.clientes as unknown as Cliente;
                    setSelectedClient(clientData);
                    setClientSearchText(`${clientData.locker_id} - ${clientData.nombre} ${clientData.apellido}`);
                }
            }
        } catch (e) {
            console.error('Error fetching package details:', e);
            alert('Error al cargar la información del paquete.');
            onClose();
        } finally {
            setLoading(false);
        }
    }

    // --- Client Search Behavior ---
    const handleClientSearchChange = (text: string) => {
        setClientSearchText(text);
        if (!text) {
            setSelectedClient(null);
            setClientResults([]);
            setShowClientDropdown(false);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setShowClientDropdown(true);
        setIsSearchingClient(true);

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('clientes')
                    .select('id, nombre, apellido, locker_id')
                    .or(`locker_id.ilike.%${text}%,nombre.ilike.%${text}%,apellido.ilike.%${text}%`)
                    .limit(10);

                if (error) throw error;
                setClientResults(data || []);
            } catch (e) {
                console.error('Error searching clients:', e);
            } finally {
                setIsSearchingClient(false);
            }
        }, 400); // 400ms debounce
    };

    const selectClient = (client: Cliente) => {
        setSelectedClient(client);
        setClientSearchText(`${client.locker_id} - ${client.nombre} ${client.apellido}`);
        setShowClientDropdown(false);
    };

    const clearClient = () => {
        setSelectedClient(null);
        setClientSearchText('');
    };

    // --- Save Package ---
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paqueteId) return;

        if (!selectedClient) {
            alert('Debes asignar un cliente (Casillero) válido al paquete.');
            return;
        }

        if (!tracking.trim()) {
            alert('El número de tracking es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('paquetes')
                .update({
                    tracking: tracking.trim(),
                    cliente_id: selectedClient.id,
                    peso_lbs: parseFloat(pesoLbs) || null,
                    piezas: parseInt(piezas, 10) || 1,
                    bodega_id: bodegaId || null,
                    transportista_id: transportistaId || null,
                    estado: estado,
                    notas: notas.trim() || null
                })
                .eq('id', paqueteId);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating package:', error);
            alert('Ocurrió un error al actualizar el paquete: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Prevent closing when clicking inside the dropdown list
    const handleBlur = (e: React.FocusEvent) => {
        // Adding a slight delay allows the click event on the item to fire before the dropdown is closed
        setTimeout(() => setShowClientDropdown(false), 200);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex flex-col items-center justify-center bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Editar Paquete</h2>
                            <p className="text-xs font-semibold text-slate-500">Modifica la información del inventario.</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={saving} className="p-2 rounded-xl hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-16">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-sm font-medium text-slate-500">Cargando datos del paquete...</p>
                    </div>
                ) : (
                    <form id="edit-package-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                        <div className="space-y-6">

                            {/* Tracking & Client row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tracking Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={tracking}
                                        onChange={e => setTracking(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 shadow-sm bg-white"
                                    />
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cliente (Casillero) *</label>
                                    <div className="relative group/search">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            className={`block w-full rounded-xl py-2.5 pl-9 pr-8 text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 font-bold outline-none sm:text-sm ${!selectedClient ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50' : 'border border-emerald-300 bg-emerald-50'
                                                }`}
                                            placeholder="Buscar por casillero o nombre..."
                                            value={clientSearchText}
                                            onChange={(e) => handleClientSearchChange(e.target.value)}
                                            onBlur={handleBlur}
                                            autoComplete="off"
                                        />
                                        {selectedClient && (
                                            <button type="button" onClick={clearClient} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        {isSearchingClient && !selectedClient && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {showClientDropdown && clientResults.length > 0 && (
                                        <div className="absolute z-[110] w-full mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 max-h-48 overflow-auto animate-fade-in divide-y divide-slate-50">
                                            {clientResults.map((client) => (
                                                <div
                                                    key={client.id}
                                                    onMouseDown={(e) => { e.preventDefault(); selectClient(client); }} // Use preventDefault to stop input blur
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <span className="font-extrabold text-blue-700 text-xs bg-blue-100/50 px-2 py-1 rounded-lg border border-blue-200">
                                                        {client.locker_id}
                                                    </span>
                                                    <span className="text-sm text-slate-700 font-semibold truncate leading-tight">
                                                        {client.nombre} {client.apellido}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attributes row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Peso (lbs)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={pesoLbs}
                                        onChange={e => setPesoLbs(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Piezas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={piezas}
                                        onChange={e => setPiezas(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bodega</label>
                                    <select
                                        value={bodegaId}
                                        onChange={e => setBodegaId(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    >
                                        <option value="">Selecciona...</option>
                                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Courier</label>
                                    <select
                                        value={transportistaId}
                                        onChange={e => setTransportistaId(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    >
                                        <option value="">Selecciona...</option>
                                        {transportistas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Status and Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estatus Actual</label>
                                    <select
                                        value={estado}
                                        onChange={e => setEstado(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-bold text-blue-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-blue-50/50"
                                    >
                                        <option value="recibido">Recibido</option>
                                        <option value="en_bodega">En Bodega</option>
                                        <option value="listo_consolidar">Listo Consolidar</option>
                                        <option value="consolidado">Consolidado</option>
                                        <option value="en_transito">En Tránsito</option>
                                        <option value="entregado">Entregado</option>
                                        <option value="devuelto">Devuelto</option>
                                        <option value="perdido">Perdido</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Notas / Comentarios</label>
                                    <input
                                        type="text"
                                        value={notas}
                                        onChange={e => setNotas(e.target.value)}
                                        placeholder="Detalles adicionales..."
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    />
                                </div>
                            </div>

                        </div>
                    </form>
                )}

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="edit-package-form"
                        disabled={saving || loading || !selectedClient || !tracking.trim()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm hover:translate-y-px hover:shadow-md transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Cambios
                    </button>
                </div>

            </div>
        </div>
    );
}
