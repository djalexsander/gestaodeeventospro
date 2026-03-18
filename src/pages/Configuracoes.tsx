import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Settings, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Configuracoes() {
  const { isAdminMaster, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminMaster) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="font-heading text-2xl font-bold">Configurações</h2>
      </div>

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-lg">Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Em breve: configurações globais do sistema, personalização de tema, preferências de notificação e mais.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
