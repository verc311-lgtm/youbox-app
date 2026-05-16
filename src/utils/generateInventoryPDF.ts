import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { YOUBOX_LOGO_BASE64 } from './logoBase64';

export const downloadInventoryPDF = async (consolidationId: string, consolidationCodigo: string) => {
    try {
        // Fetch consolidation details
        const { data: consData, error: consError } = await supabase
            .from('consolidaciones')
            .select(`
                *,
                bodegas(nombre),
                zonas(nombre),
                sucursales(nombre)
            `)
            .eq('id', consolidationId)
            .single();

        if (consError) throw consError;

        // Fetch packages within this consolidation
        const { data: linkData, error: linkError } = await supabase
            .from('consolidacion_paquetes')
            .select(`
                paquete_id,
                paquetes (
                    tracking,
                    peso_lbs,
                    largo_in,
                    ancho_in,
                    alto_in,
                    piezas,
                    estado,
                    notas,
                    clientes ( nombre, apellido, locker_id )
                )
            `)
            .eq('consolidacion_id', consolidationId);

        if (linkError) throw linkError;

        const packages = (linkData || []).map((link: any) => link.paquetes).filter(Boolean);

        // Sort alphabetically by client name
        packages.sort((a: any, b: any) => {
            const nameA = a.clientes ? `${a.clientes.nombre || ''} ${a.clientes.apellido || ''}`.trim().toLowerCase() : '';
            const nameB = b.clientes ? `${b.clientes.nombre || ''} ${b.clientes.apellido || ''}`.trim().toLowerCase() : '';
            return nameA.localeCompare(nameB);
        });

        const configRes = await supabase.from('configuracion_empresa').select('nombre_empresa').limit(1).single();
        const config = configRes.data || { nombre_empresa: 'YOUBOXGT' };

        // Initialize PDF
        const doc = new jsPDF('landscape'); // Landscape might be better for inventory tables
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();

        // Colors
        const colorPrimary: [number, number, number] = [30, 64, 175];
        const colorDark: [number, number, number] = [15, 23, 42];
        const colorLight: [number, number, number] = [241, 245, 249];

        // Header Background
        doc.setFillColor(...colorLight);
        doc.rect(0, 0, W, 40, 'F');

        // Logo
        try {
            doc.addImage(YOUBOX_LOGO_BASE64, 'PNG', 14, 8, 35, 23, '', 'FAST');
        } catch (e) {
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colorPrimary);
            doc.text(config.nombre_empresa, 14, 25);
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorDark);
        doc.text('MANIFIESTO DE INVENTARIO', W - 14, 20, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Consolidado: ${consolidationCodigo}`, W - 14, 27, { align: 'right' });
        doc.text(`Fecha: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: es })}`, W - 14, 32, { align: 'right' });

        let currentY = 50;
        
        // Metadata Block
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalles de Ruta:', 14, currentY);
        doc.setFont('helvetica', 'normal');
        
        const origen = Array.isArray(consData.bodegas) ? consData.bodegas[0]?.nombre : consData.bodegas?.nombre;
        const destino = Array.isArray(consData.zonas) ? consData.zonas[0]?.nombre : consData.zonas?.nombre;
        const sede = Array.isArray(consData.sucursales) ? consData.sucursales[0]?.nombre : consData.sucursales?.nombre;

        doc.text(`Origen: ${origen || 'N/A'}`, 14, currentY + 6);
        doc.text(`Destino: ${destino || 'N/A'}`, 14, currentY + 12);
        doc.text(`Sede: ${sede || 'N/A'}`, 14, currentY + 18);

        doc.setFont('helvetica', 'bold');
        doc.text('Totales:', W - 80, currentY);
        doc.setFont('helvetica', 'normal');
        const tWeight = packages.reduce((sum, p) => sum + (Number(p.peso_lbs) || 0), 0);
        const tPieces = packages.reduce((sum, p) => sum + (Number(p.piezas) || 0), 0);
        doc.text(`Total Lbs: ${tWeight.toFixed(2)}`, W - 80, currentY + 6);
        doc.text(`Total Piezas: ${tPieces}`, W - 80, currentY + 12);
        doc.text(`Cant. Paquetes: ${packages.length}`, W - 80, currentY + 18);

        currentY += 28;

        // Table
        const tableBody = packages.map((p, index) => {
            const clientInfo = p.clientes ? `${p.clientes.locker_id || ''} - ${p.clientes.nombre} ${p.clientes.apellido}` : 'Desconocido';
            return [
                index + 1,
                p.tracking || '',
                clientInfo,
                p.peso_lbs?.toFixed(2) || '0.00',
                p.piezas || '1',
                `${p.largo_in || 0}x${p.ancho_in || 0}x${p.alto_in || 0}`,
                '', // Firma de recibido (empty for writing)
                ''  // No. DPI (empty for writing)
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['#', 'Tracking', 'Cliente', 'Peso (Lbs)', 'Piezas', 'Dimensiones', 'Firma de Recibido', 'No. DPI']],
            body: tableBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59], overflow: 'linebreak' }, // Slightly larger padding for writing
            headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 40 },
                2: { cellWidth: 50 },
                3: { cellWidth: 15, halign: 'right' },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 25, halign: 'center' },
                6: { cellWidth: 60 }, // Firma
                7: { cellWidth: 'auto' } // DPI
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text('Generado por YOUBOX GT Software', W / 2, H - 10, { align: 'center' });

        doc.save(`Inventario_${consolidationCodigo}.pdf`);

    } catch (error: any) {
        console.error("Error generating inventory PDF:", error);
        alert("Ocurrió un error al tratar de generar el PDF de inventario.");
    }
};
