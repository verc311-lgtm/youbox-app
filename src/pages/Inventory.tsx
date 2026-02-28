import { useEffect, useState } from 'react';
import { Filter, Download, Inbox, Package as PkgIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Control de Inventario' : 'Mis Paquetes'}
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Gestión de paquetes en almacén (Warehouses).' : 'Rastrea el estado de tus compras.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
          {isAdmin && (
            <button className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Exportar
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Tracking / Envío</th>
                {isAdmin && <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Cliente</th>}
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Ingreso</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Peso</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Ubicación</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estatus</th>
                {isAdmin && (
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">Cargando paquetes...</td>
                </tr>
              ) : paquetes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Inbox className="h-10 w-10 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">No hay paquetes registrados</p>
                      <p className="text-xs">Los paquetes aparecerán aquí cuando lleguen a nuestras bodegas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paquetes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-blue-50 p-2">
                          <PkgIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{p.tracking}</div>
                          <div className="text-xs text-slate-500">{p.transportistas?.nombre || 'Carrier'}</div>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                        {p.clientes?.nombre} {p.clientes?.apellido} <br />
                        <span className="text-xs text-blue-600 font-medium">{p.clientes?.locker_id}</span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {p.fecha_recepcion ? format(new Date(p.fecha_recepcion), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 font-medium">
                      {p.peso_lbs} lbs
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {p.bodegas?.nombre || 'Bodega General'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${ESTADOS[p.estado]?.color || 'bg-slate-50 text-slate-600 ring-slate-500/10'}`}>
                        {ESTADOS[p.estado]?.label || p.estado}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button className="text-blue-600 hover:text-blue-900">Editar</button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
