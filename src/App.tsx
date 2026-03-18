import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { AppProvider } from "@/context/AppContext";
import { AppLayout } from "@/components/AppLayout";
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
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Company routes — admin_master can view layout but data is empty */
function CompanyRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** Blocks company users from master-level routes */
function MasterRoute({ children }: { children: React.ReactNode }) {
  const { isAdminMaster, loading } = useAuth();
  if (loading) return null;
  if (!isAdminMaster) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  return <Index />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      {/* Default route: redirect based on role */}
      <Route path="/" element={<ProtectedRoute><AppLayout><DefaultRedirect /></AppLayout></ProtectedRoute>} />
      {/* Company routes — blocked for admin_master */}
      <Route path="/eventos" element={<ProtectedRoute><CompanyRoute><AppLayout><Index /></AppLayout></CompanyRoute></ProtectedRoute>} />
      <Route path="/artistas" element={<ProtectedRoute><CompanyRoute><AppLayout><Artistas /></AppLayout></CompanyRoute></ProtectedRoute>} />
      <Route path="/riders" element={<ProtectedRoute><CompanyRoute><AppLayout><Riders /></AppLayout></CompanyRoute></ProtectedRoute>} />
      <Route path="/cidades" element={<ProtectedRoute><CompanyRoute><AppLayout><Cidades /></AppLayout></CompanyRoute></ProtectedRoute>} />
      <Route path="/funcionarios" element={<ProtectedRoute><CompanyRoute><AppLayout><Funcionarios /></AppLayout></CompanyRoute></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><CompanyRoute><AppLayout><Usuarios /></AppLayout></CompanyRoute></ProtectedRoute>} />
      {/* Master routes — blocked for company users */}
      <Route path="/master" element={<ProtectedRoute><MasterRoute><AppLayout><PainelMaster /></AppLayout></MasterRoute></ProtectedRoute>} />
      <Route path="/empresas" element={<ProtectedRoute><MasterRoute><AppLayout><Empresas /></AppLayout></MasterRoute></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><MasterRoute><AppLayout><Admin /></AppLayout></MasterRoute></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><MasterRoute><AppLayout><Configuracoes /></AppLayout></MasterRoute></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <CompanyProvider>
          <AppProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AppProvider>
        </CompanyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
