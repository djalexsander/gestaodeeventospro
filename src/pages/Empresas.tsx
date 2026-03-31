import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Trash2, Loader2, Upload, ImageIcon, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
  email: string;
  phone: string;
}

interface PlanOption { id: string; name: string; type: string; duration_days: number | null; price: number; }
interface ActiveSub { company_id: string; plan_name: string; status: string; expires_at: string | null; }

export default function Empresas() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const { refreshCompanies } = useCompany();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [selectedRole, setSelectedRole] = useState<string>("company_admin");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("none");
  const [activeSubs, setActiveSubs] = useState<ActiveSub[]>([]);

  const fetchCompanies = async () => {
    setLoading(true);
    const [compRes, plansRes, subsRes] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("plans").select("id, name, type, duration_days, price").eq("is_active", true).order("price"),
      supabase.from("company_subscriptions").select("company_id, status, expires_at, plans(name)").eq("status", "active"),
    ]);
    if (compRes.data) setCompanies(compRes.data as any);
    if (plansRes.data) setPlans(plansRes.data as any);
    if (subsRes.data) setActiveSubs(subsRes.data.map((s: any) => ({
      company_id: s.company_id, plan_name: s.plans?.name || '—',
      status: s.status, expires_at: s.expires_at,
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminMaster) fetchCompanies();
  }, [isAdminMaster]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview(null);
  }, [logoFile]);

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdminMaster) return <Navigate to="/" replace />;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "" });
    setLogoFile(null);
    setSelectedPlanId("none");
    setSelectedRole("company_admin");
    setSelectedStatus("active");
    setExpirationDate("");
    setDialogOpen(true);
  };

  const openEdit = (c: CompanyRow) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "" });
    setLogoFile(null);
    const sub = activeSubs.find(s => s.company_id === c.id);
    setSelectedPlanId("none");
    setSelectedRole("company_admin");
    setSelectedStatus(sub?.status || "active");
    setExpirationDate(sub?.expires_at ? new Date(sub.expires_at).toISOString().split("T")[0] : "");
    setDialogOpen(true);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, file);
    if (error) { toast.error("Erro ao enviar logo"); return null; }
    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    let logoUrl = editing?.logo_url || null;
    if (logoFile) {
      const url = await uploadLogo(logoFile);
      if (url) logoUrl = url;
    }

    const payload = { name: form.name, logo_url: logoUrl, email: form.email, phone: form.phone } as any;

    if (editing) {
      const { error } = await supabase.from("companies").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar empresa"); }
      else {
        // Update or create subscription
        if (selectedPlanId !== "none") {
          const plan = plans.find(p => p.id === selectedPlanId);
          let expiresAt: string | null = expirationDate || null;
          if (!expiresAt && plan && plan.duration_days) {
            const exp = new Date();
            exp.setDate(exp.getDate() + plan.duration_days);
            expiresAt = exp.toISOString();
          }
          // Deactivate old subscriptions
          await supabase.from("company_subscriptions").update({ status: "cancelled" }).eq("company_id", editing.id).eq("status", "active");
          // Create new subscription
          await supabase.from("company_subscriptions").insert({
            company_id: editing.id,
            plan_id: selectedPlanId,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt,
            status: selectedStatus,
          });
        } else {
          // Remove active subscriptions if "Sem plano"
          await supabase.from("company_subscriptions").update({ status: "cancelled" }).eq("company_id", editing.id).eq("status", "active");
        }
        toast.success("Empresa atualizada");
        await fetchCompanies();
        await refreshCompanies();
      }
    } else {
      const { data: newCompany, error } = await supabase.from("companies").insert(payload).select().single();
      if (error) toast.error("Erro ao criar empresa");
      else {
        // Assign plan if selected
        if (selectedPlanId !== "none" && newCompany) {
          const plan = plans.find(p => p.id === selectedPlanId);
          let expiresAt: string | null = expirationDate || null;
          if (!expiresAt && plan && plan.duration_days) {
            const exp = new Date();
            exp.setDate(exp.getDate() + plan.duration_days);
            expiresAt = exp.toISOString();
          }
          await supabase.from("company_subscriptions").insert({
            company_id: newCompany.id,
            plan_id: selectedPlanId,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt,
            status: selectedStatus,
          });
        }
        toast.success("Empresa criada");
        await fetchCompanies();
        await refreshCompanies();
      }
    }
    setSubmitting(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir empresa");
    else { toast.success("Empresa excluída"); setCompanies(prev => prev.filter(c => c.id !== id)); await refreshCompanies(); }
  };

  const displayLogo = logoPreview || editing?.logo_url;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Empresas</h2>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova Empresa</Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Logo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Plano</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
            ) : companies.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{c.email || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{c.phone || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {(() => {
                    const sub = activeSubs.find(s => s.company_id === c.id);
                    return sub ? (
                      <Badge variant="outline" className="gap-1">
                        <CreditCard className="h-3 w-3" /> {sub.plan_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem plano</span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Logo da Empresa</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden">
                  {displayLogo ? (
                    <img src={displayLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover:bg-muted transition-colors text-sm font-medium">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                  </label>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG ou SVG • Máx 2MB</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome da Empresa <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={selectedPlanId} onValueChange={v => {
                  setSelectedPlanId(v);
                  if (v !== "none") {
                    const plan = plans.find(p => p.id === v);
                    if (plan && plan.duration_days && !expirationDate) {
                      const exp = new Date();
                      exp.setDate(exp.getDate() + plan.duration_days);
                      setExpirationDate(exp.toISOString().split("T")[0]);
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Sem plano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {plans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — R$ {Number(p.price).toFixed(2)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Papel do Usuário</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_admin">Admin da Empresa</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
