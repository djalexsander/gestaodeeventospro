import { isWeb } from "@/lib/platform";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

function PwaUpdateBannerInner() {
  const [dismissed, setDismissed] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    // @ts-ignore - virtual module provided by vite-plugin-pwa at runtime
    import("virtual:pwa-register").then(({ registerSW }) => {
      if (cancelled) return;
      const update = registerSW({
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
          if (registration) {
            setInterval(() => registration.update(), 60_000);
          }
        },
        onRegisterError(error: any) {
          console.error("SW registration error:", error);
        },
      });
      setUpdateSW(() => update);
    }).catch(() => {
      // PWA plugin not available (e.g. Tauri build)
    });
    return () => { cancelled = true; };
  }, []);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-3 text-sm shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="font-medium">Nova versão disponível!</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateSW?.(true)}
          className="gap-2 font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="h-8 w-8 p-0 text-primary-foreground hover:text-primary-foreground/80"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PwaUpdateBanner() {
  if (!isWeb()) return null;
  return <PwaUpdateBannerInner />;
}
