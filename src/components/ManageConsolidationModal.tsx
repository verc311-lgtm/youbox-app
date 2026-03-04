import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Search, Trash2, X, Plus, Loader2, AlertCircle } from 'lucide-react';

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
    onSuccess: () => void;
}

export function ManageConsolidationModal({ isOpen, onClose, consolidationId, consolidationCodigo, onSuccess }: ManageConsolidationModalProps) {
    const [paquetes, setPaquetes] = useState<Paquete[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && consolidationId) {
            fetchAttachedPackages();
        }
    }, [isOpen, consolidationId]);

    async function fetchAttachedPackages() {
        setLoading(true);
        try {
            const { data: pivotData } = await supabase
                .from('consolidacion_paquetes')
                .select('paquete_id')
                .eq('consolidacion_id', consolidationId);

            if (pivotData && pivotData.length > 0) {
                const ids = pivotData.map(p => p.paquete_id);
                const { data: paqData } = await supabase
                    .from('paquetes')
                    .select('id, tracking, peso_lbs, piezas, estado, clientes(nombre, apellido, locker_id)')
                    .in('id', ids)
                    .order('tracking');

                setPaquetes((paqData as any) || []);
            } else {
                setPaquetes([]);
            }
        } catch (error) {
            console.error('Error fetching attached packages:', error);
        } finally {
            setLoading(false);
        }
    }

    const updateConsolidationWeight = async (currentPaquetes: Paquete[]) => {
        const totalWeight = currentPaquetes.reduce((acc, p) => acc + (Number(p.peso_lbs) || 0), 0);
        await supabase.from('consolidaciones').update({ peso_total_lbs: totalWeight }).eq('id', consolidationId);
        onSuccess(); // Refresh parent list
    };

    const handleAddPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setSearchLoading(true);
        try {
            // Find package by tracking
            const { data: foundPaquete, error: findError } = await supabase
                .from('paquetes')
                .select('id, tracking, peso_lbs, piezas, estado, clientes(nombre, apellido, locker_id)')
                .ilike('tracking', `%${searchTerm.trim()}%`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (findError || !foundPaquete) {
                alert('No se encontró ningún paquete con ese tracking.');
                setSearchTerm('');
                return;
            }

            if (paquetes.some(p => p.id === foundPaquete.id)) {
                alert('Este paquete ya está en el consolidado.');
                setSearchTerm('');
                return;
            }

            if (foundPaquete.estado !== 'en_bodega' && foundPaquete.estado !== 'recibido') {
                if (!window.confirm(`El paquete está en estado "${foundPaquete.estado}". ¿Seguro que deseas añadirlo a este consolidado?`)) {
                    setSearchTerm('');
                    return;
                }
            }

            // Add it instantly
            setActionLoading('add');
            await supabase.from('consolidacion_paquetes').insert({ consolidacion_id: consolidationId, paquete_id: foundPaquete.id });
            await supabase.from('paquetes').update({ estado: 'consolidado' }).eq('id', foundPaquete.id);

            const newPaquetes = [...paquetes, foundPaquete as any];
            setPaquetes(newPaquetes);
            await updateConsolidationWeight(newPaquetes);

            setSearchTerm('');
        } catch (err: any) {
            console.error('Add error:', err);
            alert('Error al agregar paquete: ' + err.message);
        } finally {
            setSearchLoading(false);
            setActionLoading(null);
        }
    };

    const handleRemovePackage = async (paqueteId: string) => {
        if (!window.confirm('¿Liberar este paquete del consolidado? Volverá a estar "En Bodega".')) return;

        setActionLoading(paqueteId);
        try {
            await supabase.from('consolidacion_paquetes').delete().eq('consolidacion_id', consolidationId).eq('paquete_id', paqueteId);
            await supabase.from('paquetes').update({ estado: 'en_bodega' }).eq('id', paqueteId);

            const newPaquetes = paquetes.filter(p => p.id !== paqueteId);
            setPaquetes(newPaquetes);
            await updateConsolidationWeight(newPaquetes);

        } catch (err: any) {
            console.error('Remove error:', err);
            alert('Error al remover paquete: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Gestionar Carga</h2>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Consolidado: <span className="text-blue-600 font-bold">{consolidationCodigo}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Action Bar (Add Package) */}
                <div className="p-5 border-b border-slate-100 bg-white">
                    <form onSubmit={handleAddPackage} className="relative flex items-center gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Escanea o escribe el Tracking para agregar al instante..."
                                className="h-12 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-sm"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!searchTerm.trim() || searchLoading}
                            className="h-12 px-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm hover:translate-y-px hover:shadow-md transition-all focus:outline-none disabled:opacity-50"
                        >
                            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Añadir
                        </button>
                    </form>
                </div>

                {/* Package List */}
                <div className="flex-1 overflow-y-auto bg-slate-50/30 p-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                            <p className="text-sm font-medium text-slate-500">Cargando paquetes del consolidado...</p>
                        </div>
                    ) : paquetes.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">Consolidado Vacío</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto">Escanea un tracking arriba para empezar a estructurar la carga.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {paquetes.map((p) => (
                                <div key={p.id} className="group relative flex items-center justify-between p-4 bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-blue-200">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate pr-2 tracking-tight">{p.tracking}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-0.5 flex gap-2">
                                                <span><span className="font-semibold text-slate-600">{p.clientes?.locker_id || 'N/A'}</span> ({p.clientes?.nombre} {p.clientes?.apellido})</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-semibold text-amber-600">{p.peso_lbs} lbs</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemovePackage(p.id)}
                                        disabled={actionLoading === p.id}
                                        className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                                        title="Quitar paquete del consolidado"
                                    >
                                        {actionLoading === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                {!loading && paquetes.length > 0 && (
                    <div className="px-5 py-4 border-t border-slate-100 bg-white flex justify-between items-center text-sm">
                        <p className="font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">Total: <span className="text-blue-600">{paquetes.length} paquetes</span></p>
                        <p className="font-bold text-slate-600 bg-amber-50 px-3 py-1 rounded-lg">Peso: <span className="text-amber-600">{paquetes.reduce((acc, p) => acc + (Number(p.peso_lbs) || 0), 0).toFixed(2)} lbs</span></p>
                    </div>
                )}

            </div>
        </div>
    );
}
