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
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Warehouse</h1>
                    <p className="text-sm text-slate-500">Agrupación temporal de paquetes por cliente y bodega.</p>
                </div>

                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-full border-0 py-2 pl-10 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 min-w-[300px]"
                        placeholder="Buscar casillero, nombre, bodega o tracking..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                </div>
            ) : filteredLockers.length === 0 ? (
                <div className="text-center bg-white rounded-xl border border-slate-200 py-16 px-6 shadow-sm">
                    <Inbox className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">No hay paquetes en bodega</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Todos los paquetes han sido consolidados o la búsqueda no arrojó resultados.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredLockers.map(([groupKey, group]) => {
                        const isExpanded = !!expandedCards[groupKey];
                        const lockerDisplay = group.cliente?.locker_id || 'SIN_LOCKER';
                        return (
                            <div
                                key={groupKey}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col"
                            >
                                <div
                                    className="p-5 cursor-pointer flex-none select-none hover:bg-slate-50/50"
                                    onClick={() => toggleExpand(groupKey)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                                <MapPin className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-slate-900 transition-colors">
                                                        {lockerDisplay}
                                                    </h3>
                                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                                        {group.bodega?.nombre || 'Desconocida'}
                                                    </span>
                                                </div>
                                                {group.cliente ? (
                                                    <p className="text-sm font-medium text-slate-600 mt-0.5">
                                                        {group.cliente.nombre} {group.cliente.apellido}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-red-500 font-medium mt-0.5">Cliente Desconocido</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-3">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Package className="h-4 w-4" />
                                            <span className="font-bold">{group.paquetes.length} pz</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-blue-600">
                                            <span>{isExpanded ? 'Ocultar' : 'Ver Contenido'}</span>
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-slate-50 border-t border-slate-200 p-4 flex-1">
                                        <div className="space-y-3">
                                            {group.paquetes.map((paquete) => (
                                                <div key={paquete.id} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex flex-col gap-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-slate-400" />
                                                            <span className="text-sm font-bold text-slate-800 break-all">{paquete.tracking}</span>
                                                        </div>
                                                        {paquete.peso_lbs && (
                                                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 whitespace-nowrap">
                                                                {paquete.peso_lbs} lbs
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                                        <div className="flex items-center gap-1">
                                                            <Truck className="h-3 w-3" />
                                                            <span>{paquete.transportistas?.nombre || 'Desconocido'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
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
