import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, ScanLine } from 'lucide-react';

interface ScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: ScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure DOM element exists before rendering
            const timeout = setTimeout(() => {
                scannerRef.current = new Html5QrcodeScanner(
                    "qr-reader-quick-entry",
                    {
                        fps: 10,
                        qrbox: { width: 300, height: 150 }, // Wider box for 1D barcodes
                        rememberLastUsedCamera: true,
                        supportedScanTypes: [] // Default: all supported types
                    },
                    false
                );

                scannerRef.current.render(
                    (decodedText) => {
                        if (scannerRef.current) {
                            scannerRef.current.pause(true); // pause briefly upon success
                        }
                        onScan(decodedText);
                    },
                    (error) => {
                        // parse errors are normal noise (e.g. no barcode in frame)
                    }
                );
            }, 100);

            return () => {
                clearTimeout(timeout);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
                }
            };
        }
    }, [isOpen, onScan]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-blue-600">
                        <ScanLine className="h-5 w-5" />
                        <h2 className="text-lg font-bold text-slate-800">Escanear Código / Guía</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 bg-slate-50 flex items-center justify-center">
                    {/* The library injects UI here */}
                    <div id="qr-reader-quick-entry" className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200"></div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100 text-center text-sm text-slate-500">
                    Apunta la cámara al código de barras del paquete. El escaneo sucederá automáticamente.
                </div>
            </div>
        </div>
    );
}
