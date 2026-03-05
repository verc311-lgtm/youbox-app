import { useState, useEffect, useRef } from 'react';
import { Search, Package, User, FileText, Globe2, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 400);
    const [results, setResults] = useState<{ type: string, id: string, title: string, subtitle: string, icon: any, url: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Command Palette State
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Event listner wrapper for the custom open event
    useEffect(() => {
        const handleOpenEvent = () => setIsOpen(true);
        window.addEventListener('open-global-search', handleOpenEvent);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('open-global-search', handleOpenEvent);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else if (!isOpen) {
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            return;
        }

        const searchData = async () => {
            setLoading(true);

            try {
                const searchTerm = `%${debouncedQuery}%`;

                // Parallel queries to paquetes, facturas, clientes
                const [paquetesRes, clientesRes, facturasRes, consolRes] = await Promise.all([
                    supabase.from('paquetes')
                        .select('id, tracking, descripcion, clientes(nombre, apellido)')
                        .or(`tracking.ilike.${searchTerm},descripcion.ilike.${searchTerm}`)
                        .limit(5),
                    supabase.from('clientes')
                        .select('id, locker_id, nombre, apellido, email')
                        .or(`locker_id.ilike.${searchTerm},nombre.ilike.${searchTerm},apellido.ilike.${searchTerm},email.ilike.${searchTerm}`)
                        .limit(5),
                    supabase.from('facturas')
                        .select('id, numero, clientes(nombre, apellido)')
                        .or(`numero.ilike.${searchTerm}`)
                        .limit(5),
                    supabase.from('consolidaciones')
                        .select('id, codigo, estado, bodegas(nombre)')
                        .or(`codigo.ilike.${searchTerm}`)
                        .limit(5)
                ]);

                const combinedResults = [];

                if (paquetesRes.data) {
                    combinedResults.push(...paquetesRes.data.map(p => {
                        const cliente = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
                        return {
                            type: 'Paquete',
                            id: p.id,
                            title: `Tracking: ${p.tracking}`,
                            subtitle: cliente ? `Cliente: ${cliente.nombre} ${cliente.apellido}` : 'Sin cliente',
                            icon: Package,
                            url: `/inventory?search=${p.tracking}`
                        };
                    }));
                }

                if (clientesRes.data) {
                    combinedResults.push(...clientesRes.data.map(c => ({
                        type: 'Cliente',
                        id: c.id,
                        title: `${c.nombre} ${c.apellido} (${c.locker_id})`,
                        subtitle: c.email || 'Sin correo',
                        icon: User,
                        url: `/users?search=${c.locker_id}`
                    })));
                }

                if (facturasRes.data) {
                    combinedResults.push(...facturasRes.data.map(f => {
                        const cliente = Array.isArray(f.clientes) ? f.clientes[0] : f.clientes;
                        return {
                            type: 'Factura',
                            id: f.id,
                            title: `Factura: ${f.numero}`,
                            subtitle: cliente ? `Cliente: ${cliente.nombre} ${cliente.apellido}` : '',
                            icon: FileText,
                            url: `/billing`
                        };
                    }));
                }

                if (consolRes.data) {
                    combinedResults.push(...consolRes.data.map(c => {
                        const bodega = Array.isArray(c.bodegas) ? c.bodegas[0] : c.bodegas;
                        return {
                            type: 'Consolidado',
                            id: c.id,
                            title: `Lote: ${c.codigo} (${c.estado.replace('_', ' ')})`,
                            subtitle: bodega ? `Origen: ${bodega.nombre}` : 'Sin bodega',
                            icon: Globe2,
                            url: `/consolidation`
                        };
                    }));
                }

                setResults(combinedResults);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        searchData();
    }, [debouncedQuery]);

    const handleNavigate = (url: string) => {
        navigate(url);
        setIsOpen(false);
    };

    return (
        <>
            {/* Header Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className="group flex items-center justify-between gap-2 px-3 py-2 w-full max-w-sm rounded-[10px] bg-slate-100/70 border border-slate-200/60 text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 transition-all duration-200 shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-sm font-medium">Buscar...</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 font-sans">
                    <kbd className="inline-flex h-5 items-center justify-center rounded border border-slate-300 bg-white px-1 font-medium text-[10px] text-slate-400 shadow-[0_1px_0_rgba(203,213,225,1)]">
                        Ctrl
                    </kbd>
                    <kbd className="inline-flex h-5 items-center justify-center rounded border border-slate-300 bg-white px-1.5 font-medium text-[10px] text-slate-400 shadow-[0_1px_0_rgba(203,213,225,1)]">
                        K
                    </kbd>
                </div>
            </button>

            {/* Modal Command Palette */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    {/* Dialog */}
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/50 overflow-hidden animate-in zoom-in-95 ease-out duration-200">
                        {/* Search Input */}
                        <div className="flex items-center border-b border-slate-100 px-4 py-3 bg-white">
                            <Search className="h-5 w-5 text-blue-500 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 w-full bg-transparent border-0 focus:ring-0 text-lg text-slate-800 placeholder:text-slate-400 pl-4 py-2 outline-none"
                                placeholder="Busca clientes, paquetes, manifiestos o facturas..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 px-2.5 ml-2 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-500 transition-colors border border-slate-200 hidden sm:block"
                            >
                                Esc
                            </button>
                        </div>

                        {/* Search Results */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                            {query.length === 0 ? (
                                <div className="py-14 px-6 text-center text-slate-400">
                                    <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Escribe algo para empezar a buscar</p>
                                    <p className="text-xs mt-1">Busca por código, nombre, casillero o tracking</p>
                                </div>
                            ) : loading ? (
                                <div className="py-14 flex flex-col items-center justify-center text-slate-500 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <span className="text-sm font-medium">Buscando en la base de datos...</span>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="p-2 space-y-1">
                                    <div className="px-3 pb-2 pt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Resultados Encontrados ({results.length})
                                    </div>
                                    {results.map((res, i) => (
                                        <button
                                            key={`${res.type}-${res.id}-${i}`}
                                            onClick={() => handleNavigate(res.url)}
                                            className="w-full text-left p-3 rounded-xl hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center gap-4 transition-colors group"
                                        >
                                            <div className="p-2.5 rounded-xl bg-white text-slate-400 shadow-sm border border-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <res.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-900">{res.title}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2 shrink-0 bg-white px-2 py-0.5 rounded-full border border-slate-200">{res.type}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 truncate group-hover:text-blue-700/70">{res.subtitle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-14 text-center text-slate-500">
                                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <X className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium">No se encontraron resultados para <span className="text-slate-800 font-bold">"{query}"</span></p>
                                    <p className="text-xs mt-1 text-slate-400">Verifica que lo hayas escrito correctamente</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Hint */}
                        <div className="bg-slate-50 border-t border-slate-200/60 px-4 py-2 flex items-center justify-center sm:justify-start gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Search className="w-3.5 h-3.5" /> Resultados rápidos
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
