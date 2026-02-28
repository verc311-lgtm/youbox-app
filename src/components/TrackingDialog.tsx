import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Clock, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, Truck, PackageCheck, Building2, Smartphone, Send, Calendar as CalIcon, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface TrackingDialogProps {
    consolidacionId: string;
    codigoMaster: string;
    onClose: () => void;
    onUpdate: () => void;
}

interface HistorialEstado {
    id: string;
    estado: string;
    ciudad: string | null;
    comentario: string | null;
    notificar_wa: boolean;
    notificar_email: boolean;
    fecha_evento: string;
    usuarios?: { nombre: string; apellido: string };
}

const OPCIONES_ESTADO = [
    'Creado',
    'En tránsito',
    'SAT',
    'Pago de Impuestos',
    'Oficina Quetzaltenango',
    'Entregado',
    'ALERTA',
    'SEGURO',
    'Update Mobile'
];

export function TrackingDialog({ consolidacionId, codigoMaster, onClose, onUpdate }: TrackingDialogProps) {
    const { user } = useAuth();
    const [historial, setHistorial] = useState<HistorialEstado[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [nuevoEstado, setNuevoEstado] = useState(OPCIONES_ESTADO[0]);
    const [fechaEvento, setFechaEvento] = useState(new Date().toISOString().split('T')[0]);
    const [ciudad, setCiudad] = useState('');
    const [comentario, setComentario] = useState('');
    const [notifyWA, setNotifyWA] = useState(false);
    const [notifyEmail, setNotifyEmail] = useState(false);

    useEffect(() => {
        fetchHistorial();
    }, [consolidacionId]);

    async function fetchHistorial() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('historial_consolidaciones')
                .select(`*, usuarios(nombre, apellido)`)
                .eq('consolidacion_id', consolidacionId)
                .order('fecha_evento', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistorial(data || []);
        } catch (e: any) {
            console.error('Error fetching tracking history:', e);
        } finally {
            setLoading(false);
        }
    }

    const handleGuardarEstatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoEstado || !fechaEvento) {
            alert("Completar campos obligatorios (Fecha y Estado).");
            return;
        }

        setSaving(true);
        try {
            // 1. Insert History
            const { error: histError } = await supabase.from('historial_consolidaciones').insert([{
                consolidacion_id: consolidacionId,
                estado: nuevoEstado,
                ciudad: ciudad || null,
                comentario: comentario || null,
                notificar_wa: notifyWA,
                notificar_email: notifyEmail,
                creado_por: user?.id,
                fecha_evento: new Date(fechaEvento).toISOString()
            }]);

            if (histError) throw histError;

            // 2. Update Master state in consolidaciones manually
            const masterStateMap: Record<string, string> = {
                'Creado': 'abierta',
                'En tránsito': 'en_transito',
                'Entregado': 'entregada'
            };

            const mappedMasterState = masterStateMap[nuevoEstado] || 'en_transito'; // fallback to en_transito for intermediary states

            await supabase.from('consolidaciones').update({ estado: mappedMasterState }).eq('id', consolidacionId);

            // 3. (NEW) Cascading Tracking Updates to Individual Packages
            // A) Buscar todos los IDs de paquetes dentro de esta consolidación
            const { data: pivotData } = await supabase
                .from('consolidacion_paquetes')
                .select('paquete_id')
                .eq('consolidacion_id', consolidacionId);

            if (pivotData && pivotData.length > 0) {
                const packageIds = pivotData.map(p => p.paquete_id);

                // B) Map intermediate states to actual `paquetes.estado` constraint states 
                let paqueteEstadoDestino = '';
                if (nuevoEstado === 'Creado') paqueteEstadoDestino = 'consolidado';
                else if (['En tránsito', 'SAT', 'Pago de Impuestos', 'Oficina Quetzaltenango'].includes(nuevoEstado)) paqueteEstadoDestino = 'en_transito';
                else if (nuevoEstado === 'Entregado') paqueteEstadoDestino = 'entregado';

                // C) Actualizar el estado de los paquetes 
                if (paqueteEstadoDestino) {
                    await supabase
                        .from('paquetes')
                        .update({ estado: paqueteEstadoDestino })
                        .in('id', packageIds);
                }

                // D) Insertar eventos históricos individuales para legibilidad del cliente
                const historyEntries = packageIds.map(pid => ({
                    paquete_id: pid,
                    estado_anterior: 'Actualización Automática',
                    estado_nuevo: paqueteEstadoDestino || 'en_transito',
                    usuario_id: user?.id,
                    notas: `[Actualización de Contenedor Master ${codigoMaster}] - ${nuevoEstado}${ciudad ? ` en ${ciudad}` : ''}. ${comentario ? comentario : ''}`.trim()
                }));

                await supabase.from('historial_estados').insert(historyEntries);
            }

            // Refresh
            setCiudad('');
            setComentario('');
            setNotifyWA(false);
            setNotifyEmail(false);
            await fetchHistorial();
            onUpdate();

        } catch (err: any) {
            alert('Error guardando estatus: ' + err.message);
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Creado': return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
            case 'En tránsito': return <Truck className="h-5 w-5 text-blue-500" />;
            case 'SAT': return <Building2 className="h-5 w-5 text-orange-500" />;
            case 'Pago de Impuestos': return <ShieldCheck className="h-5 w-5 text-indigo-500" />;
            case 'Oficina Quetzaltenango': return <MapPin className="h-5 w-5 text-teal-600" />;
            case 'Entregado': return <PackageCheck className="h-5 w-5 text-green-600" />;
            case 'ALERTA': return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case 'SEGURO': return <ShieldCheck className="h-5 w-5 text-blue-700" />;
            case 'Update Mobile': return <Smartphone className="h-5 w-5 text-slate-600" />;
            default: return <Clock className="h-5 w-5 text-slate-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Estatus de Consolidado</h2>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Master: <span className="text-blue-600 font-bold">{codigoMaster}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Panel Izquierdo: Formulario de Nuevo Estatus */}
                    <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-slate-100 bg-white">
                        <div className="mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                <Send className="h-4 w-4" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Nuevo Estatus</h3>
                        </div>

                        <form onSubmit={handleGuardarEstatus} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 hover:text-blue-600 cursor-pointer group">
                                        <CalIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" /> Fecha <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={fechaEvento}
                                        onChange={e => setFechaEvento(e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                        Estado <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={nuevoEstado}
                                        onChange={e => setNuevoEstado(e.target.value)}
                                        className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-medium h-10 px-3 bg-slate-50"
                                    >
                                        {OPCIONES_ESTADO.map(op => (
                                            <option key={op} value={op}>{op}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> Ciudad / Ubicación
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. Aduana Tecún Umán"
                                    value={ciudad}
                                    onChange={e => setCiudad(e.target.value)}
                                    className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3"
                                    list="ciudades-sugeridas"
                                />
                                <datalist id="ciudades-sugeridas">
                                    <option value="Laredo, TX" />
                                    <option value="Tapachula" />
                                    <option value="Ciudad de Guatemala" />
                                    <option value="Quetzaltenango" />
                                </datalist>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> Comentario
                                </label>
                                <textarea
                                    rows={3}
                                    value={comentario}
                                    onChange={e => setComentario(e.target.value)}
                                    placeholder="Instrucciones, notas de aduana o detalles del atraso..."
                                    className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notificaciones a Clientes</p>
                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={notifyWA}
                                            onChange={e => setNotifyWA(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-green-700 transition-colors">
                                            Enviar notificación por <b>WhatsApp</b>
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={notifyEmail}
                                            onChange={e => setNotifyEmail(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                            Enviar notificación por <b>Correo Automático</b>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Registrando Estatus...' : 'Añadir Estatus'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Panel Derecho: Línea de Tiempo */}
                    <div className="w-full md:w-1/2 bg-slate-50 overflow-y-auto p-6 relative">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 sticky top-0 bg-slate-50/90 backdrop-blur z-10 pb-2">
                            Línea de Tiempo Operativa
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                            </div>
                        ) : historial.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="mx-auto h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                                    <Clock className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500 font-medium">No se han registrado movimientos todavía.</p>
                            </div>
                        ) : (
                            <div className="flow-root">
                                <ul role="list" className="-mb-8">
                                    {historial.map((evento, eventIdx) => (
                                        <li key={evento.id}>
                                            <div className="relative pb-8">
                                                {eventIdx !== historial.length - 1 ? (
                                                    <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                                                ) : null}
                                                <div className="relative flex items-start space-x-3">
                                                    <div className={`relative px-1 ${eventIdx === 0 ? 'bg-blue-50' : 'bg-slate-50'} rounded-full ring-8 ring-white flex h-8 w-8 items-center justify-center shadow-sm`}>
                                                        {getStatusIcon(evento.estado)}
                                                    </div>
                                                    <div className="min-w-0 flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm ml-2 relative group">
                                                        <div className="text-sm mb-1">
                                                            <span className="font-bold text-slate-900 mr-2">{evento.estado}</span>
                                                            {evento.ciudad && (
                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                                    <MapPin className="h-3 w-3" /> {evento.ciudad}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {evento.comentario && (
                                                            <p className="mt-2 text-sm text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                                                "{evento.comentario}"
                                                            </p>
                                                        )}

                                                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
                                                            <span className="flex items-center gap-1">
                                                                <CalIcon className="h-3.5 w-3.5" />
                                                                {format(new Date(evento.fecha_evento || evento.created_at), "dd MMM yyyy 'a las' HH:mm")}
                                                            </span>
                                                            <span>por {evento.usuarios ? `${evento.usuarios.nombre} ${evento.usuarios.apellido}` : 'Sistema'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
