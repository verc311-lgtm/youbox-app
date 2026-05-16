import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';

export interface BulkLabelPaquete {
    tracking: string;
    peso_lbs: number;
    piezas: number;
    clientes: {
        nombre: string;
        apellido: string;
        locker_id: string;
    } | null;
    bodegas: {
        nombre: string;
    } | null;
    transportistas?: {
        nombre: string;
    } | null;
}

export const generateBulkLabelsPDF = async (paquetes: BulkLabelPaquete[]) => {
    if (!paquetes || paquetes.length === 0) {
        toast.error("No hay paquetes para imprimir.");
        return;
    }

    const toastId = toast.loading(`Generando ${paquetes.length} etiquetas...`);

    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [101.6, 152.4]
        });

        for (let i = 0; i < paquetes.length; i++) {
            const pkt = paquetes[i];
            
            if (i > 0) {
                doc.addPage();
            }

            const bodegaDestino = pkt.bodegas?.nombre || "General";
            const clienteCasillero = pkt.clientes?.locker_id || "N/A";
            const clienteNombre = pkt.clientes 
                ? `${pkt.clientes.nombre} ${pkt.clientes.apellido}` 
                : "CLIENTE NO ASIGNADO";
            
            const piezas = pkt.piezas || 1;
            const peso = pkt.peso_lbs || 0;
            const remitente = pkt.transportistas?.nombre || "NO ESPECIFICADO";
            const tracking = pkt.tracking;

            // --- HEADER ---
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("YOUBOX GT", 5, 10);

            doc.text("Sede Central", 5, 14);

            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.text(bodegaDestino, 96, 14, { align: 'right' });

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
            doc.text(clienteCasillero, 5, 40);

            // Name
            doc.setFontSize(14);
            doc.text(clienteNombre.toUpperCase(), 5, 50);

            // Middle Line
            doc.line(5, 56, 96, 56);

            // --- DETAILS ---
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`PIEZAS: ${piezas}`, 5, 65);
            doc.text(`PESO: ${peso} LBS`, 50, 65);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`REMITENTE: ${remitente}`, 5, 75);

            // Bottom Line
            doc.line(5, 82, 96, 82);

            // --- BARCODE ---
            // Create off-screen canvas for JsBarcode
            const canvas = document.createElement("canvas");
            
            try {
                JsBarcode(canvas, tracking, {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 2,
                    height: 50,
                    displayValue: false,
                    margin: 0
                });

                const barcodeDataUrl = canvas.toDataURL("image/png");
                doc.addImage(barcodeDataUrl, 'PNG', 10, 95, 80, 25);
            } catch (err) {
                console.error("Barcode failed for tracking:", tracking, err);
                doc.setFontSize(10);
                doc.text("(Error generating barcode)", 50.8, 105, { align: 'center' });
            }

            // Tracking string below barcode
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(tracking, 50.8, 125, { align: 'center' });
        }

        const blobUri = doc.output('bloburl');
        window.open(blobUri, '_blank');
        toast.success(`Se prepararon ${paquetes.length} etiquetas para imprimir`, { id: toastId });

    } catch (err) {
        console.error("Error bulk printing:", err);
        toast.error("Hubo un error al generar las etiquetas.", { id: toastId });
    }
};
