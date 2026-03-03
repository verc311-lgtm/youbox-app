import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

interface WebcamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File, previewUrl: string) => void;
    rowId: string;
}

export function WebcamModal({ isOpen, onClose, onCapture, rowId }: WebcamModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        setError('');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            console.error("Camera access error:", err);
            // Fallback in case "environment" facing mode is not supported on a desktop
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
                setStream(fallbackStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
            } catch (fallbackErr: any) {
                console.error("Fallback camera access error:", fallbackErr);
                setError('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const fileName = `webcam_${rowId}_${Date.now()}.jpg`;
                        const file = new File([blob], fileName, { type: 'image/jpeg' });
                        const previewUrl = canvas.toDataURL('image/jpeg', 0.85);
                        onCapture(file, previewUrl);
                        onClose();
                    }
                }, 'image/jpeg', 0.85);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                        <Camera className="h-5 w-5 text-blue-600" />
                        Cámara Web (PC)
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col items-center bg-slate-50">
                    {error ? (
                        <div className="text-center p-6 text-red-500 font-medium">
                            <p>{error}</p>
                            <button
                                onClick={startCamera}
                                className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 flex items-center gap-2 mx-auto"
                            >
                                <RefreshCw className="h-4 w-4" /> Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                            {!stream && <div className="text-white animate-pulse font-medium text-sm">Iniciando cámara...</div>}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${stream ? 'opacity-100' : 'opacity-0'}`}
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCapture}
                        disabled={!stream || !!error}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
                    >
                        <Camera className="h-4 w-4" />
                        Tomar Foto
                    </button>
                </div>
            </div>
        </div>
    );
}
