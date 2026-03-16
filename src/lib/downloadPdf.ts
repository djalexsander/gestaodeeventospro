import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export async function downloadRiderPdf(fileUrl: string, fileName: string) {
  try {
    // Extract the path from the public URL
    const urlObj = new URL(fileUrl);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/riders\/(.+)/);
    
    if (!pathMatch) {
      // Fallback: try direct fetch
      window.open(fileUrl, '_blank');
      return;
    }

    const filePath = pathMatch[1];
    const { data, error } = await supabase.storage.from('riders').download(filePath);
    
    if (error || !data) {
      toast.error('Erro ao baixar o PDF');
      return;
    }

    // Create blob URL and open/download
    const blob = new Blob([data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch {
    toast.error('Erro ao abrir o PDF');
  }
}
