import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Search, Loader2, Trash2, Save, Keyboard, ImagePlus, CheckCircle2, Upload, Printer, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LabelPrinterModal } from '../components/LabelPrinterModal';
import { WebcamModal } from '../components/WebcamModal';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  locker_id: string;
}

interface RowData {
  id: string;
  tracking: string;
  cliente_id: string;
  bodega_id: string;
  transportista_id: string;
  peso_lbs: string;
  empaque?: string;
  piezas: string;
  notas: string;
  // Photo
  photoFile: File | null;
  photoPreview: string | null;
  // UI states
  clientSearch: string;
  clientResults: Cliente[];
  isSearchingClient: boolean;
  showClientDropdown: boolean;
  showPhotoMenu: boolean; // For the popup menu
  // Save state
  isSaving: boolean;
  isSaved: boolean;
}

const createEmptyRow = (defaultBodega = '', defaultTransportista = ''): RowData => ({
  id: Math.random().toString(36).substring(7),
  tracking: '',
  cliente_id: '',
  bodega_id: defaultBodega,
  transportista_id: defaultTransportista,
  peso_lbs: '',
  empaque: 'Sobre', // Default value for Tapachula
  piezas: '1',
  notas: '',
  photoFile: null,
  photoPreview: null,
  clientSearch: '',
  clientResults: [],
  isSearchingClient: false,
  showClientDropdown: false,
  showPhotoMenu: false,
  isSaving: false,
  isSaved: false,
});

