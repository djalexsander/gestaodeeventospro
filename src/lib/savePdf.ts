import { toast } from 'sonner';
import { saveFile } from './saveFile';

/**
 * Sanitize a string for use in file names:
 * - lowercase
 * - replace spaces/special chars with hyphens
 * - remove accents
 * - collapse multiple hyphens
 */
function sanitize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface SavePdfOptions {
  doc: { output: (type: 'blob') => Blob };
  tipo: string;
  evento?: string;
  cidade?: string;
  data?: string; // YYYY-MM-DD or similar
}

/**
 * Build a professional file name from event metadata.
 * Examples:
 *   agenda-maringa-festival-20-03-2026.pdf
 *   evento-show-nacional-cianorte-21-03-2026.pdf
 */
function buildFileName({ tipo, evento, cidade, data }: Omit<SavePdfOptions, 'doc'>): string {
  const parts = [sanitize(tipo)];

  if (evento) parts.push(sanitize(evento));
  if (cidade) parts.push(sanitize(cidade));

  if (data) {
    // Convert YYYY-MM-DD → DD-MM-YYYY or keep as-is if already formatted
    const match = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      parts.push(`${match[3]}-${match[2]}-${match[1]}`);
    } else {
      parts.push(sanitize(data));
    }
  }

  return parts.join('-') + '.pdf';
}

/**
 * Universal PDF save function with automatic fallback:
 * 1. If showSaveFilePicker is available (Win 11 / modern browsers) → native "Save As" dialog
 * 2. Otherwise → automatic download via temporary link (Win 10 / older browsers)
 *
 * O mecanismo de gravação (picker + fallback) vive em `./saveFile`; aqui ficam
 * só a montagem do nome e o feedback ao usuário.
 */
export async function savePdf(options: SavePdfOptions): Promise<void> {
  const fileName = buildFileName(options);
  const blob = options.doc.output('blob');

  const outcome = await saveFile({
    blob,
    suggestedName: fileName,
    pickerTypes: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }],
  });

  if (outcome === 'cancelled') return;
  toast.success(outcome === 'saved' ? 'PDF salvo com sucesso!' : 'PDF gerado com sucesso!');
}
