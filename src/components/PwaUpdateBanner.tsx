import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { onPwaUpdateState } from "@/lib/pwa";

/**
 * Aviso passivo: a atualização do PWA é aplicada automaticamente assim que
 * for seguro (sem formulário/drawer aberto e sem alterações pendentes).
 * Este banner só informa quando a atualização está pronta mas foi adiada.
 */
export function PwaUpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => onPwaUpdateState(setReady), []);

  if (!ready) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] rounded-full bg-primary text-primary-foreground px-4 py-2 flex items-center gap-2 text-xs shadow-lg animate-in slide-in-from-bottom-2">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span className="font-medium">
        Atualização pronta — será aplicada automaticamente em um momento seguro.
      </span>
    </div>
  );
}
