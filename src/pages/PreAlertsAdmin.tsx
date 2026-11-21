import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, Search, FileText, CheckCircle2, Clock, XCircle, DollarSign, HandCoins, PlusCircle, Loader2, Upload, Pencil, Download, Calendar, AlertCircle, ShieldCheck, Copy, Check, User, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Building2, Package, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export function PreAlertsAdmin() {
    const { user } = useAuth();
    const [prealertas, setPrealertas] = useState<any[]>([]);
    const [paquetesMap, setPaquetesMap] = useState<Map<string, { peso_lbs: number; estado: string }>>(new Map());
    const [fondoTotal, setFondoTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('todas');

    // Admin manage modal
    const [selectedPrealerta, setSelectedPrealerta] = useState<any | null>(null);
    const [procesando, setProcesando] = useState(false);

    // --- NEW: Manual pre-alert creation state ---
    const [showNewModal, setShowNewModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTracking, setNewTracking] = useState('');
    const [newBodegaId, setNewBodegaId] = useState('');
    const [newValorFactura, setNewValorFactura] = useState('');
    const [newConSeguro, setNewConSeguro] = useState(false);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [bodegas, setBodegas] = useState<any[]>([]);

    // Client search for new modal
    const [newClientSearch, setNewClientSearch] = useState('');
    const [newClientResults, setNewClientResults] = useState<any[]>([]);
    const [newSelectedClient, setNewSelectedClient] = useState<any | null>(null);
    const [searchingClient, setSearchingClient] = useState(false);
    const [showClientDrop, setShowClientDrop] = useState(false);
    const clientSearchRef = useRef<NodeJS.Timeout>();

    // --- EDIT modal state ---
    const [editPrealerta, setEditPrealerta] = useState<any | null>(null);
    const [editTracking, setEditTracking] = useState('');
    const [editBodegaId, setEditBodegaId] = useState('');
    const [editValor, setEditValor] = useState('');
    const [editConSeguro, setEditConSeguro] = useState(false);
    const [editSaving, setEditSaving] = useState(false);

    // --- EXPORT modal state ---
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exporting, setExporting] = useState(false);

    // --- DEBIT modal state ---
    const [showDebitModal, setShowDebitModal] = useState(false);
    const [debitMonto, setDebitMonto] = useState('');
    const [debitDescripcion, setDebitDescripcion] = useState('');
    const [debitSaving, setDebitSaving] = useState(false);

    // --- EN BODEGA & WAREHOUSE PROCESSING state ---
    const [enBodegaSet, setEnBodegaSet] = useState<Set<string>>(new Set());
    const [warehousePrealerta, setWarehousePrealerta] = useState<any | null>(null);
    const [warehousePeso, setWarehousePeso] = useState('');
    const [warehouseNotas, setWarehouseNotas] = useState('');
    const [warehouseSaving, setWarehouseSaving] = useState(false);

    const toggleEnBodega = (id: string) => {
        setEnBodegaSet(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDesmarcar = async (p: any) => {
        // 1. Quitar de la selección de bodega inmediatamente
        setEnBodegaSet(prev => {
            const next = new Set(prev);
            next.delete(p.id);
            return next;
        });

        // 2. Si el estado operativo era 'recibido', restaurar a 'pendiente' en la base de datos
        if (p.estado === 'recibido') {
            try {
                const { error: updError } = await supabase
                    .from('prealertas')
                    .update({ estado: 'pendiente' })
                    .eq('id', p.id);
                if (updError) throw updError;
                fetchData();
            } catch (err) {
                console.error('Error desmarcando estado recibido:', err);
            }
        }
    };

    const handleProcessToWarehouse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehousePrealerta) return;
        const pesoNum = parseFloat(warehousePeso);
        if (isNaN(pesoNum) || pesoNum <= 0) {
            toast.error('Por favor ingresa un peso válido en libras mayor a 0');
            return;
        }

        setWarehouseSaving(true);
        try {
            const p = warehousePrealerta;
            const cleanTracking = p.tracking.trim().toUpperCase();

            // 1. Verificar si ya existe en 'paquetes'
            const { data: existingPkg, error: checkError } = await supabase
                .from('paquetes')
                .select('id, peso_lbs, estado')
                .eq('tracking', cleanTracking)
                .maybeSingle();

            if (checkError) console.warn('Check error:', checkError);

            if (existingPkg) {
                const { error: updError } = await supabase
                    .from('paquetes')
                    .update({
                        peso_lbs: pesoNum,
                        estado: 'en_bodega',
                        cliente_id: p.cliente_id || existingPkg.cliente_id,
                        bodega_id: p.bodega_id || existingPkg.bodega_id,
                        notas: warehouseNotas.trim() || undefined
                    })
                    .eq('id', existingPkg.id);
                if (updError) throw updError;
            } else {
                const { error: insError } = await supabase
                    .from('paquetes')
                    .insert({
                        tracking: cleanTracking,
                        cliente_id: p.cliente_id,
                        bodega_id: p.bodega_id || bodegas[0]?.id || null,
                        peso_lbs: pesoNum,
                        piezas: 1,
                        estado: 'en_bodega',
                        notas: warehouseNotas.trim() || `Ingresado desde Pre-alerta.${p.con_seguro ? ' (Con seguro)' : ' (Sin seguro)'}`,
                        usuario_recepcion: user?.id === 'admin-001' ? null : user?.id
                    });
                if (insError) throw insError;
            }

            // 2. Actualizar estado de prealerta a 'procesada'
            const { error: preError } = await supabase
                .from('prealertas')
                .update({ estado: 'procesada' })
                .eq('id', p.id);
            if (preError) throw preError;

            // 3. Actualizar mapa local de pesos y marcar en bodega
            setPaquetesMap(prev => {
                const next = new Map(prev);
                next.set(cleanTracking, { peso_lbs: pesoNum, estado: 'en_bodega' });
                return next;
            });
            setEnBodegaSet(prev => {
                const next = new Set(prev);
                next.delete(p.id);
                return next;
            });

            toast.success(`¡Tracking ${cleanTracking} procesado a Warehouse con ${pesoNum} lbs!`);
            setWarehousePrealerta(null);
            fetchData();
        } catch (err: any) {
            console.error('Error procesando a warehouse:', err);
            toast.error('Error al procesar a warehouse: ' + (err.message || ''));
        } finally {
            setWarehouseSaving(false);
        }
    };

    // --- INSURANCE PAYMENT modal state ---
    const [paymentPrealerta, setPaymentPrealerta] = useState<any | null>(null);
    const [pagoMetodo, setPagoMetodo] = useState('transferencia');
    const [pagoReferencia, setPagoReferencia] = useState('');
    const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0]);
    const [pagoMonto, setPagoMonto] = useState('');
    const [pagoNotas, setPagoNotas] = useState('');
    const [guardandoPago, setGuardandoPago] = useState(false);

    const openPaymentModal = (p: any) => {
        setPaymentPrealerta(p);
        setPagoMetodo('transferencia');
        setPagoReferencia('');
        setPagoFecha(new Date().toISOString().split('T')[0]);
        setPagoMonto(String(p.monto_seguro || (p.valor_factura * 0.05).toFixed(2)));
        setPagoNotas('');
    };

    const openEdit = (p: any) => {
        setEditPrealerta(p);
        setEditTracking(p.tracking || '');
        setEditBodegaId(p.bodega_id || '');
        setEditValor(String(p.valor_factura || ''));
        setEditConSeguro(!!p.con_seguro);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPrealerta) return;
        setEditSaving(true);
        try {
            const valorNum = parseFloat(editValor);
            const montoSeguro = editConSeguro ? parseFloat((valorNum * 0.05).toFixed(2)) : 0;
            const { error } = await supabase.from('prealertas').update({
                tracking: editTracking.trim().toUpperCase(),
                bodega_id: editBodegaId || null,
                valor_factura: valorNum,
                con_seguro: editConSeguro,
                monto_seguro: montoSeguro,
            }).eq('id', editPrealerta.id);
            if (error) throw error;
            setEditPrealerta(null);
            fetchData();
        } catch (err: any) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setEditSaving(false);
        }
    };

    const handleExportExcel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exportStartDate || !exportEndDate) {
            alert('Por favor selecciona ambas fechas.');
            return;
        }
        setExporting(true);
        try {
            const start = new Date(exportStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(exportEndDate);
            end.setHours(23, 59, 59, 999);

            const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
            let query = supabase
                .from('prealertas')
                .select(`
                    *,
                    clientes!inner (
                        nombre,
                        apellido,
                        locker_id,
                        sucursal_id
                    ),
                    bodegas (
                        nombre
                    ),
                    fondo_seguros (
                        id,
                        monto_ingreso,
                        metodo_pago,
                        referencia,
                        created_at
                    )
                `)
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString())
                .order('created_at', { ascending: false });

            if (!isSuperAdmin && user?.sucursal_id) {
                query = query.eq('clientes.sucursal_id', user.sucursal_id);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                alert('No hay pre-alertas en este rango de fechas.');
                setExporting(false);
                return;
            }

            const dataToExport = data.map(p => {
                const pago = p.fondo_seguros && p.fondo_seguros.length > 0 ? p.fondo_seguros[0] : null;
                const estadoPago = !p.con_seguro ? 'No Aplica' : (pago ? 'PAGADO' : 'PENDIENTE DE PAGO');
                return {
                    Fecha: format(new Date(p.created_at), "dd/MM/yyyy HH:mm"),
                    Casillero: p.clientes?.locker_id || '',
                    Cliente: `${p.clientes?.nombre || ''} ${p.clientes?.apellido || ''}`,
                    Tracking: p.tracking,
                    Bodega: p.bodegas?.nombre || 'N/A',
                    'Valor Declarado ($)': p.valor_factura || 0,
                    'Seguro Solicitado': p.con_seguro ? 'Sí' : 'No',
                    'Monto Seguro ($)': p.monto_seguro || 0,
                    'Estado Pago Seguro': estadoPago,
                    'Método Pago Seguro': pago?.metodo_pago || 'N/A',
                    'Referencia Pago': pago?.referencia || (p.con_seguro && !pago ? 'Debe Seguro' : 'N/A'),
                    'Estado Operativo': p.estado
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Pre-Alertas');
            XLSX.writeFile(workbook, `PreAlertas_${exportStartDate}_al_${exportEndDate}.xlsx`);
            
            setShowExportModal(false);
        } catch (err: any) {
            alert('Error exportando: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Prealertas
            const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
            let query = supabase
                .from('prealertas')
                .select(`
          *,
          clientes!inner (
            nombre,
            apellido,
            locker_id,
            sucursal_id
          ),
          bodegas (
            nombre
          ),
          fondo_seguros (
            id,
            monto_ingreso,
            metodo_pago,
            referencia,
            created_at,
            fecha_ingreso,
            verificado_por
          )
        `)
                .order('created_at', { ascending: false });

            if (!isSuperAdmin && user?.sucursal_id) {
                query = query.eq('clientes.sucursal_id', user.sucursal_id);
            }

            const { data: prealertaData, error: pError } = await query;

            if (pError) throw pError;
            setPrealertas(prealertaData || []);

            // Mapear pesos de paquetes si ya fueron recibidos/pesados en almacén
            if (prealertaData && prealertaData.length > 0) {
                try {
                    const trackings = prealertaData.map((p: any) => p.tracking).filter(Boolean);
                    const map = new Map<string, { peso_lbs: number; estado: string }>();
                    for (let i = 0; i < Math.min(trackings.length, 300); i += 100) {
                        const batch = trackings.slice(i, i + 100);
                        const { data: pkgs } = await supabase
                            .from('paquetes')
                            .select('tracking, peso_lbs, estado')
                            .in('tracking', batch);
                        if (pkgs) {
                            pkgs.forEach((pkg: any) => {
                                if (pkg.tracking) {
                                    map.set(pkg.tracking.toUpperCase(), {
                                        peso_lbs: pkg.peso_lbs || 0,
                                        estado: pkg.estado
                                    });
                                }
                            });
                        }
                    }
                    setPaquetesMap(map);
                } catch (pkgErr) {
                    console.warn('Error fetching package weights:', pkgErr);
                }
            }

            // Fetch Fondo Sum
            const { data: fondoData, error: fError } = await supabase
                .from('fondo_seguros')
                .select('monto_ingreso');

            if (fError) throw fError;

            const total = fondoData?.reduce((acc, obj) => acc + Number(obj.monto_ingreso), 0) || 0;
            setFondoTotal(total);

            // Fetch Bodegas for new modal
            const { data: bodegaData } = await supabase.from('bodegas').select('id, nombre').eq('activo', true);
            setBodegas(bodegaData || []);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Cambio de estado operativo independiente (NO cobra seguro automáticamente)
    const handleProcesar = async (prealerta: any, estadoDestino: string) => {
        try {
            setProcesando(true);

            const { error: updError } = await supabase
                .from('prealertas')
                .update({ estado: estadoDestino })
                .eq('id', prealerta.id);

            if (updError) throw updError;

            setSelectedPrealerta(null);
            fetchData();

        } catch (err: any) {
            console.error('Error procesando estado operativo:', err);
            alert('Error al procesar: ' + (err.message || err.details || JSON.stringify(err)));
        } finally {
            setProcesando(false);
        }
    };

    // Registrar cobro real de seguro
    const handleGuardarPagoSeguro = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentPrealerta) return;
        const montoNum = parseFloat(pagoMonto);
        if (isNaN(montoNum) || montoNum <= 0) {
            alert('Ingresa un monto válido mayor a 0.');
            return;
        }
        if (!pagoReferencia.trim()) {
            alert('Ingresa el número de referencia o boleta de pago.');
            return;
        }

        setGuardandoPago(true);
        try {
            const fechaISO = pagoFecha ? new Date(pagoFecha + 'T12:00:00').toISOString() : new Date().toISOString();
            const { data: newPago, error: pagoErr } = await supabase
                .from('fondo_seguros')
                .insert({
                    prealerta_id: paymentPrealerta.id,
                    monto_ingreso: montoNum,
                    metodo_pago: pagoMetodo,
                    referencia: pagoReferencia.trim(),
                    fecha_ingreso: fechaISO,
                    verificado_por: user?.id === 'admin-001' ? null : user?.id
                })
                .select()
                .single();

            if (pagoErr) throw pagoErr;

            // Generar recibo oficial con los datos del pago
            try {
                generateInsuranceReceipt(paymentPrealerta, {
                    metodo: pagoMetodo,
                    referencia: pagoReferencia.trim(),
                    fecha: fechaISO,
                    monto: montoNum
                });
            } catch (pErr) {
                console.error("Error generando PDF de recibo:", pErr);
            }

            setPaymentPrealerta(null);
            if (selectedPrealerta && selectedPrealerta.id === paymentPrealerta.id) {
                setSelectedPrealerta(null);
            }
            fetchData();
        } catch (err: any) {
            console.error('Error registrando pago de seguro:', err);
            alert('Error al registrar pago de seguro: ' + err.message);
        } finally {
            setGuardandoPago(false);
        }
    };

    // Anular pago de seguro en caso de error
    const handleAnularPagoSeguro = async (prealerta: any, fondoId: string) => {
        if (!window.confirm(`¿Estás seguro de anular el pago de seguro para el tracking ${prealerta.tracking}? Esta acción revertirá el fondo y marcará el seguro como pendiente de cobro.`)) {
            return;
        }
        try {
            setProcesando(true);
            const { error: delErr } = await supabase
                .from('fondo_seguros')
                .delete()
                .eq('id', fondoId);

            if (delErr) throw delErr;

            if (selectedPrealerta && selectedPrealerta.id === prealerta.id) {
                setSelectedPrealerta(null);
            }
            fetchData();
        } catch (err: any) {
            console.error('Error anulando pago:', err);
            alert('Error al anular pago: ' + err.message);
        } finally {
            setProcesando(false);
        }
    };

    const generateInsuranceReceipt = (prealerta: any, pagoDetails?: any) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a5' });
        const W = doc.internal.pageSize.getWidth();

        // ── Background header band ──────────────────────────
        doc.setFillColor(30, 64, 175); // blue-800
        doc.rect(0, 0, W, 38, 'F');

        // Logo text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('YOUBOX GT', W / 2, 15, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Recibo de Seguro de Paquete', W / 2, 22, { align: 'center' });
        doc.text('youboxgt.com', W / 2, 30, { align: 'center' });

        // ── Receipt box ─────────────────────────────────────
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(10, 44, W - 20, 30, 3, 3, 'F');
        doc.setTextColor(15, 118, 110); // teal-700
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PÓLIZA ACTIVA — SEGURO CUBIERTO', W / 2, 54, { align: 'center' });
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(22);
        const montoFinal = pagoDetails?.monto || prealerta.monto_seguro || (prealerta.valor_factura * 0.05);
        doc.text(`$${Number(montoFinal).toFixed(2)}`, W / 2, 66, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Prima de seguro pagada (USD)', W / 2, 72, { align: 'center' });

        // ── Details table ───────────────────────────────────
        const rows = [
            ['Tracking', prealerta.tracking],
            ['Cliente', `${prealerta.clientes?.locker_id || ''} – ${prealerta.clientes?.nombre || ''} ${prealerta.clientes?.apellido || ''}`],
            ['Bodega', prealerta.bodegas?.nombre || 'N/A'],
            ['Valor Declarado', `$${Number(prealerta.valor_factura).toFixed(2)} USD`],
            ['Cobertura Máxima', `$${Number(prealerta.valor_factura).toFixed(2)} USD`],
            ['Método de Pago', (pagoDetails?.metodo_pago || pagoDetails?.metodo || 'Transferencia').toUpperCase()],
            ['Referencia / Boleta', pagoDetails?.referencia || 'Pago verificado'],
            ['Fecha de Pago', pagoDetails?.created_at || pagoDetails?.fecha ? format(new Date(pagoDetails?.fecha || pagoDetails?.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es }) : format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })],
            ['Aprobado por', user?.nombre || 'Admin'],
        ];

        let y = 82;
        rows.forEach(([label, value], i) => {
            if (i % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(10, y - 4, W - 20, 8, 'F');
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(label + ':', 14, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(String(value), 60, y);
            y += 8;
        });

        // ── Footer ──────────────────────────────────────────
        doc.setFillColor(30, 64, 175);
        doc.rect(0, doc.internal.pageSize.getHeight() - 16, W, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Este recibo es prueba de pago del seguro de tu paquete con YouBox GT.', W / 2, doc.internal.pageSize.getHeight() - 9, { align: 'center' });
        doc.text('Guárdalo para cualquier reclamo. www.youboxgt.com | info@youboxgt.com', W / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });

        doc.save(`Recibo_Seguro_${prealerta.tracking}.pdf`);
    };

    // --- Client search for new modal ---
    const handleNewClientSearch = (text: string) => {
        setNewClientSearch(text);
        setNewSelectedClient(null);
        if (!text) { setNewClientResults([]); setShowClientDrop(false); return; }
        if (clientSearchRef.current) clearTimeout(clientSearchRef.current);
        setShowClientDrop(true);
        setSearchingClient(true);
        clientSearchRef.current = setTimeout(async () => {
            try {
                const isSuperAdmin = user?.role === 'admin' && !user?.sucursal_id;
                let clientQuery = supabase
                    .from('clientes')
                    .select('id, nombre, apellido, locker_id')
                    .or(`locker_id.ilike.%${text}%,nombre.ilike.%${text}%,apellido.ilike.%${text}%`)
                    .order('locker_id')
                    .limit(20);

                if (!isSuperAdmin && user?.sucursal_id) {
                    clientQuery = clientQuery.eq('sucursal_id', user.sucursal_id);
                }

                const { data } = await clientQuery;
                setNewClientResults(data || []);
            } finally {
                setSearchingClient(false);
            }
        }, 400);
    };

    const selectNewClient = (c: any) => {
        setNewSelectedClient(c);
        setNewClientSearch(`${c.locker_id} - ${c.nombre} ${c.apellido}`);
        setShowClientDrop(false);
    };

    const resetNewModal = () => {
        setNewTracking('');
        setNewBodegaId('');
        setNewValorFactura('');
        setNewConSeguro(false);
        setNewClientSearch('');
        setNewSelectedClient(null);
        setNewClientResults([]);
        setNewFile(null);
    };

    const handleCreatePrealerta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSelectedClient) { alert('Selecciona un cliente.'); return; }
        if (!newTracking.trim()) { alert('El tracking es requerido.'); return; }
        if (!newValorFactura || isNaN(Number(newValorFactura))) { alert('Ingresa un valor de factura válido.'); return; }

        setSaving(true);
        try {
            const cleanTracking = newTracking.trim().toUpperCase();
            
            // Check if tracking already exists
            const { data: existingPrealerta, error: checkError } = await supabase
                .from('prealertas')
                .select('id')
                .eq('tracking', cleanTracking)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingPrealerta) {
                alert('Este tracking ya ha sido pre-alertado anteriormente.');
                setSaving(false);
                return;
            }

            let facturaUrl = null;

            // 1. Upload file if exists
            if (newFile) {
                const fileExt = newFile.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `manuales/${newSelectedClient.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('prealertas')
                    .upload(filePath, newFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('prealertas')
                    .getPublicUrl(filePath);

                facturaUrl = publicUrl;
            }

            const valorNum = parseFloat(newValorFactura);
            const montoSeguro = newConSeguro ? parseFloat((valorNum * 0.05).toFixed(2)) : 0;

            const { error } = await supabase.from('prealertas').insert({
                cliente_id: newSelectedClient.id,
                tracking: newTracking.trim().toUpperCase(),
                bodega_id: newBodegaId || null,
                valor_factura: valorNum,
                con_seguro: newConSeguro,
                monto_seguro: montoSeguro,
                estado: 'pendiente',
                factura_url: facturaUrl,
            });

            if (error) throw error;

            setShowNewModal(false);
            resetNewModal();
            fetchData();
        } catch (err: any) {
            console.error('Error creating prealerta:', err);
            alert('Error al crear la pre-alerta: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Cálculos de deuda y seguros
    const segurosPorCobrar = prealertas.filter(p => p.con_seguro === true && (!p.fondo_seguros || p.fondo_seguros.length === 0));
    const totalDeudaSeguros = segurosPorCobrar.reduce((acc, p) => acc + Number(p.monto_seguro || 0), 0);
    const segurosPagados = prealertas.filter(p => p.con_seguro === true && p.fondo_seguros && p.fondo_seguros.length > 0);

    const filteredData = prealertas.filter(p => {
        const matchesSearch = p.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientes?.locker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

        const hasPago = p.fondo_seguros && p.fondo_seguros.length > 0;

        let matchesFilter = true;
        if (filterMode === 'procesadas') matchesFilter = p.estado === 'procesada';
        else if (filterMode === 'recibidas') matchesFilter = p.estado === 'recibido';
        else if (filterMode === 'por cobrar seguro') matchesFilter = p.con_seguro === true && !hasPago;
        else if (filterMode === 'seguros pagados') matchesFilter = p.con_seguro === true && hasPago;
        else if (filterMode === 'con seguro') matchesFilter = p.con_seguro === true;
        else if (filterMode === 'greensboro') matchesFilter = p.estado === 'pendiente' && p.bodegas?.nombre?.toLowerCase().includes('greensboro');
        else if (filterMode === 'tapachula') matchesFilter = p.estado === 'pendiente' && p.bodegas?.nombre?.toLowerCase().includes('tapachula');
        else if (filterMode === 'laredo') matchesFilter = p.estado === 'pendiente' && p.bodegas?.nombre?.toLowerCase().includes('laredo');

        return matchesSearch && matchesFilter;
    });

    // Paginación y control de interfaz ordenada
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterMode]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const handleCopyTracking = (id: string, tracking: string) => {
        navigator.clipboard.writeText(tracking);
        setCopiedTrackingId(id);
        setTimeout(() => setCopiedTrackingId(null), 2000);
    };

    const getBodegaInfo = (bodegaNombre?: string) => {
        const name = (bodegaNombre || '').toLowerCase();
        if (name.includes('tapachula') || name.includes('mexico') || name.includes('méxico')) {
            return { label: `🇲🇽 Bodega México`, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
        }
        if (name.includes('laredo')) {
            return { label: `🇺🇸 Bodega Laredo`, color: 'bg-blue-50 text-blue-800 border-blue-200' };
        }
        if (name.includes('greensboro')) {
            return { label: `🇺🇸 Bodega Greensboro`, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
        }
        return { label: `🏢 Bodega ${bodegaNombre || 'General'}`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    };

    const getCleanFileName = (url?: string) => {
        if (!url) return '';
        try {
            const parts = url.split('/');
            const lastPart = parts[parts.length - 1];
            const clean = decodeURIComponent(lastPart.split('?')[0]);
            const match = clean.match(/^[a-z0-9]+_\d+_(.+)$/i);
            const name = match ? match[1] : clean;
            return name.length > 30 ? name.substring(0, 28) + '...' : name;
        } catch {
            return 'Documento';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Control de Pre-Alertas</h1>
                    <p className="text-sm text-slate-500 mt-1">Valida prealertas operativamente y gestiona el cobro del Fondo Fijo de Seguros.</p>
                </div>
                {/* CTA buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Exportar a Excel
                    </button>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Nueva Pre-Alerta
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Operativas Pendientes */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Pre-Alertas Pendientes</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">
                                {prealertas.filter(p => p.estado === 'pendiente').length}
                            </h3>
                        </div>
                        <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Pendientes de validación y recepción física.
                    </p>
                </div>

                {/* 2. Seguros Por Cobrar (Deuda) */}
                <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl p-6 border border-rose-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                Seguros Por Cobrar (Deuda)
                            </p>
                            <h3 className="text-3xl font-extrabold text-rose-900 mt-1">
                                $ {totalDeudaSeguros.toFixed(2)} USD
                            </h3>
                        </div>
                        <div className="h-11 w-11 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-rose-600/90 font-medium mt-1">
                        <b>{segurosPorCobrar.length}</b> paquete{segurosPorCobrar.length === 1 ? '' : 's'} con seguro pendiente de pago.
                    </p>
                </div>

                {/* 3. Fondo Fijo Cobrado */}
                <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-6 shadow-md relative overflow-hidden text-white">
                    <div className="absolute -right-6 -top-6 h-32 w-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-emerald-100 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                                Fondo Fijo Recaudado (Cobrado)
                            </p>
                            <h3 className="text-3xl font-bold mt-1">
                                $ {fondoTotal.toFixed(2)} USD
                            </h3>
                        </div>
                        <button 
                            onClick={() => setShowDebitModal(true)}
                            className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white backdrop-blur-sm cursor-pointer"
                            title="Debitar fondo por paquete extraviado"
                        >
                            <HandCoins className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-xs text-emerald-200/90 mt-1 relative z-10">
                        <b>{segurosPagados.length}</b> seguro{segurosPagados.length === 1 ? '' : 's'} verificado{segurosPagados.length === 1 ? '' : 's'} y depositado{segurosPagados.length === 1 ? '' : 's'} en el fondo.
                    </p>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                        {['Todas', 'Por Cobrar Seguro', 'Seguros Pagados', 'Con Seguro', 'Procesadas', 'Recibidas', 'Greensboro', 'Tapachula', 'Laredo'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterMode(f.toLowerCase())}
                                className={`px-4 py-1.5 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${filterMode === f.toLowerCase() ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {f}
                                {f === 'Por Cobrar Seguro' && segurosPorCobrar.length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                                        {segurosPorCobrar.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-80 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por tracking, cliente, casillero..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-shadow"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full min-w-[960px] text-left border-collapse table-auto">
                        <thead className="bg-slate-50/95 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="py-3 px-2 w-[70px] whitespace-nowrap text-center">1. Fecha</th>
                                <th className="py-3 px-2.5 w-[130px]">2. Cliente</th>
                                <th className="py-3 px-2.5 w-[180px] whitespace-nowrap">3. N° Guía</th>
                                <th className="py-3 px-2.5 min-w-[280px]">4. Descripción Organizada</th>
                                <th className="py-3 px-2.5 w-[155px] text-center whitespace-nowrap">5. Estado en Bodega</th>
                                <th className="py-3 px-2.5 w-[115px] text-right pr-4 whitespace-nowrap">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                        <span className="font-semibold text-sm">Cargando pre-alertas...</span>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                                        No hay prealertas que coincidan con la búsqueda o filtro seleccionado.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((p) => {
                                    const isPagado = p.con_seguro && p.fondo_seguros && p.fondo_seguros.length > 0;
                                    const pagoDetails = isPagado ? p.fondo_seguros[0] : null;
                                    const pkgInfo = paquetesMap.get(p.tracking?.toUpperCase());
                                    const isEnBodegaSelected = enBodegaSet.has(p.id);

                                    return (
                                        <tr key={p.id} className={`transition-all duration-150 border-b border-slate-200/80 align-top group ${
                                            isEnBodegaSelected
                                                ? 'bg-blue-50/80 hover:bg-blue-100/60 border-l-4 border-l-blue-600 shadow-xs'
                                                : 'bg-white hover:bg-slate-50/80'
                                        }`}>
                                            {/* 1. FECHA (Reducida y compacta) */}
                                            <td className="py-3 px-2 whitespace-nowrap text-center">
                                                <div className="text-xs font-bold text-slate-700">
                                                    {format(new Date(p.created_at), "dd/MM/yy")}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {format(new Date(p.created_at), "HH:mm")} hrs
                                                </div>
                                            </td>

                                            {/* 2. CLIENTE / CASILLERO */}
                                            <td className="py-3 px-2.5">
                                                <div className="flex items-center gap-1 font-bold text-slate-800 text-xs">
                                                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[115px]" title={`${p.clientes?.nombre || ''} ${p.clientes?.apellido || ''}`}>
                                                        {p.clientes?.nombre} {p.clientes?.apellido}
                                                    </span>
                                                </div>
                                                <div className="mt-1">
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                                                        {p.clientes?.locker_id || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 3. NÚMERO DE GUÍA (Tracking) */}
                                            <td className="py-3 px-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-mono font-bold text-blue-700 text-xs select-all">
                                                        {p.tracking}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyTracking(p.id, p.tracking)}
                                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                                                        title="Copiar tracking"
                                                    >
                                                        {copiedTrackingId === p.id ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(p)}
                                                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                                >
                                                    <Pencil className="w-2.5 h-2.5" />
                                                    Editar Guía
                                                </button>
                                            </td>

                                            {/* 4. DESCRIPCIÓN ORGANIZADA */}
                                            <td className="py-3 px-2.5">
                                                <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/90 space-y-1.5 text-xs shadow-xs">
                                                    {/* Fila 1: Badges principales en 1 sola fila organizada */}
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {/* Bodega */}
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs">
                                                            <MapPin className="w-3 h-3 text-blue-600" />
                                                            {p.bodegas?.nombre || 'General'}
                                                        </span>

                                                        {/* Valor Declarado */}
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                                                            💵 Valor: ${Number(p.valor_factura || 0).toFixed(2)}
                                                        </span>

                                                        {/* Peso Báscula integrado directamente aquí */}
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border shadow-xs ${
                                                            pkgInfo?.peso_lbs
                                                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                                        }`}>
                                                            ⚖️ {pkgInfo?.peso_lbs ? `${pkgInfo.peso_lbs} Lbs` : 'Sin Pesar'}
                                                        </span>

                                                        {/* Seguro */}
                                                        {p.con_seguro ? (
                                                            isPagado ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                                                                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                                                                    Seguro Pagado (${Number(p.monto_seguro || 0).toFixed(2)})
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs animate-pulse">
                                                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                                                    Debe Seguro: ${Number(p.monto_seguro || 0).toFixed(2)}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                                                                ⚠️ Sin Seguro
                                                            </span>
                                                        )}

                                                        {/* Firma / Renuncia Status */}
                                                        {!p.con_seguro ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-amber-800 bg-amber-50 border border-amber-200 font-medium">
                                                                ✍️ Renuncia Firmada
                                                            </span>
                                                        ) : isPagado ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 font-medium">
                                                                🛡️ Póliza Activa
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-rose-700 bg-rose-50 border border-rose-200 font-medium">
                                                                ⚠️ Póliza Por Cobrar
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Fila 2: Caja de Contenido */}
                                                    <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center gap-1.5 shadow-xs">
                                                        <span className="font-bold text-slate-800 shrink-0 text-[11px]">CONTENIDO:</span>
                                                        <span className="text-slate-600 font-medium truncate text-[11px]">
                                                            {p.contenido || p.descripcion || p.notas || 'PAQUETE PRE-ALERTADO (DECLARADO EN FACTURA)'}
                                                        </span>
                                                    </div>

                                                    {/* Fila 3: Documentos adjuntos limpios */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                        {p.factura_url ? (
                                                            <a
                                                                href={p.factura_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors shadow-xs"
                                                            >
                                                                <FileText className="w-3 h-3 text-blue-600" />
                                                                Ver Factura
                                                            </a>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 italic">Sin factura</span>
                                                        )}

                                                        {p.renuncia_url && (
                                                            <a
                                                                href={p.renuncia_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition-colors shadow-xs"
                                                            >
                                                                <Shield className="w-3 h-3 text-amber-600" />
                                                                Ver Firma / Renuncia
                                                            </a>
                                                        )}

                                                        {isPagado && (
                                                            <button
                                                                type="button"
                                                                onClick={() => generateInsuranceReceipt(p, pagoDetails)}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
                                                            >
                                                                <Download className="w-3 h-3 text-emerald-600" />
                                                                Recibo Seguro
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 5. ESTADO EN BODEGA */}
                                            <td className="py-3 px-2.5 whitespace-nowrap text-center">
                                                <div className="flex flex-col gap-1.5 items-center w-full min-w-[130px]">
                                                    {/* Si NO está seleccionado en bodega */}
                                                    {!isEnBodegaSelected ? (
                                                        <div className="flex flex-col gap-1.5 items-center w-full">
                                                            <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border shadow-xs ${
                                                                p.estado === 'procesada'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : p.estado === 'recibido'
                                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                    : p.estado === 'rechazada'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                                {p.estado === 'procesada' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                                                {p.estado === 'recibido' && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                                                                {p.estado === 'pendiente' && <Clock className="w-3 h-3 text-amber-600" />}
                                                                {p.estado === 'rechazada' && <XCircle className="w-3 h-3 text-rose-600" />}
                                                                {p.estado === 'procesada' ? 'En Almacén' : p.estado}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() => toggleEnBodega(p.id)}
                                                                className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50/70 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-xs transition-all active:scale-95 cursor-pointer"
                                                                title="Marcar que el paquete ya se encuentra en bodega"
                                                            >
                                                                <Building2 className="w-3 h-3 text-blue-600" />
                                                                Ya en Bodega
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        /* Si YA está seleccionado en bodega: se resalta la fila en azul suave y se activan los dos botones */
                                                        <div className="flex flex-col gap-1 items-center w-full bg-blue-100/60 p-1.5 rounded-xl border border-blue-200">
                                                            <div className="flex items-center justify-between w-full px-1">
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-800 uppercase tracking-wide">
                                                                    <Building2 className="w-3 h-3 text-blue-600" />
                                                                    En Bodega
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDesmarcar(p);
                                                                    }}
                                                                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 hover:text-rose-600 hover:underline cursor-pointer transition-colors"
                                                                    title="Quitar selección de bodega"
                                                                >
                                                                    <RotateCcw className="w-2.5 h-2.5" />
                                                                    Desmarcar
                                                                </button>
                                                            </div>

                                                            {/* Los dos botones activados al estar en bodega */}
                                                            <div className="flex flex-col gap-1 w-full mt-0.5">
                                                                {/* Botón 1: Recibido */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleProcesar(p, 'recibido')}
                                                                    disabled={procesando}
                                                                    className={`w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                                                        p.estado === 'recibido'
                                                                            ? 'bg-emerald-600 text-white shadow-sm'
                                                                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 active:scale-95'
                                                                    }`}
                                                                    title="Confirmar paquete como recibido"
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    {p.estado === 'recibido' ? '✓ Recibido' : 'Marcar Recibido'}
                                                                </button>

                                                                {/* Botón 2: Procesar a Warehouse (Ingresar peso) */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setWarehousePrealerta(p);
                                                                        setWarehousePeso(String(pkgInfo?.peso_lbs || ''));
                                                                        setWarehouseNotas('');
                                                                    }}
                                                                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                                                                    title="Ingresar peso de báscula y procesar al inventario de Warehouse"
                                                                >
                                                                    <Package className="w-3 h-3 text-white" />
                                                                    {pkgInfo?.peso_lbs ? 'Actualizar Peso' : 'Procesar Warehouse'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 6. ACCIÓN */}
                                            <td className="py-3 px-2.5 whitespace-nowrap text-right pr-4">
                                                <div className="flex flex-col gap-1 items-end justify-center min-w-[100px]">
                                                    {/* Botón Cobrar Seguro si tiene seguro pendiente de pago */}
                                                    {p.con_seguro && !isPagado && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openPaymentModal(p)}
                                                            className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                                            title="Registrar pago del seguro"
                                                        >
                                                            <DollarSign className="w-3 h-3" />
                                                            Cobrar Seguro
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(p)}
                                                        className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                                                        title="Editar datos de pre-alerta"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPrealerta(p)}
                                                        className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                                                    >
                                                        Administrar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredData.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/80 border-t border-slate-200">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                            <span>
                                Mostrando <b className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</b> - <b className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredData.length)}</b> de <b className="text-slate-800">{filteredData.length}</b> pre-alertas
                            </span>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1.5">
                                <span>Por página:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 py-1 px-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Primera página"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Página anterior"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs">
                                Pág. {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Página siguiente"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Última página"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Admin Validation Modal (SEPARADO: Operativo vs Cobro de Seguro) */}
            {
                selectedPrealerta && (() => {
                    const isPagado = selectedPrealerta.con_seguro && selectedPrealerta.fondo_seguros && selectedPrealerta.fondo_seguros.length > 0;
                    const pagoDetails = isPagado ? selectedPrealerta.fondo_seguros[0] : null;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPrealerta(null)} />
                            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                    <div>
                                        <h3 className="font-bold text-slate-800">Administrar Pre-Alerta</h3>
                                        <p className="text-xs text-slate-500">Gestión de estado y póliza de seguro</p>
                                    </div>
                                    <button onClick={() => setSelectedPrealerta(null)} className="text-slate-400 hover:text-slate-600">
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-5 overflow-y-auto">
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                                        <p className="text-xs text-slate-500 uppercase font-semibold">Tracking & Cliente</p>
                                        <p className="font-mono font-bold text-slate-800 break-all">{selectedPrealerta.tracking}</p>
                                        <p className="text-xs text-slate-600 font-medium">
                                            {selectedPrealerta.clientes?.locker_id} — {selectedPrealerta.clientes?.nombre} {selectedPrealerta.clientes?.apellido}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Bodega: <b>{selectedPrealerta.bodegas?.nombre || 'N/A'}</b> | Declarado: <b>${Number(selectedPrealerta.valor_factura).toFixed(2)} USD</b>
                                        </p>
                                    </div>

                                    {/* ── SECCIÓN 1: ESTADO FINANCIERO DEL SEGURO ── */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Póliza y Cobro del Seguro</p>
                                        {selectedPrealerta.con_seguro ? (
                                            isPagado ? (
                                                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                            Seguro Pagado y Verificado
                                                        </p>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">
                                                            ${Number(selectedPrealerta.monto_seguro).toFixed(2)} USD
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-emerald-800 space-y-0.5 bg-white/60 p-2.5 rounded-lg border border-emerald-100 font-mono">
                                                        <p><b>Método:</b> {pagoDetails.metodo_pago}</p>
                                                        <p><b>Referencia:</b> {pagoDetails.referencia || 'N/A'}</p>
                                                        <p><b>Fecha:</b> {format(new Date(pagoDetails.fecha_ingreso || pagoDetails.created_at), "dd/MM/yyyy HH:mm")}</p>
                                                    </div>
                                                    <div className="pt-2 flex gap-2">
                                                        <button
                                                            onClick={() => generateInsuranceReceipt(selectedPrealerta, pagoDetails)}
                                                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                                        >
                                                            <Download className="w-3.5 h-3.5" /> Descargar Recibo
                                                        </button>
                                                        <button
                                                            onClick={() => handleAnularPagoSeguro(selectedPrealerta, pagoDetails.id)}
                                                            disabled={procesando}
                                                            className="py-2 px-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                                                            title="Anular pago si hubo un error"
                                                        >
                                                            Anular Pago
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold text-rose-900 flex items-center gap-1.5 text-sm">
                                                            <AlertCircle className="w-4 h-4 text-rose-600" />
                                                            Seguro Pendiente de Cobro
                                                        </p>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                                                            Debe ${Number(selectedPrealerta.monto_seguro).toFixed(2)} USD
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-rose-700 leading-relaxed">
                                                        El cliente solicitó seguro de paquete, pero <b>aún no ha sido cobrado ni verificado</b> en la cuenta bancaria.
                                                    </p>
                                                    <button
                                                        onClick={() => openPaymentModal(selectedPrealerta)}
                                                        className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                                                    >
                                                        <DollarSign className="w-4 h-4" /> Registrar Pago del Seguro
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-500">
                                                Esta pre-alerta no tiene seguro contratado (renuncia legal firmada).
                                            </div>
                                        )}
                                    </div>

                                    {/* ── SECCIÓN 2: ESTADO OPERATIVO (INDEPENDIENTE) ── */}
                                    <div className="space-y-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Estado Operativo</p>
                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                                Actual: {selectedPrealerta.estado}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleProcesar(selectedPrealerta, 'procesada')}
                                                disabled={procesando}
                                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Validar / Procesar
                                            </button>
                                            <button
                                                onClick={() => handleProcesar(selectedPrealerta, 'recibido')}
                                                disabled={procesando}
                                                className="bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                                            >
                                                Marcar Recibido
                                            </button>
                                            <button
                                                onClick={() => handleProcesar(selectedPrealerta, 'rechazada')}
                                                disabled={procesando}
                                                className="col-span-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 focus:ring-4 focus:ring-rose-50 p-2 text-sm rounded-xl font-medium transition-all"
                                            >
                                                Rechazar Pre-Alerta
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400 text-center">
                                            ℹ️ Cambiar el estado operativo NO altera el pago del seguro. Ambos procesos están totalmente separados.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* ── MODAL DEDICADO: REGISTRAR PAGO DE SEGURO ── */}
            {
                paymentPrealerta && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !guardandoPago && setPaymentPrealerta(null)} />
                        <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                        <DollarSign className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base">Registrar Pago de Seguro</h3>
                                        <p className="text-xs text-emerald-100">Fondo Fijo de Protección</p>
                                    </div>
                                </div>
                                <button onClick={() => !guardandoPago && setPaymentPrealerta(null)} className="text-emerald-100 hover:text-white">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleGuardarPagoSeguro} className="p-6 space-y-4">
                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Tracking:</span>
                                        <span className="font-mono font-bold text-slate-800">{paymentPrealerta.tracking}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Cliente:</span>
                                        <span className="font-bold text-slate-800">{paymentPrealerta.clientes?.locker_id} – {paymentPrealerta.clientes?.nombre} {paymentPrealerta.clientes?.apellido}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Valor Declarado:</span>
                                        <span className="font-semibold text-slate-700">${Number(paymentPrealerta.valor_factura).toFixed(2)} USD</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                                        <span className="font-bold text-slate-700">Prima Seguro (5%):</span>
                                        <span className="font-extrabold text-emerald-600 text-base">${Number(paymentPrealerta.monto_seguro).toFixed(2)} USD</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Monto Cobrado (USD) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={pagoMonto}
                                            onChange={(e) => setPagoMonto(e.target.value)}
                                            className="w-full rounded-xl border-slate-300 pl-7 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm font-bold text-emerald-700"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago *</label>
                                    <select
                                        value={pagoMetodo}
                                        onChange={(e) => setPagoMetodo(e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm font-medium py-2 px-3"
                                    >
                                        <option value="transferencia">Transferencia Bancaria</option>
                                        <option value="deposito">Depósito Bancario</option>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="tarjeta">Link de Pago / Tarjeta</option>
                                        <option value="saldo_socio">Saldo Socio YouBox</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">No. de Boleta / Referencia Bancaria *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Transf. Banrural #894523"
                                        value={pagoReferencia}
                                        onChange={(e) => setPagoReferencia(e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 px-3"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha del Pago</label>
                                    <input
                                        type="date"
                                        required
                                        value={pagoFecha}
                                        onChange={(e) => setPagoFecha(e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 px-3"
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentPrealerta(null)}
                                        disabled={guardandoPago}
                                        className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={guardandoPago}
                                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {guardandoPago ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" /> Confirmar Cobro
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ── NEW MANUAL PRE-ALERT MODAL ── */}
            {
                showNewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowNewModal(false); resetNewModal(); }} />
                        <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-visible animate-in zoom-in-95">
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                        <PlusCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Nueva Pre-Alerta Manual</h3>
                                        <p className="text-xs text-slate-500">Registrar una pre-alerta en nombre de un cliente</p>
                                    </div>
                                </div>
                                <button onClick={() => { setShowNewModal(false); resetNewModal(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePrealerta} className="p-6 space-y-4 overflow-visible">
                                {/* Client search */}
                                <div className="relative">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cliente (Casillero) *</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar por casillero o nombre..."
                                            value={newClientSearch}
                                            onChange={e => handleNewClientSearch(e.target.value)}
                                            onBlur={() => setTimeout(() => setShowClientDrop(false), 200)}
                                            autoComplete="off"
                                            className={`block w-full rounded-xl py-2.5 pl-9 pr-4 text-sm font-semibold outline-none border transition-all ${newSelectedClient ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-slate-800'
                                                } focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500`}
                                        />
                                        {searchingClient && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
                                    </div>
                                    {showClientDrop && newClientResults.length > 0 && (
                                        <div className="absolute z-[200] w-full mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 max-h-48 overflow-auto">
                                            {newClientResults.map(c => (
                                                <div
                                                    key={c.id}
                                                    onMouseDown={e => { e.preventDefault(); selectNewClient(c); }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <span className="font-extrabold text-blue-700 text-xs bg-blue-100 px-2 py-1 rounded-lg">{c.locker_id}</span>
                                                    <span className="text-sm text-slate-700 font-semibold truncate">{c.nombre} {c.apellido}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tracking + Bodega */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tracking *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newTracking}
                                            onChange={e => setNewTracking(e.target.value)}
                                            placeholder="Ej: 1Z999AA10123456784"
                                            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bodega</label>
                                        <select
                                            value={newBodegaId}
                                            onChange={e => setNewBodegaId(e.target.value)}
                                            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                        >
                                            <option value="">Sin bodega</option>
                                            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Valor + Insurance toggle */}
                                <div className="grid grid-cols-2 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Valor Declarado ($) *</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            value={newValorFactura}
                                            onChange={e => setNewValorFactura(e.target.value)}
                                            placeholder="0.00"
                                            className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Seguro (5%)</label>
                                        <button
                                            type="button"
                                            onClick={() => setNewConSeguro(v => !v)}
                                            className={`w-full py-2 rounded-xl text-sm font-bold border transition-all ${newConSeguro
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                                                }`}
                                        >
                                            {newConSeguro ? `✓ Con seguro (+$${newValorFactura ? (parseFloat(newValorFactura) * 0.05).toFixed(2) : '0.00'})` : 'Sin seguro'}
                                        </button>
                                    </div>
                                </div>

                                {/* Invoice File Upload */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Factura (Imagen o PDF)</label>
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-white hover:border-blue-400 transition-all">
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <Upload className={`w-6 h-6 mb-1 ${newFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            <p className="text-xs text-slate-500 font-semibold truncate px-4 max-w-full">
                                                {newFile ? newFile.name : "Click para subir factura"}
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowNewModal(false); resetNewModal(); }}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || !newSelectedClient || !newTracking.trim()}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                        Crear Pre-Alerta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ── DEBIT MODAL ── */}
            {
                showDebitModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDebitModal(false)} />
                        <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">Debitar Fondo</h3>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reponer paquete extraviado</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDebitModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const numMonto = parseFloat(debitMonto);
                                if (isNaN(numMonto) || numMonto <= 0) {
                                    alert('Ingrese un monto válido a descontar.');
                                    return;
                                }
                                if (!debitDescripcion.trim()) {
                                    alert('Ingrese una descripción válida.');
                                    return;
                                }

                                setDebitSaving(true);
                                try {
                                    const { error: insError } = await supabase
                                        .from('fondo_seguros')
                                        .insert({
                                            prealerta_id: null,
                                            monto_ingreso: -numMonto,
                                            metodo_pago: 'efectivo',
                                            referencia: debitDescripcion.trim(),
                                            verificado_por: user?.id === 'admin-001' ? null : user?.id
                                        });
                                    if (insError) throw insError;
                                    
                                    setShowDebitModal(false);
                                    setDebitMonto('');
                                    setDebitDescripcion('');
                                    fetchData();
                                } catch (err: any) {
                                    console.error('Error al debitar fondo:', err);
                                    alert('Error al debitar: ' + err.message);
                                } finally {
                                    setDebitSaving(false);
                                }
                            }} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Monto a Debitar (USD) *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={debitMonto}
                                            onChange={e => setDebitMonto(e.target.value)}
                                            placeholder="0.00"
                                            className="block w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Descripción / Motivo *</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={debitDescripcion}
                                        onChange={e => setDebitDescripcion(e.target.value)}
                                        placeholder="Ej: Pago de paquete a Cliente Juan Perez por perdida en aduana..."
                                        className="block w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 resize-none"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={debitSaving}
                                        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold disabled:opacity-50 transition-colors"
                                    >
                                        {debitSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
                                        {debitSaving ? 'Debitando...' : 'Confirmar Débito'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ── EDIT MODAL ── */}
            {editPrealerta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditPrealerta(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                                    <Pencil className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Editar Pre-Alerta</h3>
                                    <p className="text-xs text-slate-500">Cliente: {editPrealerta.clientes?.locker_id} – {editPrealerta.clientes?.nombre} {editPrealerta.clientes?.apellido}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditPrealerta(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleEditSave} className="p-6 space-y-4">
                            {/* Tracking */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tracking Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={editTracking}
                                    onChange={e => setEditTracking(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 bg-white"
                                    placeholder="Ej. TBA123..."
                                />
                            </div>

                            {/* Bodega */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bodega</label>
                                <select
                                    value={editBodegaId}
                                    onChange={e => setEditBodegaId(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 bg-white"
                                >
                                    <option value="">Sin bodega asignada</option>
                                    {bodegas.map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Valor */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Valor Declarado ($) *</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={editValor}
                                    onChange={e => setEditValor(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 bg-white"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Seguro */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Seguro (5%)</label>
                                <button
                                    type="button"
                                    onClick={() => setEditConSeguro(v => !v)}
                                    className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-all ${editConSeguro
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                                        }`}
                                >
                                    {editConSeguro
                                        ? `✓ Con seguro (+$${editValor ? (parseFloat(editValor) * 0.05).toFixed(2) : '0.00'})`
                                        : 'Sin seguro'}
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditPrealerta(null)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSaving}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-sm hover:-translate-y-px hover:shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EXPORT MODAL ── */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
                    <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                                    <Download className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Exportar Pre-Alertas</h3>
                                    <p className="text-xs text-slate-500">Selecciona el rango de fechas</p>
                                </div>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleExportExcel} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Inicio
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={exportStartDate}
                                    onChange={e => setExportStartDate(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Fin
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={exportEndDate}
                                    onChange={e => setExportEndDate(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowExportModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={exporting}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Descargar Excel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: PROCESAR A WAREHOUSE CON PESO DE BÁSCULA ── */}
            {warehousePrealerta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !warehouseSaving && setWarehousePrealerta(null)} />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">Procesar a Warehouse</h3>
                                    <p className="text-xs text-blue-100">Ingreso a inventario con pesaje de báscula</p>
                                </div>
                            </div>
                            <button
                                onClick={() => !warehouseSaving && setWarehousePrealerta(null)}
                                className="text-blue-100 hover:text-white"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleProcessToWarehouse} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Tracking:</span>
                                    <span className="font-mono font-bold text-blue-700">{warehousePrealerta.tracking}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Cliente:</span>
                                    <span className="font-bold text-slate-800">
                                        {warehousePrealerta.clientes?.locker_id} – {warehousePrealerta.clientes?.nombre} {warehousePrealerta.clientes?.apellido}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Bodega:</span>
                                    <span className="font-semibold text-slate-700">{warehousePrealerta.bodegas?.nombre || 'General'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Seguro:</span>
                                    <span className="font-semibold text-slate-700">
                                        {warehousePrealerta.con_seguro ? `Con seguro ($${Number(warehousePrealerta.monto_seguro).toFixed(2)})` : 'Sin seguro (Renuncia)'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Peso en Báscula (Libras) *
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        autoFocus
                                        placeholder="Ej. 2.5"
                                        value={warehousePeso}
                                        onChange={(e) => setWarehousePeso(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-300 pr-12 pl-4 py-2.5 text-base font-extrabold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                                        LBS
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Este peso se registrará en el inventario de Warehouse para control y facturación.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Notas de Recepción (Opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. Caja sellada en buen estado..."
                                    value={warehouseNotas}
                                    onChange={(e) => setWarehouseNotas(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setWarehousePrealerta(null)}
                                    disabled={warehouseSaving}
                                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={warehouseSaving}
                                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                    {warehouseSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" /> Guardar y Procesar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div >
    );
}

// MapPin helper icon component
function MapPin(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}
