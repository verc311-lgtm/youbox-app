import React, { useState, useEffect } from 'react';
import { X, Upload, FileUp, AlertCircle, CheckCircle2, Loader2, Anchor } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, YOUBOX_ADDRESSES } from '../context/AuthContext';

interface PreAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PreAlertModal({ isOpen, onClose }: PreAlertModalProps) {
    const { user } = useAuth();
    const [tracking, setTracking] = useState('');
    const [bodegaId, setBodegaId] = useState('');
    const [valorFactura, setValorFactura] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [conSeguro, setConSeguro] = useState(false);

    const [bodegas, setBodegas] = useState<{ id: string, nombre: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadBodegas();
            resetForm();
        }
    }, [isOpen]);

    const loadBodegas = async () => {
        try {
            const { data, error } = await supabase
                .from('bodegas')
                .select('id, nombre')
                .eq('activo', true)
                .order('nombre');

            if (error) throw error;
            setBodegas(data || []);
            if (data && data.length > 0) {
                setBodegaId(data[0].id);
            }
        } catch (err: any) {
            console.error('Error loading bodegas:', err);
        }
    };

    const resetForm = () => {
        setTracking('');
        setValorFactura('');
        setFile(null);
        setConSeguro(false);
        setSuccess(false);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!file) {
            setError('Por favor, selecciona una foto de la factura.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('prealertas')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('prealertas')
                .getPublicUrl(filePath);

            // 3. Save to database
            const valor = parseFloat(valorFactura);
            const seguroMonto = conSeguro ? valor * 0.10 : 0;

            const { data: prealerta, error: dbError } = await supabase
                .from('prealertas')
                .insert({
                    cliente_id: user.id,
                    tracking,
                    bodega_id: bodegaId,
                    valor_factura: valor,
                    factura_url: publicUrl,
                    con_seguro: conSeguro,
                    monto_seguro: seguroMonto,
                    estado: 'pendiente'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                resetForm();
            }, 3000);

        } catch (err: any) {
            console.error('Error submitting prealert:', err);
            setError('Ocurrió un error al enviar la prealerta. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const montoSeguro = parseFloat(valorFactura) * 0.10 || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!loading && !success ? onClose : undefined} />

            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-blue-600" />
                        Pre Alertar Paquete
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={loading || success}
                        className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">¡Prealerta Enviada!</h4>
                            <p className="text-sm text-slate-500 max-w-[250px]">
                                Hemos recibido la información de tu paquete correctamente.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Readonly Info */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tu Casillero</p>
                                <p className="text-lg font-bold text-slate-800">{user?.locker_id}</p>
                            </div>

                            {/* Tracking */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Tracking Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={tracking}
                                    onChange={(e) => setTracking(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Ej. Tba123..."
                                />
                            </div>

                            {/* Bodega */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Bodega de Entrega <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={bodegaId}
                                    onChange={(e) => setBodegaId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="" disabled>Selecciona una bodega</option>
                                    {bodegas.map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Valor Factura */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Valor de la Compra (USD $) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-medium">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={valorFactura}
                                        onChange={(e) => setValorFactura(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Foto Factura */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Foto / PDF de la Factura <span className="text-red-500">*</span>
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                        <p className="mb-1 text-sm text-slate-500">
                                            <span className="font-semibold text-blue-600">Click para subir</span>
                                        </p>
                                        <p className="text-xs text-slate-400 px-4 text-center">
                                            {file ? file.name : "PNG, JPG, PDF"}
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>

                            {/* Seguro */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            checked={conSeguro}
                                            onChange={(e) => setConSeguro(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-blue-900 border-b border-blue-200 pb-1 mb-2 inline-block">
                                            Deseo contratar Seguro (10% del valor)
                                        </span>
                                        {!conSeguro ? (
                                            <p className="text-xs text-slate-600 italic">
                                                * Sin seguro solo se cubre máx. $50 en caso de pérdida o daño.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg text-sm border border-blue-100">
                                                    <span className="text-slate-600">Total a Pagar (Seguro):</span>
                                                    <span className="font-bold text-blue-700 text-base">${montoSeguro.toFixed(2)}</span>
                                                </div>
                                                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs border border-yellow-200 leading-relaxed shadow-sm">
                                                    <strong>INSTRUCCIONES DE PAGO AL INSTANTE:</strong><br />
                                                    1. Transfiere o deposita el monto a la cuenta monetaria de <b>Banco Industrial - 1990018267</b> (a nombre de Youbox).<br />
                                                    2. Envía la foto de tu comprobante a nuestro número de WhatsApp al instante para validar la protección.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>

                            {/* Submit Action */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        'Enviar Pre-Alerta'
                                    )}
                                </button>
                            </div>

                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
