import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Calculator, Users, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { sendEmail } from '../../utils/sendEmail';

interface BulkInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    consolidacionId: string;
    bodegaId: string; // The origin warehouse of the consolidation
}

interface PaqueteDatos {
    id: string;
    tracking: string;
    peso_lbs: number;
    piezas: number;
    notas: string | null;
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
    // Per-package breakdown for display
    paquetesCosto: { paq: PaqueteDatos; tarifa: Tarifa | null; costo: number }[];
    tarifaAplicada: Tarifa | null; // fallback/primary tariff for display
    totalQ: number;
}

export function BulkInvoiceModal({ isOpen, onClose, onSuccess, consolidacionId, bodegaId }: BulkInvoiceModalProps) {
    const { user } = useAuth();
    const [loadingData, setLoadingData] = useState(false);
    const [saving, setSaving] = useState(false);

    const [agrupados, setAgrupados] = useState<ClienteAgrupado[]>([]);
    const [tarifas, setTarifas] = useState<Tarifa[]>([]);
    const [sendEmailFlag, setSendEmailFlag] = useState(true);

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
        setSendEmailFlag(true);
    };

    const fetchData = async () => {
        setLoadingData(true);
        try {
            // 1. Obtener las tarifas activas de la bodega de esta consolidación
            const { data: tarifasData, error: tarifasError } = await supabase
                .from('tarifas')
                .select('id, nombre_servicio, tarifa_q, tipo_cobro')
                .eq('bodega_id', bodegaId)
                .eq('activa', true);

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
            const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
            let paqQuery = supabase
                .from('paquetes')
                .select('id, tracking, peso_lbs, piezas, notas, cliente_id, clientes!inner(id, nombre, apellido, locker_id, email, sucursal_id)')
                .in('id', packageIds);

            if (!isSuperAdmin && user?.sucursal_id) {
                paqQuery = paqQuery.eq('clientes.sucursal_id', user.sucursal_id);
            }

            const { data: paquetesData, error: paqError } = await paqQuery;

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
                        paquetesCosto: [],
                        tarifaAplicada: null,
                        totalQ: 0
                    });
                }

                const grupo = gruposMap.get(cid)!;
                grupo.paquetes.push(paq);
                grupo.totalLbs += (Number(paq.peso_lbs) || 0);
            });

            // Helper: extract empaque type from notas
            const getEmpaque = (notas: string | null): string | null => {
                if (!notas) return null;
                const m = notas.match(/\[Empaque:\s*([^\]]+)\]/);
                return m ? m[1].trim().toLowerCase() : null;
            };

            // Helper: find matching tariff for a package
            const findTariffForPack = (paq: PaqueteDatos, allTarifas: Tarifa[]): { tarifa: Tarifa | null; costo: number } => {
                if (allTarifas.length === 0) return { tarifa: null, costo: 0 };
                const empaque = getEmpaque(paq.notas);
                if (empaque && empaque !== 'libra') {
                    // Try to match "Shein Bolsa", "Shein Sobre", "Shein Caja" etc.
                    const matched = allTarifas.find(t =>
                        t.nombre_servicio.toLowerCase().includes(empaque)
                    );
                    if (matched) {
                        // por_paquete: tarifa_q × 1 package
                        const costo = matched.tipo_cobro === 'por_libra'
                            ? matched.tarifa_q * (Number(paq.peso_lbs) || 1)
                            : matched.tarifa_q; // fijo or por_paquete
                        return { tarifa: matched, costo };
                    }
                }
                // Fallback: por_libra (Flete General)
                const libraT = allTarifas.find(t => t.tipo_cobro === 'por_libra') || allTarifas[0];
                const costo = libraT.tipo_cobro === 'por_libra'
                    ? libraT.tarifa_q * (Number(paq.peso_lbs) > 0 ? Number(paq.peso_lbs) : 1)
                    : libraT.tarifa_q;
                return { tarifa: libraT, costo };
            };

            // 5. Aplicar tarifas y calculo a cada grupo
            const gruposArr = Array.from(gruposMap.values()).map(grupo => {
                // Per-package cost calculation using empaque type from notas
                const paquetesCosto = grupo.paquetes.map(paq => {
                    const { tarifa, costo } = findTariffForPack(paq, fetchedTarifas);
                    return { paq, tarifa, costo };
                });

                const totalQ = paquetesCosto.reduce((s, x) => s + x.costo, 0);
                // Primary tariff for display = most-used in this group
                const tarifaAplicada = paquetesCosto[0]?.tarifa || null;

                return {
                    ...grupo,
                    paquetesCosto,
                    tarifaAplicada,
                    totalQ
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

                const numeroFactura = `FAC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
                        creado_por: user?.id?.includes('-') && user.id.length > 15 ? user.id : null,
                        notas: `Factura masiva por importación de ${grupo.paquetes.length} paquete(s) consolidado(s).`
                    }])
                    .select()
                    .single();

                if (resFactura.error) throw resFactura.error;
                const facturaNueva = resFactura.data;

                // 2. Crear un concepto agrupado. 
                // Extraemos los trackings para agregarlos a la descripcion
                const trackingsStr = grupo.paquetes.map(p => p.tracking).filter(Boolean).join(', ');
                // Build per-package breakdown for the concepto description
                const detalle = grupo.paquetesCosto.map(({ paq, tarifa, costo }) =>
                    `${paq.tracking} → ${tarifa?.nombre_servicio || 'Genérico'} Q${costo.toFixed(2)}`
                ).join(' | ');
                const resConcepto = await supabase.from('conceptos_factura').insert([{
                    factura_id: facturaNueva.id,
                    descripcion: `Logística Consolidado — ${grupo.paquetes.length} paq, ${grupo.totalLbs.toFixed(2)} lbs. Detalle: ${detalle}`,
                    cantidad: 1,
                    precio_unitario: grupo.totalQ,
                    subtotal: grupo.totalQ
                }]);

                if (resConcepto.error) throw resConcepto.error;

                // 3. Notificación via Resend API
                if (sendEmailFlag && grupo.cliente.email) {
                    const emailHtml = `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                        <h2 style="color: #2563eb;">Factura por Consolidación 🧾</h2>
                        <p>Hola <strong>${grupo.cliente.nombre}</strong>,</p>
                        <p>Hemos generado tu factura <strong>(${numeroFactura})</strong> correspondiente al procesamiento de <strong>${grupo.paquetes.length} paquete(s)</strong> de importación.</p>
                        <p>El total a pagar es de <strong>Q${grupo.totalQ.toFixed(2)}</strong>.</p>
                        <p style="margin-top: 15px;">Recuerda que puedes revisar los detalles y pagar desde tu portal de cliente en Youbox GT.</p>
                        <p style="color: #64748b; font-size: 12px; margin-top: 30px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                      </div>
                    `;

                    await sendEmail({
                        to: grupo.cliente.email,
                        subject: `Factura ${numeroFactura} de Importación - Youbox GT`,
                        html: emailHtml
                    });
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
                                                    {/* Per-package tariff breakdown */}
                                                    <div className="space-y-1">
                                                        {g.paquetesCosto.map(({ paq, tarifa, costo }, pi) => (
                                                            <div key={pi} className="flex items-center gap-1.5 text-xs">
                                                                <span className="font-mono text-slate-500 truncate max-w-[90px]" title={paq.tracking}>{paq.tracking?.slice(-8)}</span>
                                                                <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{tarifa?.nombre_servicio || 'Genérico'}</span>
                                                                <span className="text-emerald-700 font-bold">Q{costo.toFixed(0)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
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
                            checked={sendEmailFlag}
                            onChange={(e) => setSendEmailFlag(e.target.checked)}
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
