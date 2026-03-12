import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Loader2, Package, Calculator, Store, Truck, ShoppingCart, Info, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

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
    const TASA_CAMBIO = 8.00; // Fixed exchange rate or fetch from DB? Assume 8.00 for now.

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
            if (data.priceUsd) setPriceUsd(data.priceUsd);
            if (data.estimatedWeightLbs) setWeightLbs(data.estimatedWeightLbs);
            if (data.imageUrl) setImageUrl(data.imageUrl);

        } catch (err: any) {
            setExtractError(err.message || 'Error al analizar el enlace. Por favor ingresa los datos manualmente.');
        } finally {
            setIsExtracting(false);
        }
    };

    // Calculations
    const calculateEstimates = () => {
        let costoEnvio = 0;
        const baseWeight = Number(weightLbs) || 1;

        // Find a general per-pound rate
        const libraRate = tarifas.find(t => t.tipo_cobro === 'por_libra');
        if (libraRate) {
            costoEnvio = libraRate.tarifa_q * baseWeight;
        } else if (tarifas.length > 0) {
            costoEnvio = tarifas[0].tarifa_q * baseWeight; // fallback
        }

        const priceQ = (Number(priceUsd) || 0) * TASA_CAMBIO;
        let subtotal = priceQ + costoEnvio;
        let comision = 0;

        if (weBuyIt) {
            comision = subtotal * 0.20;
        }

        const total = subtotal + comision;

        return { costoEnvio, priceQ, comision, total };
    };

    const { costoEnvio, priceQ, comision, total } = calculateEstimates();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-10 pb-20 px-4 sm:px-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 w-full h-80 bg-gradient-to-b from-blue-600 to-indigo-700 rounded-b-[3rem] -z-10 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-3xl space-y-8 mt-4">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-2 shadow-sm border border-white/20">
                        <Calculator className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Cotizador Inteligente</h1>
                    <p className="text-blue-100 text-lg font-medium max-w-xl mx-auto">
                        Calcula exactamente cuánto cuesta traer tus compras a Guatemala, sin sorpresas.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-8 animate-fade-in relative z-10">

                    {/* Step 1: Branch */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-widest">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs shadow-sm">1</span>
                            Destino en Guatemala
                        </label>
                        <div className="relative">
                            <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <select
                                value={selectedSucursal}
                                onChange={(e) => setSelectedSucursal(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-0 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Selecciona tu sede más cercana...</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Step 2: Smart Link */}
                    <div className={`space-y-4 transition-all duration-300 ${!selectedSucursal ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-widest">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs shadow-sm">2</span>
                            Enlace del Producto <span className="text-emerald-500 flex items-center gap-1 normal-case font-semibold text-xs ml-auto"><Sparkles className="h-3 w-3" /> IA Activada</span>
                        </label>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="url"
                                    placeholder="https://amazon.com/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 focus:ring-0 focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleExtract}
                                disabled={isExtracting || !url}
                                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95"
                            >
                                {isExtracting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                                Analizar Link
                            </button>
                        </div>

                        {extractError && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-sm font-medium">
                                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                                <p>{extractError}</p>
                            </div>
                        )}
                    </div>

                    {/* Product Form */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 transition-all duration-500 ${title || extractError ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
                        <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Producto ({imageUrl ? 'Encontrado' : 'Ingresar Nombre'})</label>
                            <input
                                type="text"
                                placeholder="Ej. Zapatos Nike, Laptop Dell..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-medium focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Precio (USD $)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={priceUsd}
                                    onChange={(e) => setPriceUsd(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full pl-8 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Peso Estimado (Lbs)</label>
                            <div className="relative">
                                <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="number"
                                    placeholder="1.0"
                                    value={weightLbs}
                                    onChange={(e) => setWeightLbs(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Step 3: Service Options */}
                    <div className={`space-y-4 transition-all duration-300 ${!selectedSucursal ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-widest">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs shadow-sm">3</span>
                            Opciones de Servicio
                        </label>

                        <label className="flex items-start sm:items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 border-slate-200 bg-white hover:border-emerald-300"
                            style={weBuyIt ? { borderColor: '#10b981', backgroundColor: '#ecfdf5' } : {}}>
                            <div className="relative flex items-center pt-1 sm:pt-0">
                                <input
                                    type="checkbox"
                                    checked={weBuyIt}
                                    onChange={(e) => setWeBuyIt(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-bold ${weBuyIt ? 'text-emerald-800' : 'text-slate-800'}`}>Deseo que YBG realice la compra</h4>
                                <p className={`text-sm mt-0.5 ${weBuyIt ? 'text-emerald-600' : 'text-slate-500'}`}>Nos encargamos de comprarlo con tarjeta corporativa (Aplica 20% de recargo).</p>
                            </div>
                            <ShoppingCart className={`h-8 w-8 ml-auto hidden sm:block ${weBuyIt ? 'text-emerald-500' : 'text-slate-300'}`} />
                        </label>
                    </div>

                    {/* Totals Breakdown */}
                    {selectedSucursal && (priceUsd || weightLbs) ? (
                        <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-bl-full opacity-20" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500 rounded-tr-full opacity-20" />

                            <h3 className="text-lg font-bold text-slate-300 mb-6 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Desglose de Cotización
                            </h3>

                            <div className="space-y-3 relative z-10">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Costo del Producto (Q)</span>
                                    <span className="font-semibold">Q {priceQ.toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center text-slate-300">
                                    <span className="flex items-center gap-2"><Truck className="h-4 w-4" /> Envío a Sede (Q)</span>
                                    <span className="font-semibold">Q {costoEnvio.toFixed(2)}</span>
                                </div>

                                {weBuyIt && (
                                    <div className="flex justify-between items-center text-emerald-300">
                                        <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Servicio de Compra (20%)</span>
                                        <span className="font-semibold">+ Q {comision.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="pt-4 mt-4 border-t border-slate-700/50 flex justify-between items-end">
                                    <div>
                                        <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider block mb-1">Total Estimado</span>
                                        <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">Q {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-700/50">
                                <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    Contactar para Ordenar
                                </button>
                                <p className="text-center text-xs text-slate-500 mt-3 font-medium flex items-center justify-center gap-1">
                                    <Info className="h-3 w-3" /> Las cotizaciones son aproximadas y pueden variar levemente al recibir el paquete final.
                                </p>
                            </div>
                        </div>
                    ) : null}

                </div>

                {/* Footer info brand */}
                <div className="text-center text-slate-400 text-sm font-medium">
                    Powered by YouBox GT AI Engine
                </div>
            </div>
        </div>
    );
}
