import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { AppProvider } from "@/context/AppContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { AppLayout } from "@/components/AppLayout";
import { PwaUpdateBanner } from "@/components/PwaUpdateBanner";
import { Loader2 } from "lucide-react";

import Index from "./pages/Index";
import Artistas from "./pages/Artistas";
import Riders from "./pages/Riders";
import Cidades from "./pages/Cidades";
import Admin from "./pages/Admin";
import Funcionarios from "./pages/Funcionarios";
import Empresas from "./pages/Empresas";
import Usuarios from "./pages/Usuarios";
import PainelMaster from "./pages/PainelMaster";
import Planos from "./pages/Planos";
import Financeiro from "./pages/Financeiro";
import Configuracoes from "./pages/Configuracoes";
import PlanoAssinatura from "./pages/PlanoAssinatura";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function CompanyRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function MasterRoute({ children }: { children: React.ReactNode }) {
  const { isAdminMaster, loading } = useAuth();

  if (loading) return null;
  if (!isAdminMaster) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function DefaultRedirect() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Index />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DefaultRedirect />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/eventos"
        element={
          <ProtectedRoute>
            <CompanyRoute>
              <AppLayout>
                <Index />
              </AppLayout>
            </CompanyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/artistas"
        element={
          <ProtectedRoute>
            <CompanyRoute>
              <AppLayout>
                <Artistas />
              </AppLayout>
            </CompanyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/riders"
        element={
          <ProtectedRoute>
            <CompanyRoute>
              <AppLayout>
                <Riders />
              </AppLayout>
            </CompanyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cidades"
        element={
          <ProtectedRoute>
            <CompanyRoute>
              <AppLayout>
                <Cidades />
              </AppLayout>
            </CompanyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/funcionarios"
        element={
          <ProtectedRoute>
            <CompanyRoute>
              <AppLayout>
                <Funcionarios />
              </AppLayout>
            </CompanyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <CompanyRoute>
              <AppLayout>
                <Usuarios />
              </AppLayout>
            </CompanyRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/master"
        element={
          <ProtectedRoute>
            <MasterRoute>
              <AppLayout>
                <PainelMaster />
              </AppLayout>
            </MasterRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/empresas"
        element={
          <ProtectedRoute>
            <MasterRoute>
              <AppLayout>
                <Empresas />
              </AppLayout>
            </MasterRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/planos"
        element={
          <ProtectedRoute>
            <MasterRoute>
              <AppLayout>
                <Planos />
              </AppLayout>
            </MasterRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/financeiro"
        element={
          <ProtectedRoute>
            <MasterRoute>
              <AppLayout>
                <Financeiro />
              </AppLayout>
            </MasterRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <MasterRoute>
              <AppLayout>
                <Admin />
              </AppLayout>
            </MasterRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <MasterRoute>
              <AppLayout>
                <Configuracoes />
              </AppLayout>
            </MasterRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaUpdateBanner />

      <AuthProvider>
        <CompanyProvider>
          <SubscriptionProvider>
            <AppProvider>
              <HashRouter>
                <AppRoutes />
              </HashRouter>
            </AppProvider>
          </SubscriptionProvider>
        </CompanyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
