import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { FileUp, Shield, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PreAlertModal } from '../components/PreAlertModal';

export function ClientPreAlerts() {
    const { user } = useAuth();
    const [prealertas, setPrealertas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (user?.id && !showModal) {
            fetchPrealertas();
        }
    }, [user?.id, showModal]);

    const fetchPrealertas = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('prealertas')
                .select(`
          *,
          bodegas (
            nombre
          )
        `)
                .eq('cliente_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPrealertas(data || []);
        } catch (err) {
            console.error('Error fetching prealertas:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Mis Pre-Alertas</h1>
                    <p className="text-sm text-slate-500 mt-1">Historial de paquetes pre-alertados antes de su llegada.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    <FileUp className="w-4 h-4" />
                    Nueva Pre-Alerta
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Tracking</th>
                                <th className="p-4">Bodega</th>
                                <th className="p-4">Valor Eq.</th>
                                <th className="p-4">Seguro</th>
                                <th className="p-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Cargando historial...
                                    </td>
                                </tr>
                            ) : prealertas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <FileUp className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">Aún no tienes pre-alertas</h3>
                                        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
                                            Notifícanos antes de que tu paquete llegue a nuestras bodegas y asegúralo.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                prealertas.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-600">
                                            {format(new Date(p.created_at), "d MMM, yyyy", { locale: es })}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-sm">{p.tracking}</span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 flex items-center gap-1.5 pt-4">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            {p.bodegas?.nombre || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800">${Number(p.valor_factura).toFixed(2)}</span>
                                        </td>
                                        <td className="p-4">
                                            {p.con_seguro ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                    <Shield className="w-3 h-3" />
                                                    Sí (+${Number(p.monto_seguro).toFixed(2)})
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-sm">No</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${p.estado === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    p.estado === 'procesada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        p.estado === 'recibido' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PreAlertModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
}
