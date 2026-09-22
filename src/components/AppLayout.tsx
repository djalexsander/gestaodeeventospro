import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { UpdateBanner } from "@/components/UpdateBanner";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { PwaUpdateBanner } from "@/components/PwaUpdateBanner";
import { Button } from "@/components/ui/button";
import { getParentRoute } from "@/lib/navigation";
import { useStandaloneBackGuard } from "@/hooks/use-standalone-back-guard";


export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const parentRoute = getParentRoute(location.pathname);
  useStandaloneBackGuard();

  return (
    <SidebarProvider>
      <PwaUpdateBanner />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
            <SidebarTrigger />
            {parentRoute && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Voltar"
                onClick={() => navigate(parentRoute)}
                className="shrink-0 -ml-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="font-heading text-lg font-bold text-foreground truncate flex-1">
              Central de Eventos
            </h1>
            <NotificationBell />
          </header>
          
          <UpdateBanner />
          <SubscriptionBanner />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
