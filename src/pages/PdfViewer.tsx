import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PdfViewer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = searchParams.get("url") || "";
  const fileName = searchParams.get("name") || "Rider técnico";

  const filePath = useMemo(() => {
    try {
      const urlObj = new URL(fileUrl);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/riders\/(.+)/);
      return pathMatch?.[1] || null;
    } catch {
      return null;
    }
  }, [fileUrl]);

  useEffect(() => {
    let currentBlobUrl: string | null = null;

    async function loadPdf() {
      if (!filePath) {
        setError("Arquivo inválido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.storage.from("riders").download(filePath);

      if (error || !data) {
        setError("Não foi possível abrir este PDF.");
        setLoading(false);
        return;
      }

      currentBlobUrl = URL.createObjectURL(data);
      setBlobUrl(currentBlobUrl);
      setLoading(false);
    }

    loadPdf();

    return () => {
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [filePath]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
          </div>
          <div className="w-[88px]" />
        </div>
      </header>

      <main className="flex flex-1 flex-col p-4 md:p-6">
        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border bg-card">
            <div className="flex items-center gap-3 text-muted-foreground">
              <FileText className="h-5 w-5 animate-pulse text-primary" />
              <span>Carregando PDF...</span>
            </div>
          </div>
        ) : error || !blobUrl ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border bg-card p-6 text-center">
            <div className="space-y-3">
              <p className="font-medium text-foreground">{error || "Não foi possível abrir o arquivo."}</p>
              <p className="text-sm text-muted-foreground">Tente novamente ou reenvie o PDF.</p>
            </div>
          </div>
        ) : (
          <iframe
            src={blobUrl}
            title={fileName}
            className="min-h-[75vh] w-full flex-1 rounded-xl border bg-card"
          />
        )}
      </main>
    </div>
  );
}
