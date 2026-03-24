import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function registerSW() {
      try {
        const { registerSW } = await import("virtual:pwa-register");
        const update = registerSW({
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            // silent
          },
        });
        setUpdateSW(() => update);
      } catch {
        // PWA not available (e.g. Tauri desktop)
      }
    }
    registerSW();
  }, []);

  if (!needRefresh || dismissed) return null;

  const handleUpdate = async () => {
    if (updateSW) {
      await updateSW();
    }
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-3 text-sm shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        <span className="font-semibold">Nova atualização disponível!</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          className="gap-2 font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          Atualizar
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
