import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Clock, TrendingUp, Building2, BarChart3, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AdminApprovals from "@/components/AdminApprovals";
import { toast } from "sonner";

interface SubRow {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  notes: string;
  plans: { name: string; price: number; type: string } | null;
  companies: { name: string } | null;
}

type CardType = "received" | "pending" | "month" | null;

export default function Financeiro() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [allPlans, setAllPlans] = useState<{ id: string; name: string; price: number; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Detail dialog
  const [detailType, setDetailType] = useState<CardType>(null);

  // Edit dialog
  const [editSub, setEditSub] = useState<SubRow | null>(null);
  const [editForm, setEditForm] = useState({ plan_id: "", status: "", starts_at: "", expires_at: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    if (!isAdminMaster) return;
    setLoading(true);
    Promise.all([
      supabase.from("company_subscriptions").select("*, plans(name, price, type), companies(name)"),
      supabase.from("companies").select("id, name"),
      supabase.from("plans").select("id, name, price, type").eq("is_active", true),
    ]).then(([subsRes, compRes, plansRes]) => {
      setSubs((subsRes.data as any) || []);
      setCompanies((compRes.data as any) || []);
      setAllPlans((plansRes.data as any) || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [isAdminMaster]);

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

  // Detail items based on card type
  const detailItems = useMemo(() => {
    if (detailType === "received") return activeSubs;
    if (detailType === "pending") return pendingSubs;
    if (detailType === "month") return currentMonthSubs;
    return [];
  }, [detailType, activeSubs, pendingSubs, currentMonthSubs]);

  const detailTitle = detailType === "received" ? "Total Recebido" : detailType === "pending" ? "Pendente" : "Receita do Mês Atual";

  const openEdit = (s: SubRow) => {
    setEditSub(s);
    setEditForm({
      plan_id: s.plan_id,
      status: s.status,
      starts_at: s.starts_at?.slice(0, 10) || "",
      expires_at: s.expires_at?.slice(0, 10) || "",
      notes: s.notes || "",
    });
  };

  const handleSave = async () => {
    if (!editSub) return;
    setSaving(true);
    const { error } = await supabase.from("company_subscriptions").update({
      plan_id: editForm.plan_id,
      status: editForm.status,
      starts_at: editForm.starts_at,
      expires_at: editForm.expires_at || null,
      notes: editForm.notes,
    }).eq("id", editSub.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Atualizado com sucesso");
    setEditSub(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("company_subscriptions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Excluído com sucesso");
    fetchData();
  };

  const statusColor = (s: string) => s === "active" ? "default" : s === "expired" ? "destructive" : "secondary";

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
            <Card className="bg-card border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" onClick={() => setDetailType("received")}>
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
            <Card className="bg-card border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" onClick={() => setDetailType("pending")}>
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
            <Card className="bg-card border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" onClick={() => setDetailType("month")}>
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

          <AdminApprovals />
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailType} onOpenChange={open => { if (!open) setDetailType(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTitle} — Detalhes</DialogTitle>
          </DialogHeader>
          {detailItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum registro encontrado.</p>
          ) : (
            <div className="space-y-3">
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailItems.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.companies?.name}</TableCell>
                        <TableCell>{s.plans?.name}</TableCell>
                        <TableCell>R$ {(s.plans?.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(s.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {detailItems.map(s => (
                  <div key={s.id} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{s.companies?.name}</span>
                      <Badge variant={statusColor(s.status)}>{s.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{s.plans?.name} — R$ {(s.plans?.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={open => { if (!open) setEditSub(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura — {editSub?.companies?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plano</Label>
              <Select value={editForm.plan_id} onValueChange={v => setEditForm(f => ({ ...f, plan_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="date" value={editForm.starts_at} onChange={e => setEditForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={editForm.expires_at} onChange={e => setEditForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
