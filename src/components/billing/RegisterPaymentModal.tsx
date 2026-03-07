import React, { useState } from 'react';
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface RegisterPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    facturaId: string;
    facturaTotal: number;
    totalPagado: number;
    facturaNumero: string;
}

export function RegisterPaymentModal({ isOpen, onClose, onSuccess, facturaId, facturaTotal, totalPagado, facturaNumero }: RegisterPaymentModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const saldoActual = facturaTotal - totalPagado;
    const [monto, setMonto] = useState(saldoActual.toString());
    const [descuento, setDescuento] = useState('');
    const [tipoDescuento, setTipoDescuento] = useState<'fijo' | 'porcentaje'>('fijo');
    const [metodo, setMetodo] = useState('transferencia');
    const [referencia, setReferencia] = useState('');
    const [notas, setNotas] = useState('');
    // Extra charges
    const [cargoExtra, setCargoExtra] = useState('');
    const [cargoExtraRef, setCargoExtraRef] = useState('');

    const handleDescuentoChange = (val: string, type: 'fijo' | 'porcentaje') => {
        setDescuento(val);
        setTipoDescuento(type);
        const descVal = parseFloat(val) || 0;
        const extraVal = parseFloat(cargoExtra) || 0;

        let calculatedDiscount = 0;
        if (type === 'fijo') {
            calculatedDiscount = descVal;
        } else if (type === 'porcentaje') {
            calculatedDiscount = facturaTotal * (descVal / 100);
        }

        const nuevoTotal = facturaTotal - calculatedDiscount + extraVal;
        const remaining = Math.max(0, nuevoTotal - totalPagado);
        setMonto(remaining.toFixed(2));
    };

    // Recalculate monto when extra changes
    const handleExtraChange = (val: string) => {
        setCargoExtra(val);
        const extraVal = parseFloat(val) || 0;
        const descVal = parseFloat(descuento) || 0;
        let disc = tipoDescuento === 'fijo' ? descVal : facturaTotal * (descVal / 100);
        if (disc < 0 || disc > facturaTotal) disc = 0;

        const nuevoTotal = facturaTotal - disc + extraVal;
        const remaining = Math.max(0, nuevoTotal - totalPagado);
        setMonto(remaining.toFixed(2));
    };

    const handleSave = async () => {
        if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
            toast.error("Ingrese un monto válido mayor a 0.");
            return;
        }

        setLoading(true);
        try {
            const montoFinal = parseFloat(monto);
            const descVal = parseFloat(descuento) || 0;
            let descFinal = 0;

            if (tipoDescuento === 'fijo') {
                descFinal = descVal;
            } else if (tipoDescuento === 'porcentaje') {
                descFinal = facturaTotal * (descVal / 100);
            }

            if (descFinal < 0) {
                toast.error("El descuento no puede ser negativo.");
                setLoading(false);
                return;
            }

            let notaFinal = notas;
            if (descFinal > 0) {
                const descText = tipoDescuento === 'porcentaje'
                    ? `(Descuento aplicado: ${descVal}% equivalente a Q${descFinal.toFixed(2)}. Total original: Q${facturaTotal.toFixed(2)})`
                    : `(Descuento manual aplicado: Q${descFinal.toFixed(2)}. Total original: Q${facturaTotal.toFixed(2)})`;
                notaFinal = notaFinal ? `${notaFinal} \n${descText}` : descText;
            }

            const extraVal = parseFloat(cargoExtra) || 0;
            if (extraVal > 0) {
                const extraText = `[Cargo Extra: Q${extraVal.toFixed(2)}${cargoExtraRef ? ` | Ref: ${cargoExtraRef}` : ''}]`;
                notaFinal = notaFinal ? `${notaFinal}\n${extraText}` : extraText;
            }

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
                    notas: notaFinal
                }]);

            if (pagoError) throw pagoError;

            // 2. Actualizar estado de Factura
            const extraVal2 = parseFloat(cargoExtra) || 0;
            const nuevoMontoTotal = facturaTotal - descFinal + extraVal2;
            const totalPagadoAcumulado = totalPagado + montoFinal;

            let updatePayload: any = {};

            // Si el monto pagado hasta ahora (más lo de hoy) cubre el total (ajustado)
            if (totalPagadoAcumulado >= nuevoMontoTotal - 0.01) {
                updatePayload.estado = 'verificado';
            } else {
                updatePayload.estado = 'pendiente';
            }

            // Si hubo cambios en el total (descuento o cargo extra), lo actualizamos en la factura
            if (descFinal > 0 || extraVal2 > 0) {
                updatePayload.monto_total = nuevoMontoTotal;
            }

            // Solo actualizar si realmente hay algo que cambiar en el payload
            if (Object.keys(updatePayload).length > 0) {
                const { error: facError } = await supabase
                    .from('facturas')
                    .update(updatePayload)
                    .eq('id', facturaId);
                if (facError) throw facError;
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al registrar pago: ' + error.message);
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
                        <div className="flex justify-between items-start mt-1">
                            <span className="font-bold text-slate-900">{facturaNumero}</span>
                            <div className="text-right flex flex-col items-end">
                                <span className="font-bold text-slate-600">Total: Q{facturaTotal.toFixed(2)}</span>
                                {totalPagado > 0 && (
                                    <span className="text-xs font-bold text-emerald-600">Pagado: Q{totalPagado.toFixed(2)}</span>
                                )}
                                <span className="text-sm font-black text-blue-600 border-t border-slate-200 mt-1 pt-1">
                                    Saldo: Q{saldoActual.toFixed(2)}
                                </span>
                                {(parseFloat(cargoExtra) || 0) > 0 && (
                                    <div className="text-[10px] font-bold text-orange-600 mt-0.5">+Q{(parseFloat(cargoExtra) || 0).toFixed(2)} cargo extra</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
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
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descuento</label>
                            <div className="flex relative shadow-sm rounded-md">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={descuento}
                                    onChange={(e) => handleDescuentoChange(e.target.value, tipoDescuento)}
                                    className="w-full rounded-none rounded-l-md border-slate-300 focus:border-green-500 focus:ring-green-500 sm:text-sm text-amber-600 font-semibold bg-amber-50"
                                />
                                <select
                                    value={tipoDescuento}
                                    onChange={(e) => handleDescuentoChange(descuento, e.target.value as 'fijo' | 'porcentaje')}
                                    className="rounded-none rounded-r-md border-l-0 border-slate-300 bg-slate-50 text-slate-600 font-bold sm:text-sm focus:ring-green-500 focus:border-green-500 cursor-pointer"
                                >
                                    <option value="fijo">Q</option>
                                    <option value="porcentaje">%</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Cargo Extra */}
                    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 space-y-2">
                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            Cargo Extra (opcional)
                        </p>
                        <div className="flex gap-3">
                            <div className="w-28">
                                <label className="block text-xs font-medium text-orange-700 mb-1">Monto (Q)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={cargoExtra}
                                    onChange={(e) => handleExtraChange(e.target.value)}
                                    className="w-full rounded-md border-orange-300 bg-white text-orange-700 font-semibold shadow-sm focus:border-orange-500 focus:ring-orange-400 sm:text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-orange-700 mb-1">Referencia / Concepto</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Impuesto aduana, seguro..."
                                    value={cargoExtraRef}
                                    onChange={(e) => setCargoExtraRef(e.target.value)}
                                    className="w-full rounded-md border-orange-300 bg-white text-slate-700 shadow-sm focus:border-orange-500 focus:ring-orange-400 sm:text-sm"
                                />
                            </div>
                        </div>
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
