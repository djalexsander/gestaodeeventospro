import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isTauri } from "@/lib/platform";

export function TauriUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateObj, setUpdateObj] = useState<any>(null);

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
    try {
      await updateObj.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      setUpdating(false);
    }
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
          disabled={updating}
          className="gap-2 font-semibold"
        >
          <Download className="h-3.5 w-3.5" />
          {updating ? "Instalando..." : "Atualizar"}
        </Button>
        {!updating && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
