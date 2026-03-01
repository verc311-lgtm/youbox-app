import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Layers, Search, MapPin, Calendar, ExternalLink, ChevronRight, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrackingDialog } from './TrackingDialog';
import { BulkInvoiceModal } from './billing/BulkInvoiceModal';
import { useAuth } from '../context/AuthContext';

interface Consolidacion {
    id: string;
    codigo: string;
    estado: string;
    peso_total_lbs: number;
    created_at: string;
    bodegas: { id: string, nombre: string } | null;
    zonas: { id: string, nombre: string } | null;
    paquetes_count?: number;
}

export function ConsolidationsList() {
    const [consolidaciones, setConsolidaciones] = useState<Consolidacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog state
    const [trackingId, setTrackingId] = useState<string | null>(null);
    const [trackingCodigo, setTrackingCodigo] = useState('');

    // Bulk Invoice Modal State
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [selectedConsolidationId, setSelectedConsolidationId] = useState('');
    const [selectedBodegaId, setSelectedBodegaId] = useState('');

    const { user, isAdmin } = useAuth();

    useEffect(() => {
        fetchConsolidaciones();
    }, []);

    async function fetchConsolidaciones() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('consolidaciones')
                .select(`
          id, codigo, estado, peso_total_lbs, created_at,
          bodegas(id, nombre),
          zonas(id, nombre),
          consolidacion_paquetes(count)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((d: any) => ({
                id: d.id,
                codigo: d.codigo,
                estado: d.estado,
                peso_total_lbs: d.peso_total_lbs,
                created_at: d.created_at,
                bodegas: Array.isArray(d.bodegas) ? d.bodegas[0] : d.bodegas,
                zonas: Array.isArray(d.zonas) ? d.zonas[0] : d.zonas,
                paquetes_count: Array.isArray(d.consolidacion_paquetes) ? d.consolidacion_paquetes[0]?.count || 0 : d.consolidacion_paquetes?.count || 0
            }));
            setConsolidaciones(formatted as Consolidacion[]);
        } catch (e) {
            console.error('Error fetching consolidaciones:', e);
        } finally {
            setLoading(false);
        }
    }

    const openTracking = (id: string, codigo: string) => {
        setTrackingId(id);
        setTrackingCodigo(codigo);
    };

    const openInvoiceModal = (consId: string, bodegaId: string) => {
        setSelectedConsolidationId(consId);
        setSelectedBodegaId(bodegaId);
        setInvoiceModalOpen(true);
    };

    const getStatusColor = (estado: string) => {
        switch (estado) {
            case 'abierta': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'en_transito': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'entregada': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const filtered = consolidaciones.filter(c =>
        c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
            {/* List Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass p-4 rounded-2xl w-full">
                <div className="relative w-full sm:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por código de Consolidado o Estatus..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
                    />
                </div>
                <button
                    onClick={fetchConsolidaciones}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-white hover:shadow-md transition-all duration-200 w-full sm:w-auto"
                >
                    Refrescar Lista
                </button>
            </div>

            {/* List View */}
            <div className="rounded-2xl glass overflow-hidden flex flex-col min-w-0">
                {loading ? (
                    <div className="flex justify-center flex-col items-center py-20 px-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-4"></div>
                        <p className="text-slate-500 text-sm font-medium">Sincronizando bitácora maestra...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Layers className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700">No hay consolidados</h3>
                        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">Todavía no has agrupado ningún envío maestro.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200/60">
                            <thead className="bg-slate-50/50 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle del Consolidado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Ruta</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Estatus Actual</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Carga</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white/40 divide-y divide-slate-100">
                                {filtered.map((cons, index) => (
                                    <tr key={cons.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${index * 50}ms` }}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 shrink-0 hidden sm:flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 p-2.5 shadow-sm group-hover:scale-105 transition-transform">
                                                    <Truck className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 tracking-tight">{cons.codigo}</p>
                                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(cons.created_at), "dd MMM yyyy", { locale: es })}
                                                    </p>
                                                    {/* Mobile only details */}
                                                    <div className="sm:hidden flex flex-col gap-1 mt-2">
                                                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(cons.estado)}`}>
                                                            {cons.estado.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-xs text-slate-400 truncate max-w-[150px]">{cons.bodegas?.nombre} → {cons.zonas?.nombre}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                            <div className="flex flex-col text-sm text-slate-600 space-y-1">
                                                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> <span className="font-semibold text-slate-700">Origen:</span> {cons.bodegas?.nombre || 'N/A'}</span>
                                                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> <span className="font-semibold text-slate-700">Destino:</span> {cons.zonas?.nombre || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wide shadow-sm ${getStatusColor(cons.estado)}`}>
                                                {cons.estado.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center gap-1">
                                            <p className="text-sm font-bold text-slate-800 bg-slate-100 inline-block px-2 py-0.5 rounded-md">{cons.paquetes_count} <span className="text-xs text-slate-500 font-medium">Paquetes</span></p>
                                            <p className="text-xs font-bold text-slate-500 mt-1">{cons.peso_total_lbs?.toFixed(2)} lbs</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {isAdmin && cons.bodegas && (
                                                    <button
                                                        onClick={() => openInvoiceModal(cons.id, (cons.bodegas as any).id)}
                                                        className="inline-flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-200 font-bold shadow-sm"
                                                        title="Generar Facturas"
                                                    >
                                                        <Layers className="h-4 w-4" /> <span className="hidden lg:inline">Facturar Lote</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openTracking(cons.id, cons.codigo)}
                                                    className="inline-flex items-center justify-center gap-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-200 font-bold shadow-sm"
                                                >
                                                    <ExternalLink className="h-4 w-4" /> <span className="hidden lg:inline">Tracking</span>
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

            {trackingId && (
                <TrackingDialog
                    consolidacionId={trackingId}
                    codigoMaster={trackingCodigo}
                    onClose={() => setTrackingId(null)}
                    onUpdate={fetchConsolidaciones}
                />
            )}

            {invoiceModalOpen && (
                <BulkInvoiceModal
                    isOpen={invoiceModalOpen}
                    onClose={() => setInvoiceModalOpen(false)}
                    onSuccess={() => {
                        fetchConsolidaciones();
                    }}
                    consolidacionId={selectedConsolidationId}
                    bodegaId={selectedBodegaId}
                />
            )}
        </div>
    );
}
