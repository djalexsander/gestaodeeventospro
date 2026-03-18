import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppContext } from "@/context/AppContext";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function UpdateBanner() {
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

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            <h1 className="font-heading text-lg font-bold text-foreground truncate">
              Agenda Estação Mix Eventos
            </h1>
          </header>
          <UpdateBanner />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
