import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Search, Calendar, ChevronLeft, ChevronRight, Building, FileText, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Payment {
    id: string;
    monto: number;
    metodo: string;
    referencia: string;
    created_at: string;
    facturas: {
        numero: string;
        estado: string;
        clientes: {
            nombre: string;
            apellido: string;
            locker_id: string;
            sucursal_id: string;
            sucursales: {
                nombre: string;
            }
        } | null;
    } | null;
}

interface SupabasePaymentResponse {
    id: string;
    monto: number;
    metodo: string;
    referencia: string;
    created_at: string;
    facturas: {
        numero: string;
        estado: string;
        cliente_manual_nombre: string | null;
        cliente_manual_nit: string | null;
        clientes: {
            nombre: string;
            apellido: string;
            locker_id: string;
            sucursal_id: string;
            sucursales: {
                nombre: string;
            } | null;
        } | null;
    } | null;
}

interface Sucursal {
    id: string;
    nombre: string;
}

export function Payments() {
    const { user, loading: authLoading } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);

    const isSuperAdmin = user?.role === 'admin';

    // Filters
    const [selectedFilterBranch, setSelectedFilterBranch] = useState<string>('all');
    const [searchFilter, setSearchFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('all');

    const paymentMethods = [
        { id: 'all', name: 'Todos los Métodos' },
        { id: 'efectivo', name: 'Efectivo' },
        { id: 'transferencia', name: 'Transferencia' },
        { id: 'tarjeta', name: 'Tarjeta / POS' },
        { id: 'visalink', name: 'Visalink' },
        { id: 'cheque', name: 'Cheque' },
    ];

    /* Pagination */
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        fetchSucursales();
    }, []);

    useEffect(() => {
        if (user) {
            if (!isSuperAdmin && user.sucursal_id) {
                setSelectedFilterBranch(user.sucursal_id);
            }
            fetchPayments();
        }
    }, [user, selectedFilterBranch]);

    async function fetchSucursales() {
        if (!isSuperAdmin) return;
        const { data } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
        if (data) setSucursales(data);
    }

    async function fetchPayments() {
        if (!user) return;
        setLoading(true);
        try {
            const activeBranch = isSuperAdmin ? selectedFilterBranch : user?.sucursal_id;
            const filterByBranch = activeBranch && activeBranch !== 'all';

            let query = supabase
                .from('pagos')
                .select(`
          id, monto, metodo, referencia, created_at,
          facturas${filterByBranch ? '!inner' : ''} (
            numero, estado, cliente_manual_nombre, cliente_manual_nit,
            clientes${filterByBranch ? '!inner' : ''} (nombre, apellido, locker_id, sucursal_id, sucursales(nombre))
          )
        `)
                .order('created_at', { ascending: false })
                .limit(1000); // Fetch latest 1000 to paginate locally

            if (filterByBranch) {
                query = query.eq('facturas.clientes.sucursales.id', activeBranch);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter only verified payments (youbox logic assumes payments linked to facturas verificado or pagado status)
            const verifiedPayments: Payment[] = (data || [])
                .filter(p => {
                    const f = (p as any).facturas;
                    if (!f) return false;
                    // Handle array wrappers from Supabase joins if they occur
                    const fact = Array.isArray(f) ? f[0] : f;
                    if (!fact) return false;
                    return ['verificado', 'pagado'].includes((fact.estado || '').toLowerCase());
                })
                .map(p => {
                    // Flatten the array response from Supabase inner joins if needed
                    const f = (p as any).facturas;
                    const fact = Array.isArray(f) ? f[0] : f;
                    const cls = fact?.clientes;
                    const client = Array.isArray(cls) ? cls[0] : cls;
                    const sucs = client?.sucursales;
                    const sucursal = Array.isArray(sucs) ? sucs[0] : sucs;

                    return {
                        id: p.id,
                        monto: p.monto,
                        metodo: p.metodo,
                        referencia: p.referencia,
                        created_at: p.created_at,
                        facturas: fact ? {
                            numero: fact.numero,
                            estado: fact.estado,
                            cliente_manual_nombre: fact.cliente_manual_nombre,
                            cliente_manual_nit: fact.cliente_manual_nit,
                            clientes: client ? {
                                ...client,
                                sucursales: sucursal
                            } : null
                        } : null
                    };
                });

            setPayments(verifiedPayments);

        } catch (e: any) {
            console.error('Error fetching payments:', e);
            toast.error('Error cargando los pagos: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            // 1. Search
            if (searchFilter) {
                const searchLow = searchFilter.toLowerCase();
                const facNum = (p.facturas?.numero || '').toLowerCase();
                const clientName = (p.facturas?.clientes ? `${p.facturas.clientes.nombre} ${p.facturas.clientes.apellido}` : (p.facturas?.cliente_manual_nombre || '')).toLowerCase();
                const clientLocker = (p.facturas?.clientes?.locker_id || '').toLowerCase();
                const ref = (p.referencia || '').toLowerCase();

                if (!facNum.includes(searchLow) && !clientName.includes(searchLow) && !clientLocker.includes(searchLow) && !ref.includes(searchLow)) {
                    return false;
                }
            }

            // 2. Method
            if (methodFilter !== 'all' && p.metodo !== methodFilter) return false;

            return true;
        });
    }, [payments, searchFilter, methodFilter]);

    const hasActiveFilters = searchFilter !== '' || methodFilter !== 'all';

    // Summaries
    const summaries = useMemo(() => {
        let totalAmount = 0;
        const methodTotals: Record<string, number> = {};

        filteredPayments.forEach(p => {
            const amt = Number(p.monto) || 0;
            totalAmount += amt;
            methodTotals[p.metodo] = (methodTotals[p.metodo] || 0) + amt;
        });

        return { totalAmount, count: filteredPayments.length, methodTotals };
    }, [filteredPayments]);


    // Pagination Calc
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const currentPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1); // Reset page on filter change
    }, [selectedFilterBranch, searchFilter, methodFilter]);

    const formatQ = (val: number) => {
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);
    };

    const getMethodBadgeClass = (metodo: string) => {
        const met = metodo.toLowerCase();
        if (met.includes('tarjeta') || met.includes('visa')) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (met.includes('transferencia')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (met.includes('efectivo')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (met.includes('cheque')) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="space-y-6 lg:max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Registro de Pagos
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Historial de cobros verificados correspondientes a facturas.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {isSuperAdmin && (
                        <div className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl border border-slate-200/50 shadow-sm transition-all hover:shadow-md w-full sm:w-auto">
                            <Building className="h-4 w-4 text-blue-500" />
                            <select
                                value={selectedFilterBranch}
                                onChange={(e) => setSelectedFilterBranch(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer appearance-none w-full pr-4"
                            >
                                <option value="all">Todas las Sedes</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={fetchPayments}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-slate-50 transition-all duration-200 w-full sm:w-auto"
                    >
                        <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refrescar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Recaudado */}
                <div className="col-span-1 sm:col-span-2 glass border border-emerald-200/50 bg-emerald-50/50 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shadow-inner">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Filtrado</p>
                            <p className="text-sm font-medium text-emerald-700/70">{summaries.count} cobro(s)</p>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{formatQ(summaries.totalAmount)}</p>
                </div>

                {/* Metodos Breakdown (Top 2) */}
                {Object.entries(summaries.methodTotals)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 2)
                    .map(([metodo, total]) => (
                        <div key={metodo} className="glass border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-900/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate" title={`Pagos en ${metodo}`}>Pagos en {metodo.toUpperCase()}</p>
                            <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{formatQ(total as number)}</p>
                        </div>
                    ))}
            </div>

            {/* Table filters */}
            <div className="glass border border-slate-200/60 rounded-2xl flex flex-col md:flex-row items-center gap-4 p-4">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, factura o # referencia..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <select
                        value={methodFilter}
                        onChange={e => setMethodFilter(e.target.value)}
                        className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2 pl-3 pr-8 text-sm text-slate-700 font-bold outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    >
                        {paymentMethods.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={() => { setSearchFilter(''); setMethodFilter('all'); }}
                        className="w-full md:w-auto text-xs font-bold text-blue-600 hover:text-blue-700 flex justify-center items-center gap-1.5 bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Limpiar Filtros
                    </button>
                )}
            </div>

            {/* Main Table Container */}
            <div className="glass rounded-2xl border border-slate-200/60 overflow-hidden flex flex-col min-w-0 shadow-sm relative min-h-[400px]">

                <div className="overflow-x-auto flex-1 h-full">
                    <table className="min-w-full divide-y divide-slate-200/60">
                        <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle Factura</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Cobro</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Pago</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cobrado (Q)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/40 divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-2"></div>
                                            <p className="text-sm font-medium text-slate-500">Cargando pagos completados...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                                                <CreditCard className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-800">No se encontraron pagos</h3>
                                            <p className="text-sm font-medium text-slate-500 max-w-sm">
                                                {hasActiveFilters ? 'Prueba ajustando los filtros de búsqueda.' : 'Aún no se han cobrado facturas en esta sede.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentPayments.map((p, idx) => (
                                    <tr key={p.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${(idx % 25) * 30}ms` }}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 hidden sm:flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 shadow-sm border border-emerald-200">
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                                        <span>{p.facturas?.numero || 'N/A'}</span>
                                                        {p.facturas?.estado && (
                                                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 tracking-wider">Verificado</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.facturas?.clientes ? (
                                                <div className="max-w-[200px] sm:max-w-xs md:max-w-md">
                                                    <p className="text-sm font-bold text-slate-800 truncate" title={`${p.facturas.clientes.nombre} ${p.facturas.clientes.apellido}`}>
                                                        {p.facturas.clientes.nombre} {p.facturas.clientes.apellido}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {p.facturas.clientes.locker_id && (
                                                            <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-1 rounded">{p.facturas.clientes.locker_id}</span>
                                                        )}
                                                        {p.facturas.clientes.sucursales?.nombre && (
                                                            <span className="text-xs font-medium text-slate-500 truncate" title={p.facturas.clientes.sucursales.nombre}>
                                                                {p.facturas.clientes.sucursales.nombre}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 truncate" title={p.facturas?.cliente_manual_nombre || 'Consumidor Final'}>
                                                        {p.facturas?.cliente_manual_nombre || 'Consumidor Final'}
                                                    </p>
                                                    {p.facturas?.cliente_manual_nit && (
                                                        <p className="text-xs font-medium text-slate-500 mt-0.5">NIT: {p.facturas.cliente_manual_nit}</p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col justify-center">
                                                <span className="text-sm font-medium text-slate-900">{format(new Date(p.created_at), "d MMM yyyy", { locale: es })}</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Calendar className="h-3 w-3" /> {format(new Date(p.created_at), "HH:mm")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wide shadow-sm ${getMethodBadgeClass(p.metodo)}`}>
                                                {p.metodo}
                                            </span>
                                            {p.referencia && (
                                                <p className="text-xs text-slate-500 mt-1.5 font-mono" title={`Referencia: ${p.referencia}`}>
                                                    Ref: <span className="font-bold text-slate-700">{p.referencia.length > 20 ? p.referencia.substring(0, 20) + '...' : p.referencia}</span>
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-lg font-black text-slate-900 tracking-tight">
                                                {formatQ(p.monto)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && currentPayments.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 bg-white/50 px-6 py-4 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-600 font-medium">
                                Mostrando <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                                <span className="font-bold text-slate-900">
                                    {Math.min(currentPage * itemsPerPage, filteredPayments.length)}
                                </span>{' '}
                                de <span className="font-bold text-slate-900">{filteredPayments.length}</span> pagos
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="sr-only">Anterior</span>
                            </button>
                            <div className="hidden sm:flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                    .map((page, index, array) => (
                                        <React.Fragment key={page}>
                                            {index > 0 && array[index - 1] !== page - 1 && (
                                                <span className="px-2 text-slate-400">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`relative inline-flex items-center justify-center h-9 w-9 text-sm font-semibold rounded-lg transition-all ${currentPage === page
                                                    ? 'z-10 bg-blue-600 text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                                    : 'text-slate-900 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">Siguiente</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
