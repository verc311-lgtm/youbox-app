import { useEffect, useState } from 'react';
import { FileText, Inbox, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { GenerateInvoiceModal } from '../components/billing/GenerateInvoiceModal';
import { RegisterPaymentModal } from '../components/billing/RegisterPaymentModal';

interface Factura {
  id: string;
  numero: string;
  monto_total: number;
  moneda: string;
  estado: string;
  fecha_emision: string;
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
          id, numero, monto_total, moneda, estado, fecha_emision,
          clientes (nombre, apellido)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Facturación y Pagos' : 'Mis Facturas'}
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Gestión del ciclo de pagos y facturación.' : 'Historial de tus facturas y cobros de envíos.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500">
            <FileText className="h-4 w-4" />
            Generar Factura
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Facturas Pendientes</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{loading ? '...' : pendientes}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pagos Completados</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{loading ? '...' : verificadas}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Anuladas / Devueltas</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{loading ? '...' : anuladas}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-semibold text-slate-900">Últimas Facturas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Factura</th>
                {isAdmin && <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Cliente</th>}
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Fecha</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Monto</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estado</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-16 text-center text-slate-500 text-sm">Cargando facturas...</td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Inbox className="h-10 w-10 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">No hay facturas registradas</p>
                      <p className="text-xs">Las facturas aparecerán aquí cuando sean generadas por sistema.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6 font-medium text-slate-900">
                      {f.numero}
                    </td>
                    {isAdmin && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                        {f.clientes?.nombre} {f.clientes?.apellido}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {f.fecha_emision ? format(new Date(f.fecha_emision), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-medium">
                      {f.moneda} {f.monto_total}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${ESTADOS[f.estado]?.color || 'bg-slate-50 text-slate-600'}`}>
                        {ESTADOS[f.estado]?.label || f.estado}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      {isAdmin && f.estado === 'pendiente' && (
                        <button
                          onClick={() => openPaymentModal(f)}
                          className="text-green-600 hover:text-green-900 mr-4 inline-flex items-center gap-1">
                          <CreditCard className="h-4 w-4" /> Registrar Pago
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900 mr-4">Ver Detalles</button>
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

