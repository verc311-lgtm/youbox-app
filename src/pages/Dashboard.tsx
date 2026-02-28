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

        paquetes.forEach(p => {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard de Control</h1>
        <p className="text-sm text-slate-500">Resumen general de operaciones y finanzas.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Facturación Mensual', icon: DollarSign, value: `Q ${facturacionMes.toFixed(2)}` },
          { name: 'Ticket Promedio', icon: FileText, value: `Q ${promedioFactura.toFixed(2)}` },
          { name: 'Paquetes Procesados', icon: Package, value: totalPaquetes.toString() },
          { name: 'Carga Laredo (Tx)', icon: Truck, value: enviosLaredo.toString() },
        ].map((stat) => (
          <div key={stat.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <div className="rounded-md bg-blue-50 p-2">
                <stat.icon className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">Acumulado mes actual</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lbs Bar Chart */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Volumen (Libras) por Bodega Matriz</h2>
          <div className="h-80 w-full">
            {ingresosData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ingresosData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="LIBRAS" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos suficientes este mes</div>
            )}
          </div>
        </div>

        {/* Volume Pie Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Distribución de Paquetes</h2>
          <div className="h-64 w-full flex-1">
            {cargaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cargaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {cargaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin paquetes</div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {cargaData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs font-medium text-slate-600">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
