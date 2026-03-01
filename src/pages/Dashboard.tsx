import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, DollarSign, Truck, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // KPIs
  const [facturacionMes, setFacturacionMes] = useState(0);
  const [promedioFactura, setPromedioFactura] = useState(0);
  const [totalPaquetes, setTotalPaquetes] = useState(0);
  const [enviosLaredo, setEnviosLaredo] = useState(0);

  // Charts
  const [ingresosData, setIngresosData] = useState<any[]>([]);
  const [cargaData, setCargaData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get this month's invoices for revenue KPIs
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const { data: facturas, error: facError } = await supabase
        .from('facturas')
        .select('monto_total, estado, fecha_emision')
        .gte('fecha_emision', firstDay)
        .lte('fecha_emision', lastDay);

      if (!facError && facturas) {
        // Only count paid or pending invoices as gross revenue, or just paid. Let's do all non-cancelled.
        const validDocs = facturas.filter(f => f.estado !== 'anulada');
        const gross = validDocs.reduce((acc, curr) => acc + Number(curr.monto_total), 0);
        setFacturacionMes(gross);
        setPromedioFactura(validDocs.length > 0 ? gross / validDocs.length : 0);
      }

      // 2. Get packages to calculate volume and warehouse distribution
      const { data: paquetes, error: paqError } = await supabase
        .from('paquetes')
        .select('bodega_id, bodegas(nombre), peso_lbs')
        .gte('fecha_recepcion', firstDay)
        .lte('fecha_recepcion', lastDay);

      if (!paqError && paquetes) {
        setTotalPaquetes(paquetes.length);

        // Distribution by Warehouse
        const bodegasMap = new Map<string, { name: string, lbs: number, count: number }>();
        let laredoCount = 0;

        paquetes.forEach((p: any) => {
          const bName = p.bodegas?.nombre || 'General';
          if (bName.toLowerCase().includes('laredo')) laredoCount++;

          if (!bodegasMap.has(bName)) {
            bodegasMap.set(bName, { name: bName, lbs: 0, count: 0 });
          }
          const bData = bodegasMap.get(bName)!;
          bData.lbs += Number(p.peso_lbs || 0);
          bData.count += 1;
        });

        setEnviosLaredo(laredoCount);

        const distData = Array.from(bodegasMap.values());

        // Pie Chart: percentage of packages by warehouse
        setCargaData(distData.map(d => ({ name: d.name, value: d.count })));

        // Bar Chart: LBS by warehouse
        setIngresosData(distData.map(d => ({ name: d.name, LIBRAS: d.lbs })));
      }

    } catch (error) {
      console.error("Dashboard calculation error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Dashboard de Control</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Visión general en tiempo real de operaciones y finanzas.</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Facturación Mensual', icon: DollarSign, value: `Q ${facturacionMes.toFixed(2)}`, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 text-emerald-600' },
          { name: 'Ticket Promedio', icon: FileText, value: `Q ${promedioFactura.toFixed(2)}`, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50 text-blue-600' },
          { name: 'Paquetes Procesados', icon: Package, value: totalPaquetes.toString(), color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 text-violet-600' },
          { name: 'Carga Laredo (Tx)', icon: Truck, value: enviosLaredo.toString(), color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 text-amber-600' },
        ].map((stat, i) => (
          <div key={stat.name} className="relative overflow-hidden rounded-2xl glass p-6 card-hover group" style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full -z-10 transition-transform group-hover:scale-110`} />
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.name}</p>
              <div className={`rounded-xl p-2.5 shadow-sm ${stat.bg}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
              <p className="text-xs font-medium text-slate-400 mt-1 drop-shadow-sm">Acumulado mes actual</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lbs Bar Chart */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl glass p-6 card-hover min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Volumen Operativo por Bodega</h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Libras (Lbs)</span>
          </div>
          <div className="h-[300px] w-full">
            {ingresosData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ingresosData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLbs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', fontWeight: 600 }}
                  />
                  <Bar dataKey="LIBRAS" fill="url(#colorLbs)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <BarChart className="h-12 w-12 text-slate-200 mb-2 opacity-50" />
                <span>Sin datos suficientes este mes</span>
              </div>
            )}
          </div>
        </div>

        {/* Volume Pie Chart */}
        <div className="rounded-2xl glass p-6 card-hover flex flex-col min-w-0">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">Distribución Logística</h2>
          <p className="text-xs font-medium text-slate-400 mb-6">Proporción de paquetes por destino</p>
          <div className="h-[220px] w-full flex-1">
            {cargaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cargaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {cargaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" style={{ filter: `drop-shadow(0px 4px 6px rgba(0,0,0,0.1))` }} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin paquetes</div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {cargaData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs font-bold text-slate-700">{entry.name} <span className="text-slate-400 font-medium ml-1">({entry.value})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
