import React, { useState, useEffect, useRef } from 'react';
import { Camera, ScanBarcode, Plus, Search, Loader2, Trash2, Save, ScanLine, Keyboard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  locker_id: string;
}

interface RowData {
  id: string; // unique ID for React rendering
  tracking: string;
  cliente_id: string;
  bodega_id: string;
  transportista_id: string;
  peso_lbs: string;
  largo_in: string;
  ancho_in: string;
  alto_in: string;
  piezas: string;
  valor_declarado: string;
  es_fragil: boolean;
  reempaque: boolean;
  notas: string;
  // UI states per row
  clientSearch: string;
  clientResults: Cliente[];
  isSearchingClient: boolean;
  showClientDropdown: boolean;
}

const createEmptyRow = (defaultBodega = '', defaultTransportista = ''): RowData => ({
  id: Math.random().toString(36).substring(7),
  tracking: '',
  cliente_id: '',
  bodega_id: defaultBodega,
  transportista_id: defaultTransportista,
  peso_lbs: '',
  largo_in: '',
  ancho_in: '',
  alto_in: '',
  piezas: '1',
  valor_declarado: '',
  es_fragil: false,
  reempaque: false,
  notas: '',
  clientSearch: '',
  clientResults: [],
  isSearchingClient: false,
  showClientDropdown: false
});

