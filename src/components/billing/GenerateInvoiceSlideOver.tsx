import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, Loader2, Calculator, Search, User, UserPlus, Building, Mail, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sendEmail } from '../../utils/sendEmail';

interface Tarifa {
    id: string;
    nombre_servicio: string;
    tarifa_q: number;
    tipo_cobro: string;
}

interface Bodega {
    id: string;
    nombre: string;
}

interface Cliente {
    id: string;
    nombre: string;
    apellido: string;
    locker_id: string;
    email: string;
}

interface GenerateInvoiceSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GenerateInvoiceSlideOver({ isOpen, onClose, onSuccess }: GenerateInvoiceSlideOverProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [bodegas, setBodegas] = useState<Bodega[]>([]);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);

    const [isManualClient, setIsManualClient] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [manualName, setManualName] = useState('');
    const [manualNit, setManualNit] = useState('');
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    const [selectedBodegaId, setSelectedBodegaId] = useState('');
    const [conceptos, setConceptos] = useState<{ id: string, descripcion: string, cantidad: number, precio_unitario: number }[]>([]);
    const [sendEmailFlag, setSendEmailFlag] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            // Start with one empty concepto for convenience
            if (conceptos.length === 0) {
                addConcepto();
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (clientSearchTerm.trim()) {
                searchClientes(clientSearchTerm);
            } else {
                setClientes([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [clientSearchTerm]);

    useEffect(() => {
        if (selectedBodegaId) {
            fetchTarifas(selectedBodegaId);
        } else {
            setTarifas([]);
        }
    }, [selectedBodegaId]);

    const fetchInitialData = async () => {
        setLoadingData(true);
        try {
            const { data: bodegasRes, error: bodegasError } = await supabase
                .from('bodegas')
                .select('id, nombre')
                .eq('activo', true)
                .order('nombre');

            if (bodegasError) throw bodegasError;
            if (bodegasRes) setBodegas(bodegasRes);
        } catch (error) {
            console.error('Error fetching initial data for invoice', error);
        } finally {
            setLoadingData(false);
        }
    };

    const searchClientes = async (term: string) => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('id, nombre, apellido, locker_id, email')
                .eq('activo', true)
                .or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,locker_id.ilike.%${term}%`)
                .order('locker_id')
                .limit(20);

            if (error) throw error;
            setClientes(data || []);
        } catch (error) {
            console.error('Error searching clients', error);
        }
    };

    const fetchTarifas = async (bodegaId: string) => {
        try {
            const { data } = await supabase.from('tarifas').select('id, nombre_servicio, tarifa_q, tipo_cobro').eq('bodega_id', bodegaId).eq('activa', true);
            if (data) setTarifas(data);
        } catch (error) {
            console.error('Error fetching tarifas', error);
        }
    };

    const addConcepto = () => {
        setConceptos([...conceptos, { id: crypto.randomUUID(), descripcion: '', cantidad: 1, precio_unitario: 0 }]);
    };

    const removeConcepto = (id: string) => {
        setConceptos(conceptos.filter(c => c.id !== id));
    };

    const updateConcepto = (id: string, field: string, value: any) => {
        setConceptos(prev => prev.map(c => {
            if (c.id === id) {
                const updated = { ...c, [field]: value };
                if (field === 'descripcion') {
                    const matchingTarifa = tarifas.find(t => t.nombre_servicio === value);
                    if (matchingTarifa) {
                        updated.precio_unitario = matchingTarifa.tarifa_q;
                    }
                }
                return updated;
            }
            return c;
        }));
    };

    const total = useMemo(() => {
        return conceptos.reduce((sum, c) => sum + (c.cantidad * c.precio_unitario), 0);
    }, [conceptos]);

    const filteredClientes = useMemo(() => {
        return clientes;
    }, [clientes]);

    const handleSave = async () => {
        if (!isManualClient && !selectedCliente) {
            toast.error("Seleccione un cliente registrado");
            return;
        }
        if (isManualClient && !manualName.trim()) {
            toast.error("Ingrese el nombre para facturación");
            return;
        }
        if (conceptos.length === 0 || conceptos.every(c => !c.descripcion.trim())) {
            toast.error("Agregue al menos un cargo");
            return;
        }

        setLoading(true);
        try {
            const numeroFactura = `FAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            const { data: facturaData, error: facturaError } = await supabase
                .from('facturas')
                .insert([{
                    numero: numeroFactura,
                    cliente_id: isManualClient ? null : selectedCliente?.id,
                    cliente_manual_nombre: isManualClient ? manualName.trim() : null,
                    cliente_manual_nit: isManualClient ? manualNit.trim() : null,
                    monto_subtotal: total,
                    monto_total: total,
                    moneda: 'GTQ',
                    estado: 'pendiente',
                    creado_por: user?.id
                }])
                .select()
                .single();

            if (facturaError) throw facturaError;

            const conceptosToInsert = conceptos
                .filter(c => c.descripcion.trim() !== '')
                .map(c => ({
                    factura_id: facturaData.id,
                    descripcion: c.descripcion,
                    cantidad: c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal: c.cantidad * c.precio_unitario
                }));

            const { error: conceptosError } = await supabase.from('conceptos_factura').insert(conceptosToInsert);
            if (conceptosError) throw conceptosError;

            if (sendEmailFlag && !isManualClient && selectedCliente?.email) {
                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <img src="https://youboxgt.com/logo.png" alt="Youbox GT" style="width: 150px;">
                        </div>
                        <h2 style="color: #1e293b; margin-top: 0;">¡Nueva Factura Generada! 🧾</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hola <strong>${selectedCliente.nombre}</strong>,</p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Se ha generado una nueva factura correspondiente a tus servicios en Youbox GT.</p>
                        
                        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Número de Factura:</td>
                                    <td style="text-align: right; color: #1e293b; font-weight: bold; padding-bottom: 8px;">${numeroFactura}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748b; font-size: 14px;">Monto Total:</td>
                                    <td style="text-align: right; color: #2563eb; font-weight: bold; font-size: 20px;">Q${total.toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>

                        <p style="color: #475569; font-size: 14px;">Puedes descargar los detalles y pagar esta factura desde tu panel de cliente.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Youbox GT — Tu puerta al mundo.</p>
                    </div>
                `;

                await sendEmail({
                    to: selectedCliente.email,
                    subject: `Factura ${numeroFactura} - Youbox GT`,
                    html: emailHtml
                });
            }

            toast.success("Factura generada exitosamente");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error('Error al generar la factura: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
                <div className="w-screen max-w-xl transition-transform animate-in slide-in-from-right duration-500 ease-out bg-white shadow-2xl flex flex-col">

                    {/* Header */}
                    <div className="px-6 py-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Nueva Factura</h2>
                                <p className="text-sm font-medium text-slate-500">Generación de cargo manual o por servicio</p>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar">

                        {/* Client Selection Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User className="h-4 w-4" /> Cliente
                                </h3>
                                <button
                                    onClick={() => setIsManualClient(!isManualClient)}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${isManualClient ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {isManualClient ? <User className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                                    {isManualClient ? 'Cambiar a Registrado' : 'Factura Manual / CF'}
                                </button>
                            </div>

                            {!isManualClient ? (
                                <div className="relative">
                                    <div className={`relative group transition-all ${selectedCliente ? 'opacity-50' : ''}`}>
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por Locker o Nombre..."
                                            value={clientSearchTerm}
                                            onChange={(e) => {
                                                setClientSearchTerm(e.target.value);
                                                setShowClientDropdown(true);
                                            }}
                                            onFocus={() => setShowClientDropdown(true)}
                                            className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>

                                    {showClientDropdown && clientSearchTerm && !selectedCliente && (
                                        <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {filteredClientes.length > 0 ? (
                                                <>
                                                    {filteredClientes.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                setSelectedCliente(c);
                                                                setShowClientDropdown(false);
                                                                setClientSearchTerm('');
                                                            }}
                                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-indigo-50 transition-colors group border-b border-slate-50 last:border-0"
                                                        >
                                                            <div className="flex items-center gap-3 text-left">
                                                                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 font-black text-indigo-600 text-xs">
                                                                    {c.locker_id}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 transition-colors group-hover:text-indigo-700">{c.nombre} {c.apellido}</p>
                                                                    <p className="text-xs text-slate-400 font-medium">{c.email}</p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            setManualName(clientSearchTerm);
                                                            setIsManualClient(true);
                                                            setShowClientDropdown(false);
                                                            setClientSearchTerm('');
                                                        }}
                                                        className="w-full px-4 py-4 bg-slate-50 flex items-center gap-3 text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-slate-100"
                                                    >
                                                        <UserPlus className="h-5 w-5" />
                                                        <span className="text-sm font-black italic">Usar "{clientSearchTerm}" como cliente manual</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setManualName(clientSearchTerm);
                                                        setIsManualClient(true);
                                                        setShowClientDropdown(false);
                                                        setClientSearchTerm('');
                                                    }}
                                                    className="w-full px-4 py-8 text-center group hover:bg-indigo-50 transition-colors"
                                                >
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 group-hover:bg-white transition-colors">
                                                        <UserPlus className="h-6 w-6 text-slate-400 group-hover:text-indigo-600" />
                                                    </div>
                                                    <p className="text-slate-500 text-sm font-bold">No se encontraron clientes</p>
                                                    <div className="mt-2 text-indigo-600 text-xs font-black uppercase tracking-wider bg-indigo-50 py-2 px-4 rounded-full inline-block group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        Usar "{clientSearchTerm}" como nombre manual
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {selectedCliente && (
                                        <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-indigo-600">
                                                    {selectedCliente.locker_id}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800">{selectedCliente.nombre} {selectedCliente.apellido}</p>
                                                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{selectedCliente.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedCliente(null)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nombre / Razón Social *</label>
                                        <input
                                            type="text"
                                            placeholder="Ej. Consumidor Final o Nombre Cliente"
                                            value={manualName}
                                            onChange={(e) => setManualName(e.target.value)}
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">NIT / ID Fiscal</label>
                                        <input
                                            type="text"
                                            placeholder="Opcional"
                                            value={manualNit}
                                            onChange={(e) => setManualNit(e.target.value)}
                                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Middle Section: Bodega & Common Tasks */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Building className="h-4 w-4" /> Configuración de Cobro
                            </h3>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Bodega (Cargar Tarifas)</label>
                                    <select
                                        value={selectedBodegaId}
                                        onChange={(e) => setSelectedBodegaId(e.target.value)}
                                        className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm outline-none focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        <option value="">-- Sin Bodega / Cargos Libres --</option>
                                        {bodegas.map(b => (
                                            <option key={b.id} value={b.id}>{b.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                {tarifas.length > 0 && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95">
                                        {tarifas.slice(0, 4).map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    const newId = crypto.randomUUID();
                                                    setConceptos([...conceptos, { id: newId, descripcion: t.nombre_servicio, cantidad: 1, precio_unitario: t.tarifa_q }]);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                                            >
                                                + {t.nombre_servicio}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Conceptos Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calculator className="h-4 w-4" /> Conceptos a Facturar
                                </h3>
                                <button
                                    onClick={addConcepto}
                                    className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                                >
                                    <Plus className="h-4 w-4" /> Agregar Item
                                </button>
                            </div>

                            <div className="space-y-4">
                                {conceptos.map((c, index) => (
                                    <div key={c.id} className="group relative p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all animate-in slide-in-from-right duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Descripción del cargo..."
                                                    value={c.descripcion}
                                                    onChange={(e) => updateConcepto(c.id, 'descripcion', e.target.value)}
                                                    list={`tarifas-${c.id}`}
                                                    className="w-full bg-transparent border-none p-0 text-slate-700 font-bold placeholder:text-slate-300 focus:ring-0"
                                                />
                                                <datalist id={`tarifas-${c.id}`}>
                                                    {tarifas.map(t => <option key={t.id} value={t.nombre_servicio} />)}
                                                </datalist>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                                                        <button
                                                            onClick={() => updateConcepto(c.id, 'cantidad', Math.max(0, c.cantidad - 1))}
                                                            className="px-2 py-1 hover:bg-slate-200 transition-colors"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={c.cantidad}
                                                            onChange={(e) => updateConcepto(c.id, 'cantidad', parseFloat(e.target.value))}
                                                            className="w-12 text-center bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 py-1"
                                                        />
                                                        <button
                                                            onClick={() => updateConcepto(c.id, 'cantidad', c.cantidad + 1)}
                                                            className="px-2 py-1 hover:bg-slate-200 transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Q</span>
                                                        <input
                                                            type="number"
                                                            value={c.precio_unitario}
                                                            onChange={(e) => updateConcepto(c.id, 'precio_unitario', parseFloat(e.target.value))}
                                                            className="w-24 pl-6 pr-2 py-1 bg-slate-50 rounded-lg text-xs font-black text-slate-700 border-none focus:ring-2 focus:ring-indigo-500/10"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-slate-800">Q{(c.cantidad * c.precio_unitario).toFixed(2)}</span>
                                                    <button
                                                        onClick={() => removeConcepto(c.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {conceptos.length === 0 && (
                                    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 rounded-3xl">
                                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                            <Calculator className="h-6 w-6 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 text-sm font-bold">No hay cargos agregados</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Footer Summary & Action */}
                    <div className="px-6 py-6 border-t border-slate-100 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${sendEmailFlag ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-black text-slate-800 tracking-tight">Notificar Cliente</label>
                                    <button
                                        onClick={() => setSendEmailFlag(!sendEmailFlag)}
                                        className={`text-[10px] font-black transition-colors ${sendEmailFlag ? 'text-indigo-600' : 'text-slate-400'}`}
                                    >
                                        {sendEmailFlag ? 'ACTIVADO' : 'DESACTIVADO'}
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a pagar</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter">Q{total.toFixed(2)}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={loading || conceptos.length === 0 || (!isManualClient && !selectedCliente) || (isManualClient && !manualName.trim())}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                            {loading ? 'Generando...' : 'Confirmar y Guardar'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
