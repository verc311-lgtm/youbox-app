import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Download, Inbox, Package as PkgIcon, Loader2, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LabelPrinterModal } from '../components/LabelPrinterModal';

interface Paquete {
  id: string;
  tracking: string;
  peso_lbs: number;
  estado: string;
  fecha_recepcion: string;
  bodegas?: { nombre: string };
  clientes?: { nombre: string; apellido: string; locker_id: string };
  transportistas?: { nombre: string };
}

const ESTADOS: Record<string, { label: string, color: string }> = {
  recibido: { label: 'Recibido', color: 'bg-blue-100 text-blue-700 ring-blue-600/20' },
  en_bodega: { label: 'En Bodega', color: 'bg-purple-100 text-purple-700 ring-purple-600/20' },
  listo_consolidar: { label: 'Listo Consolidar', color: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20' },
  consolidado: { label: 'Consolidado', color: 'bg-amber-100 text-amber-700 ring-amber-600/20' },
  en_transito: { label: 'En Tránsito', color: 'bg-orange-100 text-orange-700 ring-orange-600/20' },
  entregado: { label: 'Entregado', color: 'bg-green-100 text-green-700 ring-green-600/20' },
  devuelto: { label: 'Devuelto', color: 'bg-red-100 text-red-700 ring-red-600/20' },
  perdido: { label: 'Perdido', color: 'bg-slate-100 text-slate-700 ring-slate-600/20' },
};

export function Inventory() {
  const { user, isAdmin } = useAuth();
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const [printingLabel, setPrintingLabel] = useState<any>(null);

  useEffect(() => {
    fetchPaquetes();
  }, [user]);

  async function fetchPaquetes() {
    if (!user) return;
    try {
      setLoading(true);
      let query = supabase
        .from('paquetes')
        .select(`
          id, tracking, peso_lbs, estado, fecha_recepcion,
          bodegas (nombre),
          clientes (nombre, apellido, locker_id),
          transportistas (nombre)
        `)
        .order('fecha_recepcion', { ascending: false });

      if (!isAdmin) {
        query = query.eq('cliente_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPaquetes(data || []);
    } catch (e) {
      console.error('Error fetching paquetes:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredPaquetes = paquetes.filter(p =>
    p.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientes?.locker_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            {isAdmin ? 'Control de Inventario' : 'Mis Paquetes'}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {isAdmin ? 'Gestión de paquetes en almacén (Warehouses).' : 'Rastrea el estado de tus compras en tiempo real.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl bg-white/70 backdrop-blur-sm px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm border border-slate-200/80 hover:bg-white hover:shadow-md transition-all duration-200">
            <Filter className="h-4 w-4 text-blue-500" />
            Filtros
          </button>
          {isAdmin && (
            <button className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <Download className="h-4 w-4" />
              Exportar
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl glass overflow-hidden flex flex-col min-w-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/60">
            <thead className="bg-slate-50/50 backdrop-blur-sm">
              <tr>
                <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 sm:pl-6">Tracking / Envío</th>
                {isAdmin && <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Cliente</th>}
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Ingreso</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Peso</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Ubicación</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estatus</th>
                {isAdmin && (
                  <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/40">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm font-medium text-slate-500">Sincronizando inventario...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPaquetes.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <Inbox className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-700">No hay paquetes registrados</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Los paquetes aparecerán aquí en cuanto sean procesados en nuestras bodegas.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPaquetes.map((p, index) => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-2.5 hidden sm:block shadow-sm group-hover:scale-105 transition-transform">
                          <PkgIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm tracking-tight">{p.tracking}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Truck className="h-3 w-3" />
                            {p.transportistas?.nombre || 'Carrier'}
                          </div>
                          {/* Mobile only details */}
                          <div className="sm:hidden flex items-center gap-2 text-xs font-medium text-slate-400 mt-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">{p.peso_lbs} lbs</span>
                            <span>•</span>
                            <span>{p.fecha_recepcion ? format(new Date(p.fecha_recepcion), 'dd/MM', { locale: es }) : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-3 py-4">
                        <div className="text-sm font-semibold text-slate-700">
                          {p.clientes?.nombre} {p.clientes?.apellido}
                        </div>
                        <div className="text-xs font-bold text-blue-600 bg-blue-50 inline-flex items-center px-2 py-0.5 rounded-md mt-1">
                          {p.clientes?.locker_id}
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-600 hidden sm:table-cell">
                      {p.fecha_recepcion ? format(new Date(p.fecha_recepcion), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {p.peso_lbs} <span className="text-slate-400 ml-1">lbs</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-slate-700">{p.bodegas?.nombre || 'Bodega General'}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset shadow-sm ${ESTADOS[p.estado]?.color || 'bg-slate-50 text-slate-600 ring-slate-500/10'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full bg-current opacity-70`} />
                        {ESTADOS[p.estado]?.label || p.estado}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setPrintingLabel({
                              remitenteInfo: p.transportistas?.nombre || '',
                              trackingOriginal: p.tracking,
                              clienteCasillero: p.clientes?.locker_id || '',
                              clienteNombre: `${p.clientes?.nombre || ''} ${p.clientes?.apellido || ''}`.trim(),
                              bodegaDestino: p.bodegas?.nombre || 'General',
                              pesoLbs: p.peso_lbs,
                              piezas: 1
                            })}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                            title="Imprimir Etiqueta"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>
                          </button>
                          <button className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200" title="Editar Paquete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printingLabel && (
        <LabelPrinterModal
          isOpen={!!printingLabel}
          onClose={() => setPrintingLabel(null)}
          paquete={printingLabel}
        />
      )}
    </div>
  );
}
