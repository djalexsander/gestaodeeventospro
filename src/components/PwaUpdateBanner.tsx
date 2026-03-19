import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function PwaUpdateBanner() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 60 seconds
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-3 text-sm shadow-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="font-medium">
          Nova versão disponível!
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateServiceWorker(true)}
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
