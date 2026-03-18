import { useAppContext } from "@/context/AppContext";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpdateBanner() {
  const { hasUpdates, refreshData } = useAppContext();

  if (!hasUpdates) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-3 text-sm animate-in slide-in-from-top-2">
      <span className="font-medium">Novos dados disponíveis</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={refreshData}
        className="gap-2"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Atualizar
      </Button>
    </div>
  );
}
