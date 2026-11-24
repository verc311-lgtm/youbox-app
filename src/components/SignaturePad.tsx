import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onClear: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const drawingRef = useRef(false);
    const hasInkRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High DPI support (must resize canvas before setting stroke styles)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = (rect.width || 300) * dpr;
        canvas.height = (rect.height || 128) * dpr;
        ctx.scale(dpr, dpr);

        // Set line style
        ctx.strokeStyle = '#1e293b'; // slate-800
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        drawingRef.current = true;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            const { x, y } = getPoint(e, canvas);
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
        setIsDrawing(true);
    };

    const stopDrawing = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas && hasInkRef.current) {
            onSave(canvas.toDataURL('image/png'));
        }
    };

    const getPoint = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        // Compensa si el canvas fue medido durante la animación del modal
        const dpr = window.devicePixelRatio || 1;
        const scaleX = canvas.width / dpr / (rect.width || 1);
        const scaleY = canvas.height / dpr / (rect.height || 1);
        let cx: number, cy: number;
        if ('touches' in e) {
            const t = e.touches[0] || e.changedTouches[0];
            cx = t.clientX; cy = t.clientY;
        } else {
            cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY;
        }
        return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawingRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e, canvas);

        if (!hasInkRef.current) {
            hasInkRef.current = true;
            setIsEmpty(false);
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        hasInkRef.current = false;
        setIsEmpty(true);
        onClear();
    };

    return (
        <div className="space-y-2">
            <div className="relative border-2 border-slate-200 rounded-xl bg-white overflow-hidden touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 cursor-crosshair"
                />
                {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm">
                        Firma aquí
                    </div>
                )}
            </div>
            <button
                type="button"
                onClick={clear}
                className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors uppercase tracking-wider"
            >
                Limpiar Firma
            </button>
        </div>
    );
}
