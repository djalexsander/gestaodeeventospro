import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function Empresas() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const { refreshCompanies } = useCompany();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("name");
    if (data) setCompanies(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminMaster) fetchCompanies();
  }, [isAdminMaster]);

  if (authLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdminMaster) return <Navigate to="/" replace />;

  const openNew = () => { setEditing(null); setForm({ name: "" }); setLogoFile(null); setDialogOpen(true); };
  const openEdit = (c: CompanyRow) => { setEditing(c); setForm({ name: c.name }); setLogoFile(null); setDialogOpen(true); };

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

    if (editing) {
      const { error } = await supabase.from("companies").update({ name: form.name, logo_url: logoUrl } as any).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar empresa");
      else { toast.success("Empresa atualizada"); await fetchCompanies(); await refreshCompanies(); }
    } else {
      const { error } = await supabase.from("companies").insert({ name: form.name, logo_url: logoUrl } as any);
      if (error) toast.error("Erro ao criar empresa");
      else { toast.success("Empresa criada"); await fetchCompanies(); await refreshCompanies(); }
    }
    setSubmitting(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir empresa");
    else { toast.success("Empresa excluída"); setCompanies(prev => prev.filter(c => c.id !== id)); await refreshCompanies(); }
  };

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
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : companies.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhuma empresa cadastrada</TableCell></TableRow>
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
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ name: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {(editing?.logo_url || logoFile) && (
                  <img src={logoFile ? URL.createObjectURL(logoFile) : editing?.logo_url!} alt="Logo" className="h-10 w-10 rounded object-cover" />
                )}
                <label className="flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer hover:bg-muted transition-colors text-sm">
                  <Upload className="h-4 w-4" />
                  {logoFile ? logoFile.name : "Selecionar arquivo"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex gap-3">
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
