import React, { useState } from 'react';
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface RegisterPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    facturaId: string;
    facturaTotal: number;
    facturaNumero: string;
}

export function RegisterPaymentModal({ isOpen, onClose, onSuccess, facturaId, facturaTotal, facturaNumero }: RegisterPaymentModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [monto, setMonto] = useState(facturaTotal.toString());
    const [metodo, setMetodo] = useState('transferencia');
    const [referencia, setReferencia] = useState('');
    const [notas, setNotas] = useState('');

    const handleSave = async () => {
        if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
            alert("Ingrese un monto válido mayor a 0.");
            return;
        }

        setLoading(true);
        try {
            const montoFinal = parseFloat(monto);

            // 1. Insertar el Pago
            const { error: pagoError } = await supabase
                .from('pagos')
                .insert([{
                    factura_id: facturaId,
                    monto: montoFinal,
                    metodo: metodo,
                    referencia: referencia,
                    estado: 'verificado', // Se da por sentado que el operador verificó antes de ingresarlo
                    verificado_por: user?.id,
                    notas: notas
                }]);

            if (pagoError) throw pagoError;

            // 2. Actualizar estado de Factura
            const { error: facError } = await supabase
                .from('facturas')
                .update({ estado: 'verificado' })
                .eq('id', facturaId);

            if (facError) throw facError;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert('Error al registrar pago: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" /> Registrar Pago
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Factura a Pagar</p>
                        <div className="flex justify-between items-center mt-1">
                            <span className="font-bold text-slate-900">{facturaNumero}</span>
                            <span className="font-bold text-blue-600">Total: Q{facturaTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Monto Recibido (Q) *</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago *</label>
                        <select
                            value={metodo}
                            onChange={(e) => setMetodo(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        >
                            <option value="transferencia">Transferencia Bancaria</option>
                            <option value="deposito">Depósito Físico</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Link / Tarjeta</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Número de Referencia / Boleta</label>
                        <input
                            type="text"
                            placeholder="Ej. AB-123456"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas u Observaciones</label>
                        <textarea
                            rows={2}
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md text-white bg-green-600 hover:bg-green-500 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Confirmar Pago
                    </button>
                </div>
            </div>
        </div>
    );
}
