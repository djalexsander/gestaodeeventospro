import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Company } from '@/types';

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user || authLoading) { setLoading(false); return; }
    setLoading(true);

    // All users (including admin_master) load their own company from profiles
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (profile?.company_id) {
      setActiveCompanyId(profile.company_id);
      const { data } = await supabase.from('companies').select('*').eq('id', profile.company_id).single();
      if (data) setCompanies([{ id: (data as any).id, name: (data as any).name, logoUrl: (data as any).logo_url }]);
    }

    setLoading(false);
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchCompanies();
    }
  }, [fetchCompanies, authLoading]);

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

  return (
    <CompanyContext.Provider value={{
      companies, activeCompany, activeCompanyId, setActiveCompanyId, loading,
      refreshCompanies: fetchCompanies,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used within CompanyProvider');
  return context;
}
