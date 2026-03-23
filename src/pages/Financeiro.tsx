import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Clock, TrendingUp, Building2, BarChart3, FileDown, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SubRow {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  plans: { name: string; price: number; type: string } | null;
  companies: { name: string } | null;
}

export default function Financeiro() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!isAdminMaster) return;
    setLoading(true);
    Promise.all([
      supabase.from("company_subscriptions").select("*, plans(name, price, type), companies(name)"),
      supabase.from("companies").select("id, name"),
    ]).then(([subsRes, compRes]) => {
      setSubs((subsRes.data as any) || []);
      setCompanies((compRes.data as any) || []);
      setLoading(false);
    });
  }, [isAdminMaster]);

  const year = parseInt(selectedYear);

  const filtered = useMemo(() => {
    let f = subs;
    if (selectedPlan !== "all") f = f.filter(s => s.plans?.name === selectedPlan);
    return f;
  }, [subs, selectedPlan]);

  const activeSubs = filtered.filter(s => s.status === "active");
  const activeCompanyIds = new Set(activeSubs.map(s => s.company_id));

  const totalReceived = activeSubs.reduce((sum, s) => sum + (s.plans?.price || 0), 0);
  const pendingSubs = filtered.filter(s => s.status === "expired" || s.status === "cancelled");
  const pendingTotal = pendingSubs.reduce((sum, s) => sum + (s.plans?.price || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentMonthSubs = activeSubs.filter(s => {
    const d = new Date(s.starts_at);
    return d.getMonth() === currentMonth && d.getFullYear() === year;
  });
  const currentMonthRevenue = currentMonthSubs.reduce((sum, s) => sum + (s.plans?.price || 0), 0);

  const planNames = [...new Set(subs.map(s => s.plans?.name).filter(Boolean))];

  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const chartData = months.map((m, i) => {
    const monthSubs = filtered.filter(s => {
      const d = new Date(s.starts_at);
      return d.getMonth() === i && d.getFullYear() === year && s.status === "active";
    });
    return { name: `${m}/${String(year).slice(2)}`, valor: monthSubs.reduce((sum, s) => sum + (s.plans?.price || 0), 0) };
  });

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdminMaster) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Financeiro Master</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos os planos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              {planNames.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">Total Recebido</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <TrendingUp className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {currentMonthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">Receita do Mês Atual</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCompanyIds.size} / {companies.length}</p>
                  <p className="text-xs text-muted-foreground">Empresas Ativas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-bold">Receita Mensal (últimos 12 meses)</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
                />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
