import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Navigate } from 'react-router-dom';
import { Crown, Building2, Users, Activity, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PainelMaster() {
  const { isAdminMaster, loading: authLoading, session } = useAuth();
  const { companies } = useCompany();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminMaster) return <Navigate to="/" replace />;

  const handleReset = async () => {
    if (confirmText !== 'RESETAR') return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-system', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Sistema resetado com sucesso!');
      setShowConfirm(false);
      setConfirmText('');
      // Reload to refresh all contexts
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar sistema');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-primary" />
        <h2 className="font-heading text-2xl font-bold">Painel Master</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">cadastradas no sistema</p>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Ativo</div>
            <p className="text-xs text-muted-foreground">sistema operacional</p>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visão</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Global</div>
            <p className="text-xs text-muted-foreground">acesso a todas as empresas</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
