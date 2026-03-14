import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, Download, Inbox, Package as PkgIcon, Loader2, Truck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useBodegas, useDeletePaquete, QUERY_KEYS } from '../hooks/useQueries';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { LabelPrinterModal } from '../components/LabelPrinterModal';
import { EditPackageModal } from '../components/EditPackageModal';
import { InventoryFilters, FilterState } from '../components/InventoryFilters';

interface Paquete {
  id: string;
  tracking: string;
  peso_lbs: number;
  estado: string;
  fecha_recepcion: string;
  notas?: string | null;
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
  const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  const [printingLabel, setPrintingLabel] = useState<any>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    bodegaId: '',
    estado: '',
    startDate: '',
    endDate: '',
    cliente: '',
    lockerId: '',
    tracking: '',
    minPeso: '',
    maxPeso: '',
    piezas: '',
    transportistaId: '',
    empaque: ''
  });

  // Safe hasActiveFilters that doesn't rely on objects if possible
  const hasActiveFilters = useMemo(() => {
    return Object.values(activeFilters).some(v => v !== '');
  }, [activeFilters]);

  // ── React Query: bodegas (cached globally, no re-fetch on page change) ──────
  const { data: bodegas = [] } = useBodegas();

  // ── React Query: paquetes (scoped by role) ─────────────────────────────────
  const { data: paquetes = [], isLoading: loading, error: queryError, refetch: refetchPaquetes } = useQuery({
    queryKey: QUERY_KEYS.paquetes({ scope: isSuperAdmin ? 'all' : user?.sucursal_id, debug: 'v4' }),
    queryFn: async () => {
      console.log('DEBUG: Initiating fetch for sucursal:', user?.sucursal_id);
      const { data, error } = await supabase
        .from('paquetes')
        .select(`
          id, tracking, peso_lbs, piezas, estado, fecha_recepcion, notas, created_at, bodega_id, transportista_id,
          bodegas (id, nombre),
          clientes (id, nombre, apellido, locker_id, sucursal_id),
          transportistas (id, nombre)
        `)
        .order('fecha_recepcion', { ascending: false });

      if (error) {
        console.error('DEBUG: Fetch error details:', error);
        throw error;
      }
      console.log('DEBUG: Fetch success, rows:', data?.length);
      return data ?? [];
    },
    enabled: !!user,
    retry: 1
  });

  // ── Delete mutation with optimistic update ─────────────────────────────────
  const deleteMutation = useDeletePaquete();

  const handleDeletePackage = async (paqueteId: string, tracking: string) => {
    if (!window.confirm(`¿Estás completamente seguro de que deseas ELIMINAR el paquete con tracking: ${tracking}? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(paqueteId);
    } catch (e: any) {
      toast.error('Hubo un error al eliminar el paquete: ' + e.message);
    }
  };

  const normalize = (str: string) =>
    (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const filteredPaquetes = useMemo(() => {
    const list = (paquetes as any[]) || [];
    if (!searchTerm && !hasActiveFilters) return list;

    return list.filter(p => {
      try {
        const pCliente = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;

        // 1. Text Search (Global Search Bar)
        const search = normalize(searchTerm);
        if (search) {
          const trackingMatch = normalize(p.tracking).includes(search);
          const lockerMatch = normalize(pCliente?.locker_id).includes(search);
          const fullName = normalize(`${pCliente?.nombre || ''} ${pCliente?.apellido || ''}`);
          if (!trackingMatch && !lockerMatch && !fullName.includes(search)) return false;
        }

        // 2. Bodega Filter
        if (activeFilters.bodegaId && p.bodega_id !== activeFilters.bodegaId) return false;

        // 3. Estado Filter
        if (activeFilters.estado && p.estado !== activeFilters.estado) return false;

        // 4. Locker Filter (Advanced)
        if (activeFilters.lockerId) {
          const lockerSearch = normalize(activeFilters.lockerId);
          if (!normalize(pCliente?.locker_id).includes(lockerSearch)) return false;
        }

        // 5. Tracking Filter (Advanced)
        if (activeFilters.tracking) {
          const trackingSearch = normalize(activeFilters.tracking);
          if (!normalize(p.tracking).includes(trackingSearch)) return false;
        }

        // 6. Cliente Filter (Advanced - specific by name)
        if (activeFilters.cliente) {
          const clienteSearch = normalize(activeFilters.cliente);
          const fullName = normalize(`${pCliente?.nombre || ''} ${pCliente?.apellido || ''}`);
          if (!fullName.includes(clienteSearch)) return false;
        }

        // 7. Transportista (Carrier) Filter
        if (activeFilters.transportistaId && p.transportista_id !== activeFilters.transportistaId) return false;

        // 8. Empaque Filter (Searches in notes pattern [Empaque: ...])
        if (activeFilters.empaque) {
          const empaqueFilter = normalize(activeFilters.empaque);
          const notas = normalize(p.notas || '');
          if (!notas.includes(`[empaque: ${empaqueFilter}]`) && !notas.includes(`[empaque:${empaqueFilter}]`)) {
            const m = (p.notas || '').match(/\[Empaque:\s*([^\]]+)\]/i);
            if (!m || normalize(m[1]) !== empaqueFilter) return false;
          }
        }

        // 9. Piezas Filter
        if (activeFilters.piezas && Number(p.piezas) !== Number(activeFilters.piezas)) return false;

        // 10. Weight Range
        const weight = Number(p.peso_lbs) || 0;
        if (activeFilters.minPeso && weight < Number(activeFilters.minPeso)) return false;
        if (activeFilters.maxPeso && weight > Number(activeFilters.maxPeso)) return false;

        // 11. Date Range
        if (activeFilters.startDate || activeFilters.endDate) {
          const dateStr = p.fecha_recepcion || p.created_at;
          if (!dateStr) return false;
          const pDate = parseISO(dateStr);
          if (activeFilters.startDate && pDate < startOfDay(parseISO(activeFilters.startDate))) return false;
          if (activeFilters.endDate && pDate > endOfDay(parseISO(activeFilters.endDate))) return false;
        }

        return true;
      } catch (e) {
        return true;
      }
    });
  }, [paquetes, searchTerm, activeFilters, hasActiveFilters]);

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {!isAdmin && (
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 hover:-translate-x-1 transition-all mb-3 animate-fade-in group">
              <ArrowLeft className="h-4 w-4 group-hover:stroke-[3px]" />
              Volver al Dashboard
            </Link>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            {isAdmin ? 'Control de Inventario' : 'Mis Paquetes'}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {isAdmin ? 'Gestión de paquetes en almacén (Warehouses).' : 'Rastrea el estado de tus compras en tiempo real.'}
          </p>
          <div className="mt-2 flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 w-fit">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                Sincronizado: {paquetes.length} paquetes ({filteredPaquetes.length} filtrados)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium px-1">
              Auth: {isAdmin ? 'Admin' : 'User'} | Sucursal: {user?.sucursal_id || 'Global'} | Role: {user?.role || 'N/A'}
            </div>
          </div>
        </div>
        <div className="flex gap-3 relative">
          <button
            onClick={() => setShowFilters(true)}
            className={`inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 border relative ${hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              : 'bg-white/70 backdrop-blur-sm text-slate-700 border-slate-200/80 hover:bg-white hover:shadow-md'
              }`}
          >
            <Filter className={`h-4 w-4 ${hasActiveFilters ? 'text-blue-600' : 'text-blue-500'}`} />
            Filtros
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
            )}
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
              ) : queryError ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-red-500">
                      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                        <PkgIcon className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-base font-semibold">Error al cargar datos</p>
                        <p className="text-sm opacity-80 mt-1">{(queryError as any)?.message || 'Ha ocurrido un error inesperado'}</p>
                        <button
                          onClick={() => refetchPaquetes()}
                          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                        >
                          Reintentar
                        </button>
                      </div>
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
                        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                          {paquetes.length === 0
                            ? 'La base de datos devolvió 0 paquetes para tu sucursal.'
                            : 'Ningún paquete coincide con los filtros aplicados.'}
                        </p>
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
                            {(p.bodegas?.nombre || '').toLowerCase().includes('tapachula') && p.notas ? (
                              (() => {
                                const m = p.notas.match(/\[Empaque:\s*([^\]]+)\]/);
                                return m ? (
                                  <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                                    📦 {m[1]}
                                  </span>
                                ) : (
                                  <><Truck className="h-3 w-3" />{p.transportistas?.nombre || 'Carrier'}</>
                                );
                              })()
                            ) : (
                              <><Truck className="h-3 w-3" />{p.transportistas?.nombre || 'Carrier'}</>
                            )}
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
                        <div className="flex items-center justify-end gap-2 min-w-[120px]">
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
                          <button
                            onClick={() => setEditingPackageId(p.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                            title="Editar Paquete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          </button>
                          <button
                            onClick={() => handleDeletePackage(p.id, p.tracking)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                            title="Eliminar Paquete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
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

      {editingPackageId && (
        <EditPackageModal
          isOpen={!!editingPackageId}
          onClose={() => setEditingPackageId(null)}
          paqueteId={editingPackageId}
          onSuccess={() => {
            refetchPaquetes();
          }}
        />
      )}

      {/* Advanced Filters */}
      <InventoryFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        bodegas={bodegas}
        currentFilters={activeFilters}
        onApply={setActiveFilters}
        isAdmin={isAdmin}
      />
    </div>
  );
}