export function QuickEntry() {
  const { user } = useAuth();
  const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([]);
  const [transportistas, setTransportistas] = useState<{ id: string; nombre: string }[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [saving, setSaving] = useState(false);
  const [globalBodega, setGlobalBodega] = useState('');
  const [globalTransportista, setGlobalTransportista] = useState('');

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScannerRowId, setActiveScannerRowId] = useState<string | null>(null);

  // Fetch Catalogs initially
  useEffect(() => {
    fetchCatalogs();
  }, []);

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

      // Initialize first row
      setRows([createEmptyRow(defBodega, defTrans)]);
    } catch (e) {
      console.error('Error fetching catalogs:', e);
    }
  }

  // Row Management
  const addRow = () => {
    // Inherit from the last row if possible
    const lastRow = rows[rows.length - 1];
    const bId = lastRow ? lastRow.bodega_id : globalBodega;
    const tId = lastRow ? lastRow.transportista_id : globalTransportista;
    const newId = Math.random().toString(36).substring(7);
    const newRow = createEmptyRow(bId, tId);
    newRow.id = newId;

    setRows(prev => [...prev, newRow]);

    // Auto-focus next tracking input
    setTimeout(() => {
      const el = document.getElementById(`tracking-${newId}`);
      if (el) el.focus();
    }, 50);
  };

  const removeRow = (idToRemove: string) => {
    if (rows.length === 1) return; // Always keep one row
    setRows(rows.filter(r => r.id !== idToRemove));
  };

  const updateRow = (id: string, field: keyof RowData, value: any) => {
    setRows(currentRows => currentRows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Client Search logic per row
  const handleClientSearchChange = (id: string, value: string) => {
    updateRow(id, 'clientSearch', value);
    updateRow(id, 'cliente_id', ''); // clear previous selection

    if (value.length >= 2) {
      updateRow(id, 'isSearchingClient', true);
      // Debounce logic simulation
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
        // Double check if the row still exists and is searching
        setRows(current => current.map(r => {
          if (r.id === id) {
            return { ...r, clientResults: data, showClientDropdown: true, isSearchingClient: false };
          }
          return r;
        }));
      }
    } catch (e) {
      console.error('Search error:', e);
    }
  };

  const selectClientForRow = (id: string, cliente: Cliente) => {
    setRows(current => current.map(r => {
      if (r.id === id) {
        return {
          ...r,
          cliente_id: cliente.id,
          clientSearch: `${cliente.locker_id} - ${cliente.nombre} ${cliente.apellido}`,
          showClientDropdown: false,
          clientResults: []
        };
      }
      return r;
    }));

    // Auto focus weight (peso)
    setTimeout(() => {
      const el = document.getElementById(`peso-${id}`);
      if (el) el.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentId: string, type: 'tracking' | 'client' | 'peso', index: number) => {
    // Hardware Scanner (or user) pressed Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'tracking') {
        const el = document.getElementById(`client-${currentId}`);
        if (el) el.focus();
      } else if (type === 'client') {
        const el = document.getElementById(`peso-${currentId}`);
        if (el) el.focus();
      } else if (type === 'peso') {
        // Try to go to next row
        const isLastRow = index === rows.length - 1;
        if (isLastRow) {
          const lastRow = rows[index];
          // Solo agregar si la fila actual ya tiene tracking válido
          if (lastRow.tracking.trim() !== '') {
            addRow();
          }
        } else {
          const nextRowId = rows[index + 1].id;
          const el = document.getElementById(`tracking-${nextRowId}`);
          if (el) el.focus();
        }
      }
    }
  };

  const openScanner = (rowId: string) => {
    setActiveScannerRowId(rowId);
    setIsScannerOpen(true);
  };

  const onScanSuccess = (decodedText: string) => {
    if (activeScannerRowId) {
      updateRow(activeScannerRowId, 'tracking', decodedText);
      setIsScannerOpen(false);
      setActiveScannerRowId(null);

      // Auto focus client search
      setTimeout(() => {
        const el = document.getElementById(`client-${activeScannerRowId}`);
        if (el) el.focus();
      }, 100);
    }
  };

  // Check clicking outside (simplified by onBlur)
  const closeDropdown = (id: string) => {
    setTimeout(() => {
      updateRow(id, 'showClientDropdown', false);
    }, 200);
  };

  // Save Batch
  const handleSaveBatch = async () => {
    // 1. Filter valid rows (must have tracking and cliente_id)
    const validRows = rows.filter(r => r.tracking.trim() !== '' && r.cliente_id !== '');

    if (validRows.length === 0) {
      alert('Debes completar al menos una fila con Tracking y Cliente válido (casillero asignado).');
      return;
    }

    try {
      setSaving(true);

      const payload = validRows.map(row => {
        let peso_volumetrico = null;
        const l = parseFloat(row.largo_in) || 0;
        const w = parseFloat(row.ancho_in) || 0;
        const h = parseFloat(row.alto_in) || 0;
        if (l > 0 && w > 0 && h > 0) {
          peso_volumetrico = (l * w * h) / 166;
        }

        return {
          tracking: row.tracking.trim(),
          cliente_id: row.cliente_id,
          bodega_id: row.bodega_id || globalBodega,
          transportista_id: row.transportista_id || globalTransportista,
          peso_lbs: parseFloat(row.peso_lbs) || null,
          largo_in: l || null,
          ancho_in: w || null,
          alto_in: h || null,
          peso_volumetrico: peso_volumetrico,
          piezas: parseInt(row.piezas) || 1,
          valor_declarado: parseFloat(row.valor_declarado) || null,
          es_fragil: row.es_fragil,
          reempaque: row.reempaque,
          notas: row.notas,
          estado: 'en_bodega',
          usuario_recepcion: user?.id === 'admin-001' ? null : user?.id,
        };
      });

      const { error } = await supabase.from('paquetes').insert(payload);

      if (error) {
        throw error;
      }

      alert(`¡Éxito! ${payload.length} paquete(s) guardado(s) correctamente.`);

      // Reset Grid
      setRows([createEmptyRow(globalBodega, globalTransportista)]);

    } catch (e: any) {
      console.error('Error saving batch:', e);
      alert('Error inesperado al guardar el lote: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-add row when typing in the last row
  const handleRowInteraction = (index: number) => {
    if (index === rows.length - 1) {
      const lastRow = rows[index];
      if (lastRow.tracking !== '' || lastRow.cliente_id !== '') {
        // Auto expand
        addRow();
      }
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Multi-Entry (Bulk)</h1>
          <p className="text-sm text-slate-500">Ingreso masivo de paquetes en matriz optimizada para lectores <Keyboard className="inline h-3 w-3 mx-0.5 text-slate-400" /> y cámara.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            <Plus className="h-4 w-4" />
            Añadir Fila
          </button>
          <button
            disabled={saving}
            onClick={handleSaveBatch}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Procesando...' : 'Guardar Lote Completo'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                <th className="px-4 py-3 font-semibold w-40">Bodega de Salida</th>
                <th className="px-4 py-3 font-semibold min-w-[200px]">Tracking Number <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 font-semibold min-w-[240px]">Cliente / Locker <span className="text-red-500">*</span></th>
                <th className="px-4 py-3 font-semibold w-24">Peso(lbs)</th>
                <th className="px-4 py-3 font-semibold w-36">Dim(L,W,H)</th>
                <th className="px-4 py-3 font-semibold w-20">Pz</th>
                <th className="px-4 py-3 font-semibold w-24">Frágil/Re</th>
                <th className="px-4 py-3 font-semibold w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-blue-50/10 transition-colors group">
                  <td className="px-4 py-2 text-center text-slate-400 font-medium">{index + 1}</td>

                  {/* Bodega */}
                  <td className="px-4 py-2">
                    <select
                      value={row.bodega_id}
                      onChange={(e) => updateRow(row.id, 'bodega_id', e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 px-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs"
                    >
                      {bodegas.map(b => (
                        <option key={b.id} value={b.id}>{b.nombre}</option>
                      ))}
                    </select>
                  </td>

                  {/* Tracking */}
                  <td className="px-4 py-2">
                    <div className="flex gap-1.5">
                      <input
                        id={`tracking-${row.id}`}
                        type="text"
                        className="block w-full rounded-md border-0 py-1.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm font-medium"
                        placeholder="Escanea o escribe..."
                        value={row.tracking}
                        onChange={(e) => {
                          updateRow(row.id, 'tracking', e.target.value);
                          handleRowInteraction(index);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, row.id, 'tracking', index)}
                      />
                      <button
                        type="button"
                        onClick={() => openScanner(row.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200"
                        title="Usar Cámara (Scan Óptico)"
                      >
                        <ScanLine className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                  {/* Client Autocomplete */}
                  <td className="px-4 py-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Search className="h-3 w-3 text-slate-400" />
                      </div>
                      <input
                        id={`client-${row.id}`}
                        type="text"
                        className={`block w-full rounded-md border-0 py-1.5 pl-7 pr-3 text-slate-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm ${!row.cliente_id && row.clientSearch ? 'ring-yellow-400' : 'ring-slate-300'}`}
                        placeholder="Buscar YBG..."
                        value={row.clientSearch}
                        onChange={(e) => handleClientSearchChange(row.id, e.target.value)}
                        onBlur={() => closeDropdown(row.id)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, 'client', index)}
                        autoComplete="off"
                      />
                      {row.isSearchingClient && (
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                          <Loader2 className="h-3 w-3 text-slate-400 animate-spin" />
                        </div>
                      )}

                      {row.showClientDropdown && row.clientResults.length > 0 && (
                        <div className="absolute z-50 w-full lg:w-[350px] mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-auto">
                          <ul className="py-1">
                            {row.clientResults.map((client) => (
                              <li
                                key={client.id}
                                onMouseDown={() => selectClientForRow(row.id, client)} // mousedown fires before blur
                                className="text-slate-900 hover:bg-blue-50 cursor-pointer select-none relative py-2 pl-3 pr-3 border-b border-slate-50 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-700">{client.locker_id}</span>
                                  <span className="text-sm text-slate-700 truncate">{client.nombre} {client.apellido}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Peso */}
                  <td className="px-4 py-2">
                    <input
                      id={`peso-${row.id}`}
                      type="number"
                      step="0.01"
                      className="block w-full rounded-md border-0 py-1.5 px-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs"
                      placeholder="0.00"
                      value={row.peso_lbs}
                      onChange={(e) => updateRow(row.id, 'peso_lbs', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, 'peso', index)}
                    />
                  </td>

                  {/* Dimensiones (L W H) */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="block w-1/3 rounded-md border-0 py-1.5 px-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs text-center"
                        placeholder="L"
                        value={row.largo_in}
                        onChange={(e) => updateRow(row.id, 'largo_in', e.target.value)}
                        title="Largo"
                      />
                      <input
                        type="number"
                        className="block w-1/3 rounded-md border-0 py-1.5 px-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs text-center"
                        placeholder="W"
                        value={row.ancho_in}
                        onChange={(e) => updateRow(row.id, 'ancho_in', e.target.value)}
                        title="Ancho"
                      />
                      <input
                        type="number"
                        className="block w-1/3 rounded-md border-0 py-1.5 px-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs text-center"
                        placeholder="H"
                        value={row.alto_in}
                        onChange={(e) => updateRow(row.id, 'alto_in', e.target.value)}
                        title="Alto"
                      />
                    </div>
                  </td>

                  {/* Piezas */}
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      className="block w-full rounded-md border-0 py-1.5 px-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs text-center"
                      value={row.piezas}
                      onChange={(e) => updateRow(row.id, 'piezas', e.target.value)}
                    />
                  </td>

                  {/* Opciones (Frágil / Reempaque) */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3 justify-center">
                      <label title="Frágil" className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-red-500 focus:ring-red-500 cursor-pointer"
                          checked={row.es_fragil}
                          onChange={(e) => updateRow(row.id, 'es_fragil', e.target.checked)}
                        />
                        <span className="ml-1 text-[10px] uppercase text-slate-500 hidden sm:inline">Fg</span>
                      </label>
                      <label title="Reempaque" className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          checked={row.reempaque}
                          onChange={(e) => updateRow(row.id, 'reempaque', e.target.checked)}
                        />
                        <span className="ml-1 text-[10px] uppercase text-slate-500 hidden sm:inline">Rm</span>
                      </label>
                    </div>
                  </td>

                  {/* Delete Button */}
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Eliminar fila"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Mostrando <span className="font-medium text-slate-900">{rows.length}</span> fila(s) para captura de datos.
          </p>
          <p className="text-sm text-slate-500">
            Puedes conectar una pistola de código de barras láser. El sistema usará la tecla <kbd className="font-mono bg-white border border-slate-300 px-1 rounded mx-1">Enter</kbd> para saltar ágilmente.
          </p>
        </div>
      </div>

      {/* Barcode Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => { setIsScannerOpen(false); setActiveScannerRowId(null); }}
        onScan={onScanSuccess}
      />
    </div>
  );
}
