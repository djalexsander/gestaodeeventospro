import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';

export interface Plan {
  id: string;
  name: string;
  type: 'trial' | 'monthly' | 'lifetime';
  durationDays: number | null;
  price: number;
  description: string;
  isActive: boolean;
}

export interface CompanySubscription {
  id: string;
  companyId: string;
  planId: string;
  status: 'active' | 'expired' | 'cancelled';
  startsAt: string;
  expiresAt: string | null;
  notes: string;
  plan?: Plan;
}

interface SubscriptionContextType {
  plans: Plan[];
  subscription: CompanySubscription | null;
  isReadOnly: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  loading: boolean;
  refreshPlans: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { activeCompanyId } = useCompany();
  const { user, isAdminMaster, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifiedExpiration, setNotifiedExpiration] = useState<string | null>(null);

  const notifyCompanyUsersOfExpiration = useCallback(async (companyId: string, subId: string) => {
    // Only notify once per subscription
    if (notifiedExpiration === subId) return;
    setNotifiedExpiration(subId);

    // Get all users from this company
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId);

    if (!profiles || profiles.length === 0) return;

    const rows = profiles.map((p: any) => ({
      user_id: p.id,
      company_id: companyId,
      type: 'warning',
      title: 'Plano Expirado',
      message: 'O plano da sua empresa expirou. O sistema está em modo somente leitura. Acesse Plano & Assinatura para renovar.',
    }));

    await supabase.from('notifications').insert(rows);
  }, [notifiedExpiration]);

  const fetchPlans = useCallback(async () => {
    const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('price');
    if (data) {
      setPlans(data.map((p: any) => ({
        id: p.id, name: p.name, type: p.type,
        durationDays: p.duration_days, price: Number(p.price),
        description: p.description, isActive: p.is_active,
      })));
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!activeCompanyId) { setSubscription(null); setLoading(false); return; }

    const { data } = await supabase
      .from('company_subscriptions')
      .select('*, plans(*)')
      .eq('company_id', activeCompanyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const plan = data.plans ? {
        id: (data.plans as any).id, name: (data.plans as any).name,
        type: (data.plans as any).type as Plan['type'],
        durationDays: (data.plans as any).duration_days,
        price: Number((data.plans as any).price),
        description: (data.plans as any).description,
        isActive: (data.plans as any).is_active,
      } : undefined;

      const sub: CompanySubscription = {
        id: data.id, companyId: data.company_id, planId: data.plan_id,
        status: data.status as CompanySubscription['status'],
        startsAt: data.starts_at, expiresAt: data.expires_at,
        notes: data.notes, plan,
      };

      // Check if expired
      if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
        sub.status = 'expired';
        // Update in DB
        await supabase.from('company_subscriptions').update({ status: 'expired' }).eq('id', sub.id);
        // Notify all company users about expiration
        await notifyCompanyUsersOfExpiration(activeCompanyId, sub.id);
      }

      setSubscription(sub);
    } else {
      setSubscription(null);
    }
    setLoading(false);
  }, [activeCompanyId]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPlans();
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [authLoading, user, fetchPlans, fetchSubscription]);

  const isExpired = !isAdminMaster && (
    !subscription ||
    subscription.status === 'expired' ||
    subscription.status === 'cancelled' ||
    (subscription.expiresAt && new Date(subscription.expiresAt) < new Date())
  );

  const isReadOnly = !isAdminMaster && !!user && !authLoading && isExpired;

  const daysRemaining = subscription?.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : subscription?.plan?.type === 'lifetime' ? null : null;

  return (
    <SubscriptionContext.Provider value={{
      plans, subscription, isReadOnly, isExpired: !!isExpired,
      daysRemaining, loading,
      refreshPlans: fetchPlans,
      refreshSubscription: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
}
