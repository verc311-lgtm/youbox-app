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
    <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-fade-in relative z-10 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Motor de Tarifas
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Configura los precios de fletes por libra o por paquete según cada Origen.
          </p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            if (!newTarifa.bodega_id && bodegas.length > 0) {
              setNewTarifa(p => ({ ...p, bodega_id: bodegas[0].id }));
            }
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${isAdding ? 'bg-slate-500 hover:bg-slate-600 shadow-slate-500/20 focus:ring-slate-500/50' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-lg focus:ring-blue-500/50'}`}
        >
          {isAdding ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {isAdding ? 'Cancelar Edición' : 'Agregar Tarifa'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-dark rounded-2xl shadow-md border border-slate-200/60 p-6 sm:p-8 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Calculator className="h-4.5 w-4.5" />
            </span>
            Nueva Configuración de Tarifa
          </h3>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-5 items-end">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-1">Bodega (Origen)</label>
              <select
                required
                value={newTarifa.bodega_id}
                onChange={e => setNewTarifa({ ...newTarifa, bodega_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-2.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 font-medium sm:text-sm"
              >
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-1">Servicio (Ej. Shein)</label>
              <input
                required
                type="text"
                placeholder="Nombre servicio"
                value={newTarifa.nombre_servicio}
                onChange={e => setNewTarifa({ ...newTarifa, nombre_servicio: e.target.value })}
                className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-2.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 font-medium sm:text-sm"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-1">Tipo de Cobro</label>
              <select
                required
                value={newTarifa.tipo_cobro}
                onChange={e => setNewTarifa({ ...newTarifa, tipo_cobro: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-2.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 font-medium sm:text-sm"
              >
                <option value="por_libra">Por Libra</option>
                <option value="por_paquete">Por Paquete/Pieza</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 pl-1">Costo (Q)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-black text-sm">Q</span>
                </div>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTarifa.tarifa_q}
                  onChange={e => setNewTarifa({ ...newTarifa, tarifa_q: e.target.value })}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/70 py-2.5 pl-8 pr-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 font-black font-mono sm:text-sm placeholder:text-slate-400 placeholder:font-medium"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={savingNew}
                className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              >
                {savingNew ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center h-64 flex-col gap-4 items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-sm"></div>
          <p className="text-sm font-bold text-slate-500">Cargando tarifas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8 gap-6 mt-4">
          {groupedTarifas.map((group, groupIdx) => (
            <div key={group.bodega.id} className="glass rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden animate-slide-up" style={{ animationDelay: `${groupIdx * 100}ms` }}>
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 px-6 py-5 border-b border-blue-100/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl text-blue-600 shadow-sm border border-blue-100/80">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Bodega {group.bodega.nombre}</h2>
                </div>
                <div className="text-xs font-bold text-blue-600 bg-blue-100/50 px-2 py-1 rounded-md border border-blue-200/50">{group.items.length} SERVICIOS</div>
              </div>

              <ul className="divide-y divide-slate-100/80">
                {group.items.length === 0 ? (
                  <li className="p-8 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 bg-white/40">
                    <Calculator className="h-8 w-8 text-slate-300" />
                    <span className="font-medium">No hay tarifas configuradas aquí.</span>
                  </li>
                ) : (
                  group.items.map(tarifa => (
                    <li key={tarifa.id} className="p-5 sm:px-6 flex items-center justify-between bg-white/40 hover:bg-blue-50/30 transition-colors group/item">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 group-hover/item:border-blue-100 group-hover/item:bg-white group-hover/item:text-blue-500 transition-colors">
                          {tarifa.tipo_cobro === 'por_libra' ? (
                            <Calculator className="h-4 w-4" />
                          ) : (
                            <PkgIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{tarifa.nombre_servicio}</p>
                          <p className="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wide">
                            <span className="text-indigo-400">TIPO:</span> {tarifa.tipo_cobro.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {editingId === tarifa.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative w-28">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-black text-sm">Q</span>
                              <input
                                type="number"
                                autoFocus
                                step="any"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="block w-full rounded-lg border border-blue-300 py-1.5 pl-7 pr-2 text-slate-900 shadow-sm sm:text-sm font-black font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
                              />
                            </div>
                            <button
                              onClick={() => handleSaveEdit(tarifa)}
                              disabled={savingId === tarifa.id}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200/50 transition-colors"
                              title="Guardar Cambio"
                            >
                              {savingId === tarifa.id ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Save className="h-4.5 w-4.5" />}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200/50 transition-colors"
                              title="Cancelar Edición"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-right">
                              <span className="text-lg font-black text-slate-800 font-mono tracking-tight">{formatQ(tarifa.tarifa_q)}</span>
                            </div>
                            <button
                              onClick={() => handleStartEdit(tarifa)}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
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
