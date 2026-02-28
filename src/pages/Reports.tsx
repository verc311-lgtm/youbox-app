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
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Financiero</h1>
                    <p className="text-sm text-slate-500">Métricas clave e historial de utilidad de los últimos 6 meses.</p>
                </div>
                {user?.role === 'admin' && (
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                        <Building className="h-4 w-4 text-slate-400" />
                        <select
                            value={selectedFilterBranch}
                            onChange={(e) => setSelectedFilterBranch(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none focus:ring-0 cursor-pointer"
                        >
                            <option value="all">Todas las Sedes</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                    <div className="rounded-full bg-emerald-100 p-3">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Ingresos (Este Mes)</p>
                        <p className="text-2xl font-semibold text-slate-900">{formatQ(kpis.ingresosMesActual)}</p>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                    <div className="rounded-full bg-red-100 p-3">
                        <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Gastos (Este Mes)</p>
                        <p className="text-2xl font-semibold text-slate-900">{formatQ(kpis.gastosMesActual)}</p>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                    <div className={`rounded-full p-3 ${kpis.balanceMesActual >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                        <DollarSign className={`h-6 w-6 ${kpis.balanceMesActual >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Utilidad (Neta)</p>
                        <p className={`text-2xl font-semibold ${kpis.balanceMesActual >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatQ(kpis.balanceMesActual)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Bar Chart */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Ingresos vs Egresos (Últimos 6 meses)
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
                <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-900 mb-6">Distribución de Gastos (Mes Actual)</h2>

                    {categoryData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
                            No hay gastos registrados este mes.
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

                            <div className="mt-4 space-y-2">
                                {categoryData.map((cat, index) => (
                                    <div key={cat.name} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-slate-600">{cat.name}</span>
                                        </div>
                                        <span className="font-semibold text-slate-900">{formatQ(cat.value)}</span>
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
