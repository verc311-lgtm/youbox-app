import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Receipt, Plus, Loader2, Upload, Calendar,
    DollarSign, CheckCircle2, Image as ImageIcon,
    Tag,
    Building
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
    created_at: string;
}

const CategoriasGastos = [
    'Salario', 'Luz', 'Agua', 'Renta', 'Internet', 'Proveedores', 'Otros'
];

export function Expenses() {
    const { user } = useAuth();
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Ref para resetear el input the archivo
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        categoria: 'Renta',
        concepto: '',
        monto_q: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        numero_cuenta: '',
        notas: '',
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);

    useEffect(() => {
        fetchGastos();
    }, []);

    async function fetchGastos() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gastos_financieros')
                .select('*')
                .order('fecha_pago', { ascending: false });

            if (error) throw error;
            setGastos(data || []);
        } catch (e: any) {
            console.error('Error fetching expenses:', e);
        } finally {
            setLoading(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            // Create local preview if it's an image
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
                    .upload(filePath, selectedFile);

                if (uploadError) {
                    throw uploadError;
                }

                if (uploadData) {
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
                estado: 'verificado', // Auto-verified since it comes from an admin form
                registrado_por: user?.id === 'admin-001' ? null : user?.id,
            };

            const { error } = await supabase.from('gastos_financieros').insert([newGasto]);

            if (error) throw error;

            alert('Gasto registrado exitosamente!');

            // Reset form
            setFormData({
                categoria: 'Renta',
                concepto: '',
                monto_q: '',
                fecha_pago: new Date().toISOString().split('T')[0],
                numero_cuenta: '',
                notas: '',
            });
            setSelectedFile(null);
            setFilePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Reload
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

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Control de Gastos</h1>
                    <p className="text-sm text-slate-500">Registra y verifica pagos de renta, salarios, proveedores y más.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Formulario de Nuevo Gasto */}
                <div className="lg:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm p-6 space-y-5 h-fit">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-blue-500" />
                        Nuevo Gasto
                    </h2>

                    <form onSubmit={handleSave} className="space-y-4">

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Categoría <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Tag className="h-4 w-4 text-slate-400" />
                                </div>
                                <select
                                    required
                                    value={formData.categoria}
                                    onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                                    className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                                >
                                    {CategoriasGastos.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Concepto / Referencia <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Renta Febrero Almacén B"
                                value={formData.concepto}
                                onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                                className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Monto (GTQ) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-semibold text-sm">Q</span>
                                    </div>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={formData.monto_q}
                                        onChange={e => setFormData({ ...formData, monto_q: e.target.value })}
                                        className="block w-full rounded-md border-0 py-2 pl-9 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Fecha de Pago <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="date"
                                    value={formData.fecha_pago}
                                    onChange={e => setFormData({ ...formData, fecha_pago: e.target.value })}
                                    className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">N° Cuenta o Cheque (Opcional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ej. Cheque Bi #010101"
                                    value={formData.numero_cuenta}
                                    onChange={e => setFormData({ ...formData, numero_cuenta: e.target.value })}
                                    className="block w-full rounded-md border-0 py-2 pl-10 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Comprobante de Pago (Recibo)</label>
                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-4 hover:bg-slate-50 transition-colors">
                                <div className="text-center">
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" className="mx-auto h-24 object-contain mb-2 rounded border border-slate-200" />
                                    ) : (
                                        <Upload className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                    )}
                                    <div className="flex text-sm leading-6 text-slate-600 justify-center">
                                        <label htmlFor="recibo-upload" className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 hover:text-blue-500">
                                            <span>{selectedFile ? 'Cambiar archivo' : 'Subir archivo'}</span>
                                            <input
                                                id="recibo-upload"
                                                ref={fileInputRef}
                                                type="file"
                                                className="sr-only"
                                                accept="image/*,application/pdf"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs leading-5 text-slate-500">{selectedFile ? selectedFile.name : 'PNG, JPG, PDF hasta 5MB'}</p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="mt-6 w-full flex justify-center items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {saving ? (uploadingImage ? 'Subiendo recibo...' : 'Guardando...') : 'Registrar Gasto Verificado'}
                        </button>
                    </form>
                </div>

                {/* Tabla Historial */}
                <div className="lg:col-span-2 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="border-b border-slate-200 px-6 py-4 bg-slate-50">
                        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            Pagos Verificados
                        </h2>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                            </div>
                        ) : gastos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                <Receipt className="h-10 w-10 text-slate-300 mb-3" />
                                <h3 className="text-sm font-medium text-slate-900">No hay gastos registrados</h3>
                                <p className="text-sm text-slate-500 mt-1">Registra aquí los primeros gastos del negocio.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-900">Fecha</th>
                                        <th className="px-6 py-3 font-semibold text-slate-900">Concepto</th>
                                        <th className="px-6 py-3 font-semibold text-slate-900">Categoría</th>
                                        <th className="px-6 py-3 font-semibold text-slate-900 text-right">Monto</th>
                                        <th className="px-6 py-3 font-semibold text-slate-900">N° Cuenta/Ref</th>
                                        <th className="px-6 py-3 font-semibold text-slate-900 text-center">Recibo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {gastos.map((gasto) => (
                                        <tr key={gasto.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 text-slate-500">
                                                {new Date(gasto.fecha_pago).toLocaleDateString('es-ES')}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                {gasto.concepto}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                    {gasto.categoria}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-bold text-slate-800 text-right">
                                                {formatQ(gasto.monto_q)}
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                                                {gasto.numero_cuenta || '------'}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {gasto.recibo_url ? (
                                                    <a
                                                        href={gasto.recibo_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Ver Recibo"
                                                    >
                                                        <ImageIcon className="h-4 w-4" />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
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
        </div>
    );
}
