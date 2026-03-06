import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Search, FileText, CheckCircle2, Clock, XCircle, DollarSign, HandCoins, PlusCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PreAlertsAdmin() {
    const { user } = useAuth();
    const [prealertas, setPrealertas] = useState<any[]>([]);
    const [fondoTotal, setFondoTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Admin manage modal
    const [selectedPrealerta, setSelectedPrealerta] = useState<any | null>(null);
    const [procesando, setProcesando] = useState(false);

    // --- NEW: Manual pre-alert creation state ---
    const [showNewModal, setShowNewModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTracking, setNewTracking] = useState('');
    const [newBodegaId, setNewBodegaId] = useState('');
    const [newValorFactura, setNewValorFactura] = useState('');
    const [newConSeguro, setNewConSeguro] = useState(false);
    const [bodegas, setBodegas] = useState<any[]>([]);

    // Client search for new modal
    const [newClientSearch, setNewClientSearch] = useState('');
    const [newClientResults, setNewClientResults] = useState<any[]>([]);
    const [newSelectedClient, setNewSelectedClient] = useState<any | null>(null);
    const [searchingClient, setSearchingClient] = useState(false);
    const [showClientDrop, setShowClientDrop] = useState(false);
    const clientSearchRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Prealertas
            const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
            let query = supabase
                .from('prealertas')
                .select(`
          *,
          clientes!inner (
            nombre,
            apellido,
            locker_id,
            sucursal_id
          ),
          bodegas (
            nombre
          )
        `)
                .order('created_at', { ascending: false });

            if (!isSuperAdmin && user?.sucursal_id) {
                query = query.eq('clientes.sucursal_id', user.sucursal_id);
            }

            const { data: prealertaData, error: pError } = await query;

            if (pError) throw pError;
            setPrealertas(prealertaData || []);

            // Fetch Fondo Sum
            const { data: fondoData, error: fError } = await supabase
                .from('fondo_seguros')
                .select('monto_ingreso');

            if (fError) throw fError;

            const total = fondoData?.reduce((acc, obj) => acc + Number(obj.monto_ingreso), 0) || 0;
            setFondoTotal(total);

            // Fetch Bodegas for new modal
            const { data: bodegaData } = await supabase.from('bodegas').select('id, nombre').eq('activo', true);
            setBodegas(bodegaData || []);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcesar = async (prealerta: any, estadoDestino: string) => {
        try {
            setProcesando(true);

            if (estadoDestino === 'procesada' && prealerta.con_seguro) {
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

            const { error: updError } = await supabase
                .from('prealertas')
                .update({ estado: estadoDestino })
                .eq('id', prealerta.id);

            if (updError) throw updError;

            setSelectedPrealerta(null);
            fetchData();

        } catch (err) {
            console.error('Error procesando:', err);
        } finally {
            setProcesando(false);
        }
    };

    // --- Client search for new modal ---
    const handleNewClientSearch = (text: string) => {
        setNewClientSearch(text);
        setNewSelectedClient(null);
        if (!text) { setNewClientResults([]); setShowClientDrop(false); return; }
        if (clientSearchRef.current) clearTimeout(clientSearchRef.current);
        setShowClientDrop(true);
        setSearchingClient(true);
        clientSearchRef.current = setTimeout(async () => {
            try {
                const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
                let clientQuery = supabase
                    .from('clientes')
                    .select('id, nombre, apellido, locker_id')
                    .or(`locker_id.ilike.%${text}%,nombre.ilike.%${text}%,apellido.ilike.%${text}%`)
                    .limit(10);

                if (!isSuperAdmin && user?.sucursal_id) {
                    clientQuery = clientQuery.eq('sucursal_id', user.sucursal_id);
                }

                const { data } = await clientQuery;
                setNewClientResults(data || []);
            } finally {
                setSearchingClient(false);
            }
        }, 400);
    };

    const selectNewClient = (c: any) => {
        setNewSelectedClient(c);
        setNewClientSearch(`${c.locker_id} - ${c.nombre} ${c.apellido}`);
        setShowClientDrop(false);
    };

    const resetNewModal = () => {
        setNewTracking('');
        setNewBodegaId('');
        setNewValorFactura('');
        setNewConSeguro(false);
        setNewClientSearch('');
        setNewSelectedClient(null);
        setNewClientResults([]);
    };

    const handleCreatePrealerta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSelectedClient) { alert('Selecciona un cliente.'); return; }
        if (!newTracking.trim()) { alert('El tracking es requerido.'); return; }
        if (!newValorFactura || isNaN(Number(newValorFactura))) { alert('Ingresa un valor de factura válido.'); return; }

        setSaving(true);
        try {
            const valorNum = parseFloat(newValorFactura);
            const montoSeguro = newConSeguro ? parseFloat((valorNum * 0.10).toFixed(2)) : 0;

            const { error } = await supabase.from('prealertas').insert({
                cliente_id: newSelectedClient.id,
                tracking: newTracking.trim().toUpperCase(),
                bodega_id: newBodegaId || null,
                valor_factura: valorNum,
                con_seguro: newConSeguro,
                monto_seguro: montoSeguro,
                estado: 'pendiente',
                factura_url: null,
            });

            if (error) throw error;

            setShowNewModal(false);
            resetNewModal();
            fetchData();
        } catch (err: any) {
            console.error('Error creating prealerta:', err);
            alert('Error al crear la pre-alerta: ' + err.message);
        } finally {
            setSaving(false);
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
                {/* CTA button */}
                <button
                    onClick={() => setShowNewModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                    <PlusCircle className="w-4 h-4" />
                    Nueva Pre-Alerta
                </button>
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

            {/* ── NEW MANUAL PRE-ALERT MODAL ── */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowNewModal(false); resetNewModal(); }} />
                    <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-visible animate-in zoom-in-95">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                    <PlusCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Nueva Pre-Alerta Manual</h3>
                                    <p className="text-xs text-slate-500">Registrar una pre-alerta en nombre de un cliente</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowNewModal(false); resetNewModal(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePrealerta} className="p-6 space-y-4 overflow-visible">
                            {/* Client search */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cliente (Casillero) *</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por casillero o nombre..."
                                        value={newClientSearch}
                                        onChange={e => handleNewClientSearch(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowClientDrop(false), 200)}
                                        autoComplete="off"
                                        className={`block w-full rounded-xl py-2.5 pl-9 pr-4 text-sm font-semibold outline-none border transition-all ${newSelectedClient ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-slate-800'
                                            } focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500`}
                                    />
                                    {searchingClient && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
                                </div>
                                {showClientDrop && newClientResults.length > 0 && (
                                    <div className="absolute z-[200] w-full mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 max-h-48 overflow-auto">
                                        {newClientResults.map(c => (
                                            <div
                                                key={c.id}
                                                onMouseDown={e => { e.preventDefault(); selectNewClient(c); }}
                                                className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                            >
                                                <span className="font-extrabold text-blue-700 text-xs bg-blue-100 px-2 py-1 rounded-lg">{c.locker_id}</span>
                                                <span className="text-sm text-slate-700 font-semibold truncate">{c.nombre} {c.apellido}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tracking + Bodega */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tracking *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTracking}
                                        onChange={e => setNewTracking(e.target.value)}
                                        placeholder="Ej: 1Z999AA10123456784"
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bodega</label>
                                    <select
                                        value={newBodegaId}
                                        onChange={e => setNewBodegaId(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    >
                                        <option value="">Sin bodega</option>
                                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Valor + Insurance toggle */}
                            <div className="grid grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Valor Declarado ($) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={newValorFactura}
                                        onChange={e => setNewValorFactura(e.target.value)}
                                        placeholder="0.00"
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Seguro (10%)</label>
                                    <button
                                        type="button"
                                        onClick={() => setNewConSeguro(v => !v)}
                                        className={`w-full py-2 rounded-xl text-sm font-bold border transition-all ${newConSeguro
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                                            }`}
                                    >
                                        {newConSeguro ? `✓ Con seguro (+$${newValorFactura ? (parseFloat(newValorFactura) * 0.10).toFixed(2) : '0.00'})` : 'Sin seguro'}
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowNewModal(false); resetNewModal(); }}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !newSelectedClient || !newTracking.trim()}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                    Crear Pre-Alerta
                                </button>
                            </div>
                        </form>
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
