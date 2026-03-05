import React, { useState } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';

interface Bodega {
    id: string;
    nombre: string;
}

export interface FilterState {
    bodegaId: string;
    estado: string;
    startDate: string;
    endDate: string;
}

interface InventoryFiltersProps {
    isOpen: boolean;
    onClose: () => void;
    bodegas: Bodega[];
    currentFilters: FilterState;
    onApply: (filters: FilterState) => void;
    isAdmin: boolean;
}

export function InventoryFilters({
    isOpen,
    onClose,
    bodegas,
    currentFilters,
    onApply,
    isAdmin
}: InventoryFiltersProps) {
    const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

    // Sync local state when the modal opens with the current active filters
    React.useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const handleChange = (field: keyof FilterState, value: string) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        const emptyFilters: FilterState = {
            bodegaId: '',
            estado: '',
            startDate: '',
            endDate: ''
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
            <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-sm bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-100">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Filter className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-800">Filtros Avanzados</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form id="filters-form" onSubmit={handleApply} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {isAdmin && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bodega</label>
                            <select
                                value={localFilters.bodegaId}
                                onChange={(e) => handleChange('bodegaId', e.target.value)}
                                className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                            >
                                <option value="">Todas las bodegas</option>
                                {bodegas.map(b => (
                                    <option key={b.id} value={b.id}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estatus / Estado</label>
                        <select
                            value={localFilters.estado}
                            onChange={(e) => handleChange('estado', e.target.value)}
                            className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                        >
                            <option value="">Todos los estados</option>
                            <option value="recibido">Recibido</option>
                            <option value="en_bodega">En Bodega</option>
                            <option value="listo_consolidar">Listo Consolidar</option>
                            <option value="consolidado">Consolidado</option>
                            <option value="en_transito">En Tránsito</option>
                            <option value="entregado">Entregado</option>
                            <option value="devuelto">Devuelto</option>
                            <option value="perdido">Perdido</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">Fecha de Recepción</h3>
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
                        form="filters-form"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors focus:outline-none"
                    >
                        Aplicar Filtros
                    </button>
                </div>

            </div>
        </>
    );
}
