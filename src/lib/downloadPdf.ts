import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function downloadRiderPdf(fileUrl: string, fileName: string) {
  toast.promise(
    (async () => {
      const urlObj = new URL(fileUrl);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/riders\/(.+)/);
      if (!pathMatch) throw new Error('URL inválida');

      const filePath = pathMatch[1];
      const { data, error } = await supabase.storage.from('riders').download(filePath);
      if (error || !data) throw new Error('Erro ao baixar');

      const blob = new Blob([data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    })(),
    {
      loading: 'Baixando PDF...',
      success: `${fileName} baixado!`,
      error: 'Erro ao baixar o PDF',
    }
  );
}
