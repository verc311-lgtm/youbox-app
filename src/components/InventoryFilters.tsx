import React, { useState } from 'react';
import { X, Filter, RotateCcw, Calendar, Truck, Package, Search } from 'lucide-react';
import { useTransportistas } from '../hooks/useQueries';
import { format, subDays, startOfToday } from 'date-fns';

interface Bodega {
    id: string;
    nombre: string;
}

export interface FilterState {
    bodegaId: string;
    estado: string;
    startDate: string;
    endDate: string;
    cliente: string;
    lockerId: string;
    tracking: string;
    minPeso: string;
    maxPeso: string;
    piezas: string;
    transportistaId: string;
    empaque: string;
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
    const { data: transportistas = [] } = useTransportistas();

    // Sync local state when the modal opens with the current active filters
    React.useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const handleChange = (field: keyof FilterState, value: string) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const setQuickDate = (days: number | 'today') => {
        const end = startOfToday();
        const start = days === 'today' ? end : subDays(end, days);
        setLocalFilters(prev => ({
            ...prev,
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd')
        }));
    };

    const clearFilters = () => {
        const emptyFilters: FilterState = {
            bodegaId: '',
            estado: '',
            startDate: '',
            endDate: '',
            cliente: '',
            lockerId: '',
            tracking: '',
            minPeso: '',
            maxPeso: '',
            piezas: '',
            transportistaId: '',
            empaque: ''
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
                className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-100">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                            <Filter className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Filtros de Inventario</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Ajusta tu búsqueda</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form id="filters-form" onSubmit={handleApply} className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">

                    {/* Section: Core Identifiers */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Search className="h-3 w-3" /> Identificación
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tracking / Guía</label>
                                <input
                                    type="text"
                                    placeholder="Número de seguimiento..."
                                    value={localFilters.tracking}
                                    onChange={(e) => handleChange('tracking', e.target.value)}
                                    className="block w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-semibold focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Locker ID</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. YBQ10"
                                        value={localFilters.lockerId}
                                        onChange={(e) => handleChange('lockerId', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none text-blue-600 bg-slate-50/50 transition-all uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cliente</label>
                                    <input
                                        type="text"
                                        placeholder="Nombre..."
                                        value={localFilters.cliente}
                                        onChange={(e) => handleChange('cliente', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm font-semibold focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Status & Logistics */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Truck className="h-3 w-3" /> Logística & Estatus
                        </h3>
                        <div className="space-y-4">
                            {isAdmin && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bodega Origen</label>
                                    <select
                                        value={localFilters.bodegaId}
                                        onChange={(e) => handleChange('bodegaId', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-3 text-sm font-bold focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                                    >
                                        <option value="">Todas las bodegas</option>
                                        {bodegas.map(b => (
                                            <option key={b.id} value={b.id}>{b.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estado del Paquete</label>
                                <select
                                    value={localFilters.estado}
                                    onChange={(e) => handleChange('estado', e.target.value)}
                                    className="block w-full rounded-xl border-2 border-slate-100 px-3 py-3 text-sm font-bold focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="recibido">Recibido</option>
                                    <option value="en_bodega">En Bodega</option>
                                    <option value="listo_consolidar">Listo Consolidar</option>
                                    <option value="consolidado">Consolidado</option>
                                    <option value="en_transito">En Tránsito</option>
                                    <option value="entregado">Entregado</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Carrier</label>
                                    <select
                                        value={localFilters.transportistaId}
                                        onChange={(e) => handleChange('transportistaId', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-3 text-sm font-bold focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50 appearance-none"
                                    >
                                        <option value="">Todos</option>
                                        {transportistas.map(t => (
                                            <option key={t.id} value={t.id}>{t.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipo Empaque</label>
                                    <select
                                        value={localFilters.empaque}
                                        onChange={(e) => handleChange('empaque', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-3 text-sm font-bold focus:border-blue-500 outline-none text-slate-900 bg-slate-50/50 appearance-none"
                                    >
                                        <option value="">Cualquiera</option>
                                        <option value="bolsa">Bolsa</option>
                                        <option value="caja">Caja</option>
                                        <option value="sobre">Sobre</option>
                                        <option value="especial">Especial</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Weight & Dates */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Tiempo & Dimensiones
                        </h3>
                        <div className="space-y-4">
                            {/* Quick Dates */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {[{ label: 'Hoy', val: 'today' }, { label: 'Ayer', val: 1 }, { label: '7D', val: 7 }, { label: '30D', val: 30 }].map(qd => (
                                    <button
                                        key={qd.label}
                                        type="button"
                                        onClick={() => setQuickDate(qd.val as any)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-100 transition-colors shrink-0"
                                    >
                                        {qd.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Desde</label>
                                    <input
                                        type="date"
                                        value={localFilters.startDate}
                                        onChange={(e) => handleChange('startDate', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Hasta</label>
                                    <input
                                        type="date"
                                        value={localFilters.endDate}
                                        onChange={(e) => handleChange('endDate', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Peso Min</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={localFilters.minPeso}
                                        onChange={(e) => handleChange('minPeso', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Peso Max</label>
                                    <input
                                        type="number"
                                        placeholder="∞"
                                        value={localFilters.maxPeso}
                                        onChange={(e) => handleChange('maxPeso', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Piezas</label>
                                    <input
                                        type="number"
                                        placeholder="#"
                                        value={localFilters.piezas}
                                        onChange={(e) => handleChange('piezas', e.target.value)}
                                        className="block w-full rounded-xl border-2 border-slate-100 px-3 py-2 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </form>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10 space-y-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <button
                        type="submit"
                        form="filters-form"
                        className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-slate-900 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl hover:bg-black transition-all active:scale-[0.98]"
                    >
                        Aplicar Filtros
                    </button>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Limpiar Todo
                    </button>
                </div>

            </div>
        </>
    );
}