export function QuickEntry() {
  const { user } = useAuth();
  const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([]);
  const [transportistas, setTransportistas] = useState<{ id: string; nombre: string }[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [globalBodega, setGlobalBodega] = useState('');
  const [globalTransportista, setGlobalTransportista] = useState('');

  // Auto-save toggle
  const [autoSaveOnEnter, setAutoSaveOnEnter] = useState(false);


  // Label Printing state
  const [printLabelData, setPrintLabelData] = useState<any | null>(null);

  // Webcam state
  const [activeWebcamRow, setActiveWebcamRow] = useState<string | null>(null);

  // Photo input refs per row (we need two per row now: one for camera, one for gallery)
  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const galleryRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { fetchCatalogs(); }, []);

  async function fetchCatalogs() {
    try {
      const [bodegasRes, transpRes] = await Promise.all([
        supabase.from('bodegas').select('id, nombre').eq('activo', true),
        supabase.from('transportistas').select('id, nombre').eq('activo', true)
      ]);
      let defBodega = '';
      let defTrans = '';
      if (bodegasRes.data && bodegasRes.data.length > 0) {
        setBodegas(bodegasRes.data);
        defBodega = bodegasRes.data[0].id;
        setGlobalBodega(defBodega);
      }
      if (transpRes.data && transpRes.data.length > 0) {
        setTransportistas(transpRes.data);
        defTrans = transpRes.data[0].id;
        setGlobalTransportista(defTrans);
      }
      setRows([createEmptyRow(defBodega, defTrans)]);
    } catch (e) {
      console.error('Error fetching catalogs:', e);
    }
  }

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    const bId = lastRow ? lastRow.bodega_id : globalBodega;
    const tId = lastRow ? lastRow.transportista_id : globalTransportista;
    const newRow = createEmptyRow(bId, tId);
    setRows(prev => [...prev, newRow]);
    setTimeout(() => {
      const el = document.getElementById(`tracking-${newRow.id}`);
      if (el) el.focus();
    }, 50);
  };

  const removeRow = (idToRemove: string) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== idToRemove));
  };

  const updateRow = (id: string, field: keyof RowData, value: any) => {
    setRows(cur => cur.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Client search
  const handleClientSearchChange = (id: string, value: string) => {
    updateRow(id, 'clientSearch', value);
    updateRow(id, 'cliente_id', '');
    if (value.length >= 2) {
      updateRow(id, 'isSearchingClient', true);
      setTimeout(() => executeClientSearch(id, value), 400);
    } else {
      updateRow(id, 'clientResults', []);
      updateRow(id, 'showClientDropdown', false);
    }
  };

  const executeClientSearch = async (id: string, query: string) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, locker_id, nombre, apellido')
        .or(`locker_id.ilike.%${query}%,nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
        .eq('activo', true)
        .limit(8);
      if (!error && data) {
        setRows(cur => cur.map(r =>
          r.id === id ? { ...r, clientResults: data, showClientDropdown: true, isSearchingClient: false } : r
        ));
      }
    } catch (e) { console.error('Search error:', e); }
  };

  const selectClientForRow = (id: string, cliente: Cliente) => {
    setRows(cur => cur.map(r =>
      r.id === id ? {
        ...r,
        cliente_id: cliente.id,
        clientSearch: `${cliente.locker_id} - ${cliente.nombre} ${cliente.apellido}`,
        showClientDropdown: false,
        clientResults: []
      } : r
    ));
    setTimeout(() => {
      const el = document.getElementById(`peso-${id}`);
      if (el) el.focus();
    }, 50);
  };

  const closeDropdown = (id: string) => {
    setTimeout(() => updateRow(id, 'showClientDropdown', false), 200);
  };

  // Photo handling
  const handlePhotoChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Imagen muy grande. Máx 8MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRows(cur => cur.map(r =>
        r.id === id ? { ...r, photoFile: file, photoPreview: reader.result as string, showPhotoMenu: false } : r
      ));
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset so same file can be selected again if needed
  };

  const handleWebcamCapture = (id: string, file: File, previewUrl: string) => {
    setRows(cur => cur.map(r =>
      r.id === id ? { ...r, photoFile: file, photoPreview: previewUrl, showPhotoMenu: false } : r
    ));
  };

  // Per-row save
  const handleSaveRow = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    if (!row.tracking.trim()) { alert('El número de tracking es requerido.'); return; }
    if (!row.cliente_id) { alert('Selecciona un cliente / casillero válido.'); return; }

    setRows(cur => cur.map(r => r.id === rowId ? { ...r, isSaving: true } : r));

    try {
      // Check for duplicate tracking
      const { data: existingPaquete, error: checkError } = await supabase
        .from('paquetes')
        .select('id')
        .eq('tracking', row.tracking.trim())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking tracking check:', checkError);
      } else if (existingPaquete) {
        alert(`¡Alerta! El tracking ${row.tracking.trim()} ya existe registrado en el sistema.`);
        setRows(cur => cur.map(r => r.id === rowId ? { ...r, isSaving: false } : r));
        return;
      }

      let foto_url: string | null = null;

      // Upload photo if exists
      if (row.photoFile) {
        const ext = row.photoFile.name.split('.').pop();
        const path = `${user?.id || 'sys'}/${Date.now()}_${rowId}.${ext}`;
        const { error: uploadErr, data: uploadData } = await supabase.storage
          .from('recibos_gastos')
          .upload(path, row.photoFile, { cacheControl: '3600', upsert: false });
        if (!uploadErr && uploadData) {
          const { data: pub } = supabase.storage.from('recibos_gastos').getPublicUrl(uploadData.path);
          foto_url = pub.publicUrl;
        }
      }

      // Check if it's the Tapachula warehouse
      const bodegaRow = bodegas.find(b => b.id === (row.bodega_id || globalBodega));
      const isTapachula = bodegaRow?.nombre?.toLowerCase().includes('tapachula');

      let finalPesoResult = parseFloat(row.peso_lbs) || null;
      let finalNotas = row.notas || '';

      if (isTapachula && row.empaque !== 'Libra') {
        finalPesoResult = 0;
        const empaqueInfo = `[Empaque: ${row.empaque || 'Sobre'}]`;
        finalNotas = finalNotas ? `${empaqueInfo} ${finalNotas}` : empaqueInfo;
      }

      const payload = {
        tracking: row.tracking.trim(),
        cliente_id: row.cliente_id,
        bodega_id: row.bodega_id || globalBodega,
        transportista_id: row.transportista_id || globalTransportista,
        peso_lbs: finalPesoResult,
        piezas: parseInt(row.piezas) || 1,
        notas: finalNotas || null,
        estado: 'en_bodega',
        usuario_recepcion: user?.id === 'admin-001' ? null : user?.id,
      };

      const { error } = await supabase.from('paquetes').insert([payload]);
      if (error) throw error;

      // Mark as saved (green)
      setRows(cur => cur.map(r => r.id === rowId ? { ...r, isSaving: false, isSaved: true } : r));

      // Add a new row automatically after 800ms
      setTimeout(() => {
        const isLastRow = rows[rows.length - 1].id === rowId;
        if (isLastRow || rows.length === 1) {
          addRow();
        } else {
          // focus next row tracking
          const idx = rows.findIndex(r => r.id === rowId);
          if (idx < rows.length - 1) {
            const el = document.getElementById(`tracking-${rows[idx + 1].id}`);
            if (el) el.focus();
          }
        }
      }, 800);

    } catch (e: any) {
      console.error('Error saving row:', e);
      alert('Error al guardar: ' + e.message);
      setRows(cur => cur.map(r => r.id === rowId ? { ...r, isSaving: false } : r));
    }
  };

  const handleSaveAll = async () => {
    const unsavedRows = rows.filter(r => !r.isSaved && r.tracking.trim() !== '' && r.cliente_id !== '');
    if (unsavedRows.length === 0) {
      alert('No hay paquetes pendientes con tracking y cliente válido para guardar.');
      return;
    }

    // Process sequentially to prevent DB spam and UI state overlap
    for (const row of unsavedRows) {
      await handleSaveRow(row.id);
    }
  };

  // Label printing handler
  const openLabelPrinter = (row: RowData) => {
    if (!row.tracking) {
      alert("Por favor ingresa un número de tracking primero.");
      return;
    }
    const bodegaName = bodegas.find(b => b.id === (row.bodega_id || globalBodega))?.nombre || 'General';
    setPrintLabelData({
      remitenteInfo: "DESCONOCIDO", // We don't have transportista name explicitly here, could fetch if needed
      trackingOriginal: row.tracking,
      clienteCasillero: row.clientSearch.split(' - ')[0] || "N/A", // Extract locker ID from "Locker - Nombre"
      clienteNombre: row.clientSearch.split(' - ')[1] || "CLIENTE NO ASIGNADO",
      bodegaDestino: bodegaName,
      pesoLbs: parseFloat(row.peso_lbs) || 0,
      piezas: parseInt(row.piezas) || 1,
    });
  };

  // Keyboard handler for ENTER only (Tab is now 100% native DOM order)
  const handleKeyDown = (e: React.KeyboardEvent, currentId: string, type: 'tracking' | 'client' | 'peso', index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'tracking') {
        const el = document.getElementById(`client-${currentId}`);
        if (el) el.focus();
      } else if (type === 'client') {
        const el = document.getElementById(`peso-${currentId}`);
        if (el) el.focus();
      } else if (type === 'peso') {
        if (autoSaveOnEnter) {
          handleSaveRow(currentId);
        } else {
          // just try to go to next row
          const isLastRow = rows[rows.length - 1].id === currentId;
          if (isLastRow) {
            addRow();
          } else {
            const nextRowId = rows[index + 1].id;
            const el = document.getElementById(`tracking-${nextRowId}`);
            if (el) el.focus();
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in relative z-10 w-full max-w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Multi-Entry (Bulk)
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Ingreso secuencial rápido y tabulado.
          </p>
        </div>
        <div className="flex gap-3">
          {/* Scanner Mode Toggle -> Renamed to Auto Save on Enter */}
          <button
            onClick={() => setAutoSaveOnEnter(prev => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm border transition-all focus:outline-none ${autoSaveOnEnter
              ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
              : 'bg-white/80 text-slate-500 border-slate-200/60 hover:bg-white'
              }`}
            title={autoSaveOnEnter ? 'Guardado Automático Activado' : 'Guardado Manual'}
          >
            <Save className="h-4 w-4" />
            {autoSaveOnEnter ? 'Auto-Save ON' : 'Auto-Save OFF'}
          </button>

          <button
            onClick={handleSaveAll}
            disabled={rows.filter(r => !r.isSaved && r.tracking.trim() !== '' && r.cliente_id !== '').length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:from-indigo-500 hover:to-blue-500 hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
          >
            <Save className="h-4 w-4" />
            Guardar Todos
          </button>

          <button
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-200/60 hover:bg-white hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none"
          >
            <Plus className="h-4 w-4 text-blue-500" />
            Añadir Fila
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass border border-slate-200/60 rounded-2xl shadow-sm overflow-visible flex flex-col pt-1">
        <div className="overflow-x-visible custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 backdrop-blur-md text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3.5 w-10 text-center text-slate-400">#</th>
                <th className="px-3 py-3.5 w-36">Bodega</th>
                <th className="px-3 py-3.5 min-w-[200px]">Tracking Number <span className="text-red-500">*</span></th>
                <th className="px-3 py-3.5 min-w-[300px]">Cliente / Locker <span className="text-red-500">*</span></th>
                <th className="px-3 py-3.5 w-24">Peso (lbs)</th>
                <th className="px-3 py-3.5 w-16 text-center">Pzas</th>
                <th className="px-3 py-3.5 w-32 text-center">Foto</th>
                <th className="px-3 py-3.5 w-28 text-center">Acciones</th>
                <th className="px-3 py-3.5 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 bg-white/40">
              {rows.map((row, index) => {
                const currentBodega = bodegas.find(b => b.id === row.bodega_id);
                const isTapachula = currentBodega?.nombre?.toLowerCase().includes('tapachula');

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors group ${row.isSaved ? 'bg-emerald-50/60' : 'hover:bg-blue-50/30'}`}
                  >
                    {/* # */}
                    <td className="px-3 py-2.5 text-center text-slate-400 font-bold font-mono text-xs">{index + 1}</td>

                    {/* Bodega */}
                    <td className="px-3 py-2.5">
                      <select
                        value={row.bodega_id}
                        onChange={(e) => updateRow(row.id, 'bodega_id', e.target.value)}
                        disabled={row.isSaved}
                        className="block w-full rounded-lg border-slate-200/80 bg-slate-50/50 py-1.5 px-2 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-xs font-semibold disabled:opacity-60 outline-none"
                      >
                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                      </select>
                    </td>

                    {/* Tracking */}
                    <td className="px-3 py-2.5">
                      <input
                        id={`tracking-${row.id}`}
                        type="text"
                        className="block w-full rounded-lg border-slate-200/80 bg-white/80 py-1.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-sm font-bold tracking-tight uppercase disabled:opacity-60 outline-none"
                        placeholder="Escribe..."
                        value={row.tracking}
                        onChange={(e) => updateRow(row.id, 'tracking', e.target.value.toUpperCase())}
                        onKeyDown={(e) => handleKeyDown(e, row.id, 'tracking', index)}
                        disabled={row.isSaved}
                      />
                    </td>

                    {/* Client Search */}
                    <td className="px-3 py-2.5">
                      <div className="relative group/search">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                        </div>
                        <input
                          id={`client-${row.id}`}
                          type="text"
                          className={`block w-full rounded-lg py-1.5 pl-8 pr-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-sm font-bold outline-none disabled:opacity-60 ${!row.cliente_id && row.clientSearch
                            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10'
                            : row.isSaved
                              ? 'border border-emerald-200/80 bg-emerald-50/30'
                              : 'border border-slate-200/80 bg-white/80'
                            }`}
                          placeholder="Buscar por nombre, apellido o YBG..."
                          value={row.clientSearch}
                          onChange={(e) => handleClientSearchChange(row.id, e.target.value)}
                          onBlur={() => closeDropdown(row.id)}
                          onKeyDown={(e) => handleKeyDown(e, row.id, 'client', index)}
                          autoComplete="off"
                          disabled={row.isSaved}
                        />
                        {row.isSearchingClient && (
                          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                            <Loader2 className="h-3 w-3 text-slate-400 animate-spin" />
                          </div>
                        )}
                        {row.showClientDropdown && row.clientResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl ring-1 ring-black/5 max-h-64 overflow-auto">
                            <ul className="py-1">
                              {row.clientResults.map((client) => (
                                <li
                                  key={client.id}
                                  onMouseDown={() => selectClientForRow(row.id, client)}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                >
                                  <span className="font-extrabold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-md">
                                    {client.locker_id}
                                  </span>
                                  <span className="text-sm text-slate-700">
                                    {client.nombre} {client.apellido}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Peso / Tipo Empaque */}
                    <td className="px-3 py-2.5">
                      {isTapachula ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={row.empaque || 'Sobre'}
                            onChange={(e) => updateRow(row.id, 'empaque', e.target.value)}
                            disabled={row.isSaved}
                            className="block w-full rounded-lg border-slate-200/80 bg-blue-50/50 py-1.5 px-1 sm:px-2 text-blue-700 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-xs font-bold disabled:opacity-60 outline-none"
                          >
                            <option value="Sobre">Sobre</option>
                            <option value="Bolsa">Bolsa</option>
                            <option value="Caja">Caja</option>
                            <option value="Libra">Libra</option>
                          </select>
                          {row.empaque === 'Libra' && (
                            <input
                              id={`peso-${row.id}`}
                              type="number"
                              step="0.01"
                              className="block w-16 rounded-lg border-blue-200/80 text-blue-700 bg-white/80 py-1.5 px-1.5 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-blue-300 hover:border-blue-300 text-right sm:text-xs font-mono font-bold outline-none disabled:opacity-60"
                              placeholder="0"
                              value={row.peso_lbs}
                              onChange={(e) => updateRow(row.id, 'peso_lbs', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, row.id, 'peso', index)}
                              disabled={row.isSaved}
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          id={`peso-${row.id}`}
                          type="number"
                          step="0.01"
                          className="block w-full rounded-lg border-slate-200/80 bg-white/80 py-1.5 px-2.5 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 text-right sm:text-sm font-mono font-bold outline-none disabled:opacity-60"
                          placeholder="0.00"
                          value={row.peso_lbs}
                          onChange={(e) => updateRow(row.id, 'peso_lbs', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, row.id, 'peso', index)}
                          disabled={row.isSaved}
                        />
                      )}
                    </td>

                    {/* Piezas */}
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="1"
                        className="block w-full rounded-lg border-slate-200/80 bg-white/80 py-1.5 px-2 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm text-center font-bold outline-none disabled:opacity-60"
                        value={row.piezas}
                        onChange={(e) => updateRow(row.id, 'piezas', e.target.value)}
                        disabled={row.isSaved}
                      />
                    </td>

                    {/* Foto con Dropdown Menu usando Labels nativos (fixes iOS camera bug) */}
                    <td className="px-3 py-2.5 text-center relative">
                      <input
                        id={`camera-${row.id}`}
                        ref={el => { cameraRefs.current[row.id] = el; }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(row.id, e)}
                      />
                      <input
                        id={`gallery-${row.id}`}
                        ref={el => { galleryRefs.current[row.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoChange(row.id, e)}
                      />

                      <div className="relative inline-block text-left">
                        {row.photoPreview ? (
                          <button
                            onClick={() => updateRow(row.id, 'showPhotoMenu', !row.showPhotoMenu)}
                            disabled={row.isSaved}
                            className="relative inline-block"
                            title="Cambiar foto"
                          >
                            <img
                              src={row.photoPreview}
                              alt="preview"
                              className="h-9 w-9 rounded-lg object-cover shadow ring-2 ring-blue-400/40 hover:ring-blue-500/70 transition-all"
                            />
                            <div className="absolute inset-0 rounded-lg bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Camera className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => updateRow(row.id, 'showPhotoMenu', !row.showPhotoMenu)}
                            onBlur={() => setTimeout(() => updateRow(row.id, 'showPhotoMenu', false), 200)}
                            disabled={row.isSaved}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 h-9 rounded-lg border border-slate-300 text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-40 text-xs font-bold"
                          >
                            <ImagePlus className="h-4 w-4" />
                            <span className="hidden xl:inline">Subir Foto</span>
                          </button>
                        )}

                        {/* Photo Popup Dropdown - Using native labels to trigger inputs directly */}
                        {row.showPhotoMenu && (
                          <div className="absolute z-[9999] right-0 mt-2 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 overflow-hidden"
                            style={{ bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }}>
                            <label
                              htmlFor={`camera-${row.id}`}
                              onMouseDown={() => setTimeout(() => updateRow(row.id, 'showPhotoMenu', false), 150)}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <div className="bg-blue-100/50 p-1.5 rounded-lg text-blue-600">
                                <Camera className="h-4 w-4" />
                              </div>
                              Tomar foto (Móvil)
                            </label>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); setActiveWebcamRow(row.id); updateRow(row.id, 'showPhotoMenu', false); }}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 transition-colors cursor-pointer text-left"
                            >
                              <div className="bg-purple-100/50 p-1.5 rounded-lg text-purple-600">
                                <Monitor className="h-4 w-4" />
                              </div>
                              Cámara PC
                            </button>
                            <label
                              htmlFor={`gallery-${row.id}`}
                              onMouseDown={() => setTimeout(() => updateRow(row.id, 'showPhotoMenu', false), 150)}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              <div className="bg-emerald-100/50 p-1.5 rounded-lg text-emerald-600">
                                <Upload className="h-4 w-4" />
                              </div>
                              Subir galería
                            </label>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Acciones (Guardar + Imprimir) */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.isSaved ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Guardado
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSaveRow(row.id)}
                            disabled={row.isSaving || !row.tracking.trim() || !row.cliente_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Guardar"
                          >
                            {row.isSaving
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Save className="h-3.5 w-3.5" />
                            }
                            <span className="hidden xl:inline">{row.isSaving ? 'Guardando...' : 'Guardar'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openLabelPrinter(row)}
                          disabled={!row.tracking.trim()}
                          className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-300 shadow-sm hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-95 outline-none disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-300"
                          title="Imprimir Etiqueta"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1 || row.isSaving}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all disabled:opacity-30 outline-none"
                        title="Eliminar fila"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/80 backdrop-blur-sm border-t border-slate-200/60 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-0">
          <p className="text-sm text-slate-500 font-medium">
            <span className="font-extrabold text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-md border border-blue-200/50">{rows.length}</span> fila(s) &mdash;{' '}
            <span className="text-emerald-600 font-bold">{rows.filter(r => r.isSaved).length} guardado(s)</span>
          </p>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-white border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-sm">
            <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-xs font-bold text-slate-700 shadow-sm">Tab</kbd> navegar naturalmente &mdash;
            <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-xs font-bold text-slate-700 shadow-sm ml-1">Enter</kbd> salto rápido (y Auto-Save)
          </p>
        </div>
      </div>

      {printLabelData && (
        <LabelPrinterModal
          isOpen={true}
          onClose={() => setPrintLabelData(null)}
          paquete={printLabelData}
        />
      )}

      <WebcamModal
        isOpen={!!activeWebcamRow}
        onClose={() => setActiveWebcamRow(null)}
        rowId={activeWebcamRow || ''}
        onCapture={(file, previewUrl) => {
          if (activeWebcamRow) {
            handleWebcamCapture(activeWebcamRow, file, previewUrl);
          }
        }}
      />
    </div>
  );
}
