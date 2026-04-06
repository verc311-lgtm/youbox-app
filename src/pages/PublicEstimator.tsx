import React, { useState } from 'react';
import { Plus, Loader2, Trash2, Edit3, Package, ShoppingCart, ArrowLeft, Check, AlertCircle, ChevronDown, Info, MessageCircle } from 'lucide-react';

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

const TASA_CAMBIO = 8.00;
const TASA_LIBRA = 80.00;
const CONCIERGE_MULTIPLIER = 1.17;

interface CartProduct {
    id: string;
    url: string;
    title: string;
    priceUsd: number;
    weightLbs: number;
    imageUrl: string | null;
    quantity: number;
    loading: boolean;
    error?: string;
}

function randomId() {
    return Math.random().toString(36).substring(2, 9);
}

export function PublicEstimator() {
    const [selectedDepto, setSelectedDepto] = useState('');
    const [deptoOpen, setDeptoOpen] = useState(false);
    const [weBuyIt, setWeBuyIt] = useState(false);

    const [urlInput, setUrlInput] = useState('');
    const [products, setProducts] = useState<CartProduct[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const depto = DEPARTAMENTOS.find(d => d.nombre === selectedDepto);
    const costoEntrega = depto ? depto.envio : 35;

    const totalLogistica = products.reduce((sum, p) => sum + (p.weightLbs * p.quantity * TASA_LIBRA), 0);
    const totalMercaderia = products.reduce((sum, p) => sum + (p.priceUsd * p.quantity * TASA_CAMBIO), 0);
    const subtotal = totalMercaderia + totalLogistica + (products.length > 0 ? costoEntrega : 0);
    const multiplier = weBuyIt ? CONCIERGE_MULTIPLIER : 1.00;
    const grandTotal = subtotal * multiplier;

    const canOrder = products.length > 0 && selectedDepto;

    const addProduct = async () => {
        if (!urlInput.trim()) return;
        const id = randomId();
        const newProduct: CartProduct = {
            id,
            url: urlInput.trim(),
            title: 'Analizando...',
            priceUsd: 0,
            weightLbs: 1,
            imageUrl: null,
            quantity: 1,
            loading: true,
        };
        setProducts(prev => [...prev, newProduct]);
        setUrlInput('');

        try {
            const response = await fetch('/api/extract-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newProduct.url }),
            });

            if (!response.ok) throw new Error('Error al analizar el enlace');
            const data = await response.json();

            setProducts(prev => prev.map(p => p.id === id ? {
                ...p,
                loading: false,
                title: data.title || 'Producto sin nombre',
                priceUsd: data.priceUsd || 0,
                weightLbs: data.estimatedWeightLbs || 1,
                imageUrl: data.imageUrl || null,
            } : p));
        } catch (err: any) {
            setProducts(prev => prev.map(p => p.id === id ? {
                ...p,
                loading: false,
                title: 'Error al analizar',
                error: err.message,
            } : p));
        }
    };

    const removeProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const updateProduct = (id: string, field: keyof CartProduct, value: any) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleWhatsApp = () => {
        if (!canOrder) return;
        const lines = products.map((p, i) =>
            `📦 *Producto ${i + 1}:* ${p.title}\n   🔗 ${p.url}\n   💲 $${p.priceUsd} USD × ${p.quantity} ud(s) = Q${(p.priceUsd * p.quantity * TASA_CAMBIO).toFixed(2)}\n   ⚖️ ${p.weightLbs} lbs × ${p.quantity} = Q${(p.weightLbs * p.quantity * TASA_LIBRA).toFixed(2)} logística`
        ).join('\n\n');

        const message =
            `¡Hola YouBox! 👋 Quiero cotizar mi pedido:\n\n${lines}\n\n` +
            `🚚 *Destino:* ${selectedDepto}\n` +
            `🛠️ *Modalidad:* ${weBuyIt ? 'Lo compramos por ti (Gestión Premium)' : 'Yo lo compro'}\n\n` +
            `🔥 *TOTAL ESTIMADO: Q${grandTotal.toFixed(2)}*\n` +
            `_⚠️ Estimado sujeto a precio y peso real del producto_`;

        window.open(`https://wa.me/50256466611?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-blue-700/8 blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-700/8 blur-[140px]" />
                <div className="absolute top-[40%] left-[45%] w-[30%] h-[30%] rounded-full bg-violet-700/5 blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative border-b border-white/5 bg-white/3 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <a href="https://youboxgt.com" className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Volver</span>
                    </a>
                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                            YouBox <span className="text-blue-400">Smart</span>
                        </h1>
                        <p className="text-[11px] text-slate-400 tracking-widest uppercase">Cotizador Inteligente</p>
                    </div>
                    <div className="w-16" />
                </div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_370px] gap-8 items-start">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">

                        {/* Step 1: Destination */}
                        <div className="bg-white/4 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">1</span>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Selecciona tu destino</span>
                            </div>

                            {/* Departament selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setDeptoOpen(!deptoOpen)}
                                    className="w-full flex items-center justify-between bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-left transition-all"
                                >
                                    <span className={selectedDepto ? 'text-white font-semibold' : 'text-slate-400'}>
                                        {selectedDepto || 'Buscar departamento...'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${deptoOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {deptoOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#111827] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto">
                                        {DEPARTAMENTOS.map(d => (
                                            <button
                                                key={d.nombre}
                                                onClick={() => { setSelectedDepto(d.nombre); setDeptoOpen(false); }}
                                                className="w-full px-4 py-2.5 text-left hover:bg-white/8 flex items-center justify-between text-sm transition-colors"
                                            >
                                                <span>{d.nombre}</span>
                                                {d.envio === 0
                                                    ? <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">GRATIS</span>
                                                    : <span className="text-[10px] text-slate-400">Q{d.envio}</span>
                                                }
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Free destinations */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {DEPARTAMENTOS.filter(d => d.destacada).map(d => (
                                    <button
                                        key={d.nombre}
                                        onClick={() => { setSelectedDepto(d.nombre); setDeptoOpen(false); }}
                                        className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${selectedDepto === d.nombre ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/4 border-white/10 text-slate-500 hover:border-emerald-500/30'}`}
                                    >
                                        {d.nombre} — FREE
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Add Products */}
                        <div className="bg-white/4 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">2</span>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Agrega tus productos</span>
                            </div>

                            {/* URL Input */}
                            <div className="flex gap-3">
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addProduct()}
                                    placeholder="https://www.amazon.com/dp/B08..."
                                    className="flex-1 bg-white/6 border border-white/10 focus:border-blue-500/50 focus:bg-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                                    disabled={products.some(p => p.loading)}
                                />
                                <button
                                    onClick={addProduct}
                                    disabled={!urlInput.trim() || products.some(p => p.loading)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider text-xs px-5 py-3 rounded-xl transition-all shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar
                                </button>
                            </div>

                            {/* Approximate values notice */}
                            <div className="mt-4 flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
                                <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-300/80 leading-relaxed">
                                    <span className="font-bold text-amber-400">¡Puedes editar los valores!</span> Esta es una cotización aproximada basada en el conocimiento de la IA. Si el precio o el peso no es correcto, haz clic en ✏️ para modificarlos manualmente.
                                </p>
                            </div>

                            {/* Product Cards */}
                            {products.length > 0 && (
                                <div className="mt-5 space-y-4">
                                    {products.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            isEditing={editingId === product.id}
                                            onEdit={() => setEditingId(editingId === product.id ? null : product.id)}
                                            onRemove={() => removeProduct(product.id)}
                                            onUpdate={(field, value) => updateProduct(product.id, field, value)}
                                        />
                                    ))}
                                </div>
                            )}

                            {products.length === 0 && (
                                <div className="mt-8 text-center">
                                    <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">Tu carrito está vacío</p>
                                    <p className="text-slate-600 text-xs mt-1">Pega un enlace de Amazon, BestBuy, Lego u otra tienda</p>
                                </div>
                            )}
                        </div>

                        {/* Step 3: Modality */}
                        {products.filter(p => !p.loading).length > 0 && (
                            <div className="bg-white/4 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-5">
                                    <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black">3</span>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Modalidad de compra</span>
                                </div>
                                <button
                                    onClick={() => setWeBuyIt(!weBuyIt)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${weBuyIt ? 'border-green-500/60 bg-green-500/10' : 'border-white/10 bg-white/4 hover:border-white/20'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${weBuyIt ? 'bg-green-500' : 'bg-white/8'}`}>
                                        {weBuyIt ? <Check className="w-5 h-5 text-white" /> : <ShoppingCart className="w-5 h-5 text-slate-400" />}
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`font-black uppercase text-sm tracking-tight ${weBuyIt ? 'text-white' : 'text-slate-400'}`}>Lo compramos por ti</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-tight">Servicio corporativo premium — nos encargamos de todo</p>
                                    </div>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${weBuyIt ? 'bg-green-500 text-white' : 'bg-white/8 text-slate-500'}`}>
                                        {weBuyIt ? 'Activado' : 'Opcional'}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN — Receipt */}
                    <div className="sticky top-6">
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-800">
                            {/* Receipt Header */}
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 text-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Estimate Summary</p>
                                <p className="text-lg font-black tracking-widest text-slate-700 mt-1">YB-SMART-SYS</p>
                                <div className="w-24 h-px bg-slate-200 mx-auto mt-3" />
                            </div>

                            {/* Line Items */}
                            <div className="px-6 py-4 space-y-3">
                                {products.filter(p => !p.loading && !p.error).length > 0 ? (
                                    <>
                                        {/* Products */}
                                        {products.filter(p => !p.loading).map((p, i) => (
                                            <div key={p.id} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                                                <div className="flex flex-col text-left max-w-[55%]">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto {i + 1}</span>
                                                    <span className="text-[11px] font-semibold text-slate-600 leading-tight mt-0.5">{p.title}</span>
                                                    <span className="text-[9px] text-slate-400 mt-0.5">${p.priceUsd} × {p.quantity} ud</span>
                                                </div>
                                                <span className="font-bold text-base">Q {(p.priceUsd * p.quantity * TASA_CAMBIO).toFixed(2)}</span>
                                            </div>
                                        ))}

                                        {/* Logistics */}
                                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logística total</span>
                                                <span className="text-[9px] text-slate-400 mt-0.5">@ Q80.00 / lb</span>
                                            </div>
                                            <span className="font-bold text-base">Q {totalLogistica.toFixed(2)}</span>
                                        </div>

                                        {/* Delivery */}
                                        <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Envío local</span>
                                                <span className="text-[9px] text-emerald-600 uppercase mt-0.5">{selectedDepto || 'Sin destino'}</span>
                                            </div>
                                            <span className={`font-bold text-base ${costoEntrega === 0 ? 'text-emerald-600' : ''}`}>
                                                {products.length > 0 ? (costoEntrega === 0 ? 'GRATIS' : `Q ${costoEntrega.toFixed(2)}`) : 'Q 0.00'}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-6 text-center space-y-1">
                                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                                        <p className="text-slate-400 text-xs">Agrega productos para ver el resumen</p>
                                    </div>
                                )}
                            </div>

                            {/* Grand Total */}
                            <div className="px-6 pb-4">
                                <div className="py-5 text-center">
                                    <div className="inline-block relative">
                                        <div className="absolute -inset-3 bg-yellow-400 rotate-1 rounded-2xl" />
                                        <div className="relative bg-black text-white px-7 py-4 rounded-xl shadow-xl">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] block opacity-50 mb-1">Total Estimado</span>
                                            <span className="text-3xl font-black tracking-tight">Q{grandTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 text-center mt-2">↗ RATE: Q{TASA_CAMBIO.toFixed(2)}</p>
                            </div>

                            {/* Approximate notice */}
                            <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-amber-700 leading-relaxed">
                                    <span className="font-bold">Cotización aproximada.</span> Los valores de precio y peso son estimados por IA y pueden variar. Confírmales con el agente de YouBox.
                                </p>
                            </div>

                            {/* CTA */}
                            <div className="px-4 pb-5">
                                <button
                                    onClick={handleWhatsApp}
                                    disabled={!canOrder}
                                    className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all group"
                                >
                                    <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    {!selectedDepto ? 'Selecciona un destino' : products.length === 0 ? 'Agrega un producto' : 'Realizar Pedido'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Product Card Component ─────────────────────────────────── */
interface ProductCardProps {
    product: CartProduct;
    isEditing: boolean;
    onEdit: () => void;
    onRemove: () => void;
    onUpdate: (field: keyof CartProduct, value: any) => void;
}

function ProductCard({ product, isEditing, onEdit, onRemove, onUpdate }: ProductCardProps) {
    if (product.loading) {
        return (
            <div className="flex gap-4 p-4 rounded-xl border border-white/8 bg-white/3 animate-pulse">
                <div className="w-20 h-20 rounded-lg bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/8 rounded w-1/2" />
                    <div className="flex gap-3 mt-3">
                        <div className="h-8 bg-white/8 rounded-lg flex-1" />
                        <div className="h-8 bg-white/8 rounded-lg flex-1" />
                    </div>
                </div>
            </div>
        );
    }

    if (product.error) {
        return (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/8">
                <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
                <div className="flex-1">
                    <p className="text-xs font-bold text-red-400">No se pudo analizar el enlace</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 break-all">{product.url}</p>
                </div>
                <button onClick={onRemove} className="text-red-400 hover:text-red-300 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/4 overflow-hidden transition-all">
            <div className="flex gap-4 p-4">
                {/* Product Image */}
                <div className="w-20 h-20 rounded-lg bg-white/8 overflow-hidden shrink-0 border border-white/5">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-slate-600" />
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-snug line-clamp-2">{product.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 break-all line-clamp-1">{product.url}</p>

                    {!isEditing && (
                        <div className="flex gap-3 mt-3">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-center">
                                <p className="text-[9px] text-emerald-400 uppercase font-bold">Precio USD</p>
                                <p className="text-sm font-black text-emerald-400">${product.priceUsd}</p>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-center">
                                <p className="text-[9px] text-blue-400 uppercase font-bold">Peso (lbs)</p>
                                <p className="text-sm font-black text-blue-400">{product.weightLbs}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-center">
                                <p className="text-[9px] text-slate-400 uppercase font-bold">Cantidad</p>
                                <p className="text-sm font-black text-slate-300">{product.quantity}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <button onClick={onEdit} className="p-2 rounded-lg bg-white/6 hover:bg-blue-500/20 hover:text-blue-400 text-slate-400 transition-all" title="Editar valores">
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onRemove} className="p-2 rounded-lg bg-white/6 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-all" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Edit Panel */}
            {isEditing && (
                <div className="border-t border-white/8 bg-white/3 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <Edit3 className="w-3 h-3" /> Editar valores estimados
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Precio USD ($)</label>
                            <input
                                type="number"
                                value={product.priceUsd}
                                onChange={e => onUpdate('priceUsd', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white/8 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2 text-sm font-bold text-emerald-400 outline-none"
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Peso (lbs)</label>
                            <input
                                type="number"
                                value={product.weightLbs}
                                onChange={e => onUpdate('weightLbs', parseFloat(e.target.value) || 1)}
                                className="w-full bg-white/8 border border-white/10 focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm font-bold text-blue-400 outline-none"
                                step="0.1"
                                min="0.1"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Cantidad</label>
                            <input
                                type="number"
                                value={product.quantity}
                                onChange={e => onUpdate('quantity', parseInt(e.target.value) || 1)}
                                className="w-full bg-white/8 border border-white/10 focus:border-slate-500/50 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 outline-none"
                                min="1"
                                max="20"
                            />
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-600 mt-2">💡 Los cambios se reflejan en el recibo automáticamente</p>
                </div>
            )}
        </div>
    );
}
