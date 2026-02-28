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
    bodegas: { nombre: string } | null;
    zonas: { nombre: string } | null;
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

    const { user } = useAuth();
    const isAdmin = user?.rol === 'admin';

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
          bodegas(nombre),
          zonas(nombre),
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
        <div className="space-y-6">
            {/* List Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código de Consolidado o Estatus..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={fetchConsolidaciones}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                    Refrescar Lista
                </button>
            </div>

            {/* List View */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center flex-col items-center py-20 px-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
                        <p className="text-slate-500 text-sm font-medium">Cargando bitácora maestra...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <Layers className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-sm font-semibold text-slate-900">No hay consolidados</h3>
                        <p className="mt-1 text-sm text-slate-500">Todavía no has agrupado ningún envío maestro.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle del Consolidado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ruta</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estatus Actual</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Carga</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filtered.map(cons => (
                                    <tr key={cons.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                                                    <Truck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{cons.codigo}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(cons.created_at), "dd MMM yyyy", { locale: es })}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-slate-600 space-y-1">
                                                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-400" /> <b>Origen:</b> {cons.bodegas?.nombre || 'N/A'}</span>
                                                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-400" /> <b>Destino:</b> {cons.zonas?.nombre || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${getStatusColor(cons.estado)}`}>
                                                {cons.estado.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <p className="text-sm font-bold text-slate-800">{cons.paquetes_count} Paquetes</p>
                                            <p className="text-xs font-medium text-slate-500">{cons.peso_total_lbs?.toFixed(2)} lbs</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {isAdmin && cons.bodegas && (
                                                    <button
                                                        onClick={() => openInvoiceModal(cons.id, (cons.bodegas as any).id)}
                                                        className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm"
                                                        title="Generar Facturas"
                                                    >
                                                        <Layers className="h-4 w-4" /> Facturar Lote
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openTracking(cons.id, cons.codigo)}
                                                    className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm"
                                                >
                                                    <ExternalLink className="h-4 w-4" /> Tracking Master
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
