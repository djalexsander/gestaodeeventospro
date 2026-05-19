import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isTauri } from "@/lib/platform";

export function TauriUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateObj, setUpdateObj] = useState<any>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    async function checkForUpdate() {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (cancelled) return;
        if (update) {
          setUpdateObj(update);
          setUpdateAvailable(true);
          // Play notification sound
          try {
            const audio = new Audio("/notification.wav");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      } catch {
        // updater not configured or offline
      }
    }

    checkForUpdate();
    // Check every 30 minutes
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!updateAvailable || dismissed) return null;

  const handleUpdate = async () => {
    if (!updateObj) return;
    setUpdating(true);
    setProgress(0);
    try {
      let contentLength = 0;
      let received = 0;
      await updateObj.downloadAndInstall((event: any) => {
        switch (event?.event) {
          case "Started":
            contentLength = event.data?.contentLength ?? 0;
            setTotal(contentLength);
            setProgress(0);
            break;
          case "Progress":
            received += event.data?.chunkLength ?? 0;
            setDownloaded(received);
            if (contentLength > 0) {
              setProgress(Math.min(100, Math.round((received / contentLength) * 100)));
            }
            break;
          case "Finished":
            setProgress(100);
            break;
        }
      });
      try {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch {
        window.location.reload();
      }
    } catch {
      setUpdating(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span className="font-semibold">
            {updating
              ? progress !== null && progress < 100
                ? `Baixando atualização... ${progress}%`
                : progress === 100
                ? "Instalando..."
                : "Preparando atualização..."
              : "Nova atualização disponível!"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!updating && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleUpdate}
                className="gap-2 font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="font-medium text-primary-foreground hover:bg-primary-foreground/20"
              >
                Depois
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-md hover:bg-primary-foreground/20 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {updating && progress !== null && (
        <div className="mt-2">
          <Progress value={progress} className="h-1.5 bg-primary-foreground/20" />
          {total > 0 && (
            <div className="text-xs mt-1 opacity-80">
              {(downloaded / 1024 / 1024).toFixed(1)} MB / {(total / 1024 / 1024).toFixed(1)} MB
            </div>
          )}
        </div>
      )}
    </div>
  );
}
