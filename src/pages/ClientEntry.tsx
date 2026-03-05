import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Search, Loader2, Trash2, Save, ImagePlus, CheckCircle2, Upload, Printer, Monitor, User } from 'lucide-react';
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
    bodega_id: string;
    transportista_id: string;
    peso_lbs: string;
    piezas: string;
    notas: string;
    // Photo
    photoFile: File | null;
    photoPreview: string | null;
    // UI states
    showPhotoMenu: boolean;
    // Save state
    isSaving: boolean;
    isSaved: boolean;
}

const createEmptyRow = (defaultBodega = '', defaultTransportista = ''): RowData => ({
    id: Math.random().toString(36).substring(7),
    tracking: '',
    bodega_id: defaultBodega,
    transportista_id: defaultTransportista,
    peso_lbs: '',
    piezas: '1',
    notas: '',
    photoFile: null,
    photoPreview: null,
    showPhotoMenu: false,
    isSaving: false,
    isSaved: false,
});

export function ClientEntry() {
    const { user } = useAuth();

    // Global Client Selection
    const [globalClient, setGlobalClient] = useState<Cliente | null>(null);
    const [clientSearchText, setClientSearchText] = useState('');
    const [clientResults, setClientResults] = useState<Cliente[]>([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Catalogs
    const [bodegas, setBodegas] = useState<{ id: string; nombre: string }[]>([]);
    const [transportistas, setTransportistas] = useState<{ id: string; nombre: string }[]>([]);
    const [globalBodega, setGlobalBodega] = useState('');
    const [globalTransportista, setGlobalTransportista] = useState('');

    // Rows Data
    const [rows, setRows] = useState<RowData[]>([]);

    // Toggles & Modals
    const [autoSaveOnEnter, setAutoSaveOnEnter] = useState(true);
    const [printLabelData, setPrintLabelData] = useState<any | null>(null);
    const [activeWebcamRow, setActiveWebcamRow] = useState<string | null>(null);

    // Refs
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

    // --- Global Client Handlers ---
    const handleClientSearchChange = (value: string) => {
        setClientSearchText(value);
        setGlobalClient(null); // clear selected if they change text
        if (value.length >= 2) {
            setIsSearchingClient(true);
            setTimeout(() => executeClientSearch(value), 400);
        } else {
            setClientResults([]);
            setShowClientDropdown(false);
        }
    };

    const executeClientSearch = async (query: string) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, locker_id, nombre, apellido')
                .or(`locker_id.ilike.%${query}%,nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
                .eq('activo', true)
                .limit(8);
            if (!error && data) {
                setClientResults(data);
                setShowClientDropdown(true);
                setIsSearchingClient(false);
            }
        } catch (e) { console.error('Search error:', e); }
    };

    const selectClient = (cliente: Cliente) => {
        setGlobalClient(cliente);
        setClientSearchText(`${cliente.locker_id} - ${cliente.nombre} ${cliente.apellido}`);
        setShowClientDropdown(false);
        setClientResults([]);

        // Focus first tracking field when client is selected
        setTimeout(() => {
            const el = document.getElementById(`tracking-${rows[0]?.id}`);
            if (el) el.focus();
        }, 100);
    };

    // --- Row Handlers ---
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

    // --- Photos ---
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
        e.target.value = ''; // Reset
    };

    const handleWebcamCapture = (id: string, file: File, previewUrl: string) => {
        setRows(cur => cur.map(r =>
            r.id === id ? { ...r, photoFile: file, photoPreview: previewUrl, showPhotoMenu: false } : r
        ));
    };

    // --- Saving ---
    const handleSaveRow = async (rowId: string) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;
        if (!globalClient) { alert('Debes seleccionar un cliente general arriba.'); return; }
        if (!row.tracking.trim()) { alert('El número de tracking es requerido.'); return; }

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
                    .from('recibos_gastos') // Used for package photos too currently
                    .upload(path, row.photoFile, { cacheControl: '3600', upsert: false });
                if (!uploadErr && uploadData) {
                    const { data: pub } = supabase.storage.from('recibos_gastos').getPublicUrl(uploadData.path);
                    foto_url = pub.publicUrl;
                }
            }

            const payload = {
                tracking: row.tracking.trim(),
                cliente_id: globalClient.id,
                bodega_id: row.bodega_id || globalBodega,
                transportista_id: row.transportista_id || globalTransportista,
                peso_lbs: parseFloat(row.peso_lbs) || null,
                piezas: parseInt(row.piezas) || 1,
                notas: row.notas || null,
                estado: 'en_bodega',
                usuario_recepcion: user?.id === 'admin-001' ? null : user?.id,
            };

            const { error } = await supabase.from('paquetes').insert([payload]);
            if (error) throw error;

            // Mark as saved (green)
            setRows(cur => cur.map(r => r.id === rowId ? { ...r, isSaving: false, isSaved: true } : r));

            // Auto-jump/add row
            setTimeout(() => {
                const isLastRow = rows[rows.length - 1].id === rowId;
                if (isLastRow || rows.length === 1) {
                    addRow();
                } else {
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
        if (!globalClient) { alert('Debes seleccionar un cliente general arriba.'); return; }

        const unsavedRows = rows.filter(r => !r.isSaved && r.tracking.trim() !== '');
        if (unsavedRows.length === 0) {
            alert('No hay paquetes pendientes con tracking para guardar.');
            return;
        }

        // We process them sequentially to avoid race conditions and respect the UI states
        for (const row of unsavedRows) {
            await handleSaveRow(row.id);
        }
    };

    // --- Printer ---
    const openLabelPrinter = (row: RowData) => {
        if (!row.tracking) {
            alert("Por favor ingresa un número de tracking primero.");
            return;
        }
        if (!globalClient) {
            alert("Por favor selecciona un cliente en la parte superior primero.");
            return;
        }
        const bodegaName = bodegas.find(b => b.id === (row.bodega_id || globalBodega))?.nombre || 'General';
        setPrintLabelData({
            remitenteInfo: "DESCONOCIDO",
            trackingOriginal: row.tracking,
            clienteCasillero: globalClient.locker_id || "N/A",
            clienteNombre: `${globalClient.nombre} ${globalClient.apellido}`,
            bodegaDestino: bodegaName,
            pesoLbs: parseFloat(row.peso_lbs) || 0,
            piezas: parseInt(row.piezas) || 1,
        });
    };

    // --- Keyboard (Enter) ---
    const handleKeyDown = (e: React.KeyboardEvent, currentId: string, type: 'tracking' | 'peso', index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (type === 'tracking') {
                if (autoSaveOnEnter) {
                    if (globalClient) {
                        const row = rows.find(r => r.id === currentId);
                        if (row && row.tracking.trim()) {
                            // Automatically save the row directly from the tracking field if scanner is used
                            handleSaveRow(currentId);
                        } else {
                            const el = document.getElementById(`peso-${currentId}`);
                            if (el) el.focus();
                        }
                    } else {
                        alert('Debes seleccionar un cliente antes de guardar automáticamente.');
                    }
                } else {
                    const el = document.getElementById(`peso-${currentId}`);
                    if (el) el.focus();
                }
            } else if (type === 'peso') {
                if (autoSaveOnEnter) {
                    if (globalClient) {
                        handleSaveRow(currentId);
                    } else {
                        alert('Debes seleccionar un cliente antes de guardar automáticamente.');
                    }
                } else {
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
                        Entrada de Cliente
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Asigna múltiples paquetes a un mismo casillero de manera rápida.
                    </p>
                </div>
                <div className="flex gap-3">
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
                </div>
            </div>

            {/* Global Client Selector */}
            <div className="glass border border-slate-200/60 rounded-2xl shadow-sm p-6 mb-8 mt-2 bg-gradient-to-r from-white/90 to-blue-50/40 relative z-20">
                <label className="block text-sm font-extrabold text-slate-700 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    Cliente (General para todos los paquetes):
                </label>
                <div className="relative group/search max-w-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        className={`block w-full rounded-xl py-3 pl-10 pr-4 text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300 sm:text-base font-bold outline-none ${!globalClient ? 'border-amber-400 ring-4 ring-amber-400/20 bg-amber-50/10' : 'border border-emerald-300 bg-emerald-50/30'
                            }`}
                        placeholder="Buscar casillero, nombre o apellido..."
                        value={clientSearchText}
                        onChange={(e) => handleClientSearchChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                        autoComplete="off"
                    />
                    {isSearchingClient && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                        </div>
                    )}
                    {showClientDropdown && clientResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl ring-1 ring-black/5 max-h-64 overflow-auto animate-fade-in">
                            <ul className="py-2">
                                {clientResults.map((client) => (
                                    <li
                                        key={client.id}
                                        onMouseDown={() => selectClient(client)}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                    >
                                        <span className="font-extrabold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                            {client.locker_id}
                                        </span>
                                        <span className="text-sm text-slate-700 font-semibold">
                                            {client.nombre} {client.apellido}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Table grid area */}
            <div className={`transition-all duration-500 ${!globalClient ? 'opacity-40 pointer-events-none grayscale-[0.5]' : 'opacity-100'}`}>
                <div className="flex justify-end mb-3 gap-3">
                    <button
                        onClick={handleSaveAll}
                        disabled={!globalClient || rows.filter(r => !r.isSaved && r.tracking.trim() !== '').length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:from-indigo-500 hover:to-blue-500 hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Save className="h-4 w-4" />
                        Guardar Todos
                    </button>

                    <button
                        onClick={addRow}
                        disabled={!globalClient}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm border border-slate-200/60 hover:bg-white hover:-translate-y-0.5 hover:shadow-md transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Plus className="h-4 w-4 text-blue-500" />
                        Añadir Fila
                    </button>
                </div>

                <div className="glass border border-slate-200/60 rounded-2xl shadow-sm flex flex-col pt-1">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50/50 backdrop-blur-md text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-3.5 w-10 text-center text-slate-400">#</th>
                                    <th className="px-3 py-3.5 w-36">Bodega</th>
                                    <th className="px-3 py-3.5 min-w-[300px]">Tracking Number <span className="text-red-500">*</span></th>
                                    <th className="px-3 py-3.5 w-24">Peso (lbs)</th>
                                    <th className="px-3 py-3.5 w-16 text-center">Pzas</th>
                                    <th className="px-3 py-3.5 w-32 text-center">Foto</th>
                                    <th className="px-3 py-3.5 w-28 text-center">Acciones</th>
                                    <th className="px-3 py-3.5 w-10 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50 bg-white/40">
                                {rows.map((row, index) => (
                                    <tr
                                        key={row.id}
                                        className={`transition-colors group ${row.isSaved ? 'bg-emerald-50/60' : 'hover:bg-blue-50/30'}`}
                                    >
                                        <td className="px-3 py-2.5 text-center text-slate-400 font-bold font-mono text-xs">{index + 1}</td>

                                        <td className="px-3 py-2.5">
                                            <select
                                                value={row.bodega_id}
                                                onChange={(e) => updateRow(row.id, 'bodega_id', e.target.value)}
                                                disabled={row.isSaved}
                                                className="block w-full rounded-lg border-slate-200/80 bg-slate-50/50 py-1.5 px-2 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white sm:text-xs font-semibold disabled:opacity-60 outline-none"
                                            >
                                                {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                            </select>
                                        </td>

                                        <td className="px-3 py-2.5">
                                            <input
                                                id={`tracking-${row.id}`}
                                                type="text"
                                                className="block w-full rounded-lg border-slate-200/80 bg-white/80 py-1.5 px-3 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white placeholder:text-slate-400 hover:border-slate-300 sm:text-sm font-bold tracking-tight uppercase disabled:opacity-60 outline-none"
                                                placeholder="Escribe o escanea..."
                                                value={row.tracking}
                                                onChange={(e) => updateRow(row.id, 'tracking', e.target.value.toUpperCase())}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'tracking', index)}
                                                disabled={row.isSaved}
                                            />
                                        </td>

                                        <td className="px-3 py-2.5">
                                            <input
                                                id={`peso-${row.id}`}
                                                type="number"
                                                step="0.01"
                                                className="block w-full rounded-lg border-slate-200/80 bg-white/80 py-1.5 px-2.5 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white placeholder:text-slate-400 hover:border-slate-300 text-right sm:text-sm font-mono font-bold outline-none disabled:opacity-60"
                                                placeholder="0.00"
                                                value={row.peso_lbs}
                                                onChange={(e) => updateRow(row.id, 'peso_lbs', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, row.id, 'peso', index)}
                                                disabled={row.isSaved}
                                            />
                                        </td>

                                        <td className="px-3 py-2.5">
                                            <input
                                                type="number"
                                                min="1"
                                                className="block w-full rounded-lg border-slate-200/80 bg-white/80 py-1.5 px-2 text-slate-900 shadow-sm transition-all focus:border-blue-500/50 focus:bg-white sm:text-sm text-center font-bold outline-none disabled:opacity-60"
                                                value={row.piezas}
                                                onChange={(e) => updateRow(row.id, 'piezas', e.target.value)}
                                                disabled={row.isSaved}
                                            />
                                        </td>

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
                                                    <button onClick={() => updateRow(row.id, 'showPhotoMenu', !row.showPhotoMenu)} disabled={row.isSaved} className="relative inline-block">
                                                        <img src={row.photoPreview} alt="preview" className="h-9 w-9 rounded-lg object-cover shadow ring-2 ring-blue-400/40 hover:ring-blue-500/70" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => updateRow(row.id, 'showPhotoMenu', !row.showPhotoMenu)} onBlur={() => setTimeout(() => updateRow(row.id, 'showPhotoMenu', false), 200)} disabled={row.isSaved} className="inline-flex items-center justify-center gap-1.5 px-2.5 h-9 rounded-lg border border-slate-300 text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 text-xs font-bold">
                                                        <ImagePlus className="h-4 w-4" /> <span className="hidden xl:inline">Foto</span>
                                                    </button>
                                                )}
                                                {row.showPhotoMenu && (
                                                    <div className="absolute z-[9999] right-0 mt-2 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 overflow-hidden"
                                                        style={{ bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }}>
                                                        <label htmlFor={`camera-${row.id}`} onMouseDown={() => setTimeout(() => updateRow(row.id, 'showPhotoMenu', false), 150)} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 cursor-pointer">
                                                            <div className="bg-blue-100/50 p-1.5 rounded-lg"><Camera className="h-4 w-4" /></div>Móvil
                                                        </label>
                                                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setActiveWebcamRow(row.id); updateRow(row.id, 'showPhotoMenu', false); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 text-left">
                                                            <div className="bg-purple-100/50 p-1.5 rounded-lg"><Monitor className="h-4 w-4" /></div>Cámara PC
                                                        </button>
                                                        <label htmlFor={`gallery-${row.id}`} onMouseDown={() => setTimeout(() => updateRow(row.id, 'showPhotoMenu', false), 150)} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 cursor-pointer">
                                                            <div className="bg-emerald-100/50 p-1.5 rounded-lg"><Upload className="h-4 w-4" /></div>Galería
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-3 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {row.isSaved ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-200">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Guardado
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleSaveRow(row.id)} disabled={row.isSaving || !row.tracking.trim() || !globalClient} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40">
                                                        {row.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                                        <span className="hidden xl:inline">{row.isSaving ? '...' : 'Guarda'}</span>
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => openLabelPrinter(row)} disabled={!row.tracking.trim() || !globalClient} className="p-1.5 rounded-lg text-slate-500 bg-white border border-slate-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40">
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>

                                        <td className="px-3 py-2.5 text-center">
                                            <button onClick={() => removeRow(row.id)} disabled={rows.length === 1 || row.isSaving} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg disabled:opacity-30">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50/80 backdrop-blur-sm border-t border-slate-200/60 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-0">
                        <p className="text-sm text-slate-500 font-medium">
                            <span className="font-extrabold text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-md border border-blue-200/50">{rows.length}</span> fila(s) / <span className="text-emerald-600 font-bold">{rows.filter(r => r.isSaved).length} guardado(s)</span>
                        </p>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 bg-white border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-sm">
                            <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-xs font-bold shadow-sm text-slate-700">Tab</kbd> navegar —
                            <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-xs font-bold shadow-sm ml-1 text-slate-700">Enter</kbd> salto/guardar
                        </p>
                    </div>
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
