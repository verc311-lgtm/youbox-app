import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Search, Plus, Package, MapPin, Loader2, CheckSquare, Square, ClipboardList, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ConsolidationsList } from '../components/ConsolidationsList';

interface Bodega { id: string; nombre: string; }
interface Zona { id: string; nombre: string; }
interface Paquete {
  id: string;
  tracking: string;
  peso_lbs: number;
  peso_volumetrico: number;
  piezas: number;
  clientes: {
    nombre: string;
    apellido: string;
    locker_id: string;
  };
  bodegas: {
    id: string;
    nombre: string;
  };
}

export function Consolidation() {
  const { user } = useAuth();

  // Tabs State
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Data States
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    nombre_alternativo: '',
    origen_id: '',
    destino_id: ''
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      // Fetch Catalogs
      const [bodegasRes, zonasRes, paquetesRes] = await Promise.all([
        supabase.from('bodegas').select('id, nombre').eq('activo', true),
        supabase.from('zonas').select('id, nombre').eq('activo', true),
        supabase.from('paquetes')
          .select('id, tracking, peso_lbs, peso_volumetrico, piezas, clientes(nombre, apellido, locker_id), bodegas(id, nombre)')
          .in('estado', ['en_bodega', 'recibido'])
          .order('fecha_recepcion', { ascending: false })
      ]);

      if (bodegasRes.data) {
        setBodegas(bodegasRes.data);
        if (bodegasRes.data.length > 0) setFormData(f => ({ ...f, origen_id: bodegasRes.data[0].id }));
      }

      if (zonasRes.data) {
        setZonas(zonasRes.data);
        if (zonasRes.data.length > 0) setFormData(f => ({ ...f, destino_id: zonasRes.data[0].id }));
      }

      if (paquetesRes.data) {
        setPaquetes(paquetesRes.data as unknown as Paquete[]);
      }
    } catch (e) {
      console.error('Error fetching data for consolidation:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'origen_id') {
      // Si cambia el origen, se limpian las selecciones previas para no cruzar bodegas
      if (selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredPaquetes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return paquetes.filter(p => {
      // Filtrar forzosamente por la bodega seleccionada en "Origen"
      if (formData.origen_id && p.bodegas?.id !== formData.origen_id) return false;

      const lockName = `${p.clientes?.locker_id} ${p.clientes?.nombre} ${p.clientes?.apellido}`.toLowerCase();
      return lockName.includes(q) || p.tracking.toLowerCase().includes(q);
    });
  }, [paquetes, searchQuery, formData.origen_id]);

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPaquetes.length && filteredPaquetes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPaquetes.map(p => p.id)));
    }
  };

  // Resumen
  const resumen = useMemo(() => {
    let pesoTotal = 0;
    let volTotal = 0;

    selectedIds.forEach(id => {
      const p = paquetes.find(x => x.id === id);
      if (p) {
        pesoTotal += Number(p.peso_lbs) || 0;
        volTotal += Number(p.peso_volumetrico) || 0;
      }
    });

    return {
      cantidad: selectedIds.size,
      peso: pesoTotal,
      volumen: volTotal
    };
  }, [selectedIds, paquetes]);

  const handleCreateConsolidation = async () => {
    if (selectedIds.size === 0) {
      alert('Debes seleccionar al menos un paquete.');
      return;
    }
    if (!formData.origen_id || !formData.destino_id) {
      alert('Origen y Destino son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      // Generate Code like CON-YYYYMMDD-RAMDOM
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const code = `CON-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newConsolidation = {
        codigo: formData.nombre_alternativo || code,
        bodega_id: formData.origen_id,
        zona_destino_id: formData.destino_id,
        estado: 'abierta',
        peso_total_lbs: resumen.peso,
        notas: `Consolidación generada por ${user?.nombre || 'Operador'}`,
      };

      // 1. Insert Consolidation
      const { data: consData, error: consError } = await supabase
        .from('consolidaciones')
        .insert([newConsolidation])
        .select()
        .single();

      if (consError || !consData) throw consError;

      const consId = consData.id;
      const idsArray = Array.from(selectedIds);

      // 2. Pivot Table Insert
      const pivotData = idsArray.map(pid => ({
        consolidacion_id: consId,
        paquete_id: pid
      }));

      const { error: pivotError } = await supabase.from('consolidacion_paquetes').insert(pivotData);
      if (pivotError) throw pivotError;

      // 3. Update status of Packages
      for (const pid of idsArray) {
        await supabase
          .from('paquetes')
          .update({ estado: 'consolidado' })
          .eq('id', pid);
      }

      alert('Consolidación creada con éxito. Los paquetes ahora están listos para envío.');

      // Refresh Data
      setFormData(f => ({ ...f, nombre_alternativo: '' }));
      setSelectedIds(new Set());
      fetchInitialData();

    } catch (e: any) {
      console.error('Error creating consolidation:', e);
      alert('Hubo un error al crear la consolidación: ' + (e.message || 'Desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const isAllSelected = filteredPaquetes.length > 0 && selectedIds.size === filteredPaquetes.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in relative z-10 w-full max-w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Módulo de Consolidación
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Agrupa envíos y administra el Tracking Maestro.
          </p>
        </div>

        <div className="flex glass p-1.5 rounded-xl border border-slate-200/50 shadow-sm">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-white shadow-sm text-blue-600 scale-95' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <Layers className="h-4 w-4" />
            Crear Consolidado
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-white shadow-sm text-blue-600 scale-95' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
          >
            <ClipboardList className="h-4 w-4" />
            Tracking Master
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">

            {/* Detalles del Envio */}
            <div className="glass border border-slate-200/60 rounded-2xl shadow-sm p-6 space-y-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                    <Package className="h-5 w-5" />
                  </div>
                  Detalles del Envío
                </h2>
                <button
                  onClick={fetchInitialData}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/50 border border-slate-200/60 px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-white hover:-translate-y-0.5 transition-all focus:outline-none"
                  title="Refrescar datos"
                >
                  ↻
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Nombre Alternativo <span className="text-slate-400 font-normal text-xs">(Opcional)</span></label>
                  <input
                    type="text"
                    name="nombre_alternativo"
                    value={formData.nombre_alternativo}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 px-3.5 text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-500/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-sm sm:leading-6 font-medium"
                    placeholder="Dejar vacío para auto-generar"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Bodega de Origen</label>
                  <select
                    name="origen_id"
                    value={formData.origen_id}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 px-3.5 text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-500/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 sm:text-sm sm:leading-6 font-medium"
                  >
                    {bodegas.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Zona de Destino</label>
                  <select
                    name="destino_id"
                    value={formData.destino_id}
                    onChange={handleChange}
                    className="block w-full rounded-xl border-slate-200/80 bg-slate-50/50 py-2.5 px-3.5 text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-500/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 sm:text-sm sm:leading-6 font-medium"
                  >
                    {zonas.map(z => (
                      <option key={z.id} value={z.id}>{z.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Resumen Card */}
            <div className="glass border border-slate-200/60 rounded-2xl shadow-sm p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 tracking-tight mb-5">
                <div className="p-2 bg-amber-100/50 rounded-lg text-amber-600">
                  <Layers className="h-5 w-5" />
                </div>
                Resumen
              </h3>
              <dl className="space-y-3 pt-2">
                <div className="flex justify-between items-center py-2.5 px-3 bg-white/60 rounded-xl border border-slate-100 shadow-sm">
                  <dt className="text-sm font-bold text-slate-500">Paquetes seleccionados:</dt>
                  <dd className="font-extrabold text-blue-600 text-lg bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{resumen.cantidad}</dd>
                </div>
                <div className="flex justify-between py-2 px-3">
                  <dt className="text-sm font-medium text-slate-500">Peso total estimado:</dt>
                  <dd className="font-bold text-slate-800 font-mono bg-slate-100/50 px-2 rounded-md">{resumen.peso.toFixed(2)} lbs</dd>
                </div>
                <div className="flex justify-between py-2 px-3">
                  <dt className="text-sm font-medium text-slate-500">Vol. total estimado:</dt>
                  <dd className="font-bold text-slate-800 font-mono bg-slate-100/50 px-2 rounded-md">{resumen.volumen.toFixed(2)} ft³</dd>
                </div>
              </dl>
              <button
                onClick={handleCreateConsolidation}
                disabled={selectedIds.size === 0 || saving}
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/20 hover:from-slate-700 hover:to-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Layers className="h-5 w-5" />}
                {saving ? 'Procesando...' : 'Crear Consolidado Maestro'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="glass border border-slate-200/60 rounded-2xl shadow-sm h-full flex flex-col min-h-[600px] overflow-hidden">
              {/* Header & Search */}
              <div className="p-5 border-b border-slate-200/60 bg-slate-50/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Paquetes Disponibles</h2>
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-inset ring-blue-600/20 shadow-sm">
                    {paquetes.length} en bodega
                  </span>
                </div>
                <div className="relative w-full sm:w-80 group/search">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar paquete o locker..."
                    className="h-10 w-full rounded-xl border border-slate-200/80 bg-white/80 pl-10 pr-4 text-sm outline-none focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </div>

              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-slate-200/60 bg-slate-50/40 backdrop-blur-md text-xs font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                <div className="col-span-1 flex items-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 focus:outline-none transition-colors">
                    {isAllSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                  </button>
                </div>
                <div className="col-span-5">Detalle del Paquete</div>
                <div className="col-span-4">Cliente / Casillero</div>
                <div className="col-span-2 text-right">Peso (lbs)</div>
              </div>

              {/* List Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {loading ? (
                  <div className="absolute inset-0 flex justify-center items-center bg-white/40 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                      <p className="text-sm font-bold text-slate-500">Cargando paquetes...</p>
                    </div>
                  </div>
                ) : filteredPaquetes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-12 h-full">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 shadow-inner mb-4">
                      <Layers className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                      {searchQuery ? 'No hay resultados para tu búsqueda' : 'No hay paquetes en bodega'}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm">
                      {searchQuery ? 'Intenta usar otros términos de búsqueda o verifica que estén en la bodega correcta.' : 'Todos los paquetes disponibles ya han sido consolidados o asignados.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white/40">
                    {filteredPaquetes.map((p, idx) => {
                      const isSelected = selectedIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleSelect(p.id)}
                          className={`grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-all duration-300 animate-fade-in ${isSelected ? 'bg-indigo-50/60 border-l-4 border-l-blue-500' : 'hover:bg-blue-50/40 border-l-4 border-transparent'}`}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div className="col-span-1">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600 transition-transform scale-110" />
                            ) : (
                              <Square className="h-5 w-5 text-slate-300 hover:text-slate-400 transition-colors" />
                            )}
                          </div>
                          <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors ${isSelected ? 'bg-blue-500 border-blue-600' : 'bg-white border-slate-200'}`}>
                              <Package className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`} title={p.tracking}>
                                {p.tracking}
                              </p>
                              <p className="text-xs font-medium text-slate-500 mt-0.5">
                                {p.piezas || 1} {p.piezas === 1 ? 'pieza' : 'piezas'}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <MapPin className={`h-3 w-3 shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                              <p className={`text-sm font-bold truncate ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>
                                {p.clientes?.locker_id || 'N/A'}
                              </p>
                            </div>
                            <p className="text-xs font-medium text-slate-500 truncate">
                              {p.clientes?.nombre} {p.clientes?.apellido}
                            </p>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold font-mono shadow-sm border ${isSelected ? 'bg-white text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200/60'}`}>
                              {p.peso_lbs ? `${Number(p.peso_lbs).toFixed(2)} lbs` : '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Status */}
              {filteredPaquetes.length > 0 && (
                <div className="p-4 border-t border-slate-200/60 bg-slate-50/80 backdrop-blur-sm flex justify-between items-center text-sm font-bold text-slate-500">
                  <span>Mostrando {filteredPaquetes.length} {filteredPaquetes.length === 1 ? 'paquete' : 'paquetes'}</span>
                  {selectedIds.size > 0 && (
                    <span className="text-blue-600 bg-blue-100/50 px-3 py-1 rounded-lg border border-blue-200/50 shadow-sm">{selectedIds.size} seleccionados</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <ConsolidationsList />
        </div>
      )}
    </div>
  );

}
