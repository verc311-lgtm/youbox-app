import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { YOUBOX_LOGO_BASE64 } from './logoBase64';

export const downloadReportPDF = async (selectedMonthKey: string, sucursalId: string | 'all', sedeData: any, kpis: any) => {
    try {
        const configRes = await supabase.from('configuracion_empresa').select('nombre_empresa').limit(1).single();
        const config = configRes.data || { nombre_empresa: 'YOUBOXGT' };

        const monthDate = parseISO(`${selectedMonthKey}-01`);
        const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es }).toUpperCase();

        const doc = new jsPDF('portrait');
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();

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
        doc.text('REPORTE FINANCIERO', W - 14, 20, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${monthLabel}`, W - 14, 27, { align: 'right' });
        doc.text(`Fecha Emisión: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: es })}`, W - 14, 32, { align: 'right' });

        let currentY = 55;

        // Resumen
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colorPrimary);
        doc.text('Métricas del Mes', 14, currentY);
        
        currentY += 10;
        doc.setFontSize(11);
        doc.setTextColor(50);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Ingresos:`, 14, currentY);
        doc.setFont('helvetica', 'bold');
        doc.text(`Q ${kpis.ingresosMesActual.toFixed(2)}`, 60, currentY);

        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Egresos:`, 14, currentY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red
        doc.text(`Q ${kpis.gastosMesActual.toFixed(2)}`, 60, currentY);

        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50);
        doc.text(`Utilidad Neta:`, 14, currentY);
        doc.setFont('helvetica', 'bold');
        
        if (kpis.balanceMesActual >= 0) {
            doc.setTextColor(5, 150, 105); // Green
        } else {
            doc.setTextColor(220, 38, 38); // Red
        }
        doc.text(`Q ${kpis.balanceMesActual.toFixed(2)}`, 60, currentY);
        
        // Reset color
        doc.setTextColor(50);
        currentY += 20;

        // Si es global, mostramos cómo van las sedes en el semestre
        if (sucursalId === 'all') {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colorPrimary);
            doc.text('Rendimiento Semestral por Sedes (Últimos 6 meses)', 14, currentY);
            
            currentY += 10;
            autoTable(doc, {
                startY: currentY,
                head: [['Sede', 'Ingresos Semestrales', 'Egresos Semestrales']],
                body: [
                    ['Quetzaltenango', `Q ${sedeData.xela.ingresos.toFixed(2)}`, `Q ${sedeData.xela.gastos.toFixed(2)}`],
                    ['Quiché', `Q ${sedeData.quiche.ingresos.toFixed(2)}`, `Q ${sedeData.quiche.gastos.toFixed(2)}`]
                ],
                theme: 'grid',
                headStyles: { fillColor: colorPrimary, textColor: 255 },
                styles: { fontSize: 10, cellPadding: 4 }
            });
        }

        const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : currentY + 15;
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Documento generado automáticamente por YOUBOX GT Software', W / 2, H - 10, { align: 'center' });

        doc.save(`Reporte_Financiero_${monthLabel.replace(' ', '_')}.pdf`);

    } catch (error: any) {
        console.error("Error generating report PDF:", error);
        alert("Ocurrió un error al tratar de generar el PDF del reporte.");
    }
};
