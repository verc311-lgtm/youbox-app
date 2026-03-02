import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Receipt, Plus, Loader2, Upload, Calendar,
    DollarSign, CheckCircle2, Image as ImageIcon,
    Tag, Building, BarChart2, ChevronDown, ChevronUp, AlertCircle, FileDown
} from 'lucide-react';

interface Gasto {
    id: string;
    categoria: string;
    concepto: string;
    monto_q: number;
    fecha_pago: string;
    recibo_url: string;
    estado: string;
    numero_cuenta?: string;
    sucursal_id?: string;
    sucursales?: { nombre: string };
    created_at: string;
}

const CategoriasGastos = [
    'Salario', 'Luz', 'Agua', 'Renta', 'Internet', 'Proveedores', 'Otros'
];

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function Expenses() {
    const { user } = useAuth();
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [sucursales, setSucursales] = useState<{ id: string, nombre: string }[]>([]);
    const [selectedFilterBranch, setSelectedFilterBranch] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'gastos' | 'reporte'>('gastos');
    const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        categoria: 'Renta',
        concepto: '',
        monto_q: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        numero_cuenta: '',
        notas: '',
        sucursal_id: '',
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    useEffect(() => {
        fetchSucursales();
    }, []);

    useEffect(() => {
        fetchGastos();
    }, [selectedFilterBranch, user?.sucursal_id]);

    async function fetchSucursales() {
        if (user?.role === 'admin') {
            const { data } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
            if (data) {
                setSucursales(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, sucursal_id: data[0].id }));
                }
            }
        } else if (user?.sucursal_id) {
            setFormData(prev => ({ ...prev, sucursal_id: user.sucursal_id! }));
        }
    }

    async function fetchGastos() {
        setLoading(true);
        try {
            let query = supabase
                .from('gastos_financieros')
                .select('*, sucursales(nombre)')
                .order('fecha_pago', { ascending: false });

            if (user?.role !== 'admin' && user?.sucursal_id) {
                query = query.eq('sucursal_id', user.sucursal_id);
            } else if (user?.role === 'admin' && selectedFilterBranch !== 'all') {
                query = query.eq('sucursal_id', selectedFilterBranch);
            }

            const { data, error } = await query;
            if (error) throw error;
            setGastos(data || []);
        } catch (e: any) {
            console.error('Error fetching expenses:', e);
        } finally {
            setLoading(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError(null);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                setUploadError('El archivo es muy grande. Máximo 5MB.');
                return;
            }

            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploadError(null);

        if (!formData.monto_q || !formData.concepto) {
            alert('Debes indicar al menos un Concepto y Monto.');
            return;
        }

        setSaving(true);
        let recibo_url = null;

        try {
            // 1. Upload File if selected
            if (selectedFile) {
                setUploadingImage(true);
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${user?.id || 'sys'}/${fileName}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('recibos_gastos')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    // Show specific error but don't block the save
                    console.error('Upload error:', uploadError);
                    setUploadError(`No se pudo subir el recibo: ${uploadError.message}. El gasto se guardará sin imagen.`);
                } else if (uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('recibos_gastos')
                        .getPublicUrl(uploadData.path);
                    recibo_url = publicUrlData.publicUrl;
                }
                setUploadingImage(false);
            }

            // 2. Insert Record
            const newGasto = {
                categoria: formData.categoria,
                concepto: formData.concepto,
                monto_q: parseFloat(formData.monto_q),
                fecha_pago: formData.fecha_pago,
                numero_cuenta: formData.numero_cuenta,
                notas: formData.notas,
                recibo_url: recibo_url,
                sucursal_id: formData.sucursal_id || null,
                estado: 'verificado',
                registrado_por: user?.id === 'admin-001' ? null : user?.id,
            };

            const { error } = await supabase.from('gastos_financieros').insert([newGasto]);
            if (error) throw error;

            alert('Gasto registrado exitosamente!');

            setFormData({
                categoria: 'Renta',
                concepto: '',
                monto_q: '',
                fecha_pago: new Date().toISOString().split('T')[0],
                numero_cuenta: '',
                notas: '',
                sucursal_id: user?.role === 'admin' && sucursales.length > 0 ? sucursales[0].id : (user?.sucursal_id || ''),
            });
            setSelectedFile(null);
            setFilePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            fetchGastos();

        } catch (e: any) {
            console.error(e);
            alert('Error guardando el gasto: ' + e.message);
            setUploadingImage(false);
        } finally {
            setSaving(false);
        }
    };

    const formatQ = (val: number) => {
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);
    };

    // --- Monthly Report Data ---
    const reportData = useMemo(() => {
        const filtered = gastos.filter(g => {
            const year = new Date(g.fecha_pago).getFullYear();
            return year === reportYear;
        });

        // Group by month
        const byMonth: Record<number, { total: number; byCategoria: Record<string, number>; items: Gasto[] }> = {};

        filtered.forEach(g => {
            const month = new Date(g.fecha_pago).getMonth(); // 0-11
            if (!byMonth[month]) {
                byMonth[month] = { total: 0, byCategoria: {}, items: [] };
            }
            byMonth[month].total += Number(g.monto_q);
            byMonth[month].items.push(g);
            byMonth[month].byCategoria[g.categoria] = (byMonth[month].byCategoria[g.categoria] || 0) + Number(g.monto_q);
        });

        const grandTotal = filtered.reduce((sum, g) => sum + Number(g.monto_q), 0);

        // Category totals for the year
        const byCategoria: Record<string, number> = {};
        filtered.forEach(g => {
            byCategoria[g.categoria] = (byCategoria[g.categoria] || 0) + Number(g.monto_q);
        });

        return { byMonth, grandTotal, byCategoria };
    }, [gastos, reportYear]);

    const downloadMonthPDF = (mesIdx: number, mesNombre: string) => {
        const mesData = reportData.byMonth[mesIdx];
        if (!mesData) return;

        const formatQLocal = (val: number) =>
            new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);

        const rowsHtml = mesData.items.map(g => `
            <tr>
                <td>${new Date(g.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>${g.concepto}</td>
                <td>${g.categoria}</td>
                <td style="text-align:right;font-weight:700;">${formatQLocal(g.monto_q)}</td>
                <td>${g.numero_cuenta || '—'}</td>
            </tr>
        `).join('');

        const catRows = Object.entries(mesData.byCategoria)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, total]) => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <span style="color:#475569;font-size:13px;">${cat}</span>
                    <span style="font-weight:700;color:#1e293b;font-size:13px;">${formatQLocal(total)}</span>
                </div>
            `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Reporte ${mesNombre} ${reportYear} - Youbox GT</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 36px; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
                    .logo { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
                    .logo span { color: #1e293b; }
                    .title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
                    .subtitle { font-size: 12px; color: #64748b; }
                    .total-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 16px 24px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
                    .total-label { font-size: 12px; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px; }
                    .total-amount { font-size: 28px; font-weight: 900; color: #1e293b; }
                    .section-title { font-size: 13px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; margin: 20px 0 10px; }
                    .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; margin-bottom: 24px; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    thead tr { background: #2563eb; color: #fff; }
                    thead th { padding: 10px 12px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                    tbody tr:nth-child(even) { background: #f8fafc; }
                    tbody td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
                    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="logo">Youbox <span>GT</span></div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">Sistema de Gestión de Paquetes</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="title">Reporte de Gastos</div>
                        <div class="subtitle">${mesNombre} ${reportYear}</div>
                        <div class="subtitle">Generado: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    </div>
                </div>

                <div class="total-box">
                    <div>
                        <div class="total-label">Total del Mes</div>
                        <div class="total-amount">${formatQLocal(mesData.total)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:13px;color:#64748b;">${mesData.items.length} gasto(s) registrado(s)</div>
                    </div>
                </div>

                <div class="section-title">Resumen por Categoría</div>
                <div class="cat-grid">${catRows}</div>

                <div class="section-title">Detalle de Gastos</div>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Concepto</th>
                            <th>Categoría</th>
                            <th style="text-align:right;">Monto</th>
                            <th>N° Cuenta/Ref</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>

                <div class="footer">
                    Youbox GT — Reporte generado automáticamente. Este documento es de uso interno.
                </div>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); }, 500);
        }
    };

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        gastos.forEach(g => {
            years.add(new Date(g.fecha_pago).getFullYear());
        });
        const current = new Date().getFullYear();
        years.add(current);
        years.add(current - 1);
        return Array.from(years).sort((a, b) => b - a);
    }, [gastos]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in relative z-10 w-full max-w-full pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Control de Gastos
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Registra y verifica pagos de renta, salarios, proveedores y más.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Tab Switcher */}
                    <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('gastos')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'gastos' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Receipt className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                            Gastos
                        </button>
                        <button
                            onClick={() => setActiveTab('reporte')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reporte' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                            Reporte Mensual
                        </button>
                    </div>

                    {user?.role === 'admin' && (
                        <div className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl border border-slate-200/50 shadow-sm transition-all hover:shadow-md">
                            <Building className="h-4 w-4 text-blue-500" />
                            <select
                                value={selectedFilterBranch}
                                onChange={(e) => setSelectedFilterBranch(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
                            >
                                <option value="all">Todas las Sedes</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* ============ TAB: GASTOS ============ */}
            {activeTab === 'gastos' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario de Nuevo Gasto */}
                    <div className="lg:col-span-1 glass border border-slate-200/60 rounded-2xl shadow-sm p-6 space-y-5 h-fit relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                                <Receipt className="h-5 w-5" />
                            </div>
                            Nuevo Gasto
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Categoría <span className="text-rose-500">*</span></label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Tag className="h-4 w-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                                    </div>
                                    <select
                                        required
                                        value={formData.categoria}
                                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                        className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 pl-10 pr-3 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 sm:text-sm sm:leading-6 font-medium"
                                    >
                                        {CategoriasGastos.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {user?.role === 'admin' && sucursales.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Sucursal <span className="text-rose-500">*</span></label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Building className="h-4 w-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                                        </div>
                                        <select
                                            required
                                            value={formData.sucursal_id}
                                            onChange={e => setFormData({ ...formData, sucursal_id: e.target.value })}
                                            className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 pl-10 pr-3 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 sm:text-sm sm:leading-6 font-medium"
                                        >
                                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Concepto / Referencia <span className="text-rose-500">*</span></label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej. Renta Febrero Almacén B"
                                    value={formData.concepto}
                                    onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                                    className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 px-3.5 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-sm sm:leading-6"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Monto (GTQ) <span className="text-rose-500">*</span></label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <span className="text-slate-400 font-bold text-sm group-focus-within/input:text-blue-500 transition-colors">Q</span>
                                        </div>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={formData.monto_q}
                                            onChange={e => setFormData({ ...formData, monto_q: e.target.value })}
                                            className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 pl-9 pr-3 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-sm sm:leading-6 font-mono font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Fecha de Pago <span className="text-rose-500">*</span></label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.fecha_pago}
                                        onChange={e => setFormData({ ...formData, fecha_pago: e.target.value })}
                                        className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 px-3.5 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 sm:text-sm sm:leading-6 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">N° Cuenta o Cheque <span className="text-slate-400 font-normal text-xs">(Opcional)</span></label>
                                <div className="relative group/input">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Building className="h-4 w-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ej. Cheque Bi #010101"
                                        value={formData.numero_cuenta}
                                        onChange={e => setFormData({ ...formData, numero_cuenta: e.target.value })}
                                        className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 pl-10 pr-3 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Comprobante de Pago (Recibo)</label>

                                {/* Upload Error */}
                                {uploadError && (
                                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-amber-700 font-medium">{uploadError}</p>
                                    </div>
                                )}

                                <div
                                    className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-slate-200/80 bg-slate-50/50 px-6 py-5 cursor-pointer hover:bg-white hover:border-blue-400/50 transition-all duration-300 group/upload"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="text-center w-full">
                                        {uploadingImage ? (
                                            <div className="flex flex-col items-center gap-2 py-2">
                                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                                <p className="text-xs font-medium text-slate-500">Subiendo recibo...</p>
                                            </div>
                                        ) : filePreview ? (
                                            <div className="relative inline-block mt-2 mb-4">
                                                <img src={filePreview} alt="Preview" className="mx-auto h-28 object-cover rounded-lg border border-slate-200 shadow-sm transform group-hover/upload:scale-105 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-slate-900/10 rounded-lg flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity">
                                                    <Upload className="h-6 w-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover/upload:bg-blue-100 transition-colors">
                                                <Upload className="h-6 w-6 text-blue-500" />
                                            </div>
                                        )}
                                        <div className="flex flex-col text-sm leading-6 text-slate-600 justify-center items-center">
                                            <label htmlFor="recibo-upload" className="relative cursor-pointer rounded-md font-bold text-blue-600 focus-within:outline-none hover:text-blue-500">
                                                <span>{selectedFile ? 'Cambiar archivo' : 'Seleccionar archivo'}</span>
                                                <input
                                                    id="recibo-upload"
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="sr-only"
                                                    accept="image/*,application/pdf"
                                                    onChange={handleFileChange}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </label>
                                            <p className="text-xs font-medium text-slate-500 mt-1">{selectedFile ? selectedFile.name : 'PNG, JPG, PDF hasta 5MB'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="mt-6 w-full flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 text-sm font-bold text-white shadow-md shadow-slate-900/20 hover:from-slate-700 hover:to-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 transition-all hover:shadow-lg hover:-translate-y-0.5"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                {saving ? (uploadingImage ? 'Subiendo recibo...' : 'Guardando...') : 'Registrar Gasto Verificado'}
                            </button>
                        </form>
                    </div>

                    {/* Tabla Historial */}
                    <div className="lg:col-span-2 glass border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                        <div className="border-b border-slate-200/60 px-6 py-5 bg-slate-50/50 backdrop-blur-sm flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                                <div className="h-8 w-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                Pagos Verificados
                            </h2>
                        </div>
                        <div className="flex-1 overflow-auto p-0 custom-scrollbar relative">
                            {loading ? (
                                <div className="absolute inset-0 flex justify-center items-center bg-white/40 backdrop-blur-sm z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                                        <p className="text-sm font-bold text-slate-500">Cargando pagos...</p>
                                    </div>
                                </div>
                            ) : gastos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                        <Receipt className="h-10 w-10 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">No hay gastos registrados</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm">Registra aquí los primeros gastos del negocio para llevar un control financiero.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                                    <thead className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-xs">Fecha</th>
                                            <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-xs">Concepto</th>
                                            <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-xs">Categoría</th>
                                            <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-xs text-right">Monto</th>
                                            <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-xs">N° Cuenta/Ref</th>
                                            <th className="px-6 py-3.5 font-bold text-slate-600 uppercase tracking-wider text-xs text-center">Recibo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white/40">
                                        {gastos.map((gasto, idx) => (
                                            <tr key={gasto.id} className="hover:bg-blue-50/40 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                                <td className="px-6 py-4 text-slate-600 font-medium">
                                                    {new Date(gasto.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 truncate max-w-[200px]" title={gasto.concepto}>
                                                        {gasto.concepto}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 shadow-sm">
                                                            {gasto.categoria}
                                                        </span>
                                                        {gasto.sucursales?.nombre && (
                                                            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shadow-sm hidden sm:inline-flex truncate max-w-[100px]" title={gasto.sucursales.nombre}>
                                                                {gasto.sucursales.nombre}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-mono font-bold text-slate-800 text-sm">
                                                        {formatQ(gasto.monto_q)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs font-medium">
                                                    {gasto.numero_cuenta || <span className="text-slate-300">------</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {gasto.recibo_url ? (
                                                        <a
                                                            href={gasto.recibo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600 hover:text-white hover:bg-blue-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                                            title="Ver Recibo"
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ TAB: REPORTE MENSUAL ============ */}
            {activeTab === 'reporte' && (
                <div className="space-y-6">
                    {/* Year Selector + Total */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <select
                                value={reportYear}
                                onChange={e => setReportYear(Number(e.target.value))}
                                className="rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-700 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500"
                            >
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="glass border border-emerald-200/50 bg-emerald-50/50 rounded-xl px-5 py-3 flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Anual {reportYear}</p>
                                <p className="text-2xl font-black text-slate-900">{formatQ(reportData.grandTotal)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Category Summary Cards */}
                    {Object.keys(reportData.byCategoria).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(reportData.byCategoria)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, total]) => (
                                    <div key={cat} className="glass border border-slate-200/60 rounded-xl p-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat}</p>
                                        <p className="text-lg font-black text-slate-900 mt-1">{formatQ(total)}</p>
                                        <div className="mt-2 h-1 rounded-full bg-slate-100">
                                            <div
                                                className="h-1 rounded-full bg-blue-500"
                                                style={{ width: `${Math.min(100, (total / reportData.grandTotal) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{((total / reportData.grandTotal) * 100).toFixed(1)}%</p>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Monthly Breakdown */}
                    <div className="glass border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                        <div className="border-b border-slate-200/60 px-6 py-4 bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <BarChart2 className="h-5 w-5 text-blue-500" />
                                Desglose por Mes
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {MESES.map((mesNombre, mesIdx) => {
                                const mesData = reportData.byMonth[mesIdx];
                                if (!mesData) return null;
                                const isExpanded = expandedMonth === `${reportYear}-${mesIdx}`;

                                return (
                                    <div key={mesIdx}>
                                        <div className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors">
                                            <button
                                                onClick={() => setExpandedMonth(isExpanded ? null : `${reportYear}-${mesIdx}`)}
                                                className="flex items-center gap-4 flex-1 text-left"
                                            >
                                                <div className="w-24 text-sm font-bold text-slate-700">{mesNombre}</div>
                                                <div className="text-xs text-slate-500">{mesData.items.length} gasto(s)</div>
                                            </button>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-black text-slate-900 text-base">{formatQ(mesData.total)}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); downloadMonthPDF(mesIdx, mesNombre); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition-all hover:shadow-sm"
                                                    title="Descargar PDF"
                                                >
                                                    <FileDown className="h-3.5 w-3.5" />
                                                    PDF
                                                </button>
                                                <button onClick={() => setExpandedMonth(isExpanded ? null : `${reportYear}-${mesIdx}`)}>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-slate-50/40 border-t border-slate-100 px-6 py-4 space-y-3">
                                                {/* Category breakdown for this month */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                                                    {Object.entries(mesData.byCategoria).map(([cat, total]) => (
                                                        <div key={cat} className="bg-white rounded-lg px-3 py-2 border border-slate-100 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-slate-600">{cat}</span>
                                                            <span className="text-xs font-black text-slate-900 font-mono">{formatQ(total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Individual items */}
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-xs text-slate-500 uppercase">
                                                            <th className="text-left py-1 font-bold">Fecha</th>
                                                            <th className="text-left py-1 font-bold">Concepto</th>
                                                            <th className="text-right py-1 font-bold">Monto</th>
                                                            <th className="text-center py-1 font-bold">Recibo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {mesData.items.map(g => (
                                                            <tr key={g.id}>
                                                                <td className="py-2 text-slate-500 text-xs">
                                                                    {new Date(g.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                                </td>
                                                                <td className="py-2 text-slate-800 font-medium truncate max-w-[200px]">{g.concepto}</td>
                                                                <td className="py-2 text-right font-mono font-bold text-slate-900">{formatQ(g.monto_q)}</td>
                                                                <td className="py-2 text-center">
                                                                    {g.recibo_url ? (
                                                                        <a href={g.recibo_url} target="_blank" rel="noreferrer"
                                                                            className="inline-flex items-center justify-center h-6 w-6 rounded bg-blue-50 text-blue-500 hover:bg-blue-100">
                                                                            <ImageIcon className="h-3.5 w-3.5" />
                                                                        </a>
                                                                    ) : <span className="text-slate-300 text-xs">-</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {Object.keys(reportData.byMonth).length === 0 && (
                                <div className="text-center py-12">
                                    <BarChart2 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">No hay gastos registrados en {reportYear}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
