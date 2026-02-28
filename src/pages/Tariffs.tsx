import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, Edit2, Save, X, Calculator, MapPin, Package as PkgIcon, DollarSign } from 'lucide-react';

interface Bodega {
  id: string;
  nombre: string;
}

interface Tarifa {
  id: string;
  bodega_id: string;
  nombre_servicio: string;
  tipo_cobro: 'por_libra' | 'por_paquete';
  tarifa_q: number;
  activa: boolean;
  bodegas?: Bodega;
}

export function Tariffs() {
  const { user } = useAuth();
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Modo edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Nuevo registro
  const [isAdding, setIsAdding] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newTarifa, setNewTarifa] = useState({
    bodega_id: '',
    nombre_servicio: '',
    tipo_cobro: 'por_libra' as 'por_libra' | 'por_paquete',
    tarifa_q: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: bData, error: bError } = await supabase.from('bodegas').select('id, nombre');
      if (bError) throw bError;
      setBodegas(bData || []);

      const { data: tData, error: tError } = await supabase
        .from('tarifas')
        .select(`
          *,
          bodegas ( id, nombre )
        `)
        .order('nombre_servicio');
      if (tError) throw tError;

      setTarifas(tData || []);
    } catch (err: any) {
      console.error('Error fetching tariffs:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartEdit = (tarifa: Tarifa) => {
    setEditingId(tarifa.id);
    setEditValue(tarifa.tarifa_q.toString());
  };

  const handleSaveEdit = async (tarifa: Tarifa) => {
    if (!editValue || isNaN(Number(editValue))) {
      alert("Por favor ingrese un número válido.");
      return;
    }

    setSavingId(tarifa.id);
    try {
      const newMonto = parseFloat(editValue);
      const { error } = await supabase
        .from('tarifas')
        .update({ tarifa_q: newMonto })
        .eq('id', tarifa.id);

      if (error) throw error;

      // Update local state
      setTarifas(tarifas.map(t => t.id === tarifa.id ? { ...t, tarifa_q: newMonto } : t));
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      alert('Error guardando la tarifa: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarifa.bodega_id || !newTarifa.nombre_servicio || !newTarifa.tarifa_q) {
      alert("Completar todos los campos obligatorios.");
      return;
    }

    setSavingNew(true);
    try {
      const insertData = {
        bodega_id: newTarifa.bodega_id,
        nombre_servicio: newTarifa.nombre_servicio,
        tipo_cobro: newTarifa.tipo_cobro,
        tarifa_q: parseFloat(newTarifa.tarifa_q),
        activa: true
      };

      const { data, error } = await supabase.from('tarifas').insert([insertData]).select(`*, bodegas (id, nombre)`).single();
      if (error) throw error;

      if (data) {
        setTarifas([...tarifas, data]);
      }

      setIsAdding(false);
      setNewTarifa({
        bodega_id: bodegas.length > 0 ? bodegas[0].id : '',
        nombre_servicio: '',
        tipo_cobro: 'por_libra',
        tarifa_q: '',
      });
    } catch (err: any) {
      console.error(err);
      alert('Error creando tarifa: ' + err.message);
    } finally {
      setSavingNew(false);
    }
  };

  const formatQ = (val: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);
  };

  // Grouping by warehouse
  const groupedTarifas = bodegas.map(bodega => ({
    bodega,
    items: tarifas.filter(t => t.bodega_id === bodega.id)
  })).filter(g => g.items.length > 0 || bodegas.length > 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Motor de Tarifas</h1>
          <p className="text-sm text-slate-500">Configura los precios de fletes por libra o por paquete según cada Origen.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (!newTarifa.bodega_id && bodegas.length > 0) {
              setNewTarifa(p => ({ ...p, bodega_id: bodegas[0].id }));
            }
          }}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
        >
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdding ? 'Cancelar' : 'Agregar Tarifa'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border rounded-xl shadow-sm border-slate-200 p-5 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-500" /> Nueva Configuración de Tarifa
          </h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Bodega (Origen)</label>
              <select
                required
                value={newTarifa.bodega_id}
                onChange={e => setNewTarifa({ ...newTarifa, bodega_id: e.target.value })}
                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              >
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Servicio (Ej. Shein)</label>
              <input
                required
                type="text"
                placeholder="Nombre servicio"
                value={newTarifa.nombre_servicio}
                onChange={e => setNewTarifa({ ...newTarifa, nombre_servicio: e.target.value })}
                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Cobro</label>
              <select
                required
                value={newTarifa.tipo_cobro}
                onChange={e => setNewTarifa({ ...newTarifa, tipo_cobro: e.target.value as any })}
                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              >
                <option value="por_libra">Por Libra</option>
                <option value="por_paquete">Por Paquete/Pieza</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Costo (Q)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-semibold text-xs">Q</span>
                </div>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTarifa.tarifa_q}
                  onChange={e => setNewTarifa({ ...newTarifa, tarifa_q: e.target.value })}
                  className="block w-full rounded-md border-0 py-1.5 pl-8 pr-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={savingNew}
                className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-70"
              >
                {savingNew ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 gap-6">
          {groupedTarifas.map((group) => (
            <div key={group.bodega.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center gap-3">
                <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Bodega {group.bodega.nombre}</h2>
              </div>

              <ul className="divide-y divide-slate-100">
                {group.items.length === 0 ? (
                  <li className="p-5 flex justify-center text-slate-400 text-sm">No hay tarifas configuradas aquí.</li>
                ) : (
                  group.items.map(tarifa => (
                    <li key={tarifa.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {tarifa.tipo_cobro === 'por_libra' ? (
                          <Calculator className="h-4 w-4 text-slate-400" />
                        ) : (
                          <PkgIcon className="h-4 w-4 text-slate-400" />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{tarifa.nombre_servicio}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Cobro {tarifa.tipo_cobro.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {editingId === tarifa.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-24">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500 font-semibold text-xs">Q</span>
                              <input
                                type="number"
                                autoFocus
                                step="any"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="block w-full rounded-md border-0 py-1 pl-6 pr-2 text-slate-900 shadow-sm ring-1 ring-inset ring-blue-500 sm:text-sm font-bold"
                              />
                            </div>
                            <button
                              onClick={() => handleSaveEdit(tarifa)}
                              disabled={savingId === tarifa.id}
                              className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                              title="Guardar"
                            >
                              {savingId === tarifa.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-slate-50 text-slate-500 hover:bg-slate-200"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-right">
                              <span className="text-base font-bold text-slate-800">{formatQ(tarifa.tarifa_q)}</span>
                            </div>
                            <button
                              onClick={() => handleStartEdit(tarifa)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Editar Tarifa"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
