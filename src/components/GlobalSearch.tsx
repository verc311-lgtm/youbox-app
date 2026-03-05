import { useState, useEffect, useRef } from 'react';
import { Search, Package, User, FileText, Loader2, X } from 'lucide-react';
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
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            setShowResults(false);
            return;
        }

        const searchData = async () => {
            setLoading(true);
            setShowResults(true);

            try {
                const searchTerm = `%${debouncedQuery}%`;

                // Parallel queries to paquetes, facturas, clientes
                const [paquetesRes, clientesRes, facturasRes] = await Promise.all([
                    supabase.from('paquetes')
                        .select('id, tracking, descripcion, clientes(nombre, apellido)')
                        .or(`tracking.ilike.${searchTerm},descripcion.ilike.${searchTerm}`)
                        .limit(5),
                    supabase.from('clientes')
                        .select('id, locker_id, nombre, apellido, email')
                        .or(`locker_id.ilike.${searchTerm},nombre.ilike.${searchTerm},apellido.ilike.${searchTerm},email.ilike.${searchTerm}`)
                        .limit(5),
                    supabase.from('facturas')
                        .select('id, numero_factura, clientes(nombre, apellido)')
                        .or(`numero_factura.ilike.${searchTerm}`)
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
                            title: `Factura: ${f.numero_factura}`,
                            subtitle: cliente ? `Cliente: ${cliente.nombre} ${cliente.apellido}` : '',
                            icon: FileText,
                            url: `/billing`
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
        setShowResults(false);
        setQuery('');
    };

    return (
        <div className="relative w-full max-w-md hidden sm:block group" ref={containerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
                type="text"
                placeholder="Buscar tracking, cliente, paquete..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowResults(true);
                }}
                onFocus={() => { if (query) setShowResults(true); }}
                className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
            />
            {query && (
                <button onClick={() => { setQuery(''); setResults([]); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                </button>
            )}

            {/* Results Dropdown */}
            {showResults && (query.length > 0) && (
                <div className="absolute top-12 left-0 w-full bg-white rounded-xl shadow-xl ring-1 ring-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {loading ? (
                        <div className="p-4 flex items-center justify-center text-slate-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            <span className="text-sm font-medium">Buscando...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="max-h-[350px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                            {results.map((res, i) => (
                                <div
                                    key={`${res.type}-${res.id}-${i}`}
                                    onClick={() => handleNavigate(res.url)}
                                    className="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer flex items-center gap-3 transition-colors"
                                >
                                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                                        <res.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className="text-sm font-bold text-slate-800 truncate">{res.title}</p>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2 shrink-0">{res.type}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">{res.subtitle}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm font-medium text-slate-500">
                            No se encontraron resultados para "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
