import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Search, Loader2, Package, CheckCircle, Truck, WarehouseIcon, AlertCircle, ArrowLeft, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PackageResult {
    id: string;
    tracking: string;
    peso_lbs: number;
    estado: string;
    fecha_recepcion: string;
    descripcion?: string;
    bodegas?: { nombre: string };
    clientes?: { nombre: string; apellido: string; locker_id: string };
    transportistas?: { nombre: string };
    historial_estados?: {
        id: string;
        estado_nuevo: string;
        notas?: string;
        created_at: string;
    }[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    recibido: { label: 'Recibido en Bodega', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: WarehouseIcon },
    en_bodega: { label: 'En Bodega', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: WarehouseIcon },
    listo_consolidar: { label: 'Listo para Embarque', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', icon: Package },
    consolidado: { label: 'Consolidado', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Package },
    en_transito: { label: 'En Tránsito', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: Truck },
    entregado: { label: '¡Entregado!', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
    devuelto: { label: 'Devuelto', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: AlertCircle },
    perdido: { label: 'Perdido', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: AlertCircle },
};

const TRACKING_STEPS = ['recibido', 'en_bodega', 'listo_consolidar', 'en_transito', 'entregado'];

export function PublicTracking() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PackageResult | null>(null);
    const [notFound, setNotFound] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;

        setLoading(true);
        setNotFound(false);
        setResult(null);

        try {
            const { data, error } = await supabase
                .from('paquetes')
                .select(`
          id, tracking, peso_lbs, estado, fecha_recepcion, descripcion,
          bodegas (nombre),
          clientes (nombre, apellido, locker_id),
          transportistas (nombre),
          historial_estados (id, estado_nuevo, notas, created_at)
        `)
                .ilike('tracking', trimmed.toUpperCase()) // Case insensitive
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Sort history newest first
                if (data.historial_estados) {
                    (data.historial_estados as any[]).sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                }
                setResult(data as unknown as PackageResult);
            } else {
                setNotFound(true);
            }
        } catch (err) {
            console.error(err);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const estadoConf = result ? (ESTADO_CONFIG[result.estado] || ESTADO_CONFIG['recibido']) : null;
    const currentStep = result ? TRACKING_STEPS.indexOf(result.estado) : -1;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col">
            {/* Background glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            {/* Navbar */}
            <header className="relative border-b border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">YOUBOX GT</span>
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Acceso Clientes
                    </Link>
                </div>
            </header>

            {/* Hero + Search */}
            <main className="relative flex-1 flex flex-col items-center pt-16 px-4 pb-12">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl">
                        Rastrear mi Paquete
                    </h1>
                    <p className="mt-3 text-slate-400 text-lg max-w-md mx-auto">
                        Ingresa tu número de guía o tracking para ver el estado de tu envío en tiempo real.
                    </p>
                </div>

                {/* Search Box */}
                <form onSubmit={handleSearch} className="w-full max-w-2xl">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <Search className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-4 pl-12 text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition text-base font-medium"
                                placeholder="Ej. 1Z999AA10123456784"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="px-6 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}
                            <span className="hidden sm:inline">Buscar</span>
                        </button>
                    </div>
                </form>

                {/* Not Found */}
                {notFound && !loading && (
                    <div className="mt-10 w-full max-w-2xl bg-red-500/15 border border-red-500/30 rounded-2xl p-8 text-center">
                        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-white">Tracking no encontrado</h2>
                        <p className="text-slate-400 text-sm mt-2">
                            No encontramos ningún paquete con ese número. Verifica que sea correcto o comunícate con nosotros.
                        </p>
                    </div>
                )}

                {/* Result Card */}
                {result && estadoConf && (
                    <div className="mt-10 w-full max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4">

                        {/* Main Status Card */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Número de Guía</p>
                                    <h2 className="text-xl font-black text-white font-mono">{result.tracking}</h2>
                                </div>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${estadoConf.bg} ${estadoConf.color}`}>
                                    <estadoConf.icon className="h-4 w-4" />
                                    {estadoConf.label}
                                </div>
                            </div>

                            {/* Package details */}
                            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Casillero', value: result.clientes?.locker_id || 'N/A' },
                                    { label: 'Peso', value: `${result.peso_lbs} lbs` },
                                    { label: 'Bodega', value: result.bodegas?.nombre || 'General' },
                                    { label: 'Recibido', value: result.fecha_recepcion ? format(parseISO(result.fecha_recepcion), 'dd MMM yyyy', { locale: es }) : 'N/A' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-white/5 rounded-xl p-3">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                                        <p className="text-sm font-bold text-white mt-1 truncate">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visual Progress Bar */}
                        {currentStep >= 0 && result.estado !== 'devuelto' && result.estado !== 'perdido' && (
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Progreso del Envío</h3>
                                <div className="flex items-center justify-between relative">
                                    {/* Progress Line */}
                                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
                                    <div
                                        className="absolute top-4 left-0 h-0.5 bg-blue-500 transition-all"
                                        style={{ width: `${(currentStep / (TRACKING_STEPS.length - 1)) * 100}%` }}
                                    />
                                    {TRACKING_STEPS.map((step, i) => {
                                        const conf = ESTADO_CONFIG[step];
                                        const done = i <= currentStep;
                                        const Icon = conf.icon;
                                        return (
                                            <div key={step} className="relative flex flex-col items-center z-10">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${done ? 'bg-blue-500 border-blue-500' : 'bg-slate-800 border-white/10'}`}>
                                                    <Icon className={`h-4 w-4 ${done ? 'text-white' : 'text-slate-600'}`} />
                                                </div>
                                                <p className={`text-[10px] font-semibold mt-2 text-center max-w-[56px] leading-tight ${done ? 'text-white' : 'text-slate-600'}`}>
                                                    {conf.label}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* History */}
                        {result.historial_estados && result.historial_estados.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Historial de Eventos</h3>
                                <ul className="space-y-4">
                                    {result.historial_estados.map((h, i) => {
                                        const conf = ESTADO_CONFIG[h.estado_nuevo];
                                        const Icon = conf?.icon || Clock;
                                        return (
                                            <li key={h.id} className="flex gap-4">
                                                <div className={`flex-none flex h-8 w-8 items-center justify-center rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-white/5 border border-white/10'}`}>
                                                    <Icon className={`h-4 w-4 ${i === 0 ? 'text-white' : 'text-slate-400'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                        <p className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-slate-300'}`}>
                                                            {conf?.label || h.estado_nuevo}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {format(parseISO(h.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                                                        </p>
                                                    </div>
                                                    {h.notas && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{h.notas}</p>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="relative border-t border-white/5 py-5 text-center">
                <p className="text-slate-600 text-xs">© 2025 YOUBOX GT — Todos los derechos reservados</p>
            </footer>
        </div>
    );
}
