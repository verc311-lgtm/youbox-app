import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Package, DollarSign, Truck, FileText, Loader2,
  CreditCard, Bell, Search, Globe2, Users,
  Warehouse, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

// ─── Module Card Definitions ───────────────────────────────────────────────
interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  route: string;
  badge?: string;
}

const MODULE_CARDS: ModuleCard[] = [
  {
    title: 'Paquetes',
    description: 'Gestionar, buscar y procesar paquetes en bodega',
    icon: Package,
    gradient: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-50 text-blue-600',
    route: '/inventory',
  },
  {
    title: 'Facturas',
    description: 'Crear, listar y gestionar facturas de clientes',
    icon: FileText,
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50 text-violet-600',
    route: '/billing',
  },
  {
    title: 'Pagos',
    description: 'Registrar y verificar pagos recibidos',
    icon: CreditCard,
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50 text-emerald-600',
    route: '/billing?tab=pagos',
  },
  {
    title: 'Alertas',
    description: 'Visualizar y procesar notificaciones del sistema',
    icon: Bell,
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-50 text-amber-600',
    route: 'https://youboxgt.com/pre-alerts',
  },
  {
    title: 'Búsqueda',
    description: 'Encuentra paquetes, clientes y documentos rápidamente',
    icon: Search,
    gradient: 'from-cyan-500 to-blue-500',
    iconBg: 'bg-cyan-50 text-cyan-600',
    route: '/inventory?search=true',
  },
  {
    title: 'Consolidados',
    description: 'Listar, buscar y crear consolidados maestros',
    icon: Globe2,
    gradient: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-50 text-rose-600',
    route: '/consolidation',
  },
  {
    title: 'Casilleros',
    description: 'Gestionar clientes, lockers y cuentas YBG',
    icon: Users,
    gradient: 'from-slate-600 to-slate-800',
    iconBg: 'bg-slate-50 text-slate-600',
    route: '/users',
  },
  {
    title: 'Greensboro',
    description: 'Bodega Greensboro — paquetes y operaciones',
    icon: Warehouse,
    gradient: 'from-green-500 to-emerald-600',
    iconBg: 'bg-green-50 text-green-600',
    route: '/warehouse?bodega=Greensboro',
    badge: 'NC',
  },
  {
    title: 'Laredo',
    description: 'Bodega Laredo — paquetes y operaciones',
    icon: Warehouse,
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-orange-50 text-orange-600',
    route: '/warehouse?bodega=Laredo',
    badge: 'TX',
  },
  {
    title: 'Tapachula',
    description: 'Bodega Tapachula — paquetes y operaciones',
    icon: MapPin,
    gradient: 'from-teal-500 to-cyan-600',
    iconBg: 'bg-teal-50 text-teal-600',
    route: '/warehouse?bodega=Tapachula',
    badge: 'MX',
  },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const { data: facturas, error: facError } = await supabase
        .from('facturas')
        .select('monto_total, estado, fecha_emision')
        .gte('fecha_emision', firstDay)
        .lte('fecha_emision', lastDay);

      if (!facError && facturas) {
        const validDocs = facturas.filter(f => !['anulado', 'devuelto'].includes(f.estado));
        const gross = validDocs.reduce((acc, curr) => acc + Number(curr.monto_total), 0);
        setFacturacionMes(gross);
        setPromedioFactura(validDocs.length > 0 ? gross / validDocs.length : 0);
      }

      const { data: paquetes, error: paqError } = await supabase
        .from('paquetes')
        .select('bodega_id, bodegas(nombre), peso_lbs')
        .gte('fecha_recepcion', firstDay)
        .lte('fecha_recepcion', lastDay);

      if (!paqError && paquetes) {
        setTotalPaquetes(paquetes.length);

        const bodegasMap = new Map<string, { name: string, lbs: number, count: number }>();
        let laredoCount = 0;

        paquetes.forEach((p: any) => {
          const bName = p.bodegas?.nombre || 'General';
          if (bName.toLowerCase().includes('laredo')) laredoCount++;
          if (!bodegasMap.has(bName)) bodegasMap.set(bName, { name: bName, lbs: 0, count: 0 });
          const bData = bodegasMap.get(bName)!;
          bData.lbs += Number(p.peso_lbs || 0);
          bData.count += 1;
        });

        setEnviosLaredo(laredoCount);
        const distData = Array.from(bodegasMap.values());
        setCargaData(distData.map(d => ({ name: d.name, value: d.count })));
        setIngresosData(distData.map(d => ({ name: d.name, LIBRAS: d.lbs })));
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (card: ModuleCard) => {
    if (card.title === 'Búsqueda') {
      window.dispatchEvent(new Event('open-global-search'));
      return;
    }
    // External URLs open in a new tab
    if (card.route.startsWith('http')) {
      window.open(card.route, '_blank', 'noopener,noreferrer');
      return;
    }
    const [path, query] = card.route.split('?');
    if (query) {
      navigate(`${path}?${query}`);
    } else {
      navigate(path);
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
    <div className="space-y-8 animate-fade-in relative z-10 w-full max-w-full overflow-hidden pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Centro de Control
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Bienvenido, {user?.nombre || 'Usuario'} · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* ── Module Launchpad ── */}
      <div>
        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-slate-200/80" />
          Módulos del Sistema
          <span className="h-px flex-1 bg-slate-200/80" />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {MODULE_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                onClick={() => handleModuleClick(card)}
                className="relative group flex flex-col items-center text-center gap-3 rounded-2xl bg-white border border-slate-200/70 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 overflow-hidden"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Gradient glow bg on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />

                {/* Icon */}
                <div className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-xl ${card.iconBg} shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="h-7 w-7" />
                  {card.badge && (
                    <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full text-white bg-gradient-to-br ${card.gradient} shadow`}>
                      {card.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="relative z-10">
                  <p className="text-sm font-extrabold text-slate-800 group-hover:text-slate-900">{card.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight group-hover:text-slate-500 line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* Bottom gradient bar */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI Stats ── */}
      {user?.nombre?.toLowerCase().trim() !== 'alexis' && user?.email !== 'quiche@youboxgt.com' && user?.email !== 'anahi@youboxgt.com' && (
        <>
          <div>
            <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-200/80" />
              Estadísticas del Mes
              <span className="h-px flex-1 bg-slate-200/80" />
            </h2>
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
                    <p className="text-xs font-medium text-slate-400 mt-1">Acumulado mes actual</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="col-span-1 lg:col-span-2 rounded-2xl glass p-6 card-hover min-w-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Volumen Operativo por Bodega</h2>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Libras (Lbs)</span>
              </div>
              <div className="h-[280px] w-full">
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
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', fontWeight: 600 }} />
                      <Bar dataKey="LIBRAS" fill="url(#colorLbs)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <BarChart className="h-12 w-12 text-slate-200 mb-2 opacity-50" />
                    <span>Sin datos este mes</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl glass p-6 card-hover flex flex-col min-w-0">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">Distribución Logística</h2>
              <p className="text-xs font-medium text-slate-400 mb-6">Proporción de paquetes por destino</p>
              <div className="h-[200px] w-full flex-1">
                {cargaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cargaData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                        {cargaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin paquetes</div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {cargaData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-700">{entry.name} <span className="text-slate-400 font-medium">({entry.value})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
