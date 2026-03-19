import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  company_admin: "Administrador da Empresa",
  user: "Usuário",
};

export function CompanyUsers() {
  const { activeCompanyId } = useCompany();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user" });

  const fetchUsers = async () => {
    if (!activeCompanyId) return;
    setLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("company_id", activeCompanyId);

    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles && roles) {
      const mapped: CompanyUser[] = profiles
        .map((p: any) => {
          const userRole = roles.find((r: any) => r.user_id === p.id);
          return {
            id: p.id,
            name: p.name || p.email,
            email: p.email,
            role: userRole?.role || "user",
          };
        })
        .filter((u) => u.role !== "admin_master");
      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [activeCompanyId]);

  const openNew = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", role: "user" });
    setDialogOpen(true);
  };

  const openEdit = (u: CompanyUser) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    if (editingUser) {
      await supabase
        .from("profiles")
        .update({ name: form.name } as any)
        .eq("id", editingUser.id);
      await supabase
        .from("user_roles")
        .update({ role: form.role as any })
        .eq("user_id", editingUser.id);
      toast.success("Usuário atualizado");
      await fetchUsers();
    } else {
      if (!activeCompanyId) {
        toast.error("Nenhuma empresa selecionada");
        setSubmitting(false);
        return;
      }

      const res = await supabase.functions.invoke("create-company-user", {
        body: {
          email: form.email,
          name: form.name,
          role: form.role,
          company_id: activeCompanyId,
        },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Erro ao criar usuário");
      } else {
        toast.success("Usuário criado com sucesso!");
        await fetchUsers();
      }
    }

    setSubmitting(false);
    setDialogOpen(false);
  };

  const deleteUser = async (userId: string) => {
    if (deletingId) return;
    setDeletingId(userId);
    const res = await supabase.functions.invoke("delete-user", {
      body: { userId },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || "Erro ao excluir usuário");
    } else {
      toast.success("Usuário excluído");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setDeletingId(null);
  };

  if (!activeCompanyId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Selecione uma empresa para gerenciar usuários</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Usuários da Empresa</h2>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário cadastrado nesta empresa
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "company_admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === u.id}
                        onClick={() => deleteUser(u.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Senha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_admin">Administrador da Empresa</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usuários podem apenas visualizar a agenda e baixar PDFs.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingUser ? "Salvar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
