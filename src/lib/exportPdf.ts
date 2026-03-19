import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventItem, Artist, City } from '@/types';
import { savePdf } from './savePdf';

interface ExportParams {
  events: EventItem[];
  month: Date;
  getArtistById: (id: string) => Artist | undefined;
  getCityById: (id: string) => City | undefined;
  companyName?: string;
}

export async function exportMonthlyPdf({ events, month, getArtistById, getCityById, companyName }: ExportParams) {
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
  doc.text('Gestão de Eventos Pro', 14, 18);

  let headerY = 18;
  if (companyName) {
    headerY += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 140, 180);
    doc.text(companyName, 14, headerY);
    doc.setTextColor(0);
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Agenda — ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`, 14, headerY + 8);

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, headerY + 14);
  doc.setTextColor(0);

  const tableStartY = headerY + 20;

  if (monthEvents.length === 0) {
    doc.setFontSize(12);
    doc.text('Nenhum evento neste mês.', 14, tableStartY + 12);
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
      startY: tableStartY,
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

  await savePdf({
    doc,
    tipo: 'agenda',
    data: format(month, 'yyyy-MM-dd'),
  });
}

interface ExportSingleEventParams {
  event: EventItem;
  artistName: string;
  cityLabel: string;
  riderDetails?: { equipment: string; soundSystem: string; microphones: string; monitors: string } | null;
}

export async function exportSingleEventPdf({ event, artistName, cityLabel, riderDetails }: ExportSingleEventParams) {
  const doc = new jsPDF();
  const dateFormatted = format(new Date(event.date + 'T00:00:00'), 'dd/MM/yyyy');

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Gestão de Eventos Pro', 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 25);
  doc.setTextColor(0);

  // Event title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(event.name, 14, 40);

  // Status on the right side
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const statusColors: Record<string, [number, number, number]> = {
    'Confirmado': [34, 197, 94],
    'Pendente': [234, 179, 8],
    'Cancelado': [239, 68, 68],
  };
  const color = statusColors[event.status] || [99, 102, 241];
  doc.setTextColor(...color);
  doc.text(event.status, 196, 40, { align: 'right' });
  doc.setTextColor(0);

  // Details table
  const details: string[][] = [
    ['Data', dateFormatted],
    ['Artista', artistName],
    ['Cidade', cityLabel],
    ['Local', event.venue || '—'],
    ['Montagem', event.setupTime || '—'],
    ['Show', event.showTime || '—'],
  ];

  if (event.departureDate) {
    details.push(['Data de Saída', event.departureDate.split('-').reverse().join('/')]);
  }
  if (event.departureTime) {
    details.push(['Horário de Saída', event.departureTime]);
  }
  if (event.notes) {
    details.push(['Observações', event.notes]);
  }
  if (event.staffNotes) {
    details.push(['Info Funcionários', event.staffNotes]);
  }

  autoTable(doc, {
    startY: 48,
    body: details,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
    },
  });

  // Rider details
  if (riderDetails) {
    const riderY = (doc as any).lastAutoTable?.finalY + 10 || 120;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Rider Técnico', 14, riderY);

    autoTable(doc, {
      startY: riderY + 4,
      body: [
        ['Equipamentos', riderDetails.equipment || '—'],
        ['Som', riderDetails.soundSystem || '—'],
        ['Microfones', riderDetails.microphones || '—'],
        ['Monitores', riderDetails.monitors || '—'],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
      },
    });
  }

  await savePdf({
    doc,
    tipo: 'evento',
    evento: event.name,
    cidade: cityLabel,
    data: event.date,
  });
}
