import React, { useState, useEffect } from 'react';
import { X, Filter, RotateCcw, Building, CreditCard, Calendar, DollarSign } from 'lucide-react';

interface Sucursal {
    id: string;
    nombre: string;
}

export interface BillingFilterState {
    sucursalId: string;
    estado: string;
    metodo: string;
    startDate: string;
    endDate: string;
    minMonto: string;
    maxMonto: string;
    search: string;
}

interface BillingFiltersProps {
    isOpen: boolean;
    onClose: () => void;
    sucursales: Sucursal[];
    currentFilters: BillingFilterState;
    onApply: (filters: BillingFilterState) => void;
    isSuperAdmin: boolean;
}

export function BillingFilters({
    isOpen,
    onClose,
    sucursales,
    currentFilters,
    onApply,
    isSuperAdmin
}: BillingFiltersProps) {
    const [localFilters, setLocalFilters] = useState<BillingFilterState>(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const handleChange = (field: keyof BillingFilterState, value: string) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        const emptyFilters: BillingFilterState = {
            sucursalId: 'all',
            estado: 'all',
            metodo: 'all',
            startDate: '',
            endDate: '',
            minMonto: '',
            maxMonto: '',
            search: ''
        };
        setLocalFilters(emptyFilters);
        onApply(emptyFilters);
        onClose();
    };

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        onApply(localFilters);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className={`fixed inset-y-0 right-0 z-[110] w-full max-w-sm bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Filter className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-800">Filtros de Facturación</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form id="billing-filters-form" onSubmit={handleApply} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {isSuperAdmin && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Building className="h-3 w-3 text-slate-400" /> Sede / Sucursal
                            </label>
                            <select
                                value={localFilters.sucursalId}
                                onChange={(e) => handleChange('sucursalId', e.target.value)}
                                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                            >
                                <option value="all">Todas las sedes</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Filter className="h-3 w-3 text-slate-400" /> Estado de Factura
                        </label>
                        <select
                            value={localFilters.estado}
                            onChange={(e) => handleChange('estado', e.target.value)}
                            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="verificado">Pagadas</option>
                            <option value="anulado">Anuladas / Devueltas</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <CreditCard className="h-3 w-3 text-slate-400" /> Método de Pago
                        </label>
                        <select
                            value={localFilters.metodo}
                            onChange={(e) => handleChange('metodo', e.target.value)}
                            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                        >
                            <option value="all">Cualquier método</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="deposito">Depósito</option>
                            <option value="tarjeta">Tarjeta / Link</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" /> Rango de Fechas (Emisión)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
                                <input
                                    type="date"
                                    value={localFilters.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
                                <input
                                    type="date"
                                    value={localFilters.endDate}
                                    onChange={(e) => handleChange('endDate', e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-500" /> Rango de Montos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mínimo (Q)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={localFilters.minMonto}
                                    onChange={(e) => handleChange('minMonto', e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white placeholder:text-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Máximo (Q)</label>
                                <input
                                    type="number"
                                    placeholder="∞"
                                    value={localFilters.maxMonto}
                                    onChange={(e) => handleChange('maxMonto', e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                </form>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Limpiar
                    </button>
                    <button
                        type="submit"
                        form="billing-filters-form"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none"
                    >
                        Aplicar Filtros
                    </button>
                </div>

            </div>
        </>
    );
}
