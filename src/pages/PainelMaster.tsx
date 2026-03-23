import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Navigate } from 'react-router-dom';
import { Crown, Building2, Users, Activity, Loader2, X, Mail, Phone, Shield, CreditCard } from 'lucide-react';
import PlansManager from '@/components/PlansManager';
import CompanySubscriptionManager from '@/components/CompanySubscriptionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  company_id: string | null;
}

interface CompanyRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  created_at: string;
}

export default function PainelMaster() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const { companies } = useCompany();
  const [activeModal, setActiveModal] = useState<'empresas' | 'status' | 'visao' | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [companyRows, setCompanyRows] = useState<CompanyRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (activeModal === 'empresas' || activeModal === 'visao') {
      setLoadingData(true);
      Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('profiles').select('id, name, email, company_id'),
      ]).then(([compRes, profRes]) => {
        setCompanyRows((compRes.data as CompanyRow[]) || []);
        setProfiles((profRes.data as ProfileRow[]) || []);
        setLoadingData(false);
      });
    }
  }, [activeModal]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminMaster) return <Navigate to="/" replace />;

  const renderModalContent = () => {
    if (loadingData) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (activeModal === 'empresas') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Empresas Cadastradas</h3>
            <span className="ml-auto text-sm text-muted-foreground">{companyRows.length} total</span>
          </div>
          {companyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma empresa cadastrada</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {companyRows.map((c) => {
                const usersCount = profiles.filter(p => p.company_id === c.id).length;
                return (
                  <div key={c.id} className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span className="font-medium">{c.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{usersCount} usuário(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (activeModal === 'status') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Status do Sistema</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <span className="text-sm font-medium">Plataforma</span>
              <span className="text-sm font-bold text-primary">Ativo</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <span className="text-sm font-medium">Banco de Dados</span>
              <span className="text-sm font-bold text-primary">Conectado</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <span className="text-sm font-medium">Autenticação</span>
              <span className="text-sm font-bold text-primary">Operacional</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
              <span className="text-sm font-medium">Empresas Ativas</span>
              <span className="text-sm font-bold">{companies.length}</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeModal === 'visao') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Visão Global</h3>
            <span className="ml-auto text-sm text-muted-foreground">{profiles.length} usuário(s)</span>
          </div>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {profiles.map((p) => {
                const company = companyRows.find(c => c.id === p.company_id);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {company ? company.name : 'Admin Master'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-primary" />
        <h2 className="font-heading text-2xl font-bold">Painel Master</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="bg-card border cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          onClick={() => setActiveModal('empresas')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">cadastradas no sistema</p>
          </CardContent>
        </Card>

        <Card
          className="bg-card border cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          onClick={() => setActiveModal('status')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Ativo</div>
            <p className="text-xs text-muted-foreground">sistema operacional</p>
          </CardContent>
        </Card>

        <Card
          className="bg-card border cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          onClick={() => setActiveModal('visao')}
        >
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

      {/* Gestão de Planos */}
      <div className="space-y-6 mt-8">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-xl font-bold">Gestão de Planos</h3>
        </div>
        <PlansManager />
        <CompanySubscriptionManager />
      </div>

      {/* Modal flutuante */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-border bg-background p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}
