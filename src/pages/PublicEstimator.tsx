import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Loader2, Package, Calculator, Store, Truck, ShoppingCart, Info, TrendingUp, Sparkles, AlertCircle, ChevronRight, Check } from 'lucide-react';

interface Sucursal {
    id: string;
    nombre: string;
}

interface Tarifa {
    id: string;
    nombre_servicio: string;
    tarifa_q: number;
    tipo_cobro: string;
}

export function PublicEstimator() {
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [selectedSucursal, setSelectedSucursal] = useState<string>('');
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);

    // Link extraction state
    const [url, setUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractError, setExtractError] = useState('');

    // Product details state
    const [title, setTitle] = useState('');
    const [priceUsd, setPriceUsd] = useState<number | ''>('');
    const [weightLbs, setWeightLbs] = useState<number | ''>('');
    const [imageUrl, setImageUrl] = useState('');

    // Option state
    const [weBuyIt, setWeBuyIt] = useState(false);
    const TASA_CAMBIO = 8.00; // Fixed exchange rate

    useEffect(() => {
        fetchSucursales();
    }, []);

    useEffect(() => {
        if (selectedSucursal) {
            fetchTarifas(selectedSucursal);
        } else {
            setTarifas([]);
        }
    }, [selectedSucursal]);

    const fetchSucursales = async () => {
        const { data } = await supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre');
        if (data) setSucursales(data);
    };

    const fetchTarifas = async (sucursal_id: string) => {
        const { data } = await supabase
            .from('tarifas')
            .select('id, nombre_servicio, tarifa_q, tipo_cobro')
            .eq('sucursal_id', sucursal_id)
            .eq('activa', true)
            .order('nombre_servicio');
        if (data) setTarifas(data);
    };

    const handleExtract = async () => {
        if (!url.trim()) return;

        setIsExtracting(true);
        setExtractError('');
        setImageUrl('');

        try {
            const response = await fetch('/api/extract-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                throw new Error('No se pudo extraer la información automáticamente.');
            }

            const data = await response.json();

            if (data.title) setTitle(data.title);

            if (data.priceUsd !== undefined && data.priceUsd !== null) {
                setPriceUsd(data.priceUsd);
            } else {
                setPriceUsd(0);
            }

            if (data.estimatedWeightLbs) setWeightLbs(data.estimatedWeightLbs);
            if (data.imageUrl) setImageUrl(data.imageUrl);

            if (!data.priceUsd && !data.imageUrl) {
                setExtractError('Detectamos el producto, pero el sitio bloqueó la extracción del precio. Ingresa los datos manualmente abajo.');
            }

        } catch (err: any) {
            setExtractError(err.message || 'Error al analizar el enlace.');
        } finally {
            setIsExtracting(false);
        }
    };

    // Calculations
    const calculateEstimates = () => {
        let costoEnvio = 0;
        const baseWeight = Number(weightLbs) || 1;

        // DEFAULT FALLBACK: If no tariffs are found, use Q35 per pound
        const DEFAULT_LB_RATE = 35;

        const libraRate = tarifas.find(t => t.tipo_cobro === 'por_libra' || t.nombre_servicio.toLowerCase().includes('libra'));

        if (libraRate) {
            costoEnvio = libraRate.tarifa_q * baseWeight;
        } else if (tarifas.length > 0) {
            costoEnvio = tarifas[0].tarifa_q * baseWeight;
        } else if (selectedSucursal) {
            costoEnvio = DEFAULT_LB_RATE * baseWeight;
        }

        const priceQ = (Number(priceUsd) || 0) * TASA_CAMBIO;
        let subtotal = priceQ + costoEnvio;
        let comision = 0;

        if (weBuyIt) {
            comision = (priceQ + costoEnvio) * 0.20;
        }

        const total = subtotal + comision;

        return { costoEnvio, priceQ, comision, total, usedDefault: !libraRate && selectedSucursal && weightLbs !== '' };
    };

    const { costoEnvio, priceQ, comision, total, usedDefault } = calculateEstimates();

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30 pb-20">
            {/* Ambient Background Circles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/5 blur-[120px]" />
            </div>

            <div className="relative max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {/* Modern Header */}
                <header className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
                        <Sparkles className="h-3 w-3" />
                        Next-Gen Logistics
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter mb-6">
                        YouBox <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">Smart</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                        Cotizaciones instantáneas blindadas con Inteligencia Artificial. <br className="hidden sm:block" /> Traer tus compras nunca fue tan transparente.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* INPUT PANEL */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* DESTINATION SELECTION */}
                        <section className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative group border-t-white/20">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Store className="h-24 w-24 text-white" />
                            </div>

                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs not-italic">01</span>
                                Selecciona tu Destino
                            </h2>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {sucursales.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSucursal(s.id)}
                                        className={`px-4 py-4 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all duration-300 ${selectedSucursal === s.id
                                                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.03] z-10'
                                                : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'
                                            }`}
                                    >
                                        {s.nombre}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* SMART LINK EXTRACTION */}
                        <section className={`bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 relative ${!selectedSucursal ? 'opacity-20 grayscale pointer-events-none' : 'border-t-white/20'}`}>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs not-italic">02</span>
                                Análisis Automático (IA)
                            </h2>

                            <div className="space-y-6">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
                                    <div className="relative flex items-center bg-[#1e293b] rounded-[1.5rem] p-2 pr-2 overflow-hidden border border-white/10">
                                        <Search className="ml-4 text-slate-500 h-5 w-5" />
                                        <input
                                            type="url"
                                            placeholder="https://www.amazon.com/dp/..."
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 px-4 py-4 text-white font-medium placeholder:text-slate-600"
                                        />
                                        <button
                                            onClick={handleExtract}
                                            disabled={isExtracting || !url}
                                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                                        >
                                            {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                            Analizar
                                        </button>
                                    </div>
                                </div>

                                {extractError && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                                        <p className="text-[10px] font-black text-red-200 uppercase tracking-tighter leading-relaxed">{extractError}</p>
                                    </div>
                                )}

                                {/* Result Preview Card */}
                                <div className={`pt-6 border-t border-white/5 transition-all duration-700 ${title || extractError ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* AI Card Preview */}
                                        <div className="relative w-full md:w-52 h-52 bg-[#0f172a] rounded-[2rem] border border-white/10 flex items-center justify-center overflow-hidden group/thumb">
                                            {isExtracting ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Scanning...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt="Product" className="w-full h-full object-contain p-4 group-hover/thumb:scale-110 transition-transform duration-700" />
                                                    ) : (
                                                        <Package className="h-16 w-16 text-slate-800" />
                                                    )}
                                                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
                                                        Visual Data
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nombre Identificado</label>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Precio USD ($)</label>
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-black italic">$</div>
                                                        <input
                                                            type="number"
                                                            value={priceUsd}
                                                            onChange={(e) => setPriceUsd(e.target.value ? Number(e.target.value) : '')}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-4 text-emerald-400 font-black focus:border-emerald-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Peso Ext. (Lbs)</label>
                                                    <div className="relative">
                                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="number"
                                                            value={weightLbs}
                                                            onChange={(e) => setWeightLbs(e.target.value ? Number(e.target.value) : '')}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-blue-400 font-black focus:border-blue-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SERVICE TOGGLE */}
                        <section className={`bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 ${!title ? 'opacity-20 grayscale pointer-events-none' : 'border-t-white/20 hover:border-emerald-500/30'}`}>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs not-italic">03</span>
                                Modalidad de Compra
                            </h2>

                            <button
                                onClick={() => setWeBuyIt(!weBuyIt)}
                                className={`w-full group relative flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all duration-500 text-left ${weBuyIt ? 'bg-emerald-600/10 border-emerald-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${weBuyIt ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-slate-700 text-slate-700'}`}>
                                    {weBuyIt ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-black uppercase tracking-tight text-sm ${weBuyIt ? 'text-white' : 'text-slate-400'}`}>Lo compramos por ti</h3>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">Servicio "Concierge" con tarjeta corporativa (+20%)</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${weBuyIt ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-600'}`}>
                                    {weBuyIt ? 'Activado' : 'Opcional'}
                                </div>
                            </button>
                        </section>
                    </div>

                    {/* RECEIPT PANEL */}
                    <div className="lg:col-span-5 sticky top-12">
                        <div className="relative">
                            {/* Physical Detail: Side Notches */}
                            <div className="absolute -left-3 top-[32%] w-6 h-6 bg-[#0f172a] rounded-full z-20 hidden lg:block shadow-inner" />
                            <div className="absolute -right-3 top-[32%] w-6 h-6 bg-[#0f172a] rounded-full z-20 hidden lg:block shadow-inner" />

                            <div className="bg-white text-slate-900 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-transform duration-700 animate-in zoom-in-95 duration-700">
                                {/* Receipt Head */}
                                <div className="bg-slate-50 p-10 text-center border-b-2 border-dashed border-slate-200">
                                    <img
                                        src="https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-03-1.png"
                                        alt="YouBox GT"
                                        className="h-10 mx-auto grayscale opacity-40 mb-6"
                                    />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Detailed Estimate</h3>
                                    <div className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-mono">YB-AI-SYS-25</div>
                                </div>

                                {/* Receipt Lines */}
                                <div className="p-10 space-y-8 font-mono">
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SUBTOTAL MERCADERÍA</span>
                                            <span className="font-bold text-xl uppercase">Q {priceQ.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LOGÍSTICA ({weightLbs || 1} LB)</span>
                                                {usedDefault && <span className="text-[7px] font-black text-orange-500 uppercase mt-1">** Default Rate Applied</span>}
                                            </div>
                                            <span className="font-bold text-xl uppercase">Q {costoEnvio.toFixed(2)}</span>
                                        </div>

                                        {weBuyIt && (
                                            <div className="flex justify-between items-end border-b border-slate-100 pb-3 text-indigo-600">
                                                <span className="text-[9px] font-black uppercase tracking-widest">SERVICE FEE (20%)</span>
                                                <span className="font-black text-xl">+ Q {comision.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Grand Highlight */}
                                    <div className="py-8 text-center">
                                        <div className="inline-block relative">
                                            <div className="absolute -inset-4 bg-yellow-400 rotate-1 rounded-2xl" />
                                            <div className="relative bg-black text-white px-8 py-4 rounded-xl rotate-0 shadow-xl">
                                                <span className="text-[9px] font-black uppercase tracking-[0.3em] block opacity-50 mb-1">Total Estimado</span>
                                                <span className="text-5xl font-black tracking-tighter">Q{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 opacity-60">
                                            <TrendingUp className="h-3 w-3" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Rate: ${TASA_CAMBIO.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="space-y-3">
                                        <button className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-black hover:scale-[1.02] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3">
                                            Order This Parcel
                                            <ChevronRight className="h-4 w-4 text-emerald-400" />
                                        </button>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase text-center leading-relaxed max-w-[200px] mx-auto opacity-50">
                                            Los precios pueden variar según peso real en bodega y fluctuaciones del mercado.
                                        </p>
                                    </div>

                                    {/* Barcode Deco */}
                                    <div className="pt-10 opacity-10">
                                        <div className="h-10 w-full bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px,black_3px,black_4px)]" />
                                        <div className="text-[8px] font-mono tracking-[1em] mt-2 text-center uppercase">Smart-Logistics-Verified</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="mt-32 border-t border-white/5 pt-12 text-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.6em]">
                        Developed by YouBox Labs &copy; 2025
                    </p>
                </footer>
            </div>
        </div>
    );
}
