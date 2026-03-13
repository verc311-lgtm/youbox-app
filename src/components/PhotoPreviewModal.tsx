import React from 'react';
import { X, Download, Maximize2 } from 'lucide-react';

interface PhotoPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    photoUrl: string | null;
    tracking?: string;
}

export function PhotoPreviewModal({ isOpen, onClose, photoUrl, tracking }: PhotoPreviewModalProps) {
    if (!isOpen || !photoUrl) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                            <Maximize2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 tracking-tight">Vista Previa de Foto</h3>
                            {tracking && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tracking: {tracking}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={photoUrl}
                            download={`foto_${tracking || 'paquete'}.jpg`}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Descargar Foto"
                        >
                            <Download className="h-5 w-5" />
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Cerrar"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-50 p-2 sm:p-4 flex items-center justify-center">
                    <img
                        src={photoUrl}
                        alt="Foto del paquete"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                    />
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                    >
                        Cerrar Vista
                    </button>
                </div>
            </div>
        </div>
    );
}
