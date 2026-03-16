import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventItem, Artist, City } from '@/types';

interface ExportParams {
  events: EventItem[];
  month: Date;
  getArtistById: (id: string) => Artist | undefined;
  getCityById: (id: string) => City | undefined;
}

export function exportMonthlyPdf({ events, month, getArtistById, getCityById }: ExportParams) {
  const year = month.getFullYear();
  const m = month.getMonth();
  
  const monthEvents = events
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === m;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Estação Mix Eventos', 14, 18);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Agenda — ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, 14, 26);

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 32);
  doc.setTextColor(0);

  if (monthEvents.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhum evento neste mês.', 14, 50);
  } else {
    const tableData = monthEvents.map(ev => {
      const artist = getArtistById(ev.artistId);
      const city = getCityById(ev.cityId);
      const dateFormatted = format(new Date(ev.date + 'T00:00:00'), 'dd/MM/yyyy');
      return [
        dateFormatted,
        ev.name,
        artist?.name || '—',
        city ? `${city.name}/${city.state}` : '—',
        ev.venue || '—',
        ev.setupTime || '—',
        ev.showTime || '—',
        ev.status,
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [['Data', 'Evento', 'Artista', 'Cidade', 'Local', 'Montagem', 'Show', 'Status']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 25 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 25 },
      },
    });
  }

  // Summary footer
  const confirmed = monthEvents.filter(e => e.status === 'Confirmado').length;
  const pending = monthEvents.filter(e => e.status === 'Pendente').length;
  const cancelled = monthEvents.filter(e => e.status === 'Cancelado').length;

  const finalY = (doc as any).lastAutoTable?.finalY || 50;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${monthEvents.length} evento(s)  |  ✅ Confirmados: ${confirmed}  |  ⏳ Pendentes: ${pending}  |  ❌ Cancelados: ${cancelled}`, 14, finalY + 10);

  doc.save(`agenda-${format(month, 'yyyy-MM')}.pdf`);
}
