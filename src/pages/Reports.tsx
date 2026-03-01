import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Loader2, Calendar, Building } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

interface Mensual {
    mes: string;
    ingresos: number;
    gastos: number;
    balance: number;
    sortKey: string;
}

interface Categoria {
    name: string;
    value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function Reports() {
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<Mensual[]>([]);
    const [categoryData, setCategoryData] = useState<Categoria[]>([]);
    const { user } = useAuth();
    const [sucursales, setSucursales] = useState<{ id: string, nombre: string }[]>([]);
    const [selectedFilterBranch, setSelectedFilterBranch] = useState<string>('all');

    const [kpis, setKpis] = useState({
        ingresosMesActual: 0,
        gastosMesActual: 0,
        balanceMesActual: 0
    });

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchSucursales();
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [selectedFilterBranch, user]);

    const fetchSucursales = async () => {
        const { data } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
        if (data) setSucursales(data);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get past 6 months to today
            const hoy = new Date();
            const hace6Meses = subMonths(hoy, 5);

            let queryFacturas = supabase
                .from('facturas')
                .select('monto_total, fecha_emision, clientes!inner(sucursal_id)')
                .eq('estado', 'verificado')
                .gte('fecha_emision', hace6Meses.toISOString());

            let queryGastos = supabase
                .from('gastos_financieros')
                .select('monto_q, fecha_pago, categoria')
                .eq('estado', 'verificado')
                .gte('fecha_pago', hace6Meses.toISOString());

            // Filtros de Sucursal
            if (user?.role !== 'admin' && user?.sucursal_id) {
                queryFacturas = queryFacturas.eq('clientes.sucursal_id', user.sucursal_id);
                queryGastos = queryGastos.eq('sucursal_id', user.sucursal_id);
            } else if (user?.role === 'admin' && selectedFilterBranch !== 'all') {
                queryFacturas = queryFacturas.eq('clientes.sucursal_id', selectedFilterBranch);
                queryGastos = queryGastos.eq('sucursal_id', selectedFilterBranch);
            }

            const { data: facturas, error: facturasErr } = await queryFacturas;
            if (facturasErr) throw facturasErr;

            const { data: gastos, error: gastosErr } = await queryGastos;
            if (gastosErr) throw gastosErr;

            // Generate month brackets
            const monthsInterval = eachMonthOfInterval({ start: hace6Meses, end: hoy });
            const monthMap = new Map<string, Mensual>();

            monthsInterval.forEach(m => {
                const key = format(m, 'yyyy-MM');
                monthMap.set(key, {
                    mes: format(m, 'MMM yyyy', { locale: es }).toUpperCase(),
                    ingresos: 0,
                    gastos: 0,
                    balance: 0,
                    sortKey: key
                });
            });

            const currentMonthKey = format(hoy, 'yyyy-MM');
            let ingActual = 0;
            let gasActual = 0;

            // Populate Incomes
            facturas?.forEach(f => {
                const key = f.fecha_emision.substring(0, 7); // yyyy-MM
                if (monthMap.has(key)) {
                    const obj = monthMap.get(key)!;
                    obj.ingresos += Number(f.monto_total);
                    if (key === currentMonthKey) ingActual += Number(f.monto_total);
                }
            });

            // Populate Expenses
            const catMap = new Map<string, number>();
            gastos?.forEach(g => {
                const key = g.fecha_pago.substring(0, 7); // yyyy-MM
                if (monthMap.has(key)) {
                    const obj = monthMap.get(key)!;
                    obj.gastos += Number(g.monto_q);
                    if (key === currentMonthKey) gasActual += Number(g.monto_q);
                }

                // If expense is from current month, add to categories chart
                if (key === currentMonthKey) {
                    const cat = g.categoria || 'Otros';
                    catMap.set(cat, (catMap.get(cat) || 0) + Number(g.monto_q));
                }
            });

            // Process final arrays
            const monthlyArray = Array.from(monthMap.values()).map(obj => ({
                ...obj,
                balance: obj.ingresos - obj.gastos
            })).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

            const catArray = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

            setMonthlyData(monthlyArray);
            setCategoryData(catArray);
            setKpis({
                ingresosMesActual: ingActual,
                gastosMesActual: gasActual,
                balanceMesActual: ingActual - gasActual
            });

        } catch (error) {
            console.error("Error fetching report data", error);
            alert("Hubo un error al cargar las gráficas financieras.");
        } finally {
            setLoading(false);
        }
    };

    const formatQ = (val: number) => {
        return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 0 }).format(val);
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center gap-4 animate-fade-in relative z-10 w-full">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-sm"></div>
                <p className="text-sm font-bold text-slate-500">Analizando datos financieros...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-fade-in relative z-10 w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                        Dashboard Financiero
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Métricas clave e historial de utilidad de los últimos 6 meses.
                    </p>
                </div>
                {user?.role === 'admin' && (
                    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-center p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Building className="h-4.5 w-4.5" />
                        </div>
                        <select
                            value={selectedFilterBranch}
                            onChange={(e) => setSelectedFilterBranch(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer w-full min-w-[180px]"
                        >
                            <option value="all">Todas las Sedes (Global)</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up" style={{ animationDelay: '0ms' }}>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-3.5 shadow-lg shadow-emerald-500/20 text-white">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-0.5">Ingresos (Este Mes)</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatQ(kpis.ingresosMesActual)}</p>
                    </div>
                </div>
                <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up" style={{ animationDelay: '50ms' }}>
                    <div className="rounded-xl bg-gradient-to-br from-red-400 to-red-600 p-3.5 shadow-lg shadow-red-500/20 text-white">
                        <TrendingDown className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-0.5">Gastos (Este Mes)</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatQ(kpis.gastosMesActual)}</p>
                    </div>
                </div>
                <div className="glass rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all hover:-translate-y-0.5 animate-slide-up relative overflow-hidden group" style={{ animationDelay: '100ms' }}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-colors duration-500 ${kpis.balanceMesActual >= 0 ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}></div>
                    <div className={`rounded-xl p-3.5 shadow-lg text-white relative z-10 ${kpis.balanceMesActual >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20' : 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/20'}`}>
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-0.5">Utilidad (Neta)</p>
                        <p className={`text-2xl font-black tracking-tight font-mono ${kpis.balanceMesActual >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatQ(kpis.balanceMesActual)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '150ms' }}>

                {/* Bar Chart */}
                <div className="lg:col-span-2 glass rounded-2xl border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                    <h2 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Calendar className="h-4.5 w-4.5" />
                        </span>
                        Ingresos vs Egresos <span className="text-sm font-bold text-slate-400 font-normal hidden sm:inline">(Últimos 6 meses)</span>
                    </h2>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(val) => `Q${val}`} />
                                <Tooltip
                                    formatter={(value: number) => formatQ(value)}
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="lg:col-span-1 glass rounded-2xl border border-slate-200/60 p-6 sm:p-8 shadow-sm flex flex-col">
                    <h2 className="text-xl font-extrabold text-slate-900 mb-6">Distribución de Gastos</h2>

                    {categoryData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <DollarSign className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="text-sm font-bold text-slate-500">No hay gastos en el mes actual.</p>
                        </div>
                    ) : (
                        <>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatQ(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-6 space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {categoryData.map((cat, index) => (
                                    <div key={cat.name} className="flex justify-between items-center text-sm p-3 rounded-xl bg-white/60 border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3.5 h-3.5 rounded-full shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-slate-700 font-bold">{cat.name}</span>
                                        </div>
                                        <span className="font-black text-slate-900 font-mono tracking-tight">{formatQ(cat.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
