import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isTauri } from "@/lib/platform";

const DISMISS_KEY = "tauri:dismissedUpdateVersion";

export function TauriUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateObj, setUpdateObj] = useState<any>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    async function checkForUpdate() {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        console.log("[Updater] Checking for updates...");
        const update = await check();
        console.log("[Updater] check() result:", update);
        if (cancelled) return;
        if (update && (update as any).available !== false) {
          const version = (update as any).version ?? null;
          console.log("[Updater] Update available:", version, "current:", (update as any).currentVersion);
          const dismissedVersion = localStorage.getItem(DISMISS_KEY);
          if (dismissedVersion && dismissedVersion === version) {
            console.log("[Updater] Version dismissed by user, hiding banner");
            return;
          }
          setUpdateObj(update);
          setAvailableVersion(version);
          setUpdateAvailable(true);
          try {
            const audio = new Audio("/notification.wav");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        } else {
          console.log("[Updater] No update available");
        }
      } catch (err) {
        console.error("[Updater] check() failed:", err);
      }
    }

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!updateAvailable || dismissed) return null;

  const handleDismiss = () => {
    if (availableVersion) {
      localStorage.setItem(DISMISS_KEY, availableVersion);
      console.log("[Updater] User dismissed version", availableVersion);
    }
    setDismissed(true);
  };

  const handleUpdate = async () => {
    if (!updateObj) {
      console.error("[Updater] handleUpdate called but updateObj is null");
      return;
    }
    console.log("[Updater] User clicked Atualizar agora");
    setUpdating(true);
    setProgress(0);
    setErrorMsg(null);
    try {
      let contentLength = 0;
      let received = 0;
      console.log("[Updater] Starting downloadAndInstall...");
      await updateObj.downloadAndInstall((event: any) => {
        console.log("[Updater] event:", event);
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
            console.log("[Updater] Download finished, installing...");
            setProgress(100);
            break;
        }
      });
      console.log("[Updater] downloadAndInstall completed, relaunching...");
      // Clear dismissal so future updates show
      localStorage.removeItem(DISMISS_KEY);
      try {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch (relaunchErr) {
        console.error("[Updater] relaunch failed, reloading window:", relaunchErr);
        window.location.reload();
      }
    } catch (err: any) {
      console.error("[Updater] downloadAndInstall failed:", err);
      setErrorMsg(String(err?.message ?? err));
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
              : availableVersion
              ? `Nova atualização disponível! (v${availableVersion})`
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
                disabled={updating}
                className="gap-2 font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="font-medium text-primary-foreground hover:bg-primary-foreground/20"
              >
                Depois
              </Button>
              <button
                onClick={handleDismiss}
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
      {errorMsg && (
        <div className="mt-2 text-xs bg-destructive/20 px-2 py-1 rounded">
          Falha ao atualizar: {errorMsg}
        </div>
      )}
    </div>
  );
}
