import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Calculator, Users, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface BulkInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    consolidacionId: string;
    bodegaId: string; // The origin warehouse of the consolidation
}

interface PaqueteDatos {
    id: string;
    peso_lbs: number;
    cliente_id: string;
    clientes: {
        id: string;
        nombre: string;
        apellido: string;
        locker_id: string;
        email: string;
    };
}

interface Tarifa {
    id: string;
    nombre_servicio: string;
    tarifa_q: number;
    tipo_cobro: string;
    peso_min_lbs: number;
    peso_max_lbs: number | null;
}

interface ClienteAgrupado {
    cliente: {
        id: string;
        nombre: string;
        apellido: string;
        locker_id: string;
        email: string;
    };
    paquetes: PaqueteDatos[];
    totalLbs: number;
    tarifaAplicada: Tarifa | null;
    totalQ: number;
}

export function BulkInvoiceModal({ isOpen, onClose, onSuccess, consolidacionId, bodegaId }: BulkInvoiceModalProps) {
    const { user } = useAuth();
    const [loadingData, setLoadingData] = useState(false);
    const [saving, setSaving] = useState(false);

    const [agrupados, setAgrupados] = useState<ClienteAgrupado[]>([]);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [sendEmail, setSendEmail] = useState(true);

    useEffect(() => {
        if (isOpen && consolidacionId && bodegaId) {
            fetchData();
        } else {
            resetState();
        }
    }, [isOpen, consolidacionId, bodegaId]);

    const resetState = () => {
        setAgrupados([]);
        setTarifas([]);
        setSendEmail(true);
    };

    const fetchData = async () => {
        setLoadingData(true);
        try {
            // 1. Obtener las tarifas activas de la bodega de esta consolidación
            const { data: tarifasData, error: tarifasError } = await supabase
                .from('tarifas')
                .select('id, nombre_servicio, tarifa_q, tipo_cobro, peso_min_lbs, peso_max_lbs')
                .eq('bodega_id', bodegaId)
                .eq('activa', true)
                .order('peso_min_lbs', { ascending: true });

            if (tarifasError) throw tarifasError;
            const fetchedTarifas = (tarifasData || []) as Tarifa[];
            setTarifas(fetchedTarifas);

            // 2. Obtener los IDs de los paquetes de la consolidacion
            const { data: pivotData, error: pivotError } = await supabase
                .from('consolidacion_paquetes')
                .select('paquete_id')
                .eq('consolidacion_id', consolidacionId);

            if (pivotError) throw pivotError;
            if (!pivotData || pivotData.length === 0) {
                setAgrupados([]);
                setLoadingData(false);
                return;
            }

            const packageIds = pivotData.map(p => p.paquete_id);

            // 3. Obtener los paquetes completos con cliente y peso
            const { data: paquetesData, error: paqError } = await supabase
                .from('paquetes')
                .select('id, peso_lbs, cliente_id, clientes(id, nombre, apellido, locker_id, email)')
                .in('id', packageIds);

            if (paqError) throw paqError;

            // 4. Agrupar por Cliente
            const gruposMap = new Map<string, ClienteAgrupado>();

            (paquetesData as any[]).forEach((paq) => {
                if (!paq.cliente_id || !paq.clientes) return; // Ignorar paquetes huérfanos

                const cid = paq.cliente_id;
                if (!gruposMap.has(cid)) {
                    gruposMap.set(cid, {
                        cliente: paq.clientes,
                        paquetes: [],
                        totalLbs: 0,
                        tarifaAplicada: null,
                        totalQ: 0
                    });
                }

                const grupo = gruposMap.get(cid)!;
                grupo.paquetes.push(paq);
                grupo.totalLbs += (Number(paq.peso_lbs) || 0); // sumar peso
            });

            // 5. Aplicar tarifas y calculo a cada grupo
            const gruposArr = Array.from(gruposMap.values()).map(grupo => {
                // Lógica de cálculo: buscar la tarifa que encaje con su peso
                // Opcional: Para simplificar, si el tipo cobro es 'por_libra', multiplicar tarifa_q * totalLbs.
                let t_aplicada: Tarifa | null = null;
                let t_costo = 0;

                if (fetchedTarifas.length > 0) {
                    // Tratar de encontrar la tarifa por escalón de peso
                    t_aplicada = fetchedTarifas.find(t =>
                        grupo.totalLbs >= t.peso_min_lbs &&
                        (t.peso_max_lbs === null || grupo.totalLbs <= t.peso_max_lbs)
                    ) || fetchedTarifas[0]; // Fallback a la primera si nada calza

                    if (t_aplicada.tipo_cobro === 'por_libra') {
                        t_costo = t_aplicada.tarifa_q * (grupo.totalLbs > 0 ? grupo.totalLbs : 1); // min 1 lb
                    } else if (t_aplicada.tipo_cobro === 'fijo') {
                        t_costo = t_aplicada.tarifa_q; // costo plano
                    } else if (t_aplicada.tipo_cobro === 'por_paquete') {
                        t_costo = t_aplicada.tarifa_q * grupo.paquetes.length;
                    }
                }

                return {
                    ...grupo,
                    tarifaAplicada: t_aplicada,
                    totalQ: t_costo
                };
            });

            setAgrupados(gruposArr);

        } catch (error) {
            console.error("Error cargando previsualización:", error);
            alert("Ocurrió un error leyendo los paquetes de la consolidación.");
        } finally {
            setLoadingData(false);
        }
    };

    const handleGenerate = async () => {
        if (agrupados.length === 0) return;
        setSaving(true);

        try {
            let processed = 0;

            // Recorrer cada cliente para generar su factura individual
            for (const grupo of agrupados) {
                // Solo generar si tiene costo > 0 (o modificar si gustan regalar factorías en cero)
                if (grupo.totalQ <= 0) continue;

                const numeroFactura = `FAC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                // 1. Crear Factura
                const resFactura = await supabase
                    .from('facturas')
                    .insert([{
                        numero: numeroFactura,
                        cliente_id: grupo.cliente.id,
                        consolidacion_id: consolidacionId, // enlazamos el origen
                        monto_subtotal: grupo.totalQ,
                        monto_total: grupo.totalQ,
                        estado: 'pendiente',
                        moneda: 'GTQ',
                        creado_por: user?.id,
                        notas: `Factura masiva por importación de ${grupo.paquetes.length} paquete(s) consolidado(s).`
                    }])
                    .select()
                    .single();

                if (resFactura.error) throw resFactura.error;
                const facturaNueva = resFactura.data;

                // 2. Crear un concepto agrupado. 
                // Optimizamos poniendo 1 concepto "Flete Internacional" en vez de 1 línea por caja si están consolidadas, 
                // o se puede crear un concepto por paquete si se desea desglosar. Aquí unificamos.
                const resConcepto = await supabase.from('conceptos_factura').insert([{
                    factura_id: facturaNueva.id,
                    descripcion: `Servicio de Logística (${grupo.tarifaAplicada?.nombre_servicio || 'Genérico'}) - ${grupo.totalLbs.toFixed(2)} lbs agrupadas.`,
                    cantidad: 1, // o grupo.totalLbs si quisiéramos detallar unitariamente
                    precio_unitario: grupo.totalQ,
                    subtotal: grupo.totalQ
                }]);

                if (resConcepto.error) throw resConcepto.error;

                // 3. Notificación
                if (sendEmail && grupo.cliente.email) {
                    await supabase.from('notificaciones').insert([{
                        cliente_id: grupo.cliente.id,
                        tipo: 'email',
                        asunto: `Nueva Factura Generada - Lote Consolidado`,
                        mensaje: `Hola ${grupo.cliente.nombre}, hemos generado tu factura ${numeroFactura} por procesar ${grupo.paquetes.length} paquete(s) por un monto de Q${grupo.totalQ.toFixed(2)}. Puedes revisar tu portal para realizar el pago.`,
                        estado: 'pendiente'
                    }]);
                }

                processed++;
            }

            alert(`¡Facturación Masiva Completada! Se generaron ${processed} facturas.`);
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            alert("Error al generar las facturas: " + error.message);
        } finally {
            setSaving(false);
        }
    };


    if (!isOpen) return null;

    const totalGlobal = agrupados.reduce((acc, g) => acc + g.totalQ, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-blue-600" />
                            Facturación Masiva por Consolidado
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Auto-cálculo agrupando paquetes y tarifas asociadas al origen</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50">
                    {loadingData ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                            <p className="text-sm font-semibold text-slate-600">Calculando e indexando paquetes...</p>
                        </div>
                    ) : agrupados.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-900 font-semibold">Consolidado sin paquetes.</p>
                            <p className="text-slate-500 text-sm">No hay paquetes asociados o los clientes no son legibles.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600"><Users className="h-6 w-6" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Clientes</p>
                                        <p className="text-2xl font-black text-slate-900">{agrupados.length}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="bg-sky-100 p-3 rounded-lg text-sky-600"><Package className="h-6 w-6" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Total Cajas</p>
                                        <p className="text-2xl font-black text-slate-900">{agrupados.reduce((a, g) => a + g.paquetes.length, 0)}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><Calculator className="h-6 w-6" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Facturación Bruta</p>
                                        <p className="text-2xl font-black text-slate-900">Q{totalGlobal.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla Previa */}
                            <div className="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Casillero y Cliente</th>
                                            <th className="px-4 py-3 font-semibold text-center">Cajas (Lbs)</th>
                                            <th className="px-4 py-3 font-semibold">Tarifa Sugerida</th>
                                            <th className="px-4 py-3 font-semibold text-right">Monto a Facturar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {agrupados.map((g, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-slate-900">{g.cliente.locker_id}</p>
                                                    <p className="text-xs text-slate-500">{g.cliente.nombre} {g.cliente.apellido}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <p className="font-medium text-slate-800">{g.paquetes.length} Pz</p>
                                                    <p className="text-xs text-slate-500">{g.totalLbs.toFixed(2)} Lbs</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {g.tarifaAplicada ? (
                                                        <>
                                                            <p className="font-medium text-slate-800 text-xs inline-flex items-center px-2 py-0.5 rounded-md bg-slate-200">{g.tarifaAplicada.nombre_servicio}</p>
                                                            <p className="text-[10px] text-slate-500 mt-1">Q{g.tarifaAplicada.tarifa_q} - {g.tarifaAplicada.tipo_cobro}</p>
                                                        </>
                                                    ) : (
                                                        <span className="text-red-500 text-xs font-medium">Asignación Manual Requerida</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-bold bg-green-100 text-green-800 px-2 py-1 rounded-md border border-green-200">
                                                        Q{g.totalQ.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="sendEmailBulk"
                            checked={sendEmail}
                            onChange={(e) => setSendEmail(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                        />
                        <label htmlFor="sendEmailBulk" className="text-sm text-slate-700 font-medium cursor-pointer">
                            Enviar avisos por correo
                        </label>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={saving || loadingData || agrupados.length === 0}
                            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? 'Generando recibos...' : 'Generar y Facturar Todo'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
