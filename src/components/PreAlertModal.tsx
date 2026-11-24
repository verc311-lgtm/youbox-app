import React, { useState, useEffect } from 'react';
import { X, Upload, FileUp, AlertCircle, CheckCircle2, Loader2, FileText, ExternalLink, ShieldCheck, ShieldAlert, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SignaturePad } from './SignaturePad';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface PreAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CLAUSES = [
    {
        num: '1',
        title: 'DATOS DE LA PREALERTA',
        text: 'Declaro que la información proporcionada para identificar el paquete es correcta, completa y corresponde a la mercancía enviada. Autorizo a YOUBOXGT a registrar estos datos para gestionar el servicio.'
    },
    {
        num: '2',
        title: 'COBERTURA SELECCIONADA',
        text: 'La cobertura total es opcional y tiene un costo del 5% del valor declarado. Si no la contrato, cualquier compensación por pérdida, cuando corresponda, tendrá un máximo de USD 50, siempre que el paquete haya sido prealertado y de acuerdo con los términos vigentes del servicio.'
    },
    {
        num: '3',
        title: 'RESPONSABILIDAD EN ENVÍOS SIN COBERTURA TOTAL',
        text: 'Reconozco que el transporte y los trámites aduaneros pueden estar sujetos a pérdida, retención, decomiso o incidentes. Al elegir una modalidad sin cobertura total, acepto los límites de responsabilidad establecidos.'
    },
    {
        num: '4',
        title: 'TRÁNSITO POR ADUANAS Y REVISIONES',
        text: 'El cliente reconoce que, durante su traslado, el paquete puede pasar por una o varias aduanas, puestos fronterizos o centros de inspección en el país de origen, tránsito o destino. Las autoridades podrán abrir, revisar, retener, reclasificar o solicitar documentación adicional. YOUBOXGT no controla estos procedimientos ni sus tiempos y no responderá por atrasos, inspecciones, retenciones o decomisos.\n\nLa retención o el decomiso no se considerará pérdida y no estará cubierto por el seguro.'
    },
    {
        num: '5',
        title: 'CONDICIÓN FÍSICA DE LA MERCANCÍA',
        text: 'YOUBOXGT no será responsable por defectos de fábrica, golpes, roturas, rayones, derrames, faltantes del proveedor, embalaje inadecuado ni daños derivados de revisiones o manipulaciones aduaneras.'
    },
    {
        num: '6',
        title: 'MERCANCÍA NO ADMITIDA',
        text: 'Declaro conocer que no se aceptan armas, municiones, explosivos, sustancias ilícitas, productos inflamables, corrosivos o químicos peligrosos, cigarrillos, vapeadores, bebidas alcohólicas, medicamentos controlados, dinero en efectivo, animales, perecederos que requieran refrigeración ni artículos prohibidos por la ley.\n\nRESPONSABILIDAD POR ARTÍCULOS PROHIBIDOS O RESTRINGIDOS:\nSi el paquete contiene mercancía prohibida o restringida y, por esta causa, es retenido, decomisado, confiscado, destruido o devuelto por la aduana o cualquier autoridad competente, YOUBOXGT no asumirá responsabilidad por el paquete, el valor de la mercancía ni los gastos ocasionados. No procederá ningún reembolso o compensación.\n\nEl cliente asume las consecuencias derivadas del envío de mercancía prohibida o restringida.'
    },
    {
        num: '7',
        title: 'CONFIRMACIÓN DEL CLIENTE',
        text: 'Con mi firma confirmo que leí, comprendí y acepto estas condiciones, y que la información consignada es verdadera.\n\nACEPTO LAS CONDICIONES OPERATIVAS Y DE COBERTURA DE YOUBOXGT.'
    }
];

