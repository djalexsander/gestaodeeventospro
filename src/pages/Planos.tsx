import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, CreditCard } from "lucide-react";
import PlansManager from "@/components/PlansManager";

export default function Planos() {
  const { isAdminMaster, loading: authLoading } = useAuth();

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdminMaster) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h2 className="font-heading text-2xl font-bold">Gerenciar Planos</h2>
      </div>
      <PlansManager />
    </div>
  );
}
