import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Search, FileText, CheckCircle2, Clock, XCircle, DollarSign, HandCoins, PlusCircle, Loader2, Upload, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';

export function PreAlertsAdmin() {
    const { user } = useAuth();
    const [prealertas, setPrealertas] = useState<any[]>([]);
    const [fondoTotal, setFondoTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('todas');

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
    const [newFile, setNewFile] = useState<File | null>(null);
    const [bodegas, setBodegas] = useState<any[]>([]);

    // Client search for new modal
    const [newClientSearch, setNewClientSearch] = useState('');
    const [newClientResults, setNewClientResults] = useState<any[]>([]);
    const [newSelectedClient, setNewSelectedClient] = useState<any | null>(null);
    const [searchingClient, setSearchingClient] = useState(false);
    const [showClientDrop, setShowClientDrop] = useState(false);
    const clientSearchRef = useRef<NodeJS.Timeout>();

    // --- EDIT modal state ---
    const [editPrealerta, setEditPrealerta] = useState<any | null>(null);
    const [editTracking, setEditTracking] = useState('');
    const [editBodegaId, setEditBodegaId] = useState('');
    const [editValor, setEditValor] = useState('');
    const [editConSeguro, setEditConSeguro] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    const openEdit = (p: any) => {
        setEditPrealerta(p);
        setEditTracking(p.tracking || '');
        setEditBodegaId(p.bodega_id || '');
        setEditValor(String(p.valor_factura || ''));
        setEditConSeguro(!!p.con_seguro);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPrealerta) return;
        setEditSaving(true);
        try {
            const valorNum = parseFloat(editValor);
            const montoSeguro = editConSeguro ? parseFloat((valorNum * 0.05).toFixed(2)) : 0;
            const { error } = await supabase.from('prealertas').update({
                tracking: editTracking.trim().toUpperCase(),
                bodega_id: editBodegaId || null,
                valor_factura: valorNum,
                con_seguro: editConSeguro,
                monto_seguro: montoSeguro,
            }).eq('id', editPrealerta.id);
            if (error) throw error;
            setEditPrealerta(null);
            fetchData();
        } catch (err: any) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setEditSaving(false);
        }
    };

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
                    .maybeSingle();

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

                // Generate & download insurance receipt PDF
                generateInsuranceReceipt(prealerta);
            }

            const { error: updError } = await supabase
                .from('prealertas')
                .update({ estado: estadoDestino })
                .eq('id', prealerta.id);

            if (updError) throw updError;

            setSelectedPrealerta(null);
            fetchData();

        } catch (err: any) {
            console.error('Error procesando:', err);
            alert('Error al validar: ' + (err.message || JSON.stringify(err)));
        } finally {
            setProcesando(false);
        }
    };

    const generateInsuranceReceipt = (prealerta: any) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a5' });
        const W = doc.internal.pageSize.getWidth();
        const grayLight = '#f1f5f9';
        const blue = '#1e40af';
        const teal = '#0f766e';

        // ── Background header band ──────────────────────────
        doc.setFillColor(30, 64, 175); // blue-800
        doc.rect(0, 0, W, 38, 'F');

        // Logo text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('YOUBOX GT', W / 2, 15, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Recibo de Seguro de Paquete', W / 2, 22, { align: 'center' });
        doc.text('youboxgt.com', W / 2, 30, { align: 'center' });

        // ── Receipt box ─────────────────────────────────────
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(10, 44, W - 20, 30, 3, 3, 'F');
        doc.setTextColor(15, 118, 110); // teal-700
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PÓLIZA ACTIVA — SEGURO CUBIERTO', W / 2, 54, { align: 'center' });
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(22);
        doc.text(`$${Number(prealerta.monto_seguro).toFixed(2)}`, W / 2, 66, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Prima de seguro pagada (USD)', W / 2, 72, { align: 'center' });

        // ── Details table ───────────────────────────────────
        const rows = [
            ['Tracking', prealerta.tracking],
            ['Cliente', `${prealerta.clientes?.locker_id || ''} – ${prealerta.clientes?.nombre || ''} ${prealerta.clientes?.apellido || ''}`],
            ['Bodega', prealerta.bodegas?.nombre || 'N/A'],
            ['Valor Declarado', `$${Number(prealerta.valor_factura).toFixed(2)}`],
            ['Cobertura Máxima', `$${Number(prealerta.valor_factura).toFixed(2)}`],
            ['Fecha de Validación', format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })],
            ['Aprobado por', user?.nombre || 'Admin'],
        ];

        let y = 82;
        rows.forEach(([label, value], i) => {
            if (i % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(10, y - 4, W - 20, 8, 'F');
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(label + ':', 14, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(String(value), 60, y);
            y += 9;
        });

        // ── Footer ──────────────────────────────────────────
        doc.setFillColor(30, 64, 175);
        doc.rect(0, doc.internal.pageSize.getHeight() - 16, W, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Este recibo es prueba de pago del seguro de tu paquete con YouBox GT.', W / 2, doc.internal.pageSize.getHeight() - 9, { align: 'center' });
        doc.text('Guárdalo para cualquier reclamo. www.youboxgt.com | info@youboxgt.com', W / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });

        doc.save(`Recibo_Seguro_${prealerta.tracking}.pdf`);
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
        setNewFile(null);
    };

    const handleCreatePrealerta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSelectedClient) { alert('Selecciona un cliente.'); return; }
        if (!newTracking.trim()) { alert('El tracking es requerido.'); return; }
        if (!newValorFactura || isNaN(Number(newValorFactura))) { alert('Ingresa un valor de factura válido.'); return; }

        setSaving(true);
        try {
            let facturaUrl = null;

            // 1. Upload file if exists
            if (newFile) {
                const fileExt = newFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `manuales/${newSelectedClient.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('prealertas')
                    .upload(filePath, newFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('prealertas')
                    .getPublicUrl(filePath);

                facturaUrl = publicUrl;
            }

            const valorNum = parseFloat(newValorFactura);
            const montoSeguro = newConSeguro ? parseFloat((valorNum * 0.05).toFixed(2)) : 0;

            const { error } = await supabase.from('prealertas').insert({
                cliente_id: newSelectedClient.id,
                tracking: newTracking.trim().toUpperCase(),
                bodega_id: newBodegaId || null,
                valor_factura: valorNum,
                con_seguro: newConSeguro,
                monto_seguro: montoSeguro,
                estado: 'pendiente',
                factura_url: facturaUrl,
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

    const filteredData = prealertas.filter(p => {
        const matchesSearch = p.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientes?.locker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesFilter = true;
        if (filterMode === 'pendientes') matchesFilter = p.estado === 'pendiente';
        else if (filterMode === 'procesadas') matchesFilter = p.estado === 'procesada';
        else if (filterMode === 'recibidas') matchesFilter = p.estado === 'recibido';
        else if (filterMode === 'seguro') matchesFilter = p.con_seguro === true;
        else if (filterMode === 'seguros confirmados') matchesFilter = p.con_seguro === true && (p.estado === 'procesada' || p.estado === 'recibido');

        return matchesSearch && matchesFilter;
    });

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
                        Monto de protección recaudado (5% de cada paquete asegurado validado).
                    </p>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto hide-scrollbar">
                        {['Todas', 'Pendientes', 'Procesadas', 'Recibidas', 'Seguro', 'Seguros Confirmados'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterMode(f.toLowerCase())}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${filterMode === f.toLowerCase() ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-80 shrink-0">
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
                                <th className="p-4 text-center">Renuncia</th>
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
                                        <td className="p-4 text-center">
                                            {p.renuncia_url ? (
                                                <a href={p.renuncia_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors" title="Ver renuncia firmada">
                                                    <Shield className="w-4 h-4 text-rose-500" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-300">-</span>
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
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedPrealerta(p)}
                                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                                                >
                                                    Administrar
                                                </button>
                                                <button
                                                    onClick={() => openEdit(p)}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-amber-600 border border-slate-200 hover:border-amber-300 rounded-lg px-2 py-1 transition-colors"
                                                    title="Editar pre-alerta"
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                    Editar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Admin Validation Modal */}
            {
                selectedPrealerta && (
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
                                            El cliente debe haber enviado un comprobante por <b>${Number(selectedPrealerta.monto_seguro).toFixed(2)}</b> (5% de ${selectedPrealerta.valor_factura}) a tu WhatsApp. Revisa el banco.
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
                )
            }

            {/* ── NEW MANUAL PRE-ALERT MODAL ── */}
            {
                showNewModal && (
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
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Seguro (5%)</label>
                                        <button
                                            type="button"
                                            onClick={() => setNewConSeguro(v => !v)}
                                            className={`w-full py-2 rounded-xl text-sm font-bold border transition-all ${newConSeguro
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                                                }`}
                                        >
                                            {newConSeguro ? `✓ Con seguro (+$${newValorFactura ? (parseFloat(newValorFactura) * 0.05).toFixed(2) : '0.00'})` : 'Sin seguro'}
                                        </button>
                                    </div>
                                </div>

                                {/* Invoice File Upload */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Factura (Imagen o PDF)</label>
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-white hover:border-blue-400 transition-all">
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <Upload className={`w-6 h-6 mb-1 ${newFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            <p className="text-xs text-slate-500 font-semibold truncate px-4 max-w-full">
                                                {newFile ? newFile.name : "Click para subir factura"}
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
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
                )
            }

            {/* ── EDIT MODAL ── */}
            {editPrealerta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditPrealerta(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Editar Pre-Alerta</h3>
                                    <p className="text-xs text-slate-500">Cliente: {editPrealerta.clientes?.locker_id} – {editPrealerta.clientes?.nombre} {editPrealerta.clientes?.apellido}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditPrealerta(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleEditSave} className="p-6 space-y-4">
                            {/* Tracking */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tracking Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={editTracking}
                                    onChange={e => setEditTracking(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 bg-white"
                                    placeholder="Ej. TBA123..."
                                />
                            </div>

                            {/* Bodega */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bodega</label>
                                <select
                                    value={editBodegaId}
                                    onChange={e => setEditBodegaId(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 bg-white"
                                >
                                    <option value="">Sin bodega asignada</option>
                                    {bodegas.map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Valor */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Valor Declarado ($) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={editValor}
                                    onChange={e => setEditValor(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 bg-white"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Seguro */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Seguro (5%)</label>
                                <button
                                    type="button"
                                    onClick={() => setEditConSeguro(v => !v)}
                                    className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all ${editConSeguro
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                                        }`}
                                >
                                    {editConSeguro
                                        ? `✓ Con seguro (+$${editValor ? (parseFloat(editValor) * 0.05).toFixed(2) : '0.00'})`
                                        : 'Sin seguro'}
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditPrealerta(null)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSaving}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-sm hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div >
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