function generateConstanciaPDF(
    user: any,
    tracking: string,
    valorFactura: string,
    conSeguro: boolean,
    signature: string
): Blob {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let y = 11;

    // Header: YOUBOXGT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('YOUBOXGT', pageWidth / 2, y, { align: 'center' });
    y += 5.5;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('CONSTANCIA DE PREALERTA', pageWidth / 2, y, { align: 'center' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('REGISTRO DEL ENVÍO • COBERTURA • ACEPTACIÓN DE CONDICIONES', pageWidth / 2, y, { align: 'center' });
    y += 4.5;

    // Line
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3.5;

    // DATOS DEL ENVÍO
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175);
    doc.text('DATOS DEL ENVÍO', margin + 3.5, y + 4.5);

    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);

    const fechaStr = format(new Date(), 'dd/MM/yyyy HH:mm');
    const col1X = margin + 3.5;
    const col2X = margin + (contentWidth / 2) + 2;

    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre del cliente:', col1X, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'N/A', col1X + 28, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Código YBG:', col2X, y + 9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.locker_id || 'N/A', col2X + 20, y + 9.5);

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de prealerta:', col1X, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.text(fechaStr, col1X + 28, y + 14.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Valor declarado:', col2X, y + 14.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${Number(valorFactura || 0).toFixed(2)} USD`, col2X + 24, y + 14.5);

    // Row 3
    doc.setFont('helvetica', 'bold');
    doc.text('Número de tracking:', col1X, y + 19.5);
    doc.setFont('helvetica', 'normal');
    doc.text(tracking.toUpperCase(), col1X + 28, y + 19.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Contenido declarado:', col2X, y + 19.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Mercancía declarada en factura', col2X + 30, y + 19.5);

    // Row 4 - Cobertura
    doc.setFont('helvetica', 'bold');
    doc.text('Cobertura:', col1X, y + 24.5);
    doc.setFont('helvetica', 'normal');
    const optBasica = !conSeguro ? '[ X ] Básica USD 50' : '[   ] Básica USD 50';
    const optTotal = conSeguro ? '[ X ] Total 5% (Con Seguro)' : '[   ] Total 5% (Con Seguro)';
    doc.text(`${optBasica}        ${optTotal}`, col1X + 17, y + 24.5);

    y += 29.5;

    // Intro text
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    const introText = 'Por medio de este documento, el cliente confirma que ha solicitado el traslado de su paquete con YOUBOXGT y declara que conoce y acepta las condiciones siguientes:';
    const splitIntro = doc.splitTextToSize(introText, contentWidth);
    doc.text(splitIntro, margin, y);
    y += (splitIntro.length * 3.1) + 2;

    // Clauses 1 to 7
    for (const c of CLAUSES) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        doc.text(`${c.num}. ${c.title}`, margin, y);
        y += 3.2;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.6);
        doc.setTextColor(51, 65, 85);
        const splitBody = doc.splitTextToSize(c.text, contentWidth);
        doc.text(splitBody, margin, y);
        y += (splitBody.length * 2.65) + 1.8;
    }

    // Line before signature
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3.5;

    // Signature Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 64, 175);
    doc.text('FIRMA / NOMBRE DE ACEPTACIÓN DEL CLIENTE', margin, y);
    y += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(`Nombre: ${user?.nombre || ''} ${user?.apellido || ''}`.trim() + `   •   Casillero: ${user?.locker_id || 'N/A'}   •   Fecha: ${fechaStr}`, margin, y);
    y += 3.5;
    doc.text('Firma digital registrada:', margin, y);
    y += 1.5;

    if (signature) {
        doc.addImage(signature, 'PNG', margin, y, 48, 15);
        y += 16.5;
    } else {
        y += 8;
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Documento firmado electrónicamente conforme a los términos de servicio de YOUBOXGT.', margin, y);

    return doc.output('blob');
}

export function PreAlertModal({ isOpen, onClose }: PreAlertModalProps) {
    const { user } = useAuth();
    const [tracking, setTracking] = useState('');
    const [bodegaId, setBodegaId] = useState('');
    const [valorFactura, setValorFactura] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [conSeguro, setConSeguro] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);
    const [aceptoTerminos, setAceptoTerminos] = useState(false);
    const [showConditionsModal, setShowConditionsModal] = useState(false);

    const [bodegas, setBodegas] = useState<{ id: string, nombre: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadBodegas();
            resetForm();
        }
    }, [isOpen]);

    const loadBodegas = async () => {
        try {
            const { data, error } = await supabase
                .from('bodegas')
                .select('id, nombre')
                .eq('activo', true)
                .order('nombre');

            if (error) throw error;
            setBodegas(data || []);
            if (data && data.length > 0) {
                setBodegaId(data[0].id);
            }
        } catch (err: any) {
            console.error('Error loading bodegas:', err);
        }
    };

    const resetForm = () => {
        setTracking('');
        setValorFactura('');
        setFile(null);
        setConSeguro(false);
        setSignature(null);
        setAceptoTerminos(false);
        setShowConditionsModal(false);
        setSuccess(false);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!file) {
            setError('Por favor, selecciona una foto o PDF de la factura.');
            return;
        }

        if (!signature) {
            setError('Por favor, ingresa tu firma digital en el recuadro para suscribir la Constancia de Prealerta.');
            return;
        }

        if (!aceptoTerminos) {
            setError('Debes marcar la casilla aceptando los términos y condiciones de la Constancia de Prealerta para continuar.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const cleanTracking = tracking.trim().toUpperCase();

            // Check if tracking already exists
            const { data: existingRows, error: checkError } = await supabase
                .from('prealertas')
                .select('id')
                .eq('tracking', cleanTracking)
                .limit(1);

            if (checkError) throw checkError;
            const existingPrealerta = existingRows && existingRows.length > 0;

            if (existingPrealerta) {
                setError('Este tracking ya ha sido pre-alertado anteriormente y no se puede volver a registrar.');
                setLoading(false);
                return;
            }

            // 1. Upload factura to Supabase Storage
            const rawExt = file.name.includes('.') ? file.name.split('.').pop() || 'bin' : 'bin';
            const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('prealertas')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl: facturaUrl } } = supabase.storage
                .from('prealertas')
                .getPublicUrl(filePath);

            // 2. Generate and Upload Official Constancia PDF
            let constanciaUrl: string | null = null;
            try {
                const pdfBlob = generateConstanciaPDF(user, cleanTracking, valorFactura, conSeguro, signature);
                const safeTrackingKey = cleanTracking.replace(/[^A-Z0-9_-]/g, '_');
                const pdfFileName = `constancia_${safeTrackingKey}_${Date.now()}.pdf`;
                const pdfPath = `${user.id}/${pdfFileName}`;

                const { error: pdfUploadError } = await supabase.storage
                    .from('prealertas')
                    .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' });

                if (pdfUploadError) throw pdfUploadError;

                const { data: { publicUrl: pdfUrl } } = supabase.storage
                    .from('prealertas')
                    .getPublicUrl(pdfPath);

                constanciaUrl = pdfUrl;
            } catch (pdfErr) {
                console.error('Error generando Constancia PDF:', pdfErr);
                throw new Error('Error al generar la constancia legal de prealerta.');
            }

            // 3. Save to database
            const valor = parseFloat(valorFactura);
            const seguroMonto = conSeguro ? valor * 0.05 : 0;

            const { error: dbError } = await supabase
                .from('prealertas')
                .insert({
                    cliente_id: user.id,
                    tracking: cleanTracking,
                    bodega_id: bodegaId,
                    valor_factura: valor,
                    factura_url: facturaUrl,
                    con_seguro: conSeguro,
                    monto_seguro: seguroMonto,
                    estado: 'pendiente',
                    renuncia_url: constanciaUrl,
                    firma_url: constanciaUrl
                });

            if (dbError) throw dbError;

            setSuccess(true);
            setTimeout(() => {
                onClose();
                resetForm();
            }, 3000);

        } catch (err: any) {
            console.error('Error submitting prealert:', err);
            setError(err.message || 'Ocurrió un error al enviar la prealerta. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const montoSeguro = parseFloat(valorFactura) * 0.05 || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!loading && !success ? onClose : undefined} />

            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-blue-600" />
                        Pre Alertar Paquete
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={loading || success}
                        className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">¡Prealerta Registrada!</h4>
                            <p className="text-sm text-slate-500 max-w-[280px]">
                                Tu constancia de prealerta ha sido firmada y registrada correctamente en nuestro sistema.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            {/* Readonly Info */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Tu Casillero</p>
                                    <p className="text-base font-extrabold text-blue-700">{user?.locker_id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Cliente</p>
                                    <p className="text-sm font-bold text-slate-800">{user?.nombre} {user?.apellido}</p>
                                </div>
                            </div>

                            {/* Tracking */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Tracking Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={tracking}
                                    onChange={(e) => setTracking(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Ej. 9274893150..."
                                />
                            </div>

                            {/* Bodega */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Bodega de Entrega <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={bodegaId}
                                    onChange={(e) => setBodegaId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                >
                                    <option value="" disabled>Selecciona una bodega</option>
                                    {bodegas.map(b => (
                                        <option key={b.id} value={b.id}>{b.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Valor Factura */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Valor de la Compra (USD $) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <span className="text-slate-400 font-bold">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        value={valorFactura}
                                        onChange={(e) => setValorFactura(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Foto Factura */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Foto / PDF de la Factura <span className="text-red-500">*</span>
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center py-3">
                                        <Upload className="w-6 h-6 mb-1 text-blue-600" />
                                        <p className="text-xs text-slate-600 font-medium">
                                            {file ? (
                                                <span className="font-bold text-blue-700 truncate max-w-[240px] inline-block">{file.name}</span>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-blue-600">Click para subir</span> o arrastra tu archivo
                                                </>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-slate-400">JPG, PNG o PDF</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>

                            {/* SELECCIÓN DE COBERTURA / SEGURO */}
                            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200/90 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={conSeguro}
                                        onChange={(e) => setConSeguro(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-blue-900">
                                        Deseo contratar Seguro (5% del valor)
                                    </span>
                                </label>

                                {conSeguro ? (
                                    <div className="space-y-2 pt-2 border-t border-blue-200/60">
                                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl text-xs border border-blue-200 shadow-xs">
                                            <span className="text-slate-600 font-medium">Total a Pagar (Prima 5%):</span>
                                            <span className="font-extrabold text-blue-700 text-sm">${montoSeguro.toFixed(2)} USD</span>
                                        </div>
                                        <div className="bg-amber-50 text-amber-900 p-2.5 rounded-xl text-[11px] border border-amber-200 leading-relaxed shadow-xs">
                                            <strong>INSTRUCCIONES DE PAGO:</strong><br />
                                            • <b>Banco Industrial Quetzales:</b> 2583245172 (Victor Rosado)<br />
                                            • <b>Banco Industrial Dólares:</b> 2583245230 (Victor Rosado)<br />
                                            • Envía tu comprobante por WhatsApp al registrar tu prealerta.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 text-amber-800 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-[11px] leading-tight">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                        <p>
                                            <strong>Cobertura Básica seleccionada:</strong> En envíos sin cobertura total, cualquier compensación por pérdida tendrá un <strong>máximo de USD 50</strong>.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* CONSTANCIA DE PREALERTA Y ACEPTACIÓN DE CONDICIONES */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        Constancia de Prealerta
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowConditionsModal(true)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Leer Condiciones
                                    </button>
                                </div>

                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Por medio de este documento declaras que los datos son correctos y aceptas las condiciones de servicio, aduanas y cobertura de YOUBOXGT.
                                </p>

                                {/* Enlace destacado para leer las condiciones */}
                                <button
                                    type="button"
                                    onClick={() => setShowConditionsModal(true)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 transition-colors shadow-xs cursor-pointer"
                                >
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    Ver Términos y Condiciones Completos
                                </button>

                                {/* Signature Pad */}
                                <div className="pt-1">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-slate-700">Firma del Cliente: <span className="text-red-500">*</span></span>
                                        {signature ? (
                                            <span className="text-[10px] text-emerald-600 font-bold inline-flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Firmado
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-400">Firma en el recuadro</span>
                                        )}
                                    </div>
                                    <SignaturePad
                                        onSave={setSignature}
                                        onClear={() => setSignature(null)}
                                    />
                                </div>

                                {/* Checkbox Acepto */}
                                <label className="flex items-start gap-2.5 cursor-pointer pt-1 group">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={aceptoTerminos}
                                        onChange={e => setAceptoTerminos(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                    />
                                    <span className="text-[11px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors leading-snug">
                                        He leído, comprendo y <strong className="font-bold text-slate-900">acepto las condiciones operativas y de cobertura de YOUBOXGT</strong> establecidas en la Constancia de Prealerta.
                                    </span>
                                </label>
                            </div>

                            {/* Submit Action */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Generando y Guardando Constancia...
                                        </>
                                    ) : (
                                        'Enviar Pre-Alerta'
                                    )}
                                </button>
                            </div>

                        </form>
                    )}
                </div>
            </div>

            {/* MODAL DE TÉRMINOS Y CONDICIONES (CONSTANCIA DE PREALERTA) */}
            {showConditionsModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
                        {/* Header del documento */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-blue-700 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    CONSTANCIA DE PREALERTA
                                </h3>
                                <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
                                    REGISTRO DEL ENVÍO • COBERTURA • ACEPTACIÓN DE CONDICIONES
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConditionsModal(false)}
                                className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Cuerpo scrollable del documento */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
                            {/* Tarjeta de Datos del Envío llenados automáticamente */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">DATOS DEL ENVÍO</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="font-semibold text-slate-500">Nombre del cliente:</span>{' '}
                                        <b className="text-slate-800">{user?.nombre} {user?.apellido || ''}</b>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-500">Código YBG:</span>{' '}
                                        <b className="text-blue-700">{user?.locker_id || 'N/A'}</b>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-500">Fecha de prealerta:</span>{' '}
                                        <b className="text-slate-800">{format(new Date(), 'dd/MM/yyyy HH:mm')}</b>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-500">Número de tracking:</span>{' '}
                                        <b className="text-slate-800 font-mono">{tracking.trim().toUpperCase() || '(Pendiente de ingresar)'}</b>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-500">Valor declarado:</span>{' '}
                                        <b className="text-slate-800">{valorFactura ? `$${Number(valorFactura).toFixed(2)} USD` : '(Pendiente)'}</b>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-500">Contenido declarado:</span>{' '}
                                        <b className="text-slate-800">Mercancía declarada en factura</b>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs font-semibold">
                                    <span>Cobertura:</span>
                                    <span className={`px-2.5 py-0.5 rounded-md border ${!conSeguro ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                        {!conSeguro ? '☑' : '☐'} Básica USD 50
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-md border ${conSeguro ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                        {conSeguro ? '☑' : '☐'} Total 5%
                                    </span>
                                </div>
                            </div>

                            <p className="italic text-slate-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                                Por medio de este documento, el cliente confirma que ha solicitado el traslado de su paquete con YOUBOXGT y declara que conoce y acepta las condiciones siguientes:
                            </p>

                            {/* Las 7 cláusulas oficiales */}
                            <div className="space-y-3 divide-y divide-slate-100">
                                {CLAUSES.map((c) => (
                                    <div key={c.num} className="pt-3 first:pt-0 space-y-1">
                                        <h4 className="font-bold text-slate-800 text-xs">
                                            {c.num}. {c.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed text-justify">
                                            {c.text}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Sección de Firma */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 mt-4">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                                    FIRMA / NOMBRE DE ACEPTACIÓN DEL CLIENTE
                                </p>
                                <div className="text-xs text-slate-700 flex flex-wrap gap-4">
                                    <div>Nombre: <b>{user?.nombre} {user?.apellido}</b></div>
                                    <div>Casillero: <b>{user?.locker_id}</b></div>
                                    <div>Fecha: <b>{format(new Date(), 'dd/MM/yyyy')}</b></div>
                                </div>
                                <div className="pt-2">
                                    <span className="text-[11px] text-slate-500 font-semibold">Estado de la firma: </span>
                                    {signature ? (
                                        <span className="text-emerald-700 font-bold text-xs inline-flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            Firma digital registrada en el formulario
                                        </span>
                                    ) : (
                                        <span className="text-amber-700 font-medium text-xs">
                                            Ingresa tu firma en el recuadro del formulario de prealerta.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer con botones */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowConditionsModal(false)}
                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                Cerrar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAceptoTerminos(true);
                                    setShowConditionsModal(false);
                                }}
                                className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                                Acepto las Condiciones Operativas y de Cobertura
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
