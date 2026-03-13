import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { X, Search, Loader2, Save, Package, Camera, ImagePlus, Upload, Monitor } from 'lucide-react';
import { WebcamModal } from './WebcamModal';

interface Cliente {
    id: string;
    nombre: string;
    apellido: string;
    locker_id: string;
}

interface Bodega {
    id: string;
    nombre: string;
}

interface Transportista {
    id: string;
    nombre: string;
}

interface EditPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    paqueteId: string | null;
    onSuccess: () => void;
}

export function EditPackageModal({ isOpen, onClose, paqueteId, onSuccess }: EditPackageModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [tracking, setTracking] = useState('');
    const [pesoLbs, setPesoLbs] = useState('');
    const [piezas, setPiezas] = useState('1');
    const [bodegaId, setBodegaId] = useState('');
    const [transportistaId, setTransportistaId] = useState('');
    const [estado, setEstado] = useState('en_bodega');
    const [notas, setNotas] = useState('');
    const [tapachulaTipo, setTapachulaTipo] = useState('Sobre');
    const [fotoUrl, setFotoUrl] = useState<string | null>(null);

    // Photo State
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [activeWebcam, setActiveWebcam] = useState(false);

    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    // Client Search State
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [clientSearchText, setClientSearchText] = useState('');
    const [clientResults, setClientResults] = useState<Cliente[]>([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Catalogs
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [transportistas, setTransportistas] = useState<Transportista[]>([]);

    // Derived: is the selected bodega Tapachula?
    const isTapachula = bodegas.find(b => b.id === bodegaId)?.nombre.toLowerCase().includes('tapachula') ?? false;

    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
            if (paqueteId) {
                fetchPackageData();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, paqueteId]);

    async function fetchCatalogs() {
        try {
            const [bodegasRes, transpRes] = await Promise.all([
                supabase.from('bodegas').select('id, nombre').eq('activo', true),
                supabase.from('transportistas').select('id, nombre').eq('activo', true)
            ]);
            setBodegas(bodegasRes.data || []);
            setTransportistas(transpRes.data || []);
        } catch (e) {
            console.error('Error fetching catalogs:', e);
        }
    }

    async function fetchPackageData() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('paquetes')
                .select(`
          tracking, peso_lbs, piezas, bodega_id, transportista_id, estado, notas, foto_url,
          clientes (id, nombre, apellido, locker_id)
        `)
                .eq('id', paqueteId)
                .single();

            if (error) throw error;
            if (data) {
                setTracking(data.tracking);
                setPesoLbs(data.peso_lbs?.toString() || '');
                setPiezas(data.piezas?.toString() || '1');
                setBodegaId(data.bodega_id || '');
                setTransportistaId(data.transportista_id || '');
                setEstado(data.estado);

                // Extract [Empaque: X] from notas if present
                const rawNotas = data.notas || '';
                const empaqueMatch = rawNotas.match(/\[Empaque:\s*([^\]]+)\]/);
                if (empaqueMatch) {
                    setTapachulaTipo(empaqueMatch[1].trim());
                    setNotas(rawNotas.replace(/\[Empaque:\s*[^\]]+\]\s*/, '').trim());
                } else {
                    setNotas(rawNotas);
                    setTapachulaTipo('Sobre');
                }

                setFotoUrl(data.foto_url || null);
                setPhotoPreview(data.foto_url || null);

                if (data.clientes) {
                    const clientData = data.clientes as unknown as Cliente;
                    setSelectedClient(clientData);
                    setClientSearchText(`${clientData.locker_id} - ${clientData.nombre} ${clientData.apellido}`);
                }
            }
        } catch (e) {
            console.error('Error fetching package details:', e);
            toast.error('Error al cargar la información del paquete.');
            onClose();
        } finally {
            setLoading(false);
        }
    }

    // --- Client Search Behavior ---
    const handleClientSearchChange = (text: string) => {
        setClientSearchText(text);
        if (!text) {
            setSelectedClient(null);
            setClientResults([]);
            setShowClientDropdown(false);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setShowClientDropdown(true);
        setIsSearchingClient(true);

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('clientes')
                    .select('id, nombre, apellido, locker_id')
                    .or(`locker_id.ilike.%${text}%,nombre.ilike.%${text}%,apellido.ilike.%${text}%`)
                    .limit(10);

                if (error) throw error;
                setClientResults(data || []);
            } catch (e) {
                console.error('Error searching clients:', e);
            } finally {
                setIsSearchingClient(false);
            }
        }, 400); // 400ms debounce
    };

    const selectClient = (client: Cliente) => {
        setSelectedClient(client);
        setClientSearchText(`${client.locker_id} - ${client.nombre} ${client.apellido}`);
        setShowClientDropdown(false);
    };

    const clearClient = () => {
        setSelectedClient(null);
        setClientSearchText('');
    };

    // --- Photo Handlers ---
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) { toast.error('Imagen muy grande. Máx 8MB.'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoFile(file);
            setPhotoPreview(reader.result as string);
            setShowPhotoMenu(false);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleWebcamCapture = (file: File, previewUrl: string) => {
        setPhotoFile(file);
        setPhotoPreview(previewUrl);
        setShowPhotoMenu(false);
    };

    // --- Save Package ---
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paqueteId) return;

        if (!selectedClient) {
            toast.error('Debes asignar un cliente (Casillero) válido al paquete.');
            return;
        }

        if (!tracking.trim()) {
            toast.error('El número de tracking es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            let finalFotoUrl = fotoUrl;

            // Upload new photo if provided
            if (photoFile) {
                const ext = photoFile.name.split('.').pop() || 'jpg';
                const path = `${user?.id || 'sys'}/${Date.now()}_edit_${paqueteId}.${ext}`;
                const { error: uploadErr, data: uploadData } = await supabase.storage
                    .from('recibos_gastos')
                    .upload(path, photoFile, { cacheControl: '3600', upsert: false });

                if (uploadErr) throw uploadErr;
                if (uploadData) {
                    const { data: pub } = supabase.storage.from('recibos_gastos').getPublicUrl(uploadData.path);
                    finalFotoUrl = pub.publicUrl;
                }
            }

            const { error } = await supabase
                .from('paquetes')
                .update({
                    tracking: tracking.trim(),
                    cliente_id: selectedClient.id,
                    peso_lbs: parseFloat(pesoLbs) || null,
                    piezas: parseInt(piezas, 10) || 1,
                    bodega_id: bodegaId || null,
                    transportista_id: transportistaId || null,
                    estado: estado,
                    notas: isTapachula
                        ? `[Empaque: ${tapachulaTipo}] ${notas.trim()}`.trim()
                        : notas.trim() || null,
                    foto_url: finalFotoUrl
                })
                .eq('id', paqueteId);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating package:', error);
            toast.error('Ocurrió un error al actualizar el paquete: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Prevent closing when clicking inside the dropdown list
    const handleBlur = (e: React.FocusEvent) => {
        // Adding a slight delay allows the click event on the item to fire before the dropdown is closed
        setTimeout(() => setShowClientDropdown(false), 200);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex flex-col items-center justify-center bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Editar Paquete</h2>
                            <p className="text-xs font-semibold text-slate-500">Modifica la información del inventario.</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={saving} className="p-2 rounded-xl hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-16">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-sm font-medium text-slate-500">Cargando datos del paquete...</p>
                    </div>
                ) : (
                    <form id="edit-package-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                        <div className="space-y-6">

                            {/* Tracking & Client row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tracking Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={tracking}
                                        onChange={e => setTracking(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 shadow-sm bg-white"
                                    />
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cliente (Casillero) *</label>
                                    <div className="relative group/search">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            className={`block w-full rounded-xl py-2.5 pl-9 pr-8 text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 font-bold outline-none sm:text-sm ${!selectedClient ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50' : 'border border-emerald-300 bg-emerald-50'
                                                }`}
                                            placeholder="Buscar por casillero o nombre..."
                                            value={clientSearchText}
                                            onChange={(e) => handleClientSearchChange(e.target.value)}
                                            onBlur={handleBlur}
                                            autoComplete="off"
                                        />
                                        {selectedClient && (
                                            <button type="button" onClick={clearClient} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        {isSearchingClient && !selectedClient && (
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {showClientDropdown && clientResults.length > 0 && (
                                        <div className="absolute z-[110] w-full mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 max-h-48 overflow-auto animate-fade-in divide-y divide-slate-50">
                                            {clientResults.map((client) => (
                                                <div
                                                    key={client.id}
                                                    onMouseDown={(e) => { e.preventDefault(); selectClient(client); }} // Use preventDefault to stop input blur
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <span className="font-extrabold text-blue-700 text-xs bg-blue-100/50 px-2 py-1 rounded-lg border border-blue-200">
                                                        {client.locker_id}
                                                    </span>
                                                    <span className="text-sm text-slate-700 font-semibold truncate leading-tight">
                                                        {client.nombre} {client.apellido}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attributes row */}
                            <div className={`grid gap-4 ${isTapachula ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Peso (lbs)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={pesoLbs}
                                        onChange={e => setPesoLbs(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Piezas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={piezas}
                                        onChange={e => setPiezas(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Bodega</label>
                                    <select
                                        value={bodegaId}
                                        onChange={e => setBodegaId(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    >
                                        <option value="">Selecciona...</option>
                                        {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                    </select>
                                </div>
                                {/* Tapachula-only: tipo empaque */}
                                {isTapachula && (
                                    <div>
                                        <label className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">🐊 Tipo Empaque</label>
                                        <select
                                            value={tapachulaTipo}
                                            onChange={e => setTapachulaTipo(e.target.value)}
                                            className="block w-full rounded-xl border border-orange-300 px-3 py-2 sm:text-sm font-bold text-orange-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-400/20 outline-none bg-orange-50"
                                        >
                                            <option value="Sobre">Sobre</option>
                                            <option value="Bolsa">Bolsa</option>
                                            <option value="Caja">Caja</option>
                                            <option value="Libra">Libra</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Courier</label>
                                    <select
                                        value={transportistaId}
                                        onChange={e => setTransportistaId(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    >
                                        <option value="">Selecciona...</option>
                                        {transportistas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Status and Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Estatus Actual</label>
                                    <select
                                        value={estado}
                                        onChange={e => setEstado(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-bold text-blue-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-blue-50/50"
                                    >
                                        <option value="recibido">Recibido</option>
                                        <option value="en_bodega">En Bodega</option>
                                        <option value="listo_consolidar">Listo Consolidar</option>
                                        <option value="consolidado">Consolidado</option>
                                        <option value="en_transito">En Tránsito</option>
                                        <option value="entregado">Entregado</option>
                                        <option value="devuelto">Devuelto</option>
                                        <option value="perdido">Perdido</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Notas / Comentarios</label>
                                    <input
                                        type="text"
                                        value={notas}
                                        onChange={e => setNotas(e.target.value)}
                                        placeholder="Detalles adicionales..."
                                        className="block w-full rounded-xl border border-slate-200 px-3 py-2 sm:text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 bg-white"
                                    />
                                </div>
                            </div>

                            {/* Photo Section */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Camera className="h-4 w-4 text-blue-500" />
                                    Foto del Paquete
                                </label>

                                <input
                                    ref={cameraRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                                <input
                                    ref={galleryRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />

                                <div className="flex items-center gap-6">
                                    <div className="relative group/img">
                                        {photoPreview ? (
                                            <div className="relative">
                                                <img
                                                    src={photoPreview}
                                                    alt="Preview"
                                                    className="h-32 w-32 object-cover rounded-xl border-2 border-slate-200 shadow-sm transition-all group-hover/img:brightness-75"
                                                />
                                                {!photoFile && fotoUrl && (
                                                    <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                                                        <Save className="h-3 w-3" />
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                >
                                                    <Camera className="h-8 w-8 text-white drop-shadow-md" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                                                className="h-32 w-32 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500 transition-all gap-2"
                                            >
                                                <ImagePlus className="h-8 w-8" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Foto</span>
                                            </button>
                                        )}

                                        {showPhotoMenu && (
                                            <div className="absolute z-[120] left-full ml-4 top-0 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 overflow-hidden animate-fade-in">
                                                <label onClick={() => cameraRef.current?.click()} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 cursor-pointer">
                                                    <div className="bg-blue-100/50 p-1.5 rounded-lg text-blue-600"><Camera className="h-4 w-4" /></div>Móvil
                                                </label>
                                                <button type="button" onClick={() => { setActiveWebcam(true); setShowPhotoMenu(false); }} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-purple-600 cursor-pointer text-left">
                                                    <div className="bg-purple-100/50 p-1.5 rounded-lg text-purple-600"><Monitor className="h-4 w-4" /></div>Cámara PC
                                                </button>
                                                <label onClick={() => galleryRef.current?.click()} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 cursor-pointer">
                                                    <div className="bg-emerald-100/50 p-1.5 rounded-lg text-emerald-600"><Upload className="h-4 w-4" /></div>Galería
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-semibold text-slate-700">Opciones de imagen</p>
                                        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                                            Sube una foto del paquete para que el cliente pueda verla en su historial.
                                            <span className="block mt-1 text-[10px] uppercase font-bold text-slate-400">Máx 8MB • JPG/PNG</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </form>
                )}

                <WebcamModal
                    isOpen={activeWebcam}
                    onClose={() => setActiveWebcam(false)}
                    onCapture={handleWebcamCapture}
                    rowId="edit-modal"
                />

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="edit-package-form"
                        disabled={saving || loading || !selectedClient || !tracking.trim()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm hover:translate-y-px hover:shadow-md transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Cambios
                    </button>
                </div>

            </div>
        </div>
    );
}
