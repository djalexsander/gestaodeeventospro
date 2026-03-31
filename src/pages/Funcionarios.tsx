import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useCompany } from "@/context/CompanyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Users, UserPlus, Phone, Briefcase, Pencil } from "lucide-react";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  type: "equipe" | "freelancer";
  notes: string;
}

export default function Funcionarios() {
  const { isAdmin, isAdminMaster } = useAuth();
  const { activeCompanyId } = useCompany();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<"equipe" | "freelancer">("equipe");
  const [form, setForm] = useState({ name: "", phone: "", role: "", notes: "" });

  const fetchStaff = async () => {
    if (!activeCompanyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("staff_members")
      .select("*")
      .eq("company_id", activeCompanyId)
      .order("name");
    if (error) {
      toast.error("Erro ao carregar funcionários");
    } else {
      setStaff(data as StaffMember[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, [activeCompanyId]);

  const openAdd = () => {
    setEditingMember(null);
    setForm({ name: "", phone: "", role: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingMember(member);
    setForm({ name: member.name, phone: member.phone, role: member.role, notes: member.notes });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (editingMember) {
      const { error } = await supabase.from("staff_members").update({
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role.trim(),
        notes: form.notes.trim(),
      }).eq("id", editingMember.id);
      if (error) {
        toast.error("Erro ao atualizar funcionário");
      } else {
        toast.success("Funcionário atualizado!");
        setDialogOpen(false);
        fetchStaff();
      }
    } else {
      const { error } = await supabase.from("staff_members").insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role.trim(),
        type: activeTab,
        notes: form.notes.trim(),
        company_id: activeCompanyId,
      });
      if (error) {
        toast.error("Erro ao adicionar funcionário");
      } else {
        toast.success("Funcionário adicionado!");
        setDialogOpen(false);
        fetchStaff();
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    const { error } = await supabase.from("staff_members").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir funcionário");
    } else {
      toast.success("Funcionário excluído!");
      fetchStaff();
    }
  };

  const filtered = staff.filter((s) => s.type === activeTab);

  if (isAdminMaster) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Funcionários</h1>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Users className="h-10 w-10 opacity-40" />
          <p className="text-sm">Admin Master não tem acesso aos dados de funcionários da empresa.</p>
        </div>
      </div>
    );
  }

  const StaffList = ({ items }: { items: StaffMember[] }) => (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8">
          Nenhum {activeTab === "equipe" ? "membro da equipe" : "freelancer"} cadastrado.
        </p>
      )}
      {items.map((member) => (
        <Card key={member.id} className="group">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{member.name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {member.role && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {member.role}
                  </span>
                )}
                {member.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {member.phone}
                  </span>
                )}
              </div>
              {member.notes && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{member.notes}</p>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(member)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDelete(member.id, member.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Funcionários</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua equipe e freelancers</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Editar Funcionário" : `Adicionar ${activeTab === "equipe" ? "Membro da Equipe" : "Freelancer"}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label>Função</Label>
                  <Input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Ex: Técnico de som, Roadie..."
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observações..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>{editingMember ? "Salvar" : "Adicionar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "equipe" | "freelancer")}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="equipe" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="freelancer" className="flex-1 gap-2">
            <UserPlus className="h-4 w-4" />
            Freelancer
          </TabsTrigger>
        </TabsList>
        <TabsContent value="equipe">
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : (
            <StaffList items={filtered} />
          )}
        </TabsContent>
        <TabsContent value="freelancer">
          {loading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : (
            <StaffList items={filtered} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
