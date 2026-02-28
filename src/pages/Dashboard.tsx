import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, DollarSign, Truck, FileText } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard de Control</h1>
        <p className="text-sm text-slate-500">Resumen general de operaciones y finanzas.</p>
      </div>

      {/* Stats cards — se conectarán a Supabase */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Facturación Mensual', icon: DollarSign, value: 'Q 0.00' },
          { name: 'Promedio por Factura', icon: FileText, value: 'Q 0.00' },
          { name: 'Paquetes Procesados', icon: Package, value: '0' },
          { name: 'Envíos Laredo', icon: Truck, value: '0' },
        ].map((stat) => (
          <div key={stat.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <div className="rounded-md bg-slate-50 p-2">
                <stat.icon className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">Conectar a Supabase pendiente</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Ingresos por Bodega</h2>
          <div className="h-80 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <BarChart width={40} height={40} data={[]} className="mx-auto opacity-20" />
              <p className="mt-2 text-sm">Los datos aparecerán aquí una vez conectado a Supabase</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Carga por Bodega</h2>
          <div className="h-64 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <PieChart width={40} height={40} className="mx-auto opacity-20" />
              <p className="mt-2 text-sm text-slate-400">Sin datos</p>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            {['Laredo, TX', 'Greensboro, NC', 'Tapachula, MX'].map((name, index) => (
              <div key={name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-sm font-medium text-slate-600">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
