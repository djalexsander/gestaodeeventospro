import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isTauri } from "@/lib/platform";

const DISMISS_KEY = "tauri:dismissedUpdateVersion";

type Phase = "idle" | "checking" | "downloading" | "installing" | "relaunching" | "error";

export function TauriUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateObj, setUpdateObj] = useState<any>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const runningRef = useRef(false);

  const updating = phase === "downloading" || phase === "installing" || phase === "relaunching";

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
    if (runningRef.current) return;
    if (!updateObj) {
      console.error("[Updater] ERROR: handleUpdate called but update object is null");
      setErrorMsg("Não foi possível iniciar a atualização. Reinicie o aplicativo e tente novamente.");
      setPhase("error");
      return;
    }
    runningRef.current = true;
    console.log("[Updater] update detected");
    console.log("[Updater] version:", availableVersion);
    setProgress(0);
    setErrorMsg(null);
    setPhase("downloading");
    try {
      let contentLength = 0;
      let received = 0;
      console.log("[Updater] starting download");
      await updateObj.downloadAndInstall((event: any) => {
        switch (event?.event) {
          case "Started":
            contentLength = event.data?.contentLength ?? 0;
            setTotal(contentLength);
            setProgress(0);
            console.log("[Updater] download started, bytes:", contentLength);
            break;
          case "Progress":
            received += event.data?.chunkLength ?? 0;
            setDownloaded(received);
            if (contentLength > 0) {
              setProgress(Math.min(100, Math.round((received / contentLength) * 100)));
            }
            break;
          case "Finished":
            console.log("[Updater] download completed");
            console.log("[Updater] starting install");
            setProgress(100);
            setPhase("installing");
            break;
        }
      });
      console.log("[Updater] install completed");
      // Clear dismissal so future updates show
      localStorage.removeItem(DISMISS_KEY);
      setPhase("relaunching");
      console.log("[Updater] relaunching");
      try {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      } catch (relaunchErr) {
        console.error("[Updater] ERROR: relaunch failed:", relaunchErr);
        window.location.reload();
      }
    } catch (err: any) {
      console.error("[Updater] ERROR:", err);
      setErrorMsg(
        "Não foi possível instalar a atualização. Tente novamente ou reinicie o aplicativo."
      );
      setPhase("error");
      setProgress(null);
      runningRef.current = false;
    }
  };

  const statusLabel = () => {
    switch (phase) {
      case "checking":
        return "Verificando atualização...";
      case "downloading":
        return progress !== null && progress > 0
          ? `Baixando atualização... ${progress}%`
          : "Baixando atualização...";
      case "installing":
        return "Instalando atualização...";
      case "relaunching":
        return "Reiniciando...";
      case "error":
        return "Falha ao atualizar";
      default:
        return availableVersion
          ? `Nova atualização disponível! (v${availableVersion})`
          : "Nova atualização disponível!";
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : phase === "error" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="font-semibold">{statusLabel()}</span>
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
                {phase === "error" ? "Tentar novamente" : "Atualizar agora"}
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
