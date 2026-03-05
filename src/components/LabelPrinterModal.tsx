import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Loader2, Edit3, Save } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

interface LabelInfo {
    remitenteInfo: string;
    trackingOriginal: string;
    clienteCasillero: string;
    clienteNombre: string;
    bodegaDestino: string;
    pesoLbs: number;
    piezas: number;
}

interface LabelPrinterProps {
    isOpen: boolean;
    onClose: () => void;
    paquete: LabelInfo;
}

export function LabelPrinterModal({ isOpen, onClose, paquete }: LabelPrinterProps) {
    const [info, setInfo] = useState<LabelInfo>(paquete);
    const [isEditing, setIsEditing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const barcodeRef = useRef<SVGSVGElement>(null);

    // Sync incoming props
    useEffect(() => {
        setInfo(paquete);
        setIsEditing(false);
    }, [paquete]);

    // Re-render barcode when tracking changes
    useEffect(() => {
        if (isOpen && barcodeRef.current && info.trackingOriginal) {
            try {
                // Generates the barcode onto the invisible <svg> element
                JsBarcode(barcodeRef.current, info.trackingOriginal, {
                    format: "CODE128", // Auto-detect best format but enforce standard
                    lineColor: "#000",
                    width: 2,
                    height: 50,
                    displayValue: false,
                    margin: 0
                });
            } catch (err) {
                console.error("Barcode generation failed for:", info.trackingOriginal);
            }
        }
    }, [isOpen, info.trackingOriginal, isEditing]); // run after exit edit mode to refresh

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            // 1. Create a 4x6 inch PDF (standard thermal label)
            // 4 inches = 101.6 mm, 6 inches = 152.4 mm
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [101.6, 152.4]
            });

            // Set font
            doc.setFont("helvetica");

            // --- HEADER ---
            // From: YOUBOX LOGISTICS
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("YOUBOX LOGISTICS", 5, 10);

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("Miami Processing Center, FL", 5, 14);

            // To: DESTINATION / BRANCH (Huge)
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            // Right aligned
            doc.text(info.bodegaDestino, 96, 14, { align: 'right' });


            // --- MIDDLE (Horizontal line) ---
            doc.setLineWidth(0.5);
            doc.line(5, 18, 96, 18);

            // --- SHIP TO ---
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("SHIP TO:", 5, 25);

            // Locker ID (Huge)
            doc.setFontSize(36);
            doc.setFont("helvetica", "bold");
            doc.text(info.clienteCasillero || "N/A", 5, 40);

            // Name
            doc.setFontSize(14);
            doc.text((info.clienteNombre || "CLIENTE NO ASIGNADO").toUpperCase(), 5, 50);

            // Middle Line
            doc.line(5, 56, 96, 56);

            // --- DETAILS ---
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`PIEZAS: ${info.piezas}`, 5, 65);
            doc.text(`PESO: ${info.pesoLbs} LBS`, 50, 65);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`REMITENTE: ${info.remitenteInfo || "NO ESPECIFICADO"}`, 5, 75);

            // Bottom Line
            doc.line(5, 82, 96, 82);

            // --- BARCODE ---
            if (barcodeRef.current) {
                const svgData = new XMLSerializer().serializeToString(barcodeRef.current);

                // Convert SVG to canvas to get image data (jsPDF needs image, not raw SVG cleanly for pure barcodes without plugins)
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const img = new Image();
                img.onload = () => {
                    // Draw on canvas
                    canvas.width = img.width;
                    canvas.height = img.height;
                    if (ctx) {
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);

                        // Add to PDF
                        const imgData = canvas.toDataURL("image/png");
                        // Center barcode: width=80, startX= (101.6 - 80) / 2 = ~10.8
                        doc.addImage(imgData, 'PNG', 10, 95, 80, 25);

                        // Tracking string below barcode
                        doc.setFontSize(11);
                        doc.setFont("helvetica", "bold");
                        doc.text(info.trackingOriginal, 50.8, 125, { align: 'center' });

                        // Output
                        doc.autoPrint();

                        // Open in new tab which triggers OS print dialog
                        const blobUri = doc.output('bloburl');
                        window.open(blobUri, '_blank');
                        setIsPrinting(false);
                    }
                };
                img.src = "data:image/svg+xml;base64," + btoa(svgData);
            } else {
                setIsPrinting(false);
            }

        } catch (err) {
            console.error(err);
            alert("Error al generar PDF de la etiqueta.");
            setIsPrinting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Printer className="h-5 w-5" />
                        <h2 className="text-lg font-bold text-slate-800">Generar Etiqueta 4x6"</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                    {/* Rendered Barcode for user to see (Hidden SVG for jsPDF pixel extraction) */}
                    <div className="hidden">
                        <svg ref={barcodeRef}></svg>
                    </div>

                    {!isEditing ? (
                        <div className="bg-white border text-center border-slate-300 rounded-lg p-6 shadow-sm mx-auto max-w-[320px] aspect-[4/6] flex flex-col relative group">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Modificar Información"
                            >
                                <Edit3 className="h-4 w-4" />
                            </button>

                            <div className="flex justify-between items-start mb-2">
                                <div className="text-left">
                                    <p className="text-[10px] font-bold">YOUBOX LOGISTICS</p>
                                    <p className="text-[8px] text-slate-500">Miami, FL</p>
                                </div>
                                <h3 className="text-xl font-bold bg-slate-100 px-2 py-0.5 rounded">{info.bodegaDestino}</h3>
                            </div>

                            <hr className="my-2 border-slate-200 border-2" />

                            <div className="text-left mt-2 flex-1">
                                <p className="text-[10px] text-slate-500">SHIP TO:</p>
                                <h2 className="text-4xl font-black mt-1 leading-none">{info.clienteCasillero || "N/A"}</h2>
                                <p className="text-sm font-bold mt-2 truncate w-full">{info.clienteNombre.toUpperCase()}</p>
                            </div>

                            <hr className="my-2 border-slate-200" />

                            <div className="flex justify-between text-xs font-bold my-2 px-2">
                                <p>PZ: {info.piezas}</p>
                                <p>WT: {info.pesoLbs} LBS</p>
                            </div>

                            <div className="mb-4 text-center mx-auto bg-white p-2 border border-slate-100 rounded">
                                {/* Visual representation since actual SVG is hidden for jsPDF */}
                                <div className="w-full h-12 bg-slate-900 mx-auto" style={{
                                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 4px)',
                                    backgroundSize: '10px 100%'
                                }}></div>
                                <p className="text-xs font-mono font-bold mt-1 tracking-widest">{info.trackingOriginal.substring(0, 25)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4">
                                Estas modificaciones solo aplicarán a la <strong>impresión física</strong> de la etiqueta, no alteran la base de datos oficial.
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Tracking (Código de Barras)</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={info.trackingOriginal}
                                    onChange={(e) => setInfo({ ...info, trackingOriginal: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Casillero (Grande)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-bold uppercase"
                                        value={info.clienteCasillero}
                                        onChange={(e) => setInfo({ ...info, clienteCasillero: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Destino (Sucursal)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm uppercase"
                                        value={info.bodegaDestino}
                                        onChange={(e) => setInfo({ ...info, bodegaDestino: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre Cliente</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={info.clienteNombre}
                                    onChange={(e) => setInfo({ ...info, clienteNombre: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Peso (Lbs)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        value={info.pesoLbs}
                                        onChange={(e) => setInfo({ ...info, pesoLbs: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Piezas</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        value={info.piezas}
                                        onChange={(e) => setInfo({ ...info, piezas: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setIsEditing(false)}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2 mt-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-800 hover:bg-slate-700"
                            >
                                <Save className="h-4 w-4" />
                                Guardar Borrador
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting || isEditing}
                        className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        {isPrinting ? 'Procesando...' : 'Mandat Imprimir'}
                    </button>
                </div>
            </div>
        </div>
    );
}
