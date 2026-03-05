import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Search, FileText, CheckCircle2, Clock, XCircle, DollarSign, HandCoins } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PreAlertsAdmin() {
    const { user } = useAuth();
    const [prealertas, setPrealertas] = useState<any[]>([]);
    const [fondoTotal, setFondoTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal actions
    const [selectedPrealerta, setSelectedPrealerta] = useState<any | null>(null);
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Prealertas
            const { data: prealertaData, error: pError } = await supabase
                .from('prealertas')
                .select(`
          *,
          clientes (
            nombre,
            apellido,
            locker_id
          ),
          bodegas (
            nombre
          )
        `)
                .order('created_at', { ascending: false });

            if (pError) throw pError;
            setPrealertas(prealertaData || []);

            // Fetch Fondo Sum
            const { data: fondoData, error: fError } = await supabase
                .from('fondo_seguros')
                .select('monto_ingreso');

            if (fError) throw fError;

            const total = fondoData?.reduce((acc, obj) => acc + Number(obj.monto_ingreso), 0) || 0;
            setFondoTotal(total);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcesar = async (prealerta: any, estadoDestino: string) => {
        try {
            setProcesando(true);

            // Si se está marcando como "procesada" y tiene seguro, ingresarlo al fondo
            if (estadoDestino === 'procesada' && prealerta.con_seguro) {
                // Verificar si ya existe en el fondo para no duplicar
                const { data: existing } = await supabase
                    .from('fondo_seguros')
                    .select('id')
                    .eq('prealerta_id', prealerta.id)
                    .single();

                if (!existing) {
                    const { error: insError } = await supabase
                        .from('fondo_seguros')
                        .insert({
                            prealerta_id: prealerta.id,
                            monto_ingreso: prealerta.monto_seguro,
                            metodo_pago: 'transferencia',
                            referencia: 'Aprobación manual de Admin',
                            verificado_por: user?.id
                        });
                    if (insError) throw insError;
                }
            }

            // Update state
            const { error: updError } = await supabase
                .from('prealertas')
                .update({ estado: estadoDestino })
                .eq('id', prealerta.id);

            if (updError) throw updError;

            setSelectedPrealerta(null);
            fetchData(); // Recargar todo

        } catch (err) {
            console.error('Error procesando:', err);
            // alert('Error...'); (Could use an alert context here)
        } finally {
            setProcesando(false);
        }
    };

    const filteredData = prealertas.filter(p =>
        p.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientes?.locker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Control de Pre-Alertas</h1>
                    <p className="text-sm text-slate-500 mt-1">Valida prealertas y administra el Fondo Fijo de Seguros.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Pre-Alertas Pendientes</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">
                                {prealertas.filter(p => p.estado === 'pendiente').length}
                            </h3>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-6 shadow-md relative overflow-hidden text-white sm:col-span-2 lg:col-span-2">
                    <div className="absolute -right-6 -top-6 h-32 w-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-blue-100 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Fondo Fijo de Seguro (Ingresos Acumulados)
                            </p>
                            <h3 className="text-4xl font-bold mt-2">
                                $&nbsp;{fondoTotal.toFixed(2)}
                            </h3>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm">
                            <HandCoins className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-xs text-blue-200 mt-2 relative z-10 opacity-80">
                        Monto de protección recaudado (10% de cada paquete asegurado validado).
                    </p>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por tracking, cliente, casillero..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Tracking & Bodega</th>
                                <th className="p-4">Valor Eq.</th>
                                <th className="p-4">Seguro</th>
                                <th className="p-4 text-center">Factura</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Clock className="w-6 h-6 animate-spin mx-auto mb-2" /> Cargando...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-500 font-medium">No hay prealertas coincidiendo.</td></tr>
                            ) : (
                                filteredData.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 text-sm text-slate-600">
                                            {format(new Date(p.created_at), "d MMM, yyyy - HH:mm", { locale: es })}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-semibold text-slate-800">{p.clientes?.locker_id}</div>
                                            <div className="text-xs text-slate-500">{p.clientes?.nombre} {p.clientes?.apellido}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs select-all inline-block mb-1 border border-slate-200">{p.tracking}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {p.bodegas?.nombre || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800">${Number(p.valor_factura).toFixed(2)}</span>
                                        </td>
                                        <td className="p-4">
                                            {p.con_seguro ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                                                    <Shield className="w-3 h-3" />
                                                    Sí (+${Number(p.monto_seguro).toFixed(2)})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                                    No
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <a href={p.factura_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors" title="Ver archivo">
                                                <FileText className="w-4 h-4" />
                                            </a>
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
                                        <td className="p-4">
                                            <button
                                                onClick={() => setSelectedPrealerta(p)}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                                            >
                                                Administrar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Admin Validation Modal */}
            {selectedPrealerta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPrealerta(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Administrar Pre-Alerta</h3>
                            <button onClick={() => setSelectedPrealerta(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-slate-500 uppercase font-semibold">Tracking</p>
                                <p className="font-bold text-slate-800 break-all">{selectedPrealerta.tracking}</p>
                            </div>

                            {selectedPrealerta.con_seguro && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
                                    <p className="font-semibold text-blue-900 flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Seguro Solicitado
                                    </p>
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        El cliente debe haber enviado un comprobante por <b>${Number(selectedPrealerta.monto_seguro).toFixed(2)}</b> (10% de ${selectedPrealerta.valor_factura}) a tu WhatsApp. Revisa el banco.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-medium text-slate-700">Cambiar Estado:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleProcesar(selectedPrealerta, 'procesada')}
                                        disabled={procesando}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Validar/Procesar
                                    </button>
                                    <button
                                        onClick={() => handleProcesar(selectedPrealerta, 'recibido')}
                                        disabled={procesando}
                                        className="bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                                    >
                                        Marcar Recibido
                                    </button>
                                    <button
                                        onClick={() => handleProcesar(selectedPrealerta, 'rechazada')}
                                        disabled={procesando}
                                        className="col-span-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 focus:ring-4 focus:ring-rose-50 p-2 text-sm rounded-xl font-medium transition-all"
                                    >
                                        Rechazar Pre-Alerta
                                    </button>
                                </div>
                                {selectedPrealerta.con_seguro && selectedPrealerta.estado !== 'procesada' && (
                                    <p className="text-[10px] text-slate-400 text-center mt-2">
                                        Al "Validar/Procesar", el monto del seguro se agregará automáticamente al Fondo Fijo.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// MapPin helper icon component
function MapPin(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}
