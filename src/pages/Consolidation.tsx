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
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Módulo de Consolidación</h1>
          <p className="text-sm text-slate-500">Agrupa envíos y administra el Tracking Maestro.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'create' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
            Crear Consolidado
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
            <ClipboardList className="h-4 w-4" /> Tracking Master
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Detalles del Envío</h2>
                <button
                  onClick={fetchInitialData}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                  <span className="sr-only">Refrescar</span>
                  ↻
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nombre Alternativo (Guía Master)</label>
                  <input
                    type="text"
                    name="nombre_alternativo"
                    value={formData.nombre_alternativo}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Dejar vacío para auto-generar"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Origen</label>
                  <select
                    name="origen_id"
                    value={formData.origen_id}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                    {bodegas.map(b => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Destino</label>
                  <select
                    name="destino_id"
                    value={formData.destino_id}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                    {zonas.map(z => (
                      <option key={z.id} value={z.id}>{z.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-slate-900 mb-4">Resumen de Consolidación</h3>
              <dl className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <dt>Paquetes seleccionados:</dt>
                  <dd className="font-bold text-blue-600 text-base">{resumen.cantidad}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt>Peso total estimado:</dt>
                  <dd className="font-medium text-slate-900">{resumen.peso.toFixed(2)} lbs</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt>Volumen total estimado:</dt>
                  <dd className="font-medium text-slate-900">{resumen.volumen.toFixed(2)} ft³</dd>
                </div>
              </dl>
              <button
                onClick={handleCreateConsolidation}
                disabled={selectedIds.size === 0 || saving}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                {saving ? 'Procesando...' : 'Crear Consolidado'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm h-full flex flex-col min-h-[500px]">
              {/* Header & Search */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 rounded-t-xl">
                <div className="flex items-center gap-4">
                  <h2 className="text-base font-semibold text-slate-900">Paquetes Disponibles</h2>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {paquetes.length} en bodega
                  </span>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por cliente o tracking..."
                    className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                  />
                </div>
              </div>

              {/* List Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="col-span-1 flex items-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 focus:outline-none">
                    {isAllSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                  </button>
                </div>
                <div className="col-span-5">Detalle del Paquete</div>
                <div className="col-span-4">Cliente / Casillero</div>
                <div className="col-span-2 text-right">Peso (lbs)</div>
              </div>

              {/* List Body */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredPaquetes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                      <Layers className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {searchQuery ? 'No hay resultados para tu búsqueda' : 'No hay paquetes en bodega'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 max-w-sm">
                      {searchQuery ? 'Intenta usar otros términos.' : 'Todos los paquetes disponibles ya han sido consolidados o empacados.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPaquetes.map((p) => {
                      const isSelected = selectedIds.has(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleSelect(p.id)}
                          className={`grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="col-span-1">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                          <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isSelected ? 'bg-blue-100 border-blue-200' : 'bg-white border-slate-200'}`}>
                              <Package className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900" title={p.tracking}>
                                {p.tracking}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {p.piezas || 1} {p.piezas === 1 ? 'pieza' : 'piezas'}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {p.clientes?.locker_id || 'N/A'}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {p.clientes?.nombre} {p.clientes?.apellido}
                            </p>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
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
                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-between text-sm text-slate-500">
                  <span>Mostrando {filteredPaquetes.length} paquetes</span>
                  {selectedIds.size > 0 && (
                    <span className="font-medium text-blue-600">{selectedIds.size} seleccionados</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ConsolidationsList />
      )}
    </div>
  );
}
