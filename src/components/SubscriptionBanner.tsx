import { AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

export function SubscriptionBanner() {
  const { isReadOnly, isExpired, daysRemaining, subscription } = useSubscription();
  const { isAdminMaster } = useAuth();

  // Admin Master never sees subscription banners
  if (isAdminMaster) return null;

  if (!isExpired) {
    // Show warning when < 5 days remaining
    if (daysRemaining !== null && daysRemaining <= 5 && daysRemaining > 0) {
      return (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Seu plano expira em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}. Entre em contato para renovação.
        </div>
      );
    }
    return null;
  }

  if (!isReadOnly) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 inline mr-2" />
      {subscription ? 'Seu plano expirou.' : 'Nenhum plano ativo.'}{' '}
      O sistema está em modo somente leitura. Entre em contato com o administrador.
    </div>
  );
}
