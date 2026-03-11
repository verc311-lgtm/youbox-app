import { useEffect, useState, useMemo } from 'react';
import { FileText, Inbox, CreditCard, Download, Building, Filter, Search, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { GenerateInvoiceSlideOver } from '../components/billing/GenerateInvoiceSlideOver';
import { RegisterPaymentModal } from '../components/billing/RegisterPaymentModal';
import { downloadInvoicePDF } from '../utils/generateInvoicePDF';
import { BillingFilters, BillingFilterState } from '../components/billing/BillingFilters';

interface Factura {
  id: string;
  numero: string;
  monto_total: number;
  moneda: string;
  estado: string;
  fecha_emision: string;
  notas?: string;
  cliente_manual_nombre?: string;
  cliente_manual_nit?: string;
  clientes?: { nombre: string; apellido: string; locker_id?: string; nit?: string; direccion_entrega?: string };
  pagos?: { metodo: string; monto: number }[];
}

const ESTADOS: Record<string, { label: string, color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 ring-amber-600/20' },
  verificado: { label: 'Pagada', color: 'bg-green-100 text-green-700 ring-green-600/20' },
  anulado: { label: 'Anulada', color: 'bg-red-100 text-red-700 ring-red-600/20' },
  devuelto: { label: 'Devuelta', color: 'bg-slate-100 text-slate-700 ring-slate-600/20' },
};

export function Billing() {
  const { user, isAdmin } = useAuth();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

  const [sucursales, setSucursales] = useState<{ id: string, nombre: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BillingFilterState>({
    sucursalId: 'all',
    estado: 'all',
    metodo: 'all',
    startDate: '',
    endDate: '',
    minMonto: '',
    maxMonto: '',
    search: ''
  });

  const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;

  const hasActiveFilters = Boolean(
    activeFilters.sucursalId !== 'all' ||
    activeFilters.estado !== 'all' ||
    activeFilters.metodo !== 'all' ||
    activeFilters.startDate ||
    activeFilters.endDate ||
    activeFilters.minMonto ||
    activeFilters.maxMonto
  );

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSucursales();
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    fetchFacturas();
  }, [user, activeFilters.sucursalId]);

  async function fetchSucursales() {
    const { data } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
    if (data) setSucursales(data);
  }

  async function fetchFacturas() {
    if (!user) return;
    try {
      setLoading(true);
      const activeBranch = isSuperAdmin ? activeFilters.sucursalId : user?.sucursal_id;
      const useInnerJoin = activeBranch && activeBranch !== 'all';

      let query = supabase
        .from('facturas')
        .select(`
          id, numero, monto_total, moneda, estado, fecha_emision, cliente_manual_nombre, cliente_manual_nit,
          clientes${useInnerJoin ? '!inner' : ''} (nombre, apellido, locker_id, nit, direccion_entrega),
          pagos (metodo, monto)
        `)
        .order('fecha_emision', { ascending: false });

      if (!isAdmin) {
        query = query.eq('cliente_id', user.id);
      } else {
        if (useInnerJoin) {
          query = query.eq('clientes.sucursal_id', activeBranch);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setFacturas(data || []);
    } catch (e) {
      console.error('Error fetching facturas:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredFacturas = useMemo(() => {
    return facturas.filter(f => {
      // 1. Search (Number, Client or Locker)
      const searchStr = activeFilters.search.toLowerCase();
      if (searchStr) {
        const matchesNumero = f.numero.toLowerCase().includes(searchStr);
        const fullName = `${f.clientes?.nombre || ''} ${f.clientes?.apellido || ''}`.toLowerCase();
        const matchesClient = fullName.includes(searchStr) || (f.cliente_manual_nombre || '').toLowerCase().includes(searchStr);
        const matchesLocker = f.clientes?.locker_id?.toLowerCase().includes(searchStr);
        if (!matchesNumero && !matchesClient && !matchesLocker) return false;
      }

      // 2. Status
      if (activeFilters.estado !== 'all' && f.estado !== activeFilters.estado) return false;

      // 3. Method
      if (activeFilters.metodo !== 'all') {
        const hasMethod = f.pagos?.some(p => p.metodo === activeFilters.metodo);
        if (!hasMethod) return false;
      }

      // 4. Date Range
      if (activeFilters.startDate) {
        if (new Date(f.fecha_emision) < new Date(activeFilters.startDate)) return false;
      }
      if (activeFilters.endDate) {
        const endDate = new Date(activeFilters.endDate);
        endDate.setHours(23, 59, 59);
        if (new Date(f.fecha_emision) > endDate) return false;
      }

      // 5. Amount Range
      if (activeFilters.minMonto && f.monto_total < parseFloat(activeFilters.minMonto)) return false;
      if (activeFilters.maxMonto && f.monto_total > parseFloat(activeFilters.maxMonto)) return false;

      return true;
    });
  }, [facturas, activeFilters]);

  const openPaymentModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setIsPaymentModalOpen(true);
  };

  const handleAnularFactura = async (factura: Factura) => {
    const razon = window.prompt(`¿Está seguro de anular la factura ${factura.numero}? Por favor escriba la razón:`);
    if (!razon || razon.trim() === '') {
      if (razon !== null) toast.error('Debe proporcionar una razón para anular la factura.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('facturas')
        .update({
          estado: 'anulado',
          notas: factura.notas ? `${factura.notas}\n\nRAZÓN ANULACIÓN: ${razon}` : `RAZÓN ANULACIÓN: ${razon}`
        })
        .eq('id', factura.id);

      if (error) throw error;

      // Ensure any associated payments are removed when voided
      const { error: pagoError } = await supabase
        .from('pagos')
        .delete()
        .eq('factura_id', factura.id);

      if (pagoError) {
        console.error('Error al intentar eliminar pago tras anulación:', pagoError);
      }

      toast.success('Factura anulada con éxito.');
      fetchFacturas();
    } catch (e) {
      console.error('Error anular factura:', e);
      toast.error('Hubo un error al anular la factura.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary metrics based on filtered data (matching active filters)
  const summaries = useMemo(() => {
    let numFacturas = 0;
    let montoTotal = 0;
    let cobrado = 0;

    filteredFacturas.forEach(f => {
      // Exclude annulled / returned invoices from financial totals
      if (['anulado', 'devuelto'].includes(f.estado)) return;

      numFacturas++;
      montoTotal += Number(f.monto_total) || 0;

      // Sum partial payments to find out what was actually collected
      const abonos = f.pagos?.reduce((sum, pago) => sum + (Number(pago.monto) || 0), 0) || 0;
      cobrado += abonos;
    });

    const porCobrar = montoTotal - cobrado;

    return {
      numFacturas,
      montoTotal,
      cobrado,
      porCobrar: porCobrar > 0 ? porCobrar : 0
    };
  }, [filteredFacturas]);

  const formatQ = (val: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full max-w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            {isAdmin ? 'Facturación y Pagos' : 'Mis Facturas'}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {isAdmin ? 'Gestión centralizada del ciclo de pagos y facturación.' : 'Historial de tus facturas y cobros de envíos.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isAdmin && (
            <>
              {/* Search Bar */}
              <div className="relative flex-1 md:min-w-[300px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por # factura o cliente..."
                  value={activeFilters.search}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Advanced Filters Button */}
              <button
                onClick={() => setShowFilters(true)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all duration-200 shadow-sm ${hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-blue-100 hover:bg-blue-100'
                  : 'bg-white/80 backdrop-blur-sm border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:shadow-md'
                  }`}
              >
                <Filter className={`h-4.5 w-4.5 ${hasActiveFilters ? 'fill-blue-600' : ''}`} />
                {hasActiveFilters ? 'Filtros Activos' : 'Filtros'}
                {hasActiveFilters && (
                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full ml-1">
                    {Object.values(activeFilters).filter(v => v !== 'all' && v !== '').length}
                  </span>
                )}
              </button>
            </>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 md:ml-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Factura</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary cards (New Total Summaries requested by UI) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <div className="rounded-2xl glass p-5 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-slate-900/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Facturas</p>
          <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{loading ? '...' : summaries.numFacturas}</p>
        </div>
        <div className="rounded-2xl glass p-5 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto Total</p>
          <p className="text-2xl font-black text-blue-700 tracking-tight mt-1">{loading ? '...' : formatQ(summaries.montoTotal)}</p>
        </div>
        <div className="rounded-2xl glass p-5 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobrado</p>
          <p className="text-2xl font-black text-emerald-600 tracking-tight mt-1">{loading ? '...' : formatQ(summaries.cobrado)}</p>
        </div>
        <div className="rounded-2xl glass p-5 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por Cobrar</p>
          <p className="text-2xl font-black text-amber-600 tracking-tight mt-1">{loading ? '...' : formatQ(summaries.porCobrar)}</p>
        </div>
      </div>

      <div className="rounded-2xl glass overflow-hidden flex flex-col min-w-0">
        <div className="p-5 border-b border-white/20 flex items-center justify-between bg-slate-50/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Registro de Facturas</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
              {filteredFacturas.length}
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => setActiveFilters({
                sucursalId: 'all',
                estado: 'all',
                metodo: 'all',
                startDate: '',
                endDate: '',
                minMonto: '',
                maxMonto: '',
                search: ''
              })}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/60">
            <thead className="bg-slate-50/50 backdrop-blur-sm">
              <tr>
                <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 sm:pl-6">Factura</th>
                {isAdmin && <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Cliente</th>}
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Fecha Emisión</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Monto</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Estado</th>
                <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/40">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mb-2"></div>
                      <p className="text-sm font-medium text-slate-500">Cargando historial de facturación...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredFacturas.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                        <Inbox className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-base font-semibold text-slate-700">No se encontraron facturas</p>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">Prueba ajustando los filtros o la búsqueda.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={() => setActiveFilters({
                            sucursalId: 'all',
                            estado: 'all',
                            metodo: 'all',
                            startDate: '',
                            endDate: '',
                            minMonto: '',
                            maxMonto: '',
                            search: ''
                          })}
                          className="mt-2 text-sm font-bold text-blue-600 hover:underline"
                        >
                          Ver todas las facturas
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFacturas.map((f, index) => (
                  <tr key={f.id} className="hover:bg-blue-50/50 transition-colors animate-fade-in group" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 shrink-0 hidden sm:flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-2.5 shadow-sm group-hover:scale-105 transition-transform">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 tracking-tight">{f.numero}</p>
                          <div className="sm:hidden flex flex-col gap-1 mt-1.5">
                            {isAdmin && <span className="text-xs font-medium text-slate-600">{f.clientes ? `${f.clientes.nombre} ${f.clientes.apellido}` : (f.cliente_manual_nombre || 'Consumidor Final')}</span>}
                            <span className="text-xs text-slate-400">{f.fecha_emision ? format(new Date(f.fecha_emision), 'dd/MM/yy') : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-3 py-4 hidden sm:table-cell">
                        <div className="text-sm font-semibold text-slate-700">
                          {f.clientes ? `${f.clientes.nombre} ${f.clientes.apellido}` : (f.cliente_manual_nombre || 'Consumidor Final')}
                        </div>
                        {f.clientes?.locker_id && (
                          <div className="text-xs font-bold text-blue-600 bg-blue-50 inline-flex items-center px-2 py-0.5 rounded-md mt-1">
                            {f.clientes.locker_id}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-500 hidden md:table-cell">
                      {f.fecha_emision ? format(new Date(f.fecha_emision), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block w-fit">
                          <span className="text-slate-500 mr-1">{f.moneda}</span>{f.monto_total.toFixed(2)}
                        </span>
                        {f.estado === 'pendiente' && (() => {
                          const totalPagado = f.pagos?.reduce((sum, p) => sum + (Number(p.monto) || 0), 0) || 0;
                          const saldo = f.monto_total - totalPagado;
                          if (totalPagado > 0) {
                            return (
                              <span className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-amber-500" />
                                Saldo: Q{saldo.toFixed(2)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset shadow-sm ${ESTADOS[f.estado]?.color || 'bg-slate-50 text-slate-600'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full bg-current opacity-70`} />
                        {ESTADOS[f.estado]?.label || f.estado}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isAdmin && f.estado === 'pendiente' && (
                          <button
                            onClick={() => openPaymentModal(f)}
                            className="inline-flex items-center justify-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-200 font-bold shadow-sm"
                            title="Registrar Pago">
                            <CreditCard className="h-4 w-4" /> <span className="hidden lg:inline">Abonar</span>
                          </button>
                        )}
                        {isAdmin && f.estado !== 'anulado' && (
                          <button
                            onClick={() => handleAnularFactura(f)}
                            className="inline-flex items-center justify-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-200 font-bold shadow-sm"
                            title="Anular Factura">
                            <XCircle className="h-4 w-4" /> <span className="hidden lg:inline">Anular</span>
                          </button>
                        )}
                        <button
                          onClick={() => downloadInvoicePDF(f as any)}
                          className="inline-flex items-center justify-center gap-1.5 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-xl transition-all duration-200 font-bold shadow-sm"
                          title="Descargar PDF">
                          <Download className="h-4 w-4" /> <span className="hidden lg:inline">PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GenerateInvoiceSlideOver
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={fetchFacturas}
      />

      {selectedFactura && (
        <RegisterPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => { setIsPaymentModalOpen(false); setSelectedFactura(null); }}
          onSuccess={fetchFacturas}
          facturaId={selectedFactura.id}
          facturaTotal={selectedFactura.monto_total}
          totalPagado={selectedFactura.pagos?.reduce((sum, p) => sum + (Number(p.monto) || 0), 0) || 0}
          facturaNumero={selectedFactura.numero}
        />
      )}

      {/* New Professional Filters Panel */}
      <BillingFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        sucursales={sucursales}
        currentFilters={activeFilters}
        onApply={setActiveFilters}
        isSuperAdmin={isSuperAdmin}
      />

    </div>
  );
}

