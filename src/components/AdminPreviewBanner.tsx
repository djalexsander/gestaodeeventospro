import { useAuth } from "@/context/AuthContext";
import { Eye } from "lucide-react";

export function AdminPreviewBanner() {
  const { isAdminMaster } = useAuth();

  if (!isAdminMaster) return null;

  return (
    <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 px-4 py-2 flex items-center gap-2 text-sm">
      <Eye className="h-4 w-4 shrink-0" />
      <span className="font-medium">Modo visualização — Admin Master não tem acesso aos dados da empresa</span>
    </div>
  );
}
