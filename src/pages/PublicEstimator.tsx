import React, { useState } from 'react';
import { Search, Loader2, Package, Store, ShoppingCart, TrendingUp, Sparkles, AlertCircle, ChevronRight, Check } from 'lucide-react';

const DEPARTAMENTOS = [
    { nombre: 'Alta Verapaz', envio: 35 },
    { nombre: 'Baja Verapaz', envio: 35 },
    { nombre: 'Chimaltenango', envio: 35 },
    { nombre: 'Chiquimula', envio: 35 },
    { nombre: 'El Progreso', envio: 35 },
    { nombre: 'Escuintla', envio: 35 },
    { nombre: 'Guatemala', envio: 35 },
    { nombre: 'Huehuetenango', envio: 35 },
    { nombre: 'Izabal', envio: 35 },
    { nombre: 'Jalapa', envio: 35 },
    { nombre: 'Jutiapa', envio: 35 },
    { nombre: 'Petén', envio: 35 },
    { nombre: 'Quetzaltenango', envio: 0, destacada: true },
    { nombre: 'Quiché', envio: 0, destacada: true },
    { nombre: 'Retalhuleu', envio: 35 },
    { nombre: 'Sacatepéquez', envio: 35 },
    { nombre: 'San Marcos', envio: 35 },
    { nombre: 'Santa Rosa', envio: 35 },
    { nombre: 'Sololá', envio: 35 },
    { nombre: 'Suchitepéquez (Mazate)', envio: 0, destacada: true },
    { nombre: 'Totonicapán', envio: 35 },
    { nombre: 'Zacapa', envio: 35 }
];

