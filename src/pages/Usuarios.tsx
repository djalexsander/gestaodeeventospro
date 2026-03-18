import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { CompanyUsers } from "@/components/CompanyUsers";

export default function Usuarios() {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <CompanyUsers />;
}
