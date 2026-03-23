import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { CompanyUsers } from "@/components/CompanyUsers";

export default function Usuarios() {
  const { isAdmin, isAdminMaster, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  if (isAdminMaster) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Usuários da Empresa</h1>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Shield className="h-10 w-10 opacity-40" />
          <p className="text-sm">Admin Master não tem acesso aos dados de usuários da empresa.</p>
        </div>
      </div>
    );
  }

  return <CompanyUsers />;
}
