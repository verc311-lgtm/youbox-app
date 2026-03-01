import { useEffect, useState } from 'react';
import { FileText, Inbox, CreditCard, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { GenerateInvoiceModal } from '../components/billing/GenerateInvoiceModal';
import { RegisterPaymentModal } from '../components/billing/RegisterPaymentModal';
import { downloadInvoicePDF } from '../utils/generateInvoicePDF';

interface Factura {
  id: string;
  numero: string;
  monto_total: number;
  moneda: string;
  estado: string;
  fecha_emision: string;
  cliente_manual_nombre?: string;
  cliente_manual_nit?: string;
  clientes?: { nombre: string; apellido: string };
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

  useEffect(() => {
    fetchFacturas();
  }, [user]);

  async function fetchFacturas() {
    if (!user) return;
    try {
      setLoading(true);
      let query = supabase
        .from('facturas')
        .select(`
          id, numero, monto_total, moneda, estado, fecha_emision, cliente_manual_nombre, cliente_manual_nit,
          clientes (nombre, apellido, locker_id, nit, direccion_entrega)
        `)
        .order('fecha_emision', { ascending: false });

      if (!isAdmin) {
        query = query.eq('cliente_id', user.id);
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

  const openPaymentModal = (factura: Factura) => {
    setSelectedFactura(factura);
    setIsPaymentModalOpen(true);
  };

  // Calculate some simple stats based on loaded data
  const pendientes = facturas.filter(f => f.estado === 'pendiente').length;
  const verificadas = facturas.filter(f => f.estado === 'verificado').length;
  const anuladas = facturas.filter(f => ['anulado', 'devuelto'].includes(f.estado)).length;

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
        {isAdmin && (
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <FileText className="h-4 w-4" />
            Nueva Factura
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        <div className="rounded-2xl glass p-6 card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pendientes de Cobro</p>
          <p className="text-3xl font-bold text-amber-600 tracking-tight mt-2">{loading ? '...' : pendientes}</p>
        </div>
        <div className="rounded-2xl glass p-6 card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pagos Completados</p>
          <p className="text-3xl font-bold text-emerald-600 tracking-tight mt-2">{loading ? '...' : verificadas}</p>
        </div>
        <div className="rounded-2xl glass p-6 card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Anuladas / Devueltas</p>
          <p className="text-3xl font-bold text-rose-600 tracking-tight mt-2">{loading ? '...' : anuladas}</p>
        </div>
      </div>

      <div className="rounded-2xl glass overflow-hidden flex flex-col min-w-0">
        <div className="p-5 border-b border-white/20 flex items-center justify-between bg-slate-50/50 backdrop-blur-md">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Registro de Facturas</h2>
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
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                        <Inbox className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-base font-semibold text-slate-700">No hay facturas registradas</p>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">Las facturas aparecerán aquí cuando sean generadas por sistema.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                facturas.map((f, index) => (
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
                      <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <span className="text-slate-500 mr-1">{f.moneda}</span>{f.monto_total}
                      </span>
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

      <GenerateInvoiceModal
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
          facturaNumero={selectedFactura.numero}
        />
      )}

    </div>
  );
}

