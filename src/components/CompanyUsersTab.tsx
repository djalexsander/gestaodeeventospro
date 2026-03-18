import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'Admin Empresa' },
  { value: 'user', label: 'Usuário' },
];

const ROLE_LABELS: Record<string, string> = {
  company_admin: 'Admin Empresa',
  user: 'Usuário',
};

export default function CompanyUsersTab({ companyId }: { companyId: string }) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'user' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId);

    if (profiles) {
      const ids = profiles.map((p: any) => p.id);
      const { data: roles } = ids.length > 0
        ? await supabase.from('user_roles').select('*').in('user_id', ids)
        : { data: [] };

      const mapped: CompanyUser[] = profiles.map((p: any) => {
        const userRole = (roles || []).find((r: any) => r.user_id === p.id);
        return {
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          role: userRole?.role || 'user',
        };
      }).filter(u => u.role !== 'admin_master');

      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const openNew = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'user' });
    setDialogOpen(true);
  };

  const openEdit = (u: CompanyUser) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingUser) {
      await supabase.from('profiles').update({ name: form.name } as any).eq('id', editingUser.id);
      await supabase.from('user_roles').update({ role: form.role as any }).eq('user_id', editingUser.id);
      toast.success('Usuário atualizado');
      setUsers(prev => prev.map(u => u.id === editingUser.id
        ? { ...u, name: form.name, role: form.role }
        : u
      ));
    } else {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email,
          name: form.name,
          role: form.role,
          company_id: companyId,
        },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Erro ao criar usuário');
      } else {
        toast.success('Convite enviado! O usuário receberá um email para definir sua senha.');
        await fetchUsers();
      }
    }

    setSubmitting(false);
    setDialogOpen(false);
  };

  const handleDelete = async (userId: string) => {
    if (deletingId) return;
    setDeletingId(userId);
    const res = await supabase.functions.invoke('delete-user', { body: { userId } });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao excluir usuário');
    } else {
      toast.success('Usuário excluído');
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Usuários desta empresa</h3>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Usuário
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
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
                  Nenhum usuário nesta empresa
                </TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'company_admin'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
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
                      onClick={() => handleDelete(u.id)}
                    >
                      {deletingId === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-destructive" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  required
                />
                <p className="text-xs text-muted-foreground">O usuário receberá um email para definir sua senha.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingUser ? 'Salvar' : 'Criar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