export function PublicEstimator() {
    const [selectedDepto, setSelectedDepto] = useState<string>('');

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
    const TASA_LIBRA = 80.00; // Fixed weight rate per pound
    const IVA_MULTIPLIER = 1.12;
    const CONCIERGE_MULTIPLIER = 1.20;

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
        const baseWeight = Math.max(Number(weightLbs) || 1, 1);
        const depto = DEPARTAMENTOS.find(d => d.nombre === selectedDepto);
        const costoEntrega = depto ? depto.envio : 35;

        // 1. Logistics: Weight * Q80
        const costoLogistica = baseWeight * TASA_LIBRA;

        // 2. Price in Quetzales: USD * Rate
        const priceQ = (Number(priceUsd) || 0) * TASA_CAMBIO;

        // 3. Sum of items (before multiplier)
        const subtotalBase = priceQ + costoLogistica + costoEntrega;

        // 4. Final Total with multipliers
        // Normal = 1.12x, Concierge = 1.20x
        const multiplier = weBuyIt ? CONCIERGE_MULTIPLIER : IVA_MULTIPLIER;
        const total = subtotalBase * multiplier;

        return { costoLogistica, priceQ, costoEntrega, total, multiplierLabel: weBuyIt ? '20%' : '12%' };
    };

    const { costoLogistica, priceQ, costoEntrega, total, multiplierLabel } = calculateEstimates();

    const handleWhatsApp = () => {
        if (!total) return;
        const message = `¡Hola YouBox! 👋 Deseo cotizar mi compra con Smart IA:\n\n` +
            `📦 *Producto:* ${title || 'Sin nombre'}\n` +
            `🔗 *Link:* ${url || 'Manual'}\n` +
            `🌎 *Destino:* ${selectedDepto}\n` +
            `⚖️ *Peso:* ${weightLbs || 1} Lbs\n` +
            `💰 *Precio USD:* $${priceUsd}\n` +
            `🛠️ *Modalidad:* ${weBuyIt ? 'Lo compramos por mí (+20%)' : 'Yo lo compro (+12%)'}\n\n` +
            `🔥 *TOTAL ESTIMADO: Q${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}*`;

        window.open(`https://wa.me/50256466611?text=${encodeURIComponent(message)}`, '_blank');
    };

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

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition" />
                                    <select
                                        value={selectedDepto}
                                        onChange={(e) => setSelectedDepto(e.target.value)}
                                        className="relative w-full bg-[#1e293b] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold appearance-none cursor-pointer outline-none focus:border-blue-500 transition-all text-sm"
                                    >
                                        <option value="">Buscar departamento...</option>
                                        {DEPARTAMENTOS.map(d => (
                                            <option key={d.nombre} value={d.nombre}>
                                                {d.nombre} {d.envio === 0 ? '— ENVÍO GRATIS 📦' : `— Envío Q${d.envio}`}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                        <ChevronRight className="h-5 w-5 rotate-90" />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {DEPARTAMENTOS.filter(d => d.destacada).map(d => (
                                        <button
                                            key={d.nombre}
                                            onClick={() => setSelectedDepto(d.nombre)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${selectedDepto === d.nombre
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                        >
                                            {d.nombre} FREE
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* SMART LINK EXTRACTION */}
                        <section className={`bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 relative ${!selectedDepto ? 'opacity-20 grayscale pointer-events-none' : 'border-t-white/20'}`}>
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
                                            placeholder="Pega el link de Amazon, eBay, etc..."
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 px-4 py-4 text-white font-medium placeholder:text-slate-600 text-sm"
                                        />
                                        <button
                                            onClick={handleExtract}
                                            disabled={isExtracting || !url}
                                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2 shrink-0 md:shrink"
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
                                        <div className="relative w-full md:w-52 h-52 bg-[#0f172a] rounded-[2rem] border border-white/10 flex items-center justify-center overflow-hidden group/thumb shrink-0">
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
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all text-sm"
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
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Peso Estimado (Lbs)</label>
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
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter leading-tight">Servicio corporativo completo (+20%) - Nosotros nos encargamos de todo.</p>
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
                                <div className="bg-slate-100/50 p-10 text-center border-b-2 border-dashed border-slate-200">
                                    <img
                                        src="https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-03-1.png"
                                        alt="YouBox GT"
                                        className="h-10 mx-auto opacity-60 mb-6"
                                    />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 mb-2">Estimate Summary</h3>
                                    <div className="text-2xl font-black uppercase tracking-tighter text-slate-900 font-mono">YB-SMART-SYS</div>
                                </div>

                                {/* Receipt Lines */}
                                <div className="p-10 space-y-8 font-mono">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left leading-none w-1/2">VALOR MERCADERÍA</span>
                                            <span className="font-bold text-lg uppercase text-right">Q {priceQ.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LOGÍSTICA ({weightLbs || 1} LB)</span>
                                                <span className="text-[7px] font-bold text-slate-400 mt-0.5">@ Q80.00 / LB</span>
                                            </div>
                                            <span className="font-bold text-lg uppercase text-right">Q {costoLogistica.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ENVÍO LOCAL</span>
                                                <span className="text-[7px] font-bold text-emerald-600 mt-0.5 uppercase">{selectedDepto || 'Sin destino'}</span>
                                            </div>
                                            <span className={`font-bold text-lg uppercase text-right ${costoEntrega === 0 ? 'text-emerald-600' : ''}`}>
                                                {costoEntrega === 0 ? 'GRATIS' : `Q ${costoEntrega.toFixed(2)}`}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-end pt-2 text-indigo-600 border-t border-slate-200">
                                            <span className="text-[9px] font-black uppercase tracking-widest">TASAS & SERV. ({multiplierLabel})</span>
                                            <span className="font-bold text-sm">TOTAL INCLUIDO</span>
                                        </div>
                                    </div>

                                    {/* Grand Highlight */}
                                    <div className="py-6 text-center">
                                        <div className="inline-block relative">
                                            <div className="absolute -inset-4 bg-yellow-400 rotate-1 rounded-2xl" />
                                            <div className="relative bg-black text-white px-8 py-4 rounded-xl rotate-0 shadow-xl">
                                                <span className="text-[9px] font-black uppercase tracking-[0.3em] block opacity-50 mb-1">Total Estimado</span>
                                                <span className="text-4xl font-black tracking-tight">Q{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 opacity-60">
                                            <TrendingUp className="h-3 w-3" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Rate: ${TASA_CAMBIO.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleWhatsApp}
                                            disabled={!selectedDepto || !priceUsd}
                                            className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-black hover:scale-[1.02] transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                        >
                                            REALIZAR PEDIDO
                                            <ChevronRight className="h-4 w-4 text-emerald-400" />
                                        </button>
                                        <p className="text-[7px] font-bold text-slate-400 uppercase text-center leading-relaxed max-w-[200px] mx-auto opacity-50">
                                            Estimado calculado automáticamente. Envíanos el resumen por WhatsApp para confirmar existencias.
                                        </p>
                                    </div>

                                    {/* Barcode Deco */}
                                    <div className="pt-6 opacity-10">
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
                        Developed by YouBox Labs &copy; 2026
                    </p>
                </footer>
            </div>
        </div>
    );
}
