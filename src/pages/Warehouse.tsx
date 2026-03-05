import React, { useState, useEffect } from 'react';
import { Package, Inbox, Calendar, Search, MapPin, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface PaqueteWithDetails {
    id: string;
    tracking: string;
    peso_lbs: number;
    piezas: number;
    fecha_recepcion: string;
    transportistas: {
        nombre: string;
    };
    clientes: {
        id: string;
        nombre: string;
        apellido: string;
        locker_id: string;
    };
    bodegas: {
        id: string;
        nombre: string;
    };
}

interface PaquetesPorCliente {
    cliente: {
        id: string;
        nombre: string;
        apellido: string;
        locker_id: string;
    } | null;
    bodega: {
        id: string;
        nombre: string;
    } | null;
    paquetes: PaqueteWithDetails[];
}

export function Warehouse() {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupedPackages, setGroupedPackages] = useState<Record<string, PaquetesPorCliente>>({});
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchWarehousePackages();
    }, []);

    async function fetchWarehousePackages() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('paquetes')
                .select(`
          id,
          tracking,
          peso_lbs,
          piezas,
          fecha_recepcion,
          transportistas(nombre),
          clientes(id, nombre, apellido, locker_id),
          bodegas(id, nombre)
        `)
                .in('estado', ['en_bodega', 'recibido'])
                .order('fecha_recepcion', { ascending: false });

            if (error) throw error;

            if (data) {
                // Group by locker_id + bodega_id
                const groups = data.reduce((acc: Record<string, PaquetesPorCliente>, pkg: any) => {
                    const lockerId = pkg.clientes?.locker_id || 'SIN_LOCKER';
                    const bodegaId = pkg.bodegas?.id || 'SIN_BODEGA';
                    const groupKey = `${lockerId}_${bodegaId}`;

                    if (!acc[groupKey]) {
                        acc[groupKey] = {
                            cliente: pkg.clientes,
                            bodega: pkg.bodegas,
                            paquetes: []
                        };
                    }
                    acc[groupKey].paquetes.push(pkg);
                    return acc;
                }, {});

                setGroupedPackages(groups);
            }
        } catch (e) {
            console.error('Error fetching warehouse packages:', e);
        } finally {
            setLoading(false);
        }
    }

    const toggleExpand = (lockerId: string) => {
        setExpandedCards(prev => ({ ...prev, [lockerId]: !prev[lockerId] }));
    };

    const filteredLockers = (Object.entries(groupedPackages) as [string, PaquetesPorCliente][]).filter(([groupKey, group]) => {
        const searchLow = searchTerm.toLowerCase();
        const matchLocker = groupKey.toLowerCase().includes(searchLow);
        const matchName = group.cliente ? `${group.cliente.nombre} ${group.cliente.apellido}`.toLowerCase().includes(searchLow) : false;
        const matchBodega = group.bodega?.nombre.toLowerCase().includes(searchLow);
        const matchTracking = group.paquetes.some(p => p.tracking.toLowerCase().includes(searchLow));

        return matchLocker || matchName || matchBodega || matchTracking;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-fade-in relative z-10 w-full pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Warehouse
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Agrupación temporal de paquetes por cliente y bodega.
                    </p>
                </div>

                <div className="relative group/search outline-none">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search className="h-4.5 w-4.5 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-2xl border border-slate-200/80 bg-white/70 py-2.5 pl-11 pr-5 text-slate-900 shadow-sm transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 font-medium sm:text-sm min-w-[320px] backdrop-blur-xl hover:border-slate-300 hover:bg-white/90"
                        placeholder="Buscar casillero, nombre, bodega o tracking..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center flex-col items-center py-20 gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-sm"></div>
                    <p className="text-sm font-bold text-slate-500">Cargando inventario...</p>
                </div>
            ) : filteredLockers.length === 0 ? (
                <div className="text-center glass rounded-2xl border border-slate-200/60 py-20 px-8 shadow-sm">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 shadow-inner mb-5">
                        <Inbox className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="mt-4 text-lg font-extrabold text-slate-800 tracking-tight">No hay paquetes en bodega</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 max-w-md mx-auto">
                        Todos los paquetes han sido consolidados o la búsqueda actual no arrojó resultados. Intenta ajustar tus filtros.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredLockers.map(([groupKey, group], idx) => {
                        const isExpanded = !!expandedCards[groupKey];
                        const lockerDisplay = group.cliente?.locker_id || 'SIN_LOCKER';
                        return (
                            <div
                                key={groupKey}
                                className="glass rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1 animate-fade-in"
                                style={{ animationDelay: `${idx * 40}ms` }}
                            >
                                <div
                                    className="p-5 cursor-pointer flex-none select-none hover:bg-white/40 transition-colors duration-200"
                                    onClick={() => toggleExpand(groupKey)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20 text-white flex-shrink-0 group-hover:scale-105 transition-transform">
                                                <MapPin className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                                        {lockerDisplay}
                                                    </h3>
                                                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider border border-indigo-100 shadow-sm">
                                                        {group.bodega?.nombre || 'Desconocida'}
                                                    </span>
                                                </div>
                                                {group.cliente ? (
                                                    <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        {group.cliente.nombre} {group.cliente.apellido}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-red-100 shadow-sm">Cliente Desconocido</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200/60 pt-4">
                                        <div className="flex items-center gap-2 text-slate-600 bg-white/60 px-2.5 py-1 rounded-lg shadow-sm border border-slate-100">
                                            <Package className="h-4.5 w-4.5 text-blue-500" />
                                            <span className="font-extrabold text-blue-900">{group.paquetes.length} pz</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border ${isExpanded ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}`}>
                                            <span>{isExpanded ? 'Ocultar' : 'Ver Contenido'}</span>
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-slate-50/50 backdrop-blur-sm border-t border-slate-200/60 p-5 flex-1 animate-slide-up origin-top">
                                        <div className="space-y-3">
                                            {group.paquetes.map((paquete) => (
                                                <div key={paquete.id} className="bg-white/80 rounded-xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500 shadow-sm border border-blue-100/50">
                                                                <Package className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-sm font-extrabold text-slate-900 break-all tracking-tight selection:bg-blue-100 font-mono">{paquete.tracking}</span>
                                                        </div>
                                                        {paquete.peso_lbs && (
                                                            <span className="text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60 rounded-lg px-2 py-0.5 whitespace-nowrap shadow-sm font-mono">
                                                                {paquete.peso_lbs} lbs
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>{paquete.transportistas?.nombre || 'Desconocido'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>
                                                                {paquete.fecha_recepcion ? format(new Date(paquete.fecha_recepcion), 'dd/MM/yyyy') : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
