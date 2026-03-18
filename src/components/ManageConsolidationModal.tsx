import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Package, Search, Trash2, X, Plus, Loader2, ChevronsRight, CheckCircle2 } from 'lucide-react';

interface Paquete {
    id: string;
    tracking: string;
    peso_lbs: number;
    piezas: number;
    estado: string;
    clientes: {
        nombre: string;
        apellido: string;
        locker_id: string;
    } | null;
}

interface ManageConsolidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    consolidationId: string;
    consolidationCodigo: string;
    bodegaId: string;
    onSuccess: () => void;
}

export function ManageConsolidationModal({ isOpen, onClose, consolidationId, consolidationCodigo, bodegaId, onSuccess }: ManageConsolidationModalProps) {
    const [attachedPaquetes, setAttachedPaquetes] = useState<Paquete[]>([]);
    const [availablePaquetes, setAvailablePaquetes] = useState<Paquete[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && consolidationId) {
            fetchData();
        }
    }, [isOpen, consolidationId]);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch packages attached to this consolidation
            const { data: pivotData } = await supabase
                .from('consolidacion_paquetes')
                .select('paquete_id')
                .eq('consolidacion_id', consolidationId);

            const attachedIds = pivotData?.map(p => p.paquete_id) || [];

            let attachedData: Paquete[] = [];
            if (attachedIds.length > 0) {
                const { data: paqData } = await supabase
                    .from('paquetes')
                    .select('id, tracking, peso_lbs, piezas, estado, clientes(nombre, apellido, locker_id)')
                    .in('id', attachedIds)
                    .order('tracking');
                attachedData = (paqData as any) || [];
            }
            setAttachedPaquetes(attachedData);

            // Fetch available packages (en_bodega or recibido) for the specific bodega
            let query = supabase
                .from('paquetes')
                .select('id, tracking, peso_lbs, piezas, estado, clientes(nombre, apellido, locker_id)')
                .in('estado', ['en_bodega', 'recibido'])
                .order('fecha_recepcion', { ascending: false });

            if (bodegaId) {
                query = query.eq('bodega_id', bodegaId);
            }

            const { data: availData, error: availError } = await query;
            if (availError) throw availError;

            const filtered = (availData as any[] || []).filter(p => !attachedIds.includes(p.id));
            setAvailablePaquetes(filtered);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    const updateConsolidationWeight = async (currentAttached: Paquete[]) => {
        const totalWeight = currentAttached.reduce((acc, p) => acc + (Number(p.peso_lbs) || 0), 0);
        await supabase.from('consolidaciones').update({ peso_total_lbs: totalWeight }).eq('id', consolidationId);
        onSuccess(); // Refresh parent list silently
    };

    const handleAddPackage = async (paquete: Paquete) => {
        setActionLoading(paquete.id);
        try {
            // Add to pivot
            const { error: pivotError } = await supabase.from('consolidacion_paquetes').insert({
                consolidacion_id: consolidationId,
                paquete_id: paquete.id
            });
            if (pivotError) throw pivotError;

            // Update status
            const { error: statusError } = await supabase.from('paquetes').update({
                estado: 'consolidado'
            }).eq('id', paquete.id);
            if (statusError) throw statusError;

            // Update UI State locally for speed
            const newAttached = [...attachedPaquetes, paquete];
            setAttachedPaquetes(newAttached);
            setAvailablePaquetes(availablePaquetes.filter(p => p.id !== paquete.id));

            await updateConsolidationWeight(newAttached);
        } catch (err: any) {
            console.error('Add error:', err);
            toast.error('Error al agregar paquete: ' + (err.message || 'Error desconocido'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemovePackage = async (paquete: Paquete) => {
        setActionLoading(paquete.id);
        try {
            // Remove from pivot
            const { error: pivotError } = await supabase.from('consolidacion_paquetes').delete()
                .eq('consolidacion_id', consolidationId)
                .eq('paquete_id', paquete.id);
            if (pivotError) throw pivotError;

            // Restore status
            const { error: statusError } = await supabase.from('paquetes').update({
                estado: 'en_bodega'
            }).eq('id', paquete.id);
            if (statusError) throw statusError;

            // Update UI State locally
            const newAttached = attachedPaquetes.filter(p => p.id !== paquete.id);
            setAttachedPaquetes(newAttached);
            setAvailablePaquetes([{ ...paquete, estado: 'en_bodega' }, ...availablePaquetes]);

            await updateConsolidationWeight(newAttached);
        } catch (err: any) {
            console.error('Remove error:', err);
            toast.error('Error al remover paquete: ' + (err.message || 'Error desconocido'));
        } finally {
            setActionLoading(null);
        }
    };

    const filteredAvailable = useMemo(() => {
        const query = searchTerm.toLowerCase();
        return availablePaquetes.filter(p =>
            p.tracking.toLowerCase().includes(query) ||
            `${p.clientes?.locker_id} ${p.clientes?.nombre} ${p.clientes?.apellido}`.toLowerCase().includes(query)
        );
    }, [availablePaquetes, searchTerm]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col h-[90vh] overflow-hidden transform transition-all">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Gestionar Carga</h2>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Consolidado Maestro: <span className="text-blue-600 font-bold">{consolidationCodigo}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Main Content Area: Dos Columnas */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 bg-slate-100/50">

                    {/* Columna Izquierda: Paquetes Disponibles */}
                    <div className="flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/60 bg-white">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-blue-500" /> Paquetes sin procesar
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md ml-auto">{availablePaquetes.length}</span>
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar Tracking o Locker..."
                                    className="h-10 w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                            ) : filteredAvailable.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-sm">
                                    {searchTerm ? 'No se encontraron resultados.' : 'No hay paquetes sin procesar en esta bodega.'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredAvailable.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 border border-slate-200/60 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all bg-white group hover:bg-blue-50/30">
                                            <div className="min-w-0 pr-3">
                                                <p className="font-bold text-slate-800 text-sm truncate">{p.tracking}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                    <span className="font-semibold text-slate-600">{p.clientes?.locker_id || ''}</span> {p.clientes?.nombre}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleAddPackage(p)}
                                                disabled={actionLoading === p.id}
                                                className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                                title="Añadir a Consolidado"
                                            >
                                                {actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha: Paquetes en el Consolidado */}
                    <div className="flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
                        <div className="p-4 border-b border-slate-200/60 bg-white flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> En este Consolidado
                            </h3>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Total: {attachedPaquetes.length}</span>
                                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">{attachedPaquetes.reduce((acc, p) => acc + (Number(p.peso_lbs) || 0), 0).toFixed(2)} lbs</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                            ) : attachedPaquetes.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="mx-auto h-12 w-12 bg-white border border-dashed border-slate-300 rounded-full flex items-center justify-center mb-3">
                                        <ChevronsRight className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">Consolidado vacío.</p>
                                    <p className="text-slate-400 text-xs mt-1">Añade paquetes desde la lista de disponibles.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {attachedPaquetes.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 border border-emerald-100 rounded-xl shadow-sm bg-white hover:border-emerald-300 transition-all">
                                            <div className="min-w-0 pr-3">
                                                <p className="font-bold text-slate-800 text-sm truncate">{p.tracking}</p>
                                                <p className="text-xs text-slate-500 mt-0.5 flex gap-2">
                                                    <span><span className="font-semibold text-slate-600">{p.clientes?.locker_id}</span> {p.clientes?.nombre}</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="font-bold text-emerald-600">{p.peso_lbs} lbs</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemovePackage(p)}
                                                disabled={actionLoading === p.id}
                                                className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                title="Quitar del Consolidado"
                                            >
                                                {actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
