import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Loader2, Trash2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin_master: 'Admin Master',
  company_admin: 'Admin Empresa',
  admin: 'Admin',
  user: 'Usuário',
};

export default function Admin() {
  const { isAdmin, isAdminMaster, loading: authLoading, user } = useAuth();
  const { companies } = useCompany();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'user', company_id: '' });

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');

    if (profiles && roles) {
      setUsers(profiles.map((p: any) => {
        const userRole = roles.find((r: any) => r.user_id === p.id);
        return {
          id: p.id, name: p.name || p.email, email: p.email,
          role: userRole?.role || 'user', company_id: p.company_id || null,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const openNew = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'user', company_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, company_id: u.company_id || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingUser) {
      await supabase.from('profiles').update({
        name: form.name,
        ...(form.company_id ? { company_id: form.company_id } : {}),
      } as any).eq('id', editingUser.id);
      await supabase.from('user_roles').update({ role: form.role as any }).eq('user_id', editingUser.id);
      toast.success('Usuário atualizado');
      setUsers(prev => prev.map(u => u.id === editingUser.id
        ? { ...u, name: form.name, role: form.role, company_id: form.company_id || null }
        : u
      ));
    } else {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email, name: form.name,
          role: form.role, company_id: form.company_id || null,
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

  const deleteUser = async (userId: string) => {
    const res = await supabase.functions.invoke('delete-user', {
      body: { userId },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao excluir usuário');
    } else {
      toast.success('Usuário excluído');
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return '—';
    return companies.find(c => c.id === companyId)?.name || '—';
  };

  const availableRoles = isAdminMaster
    ? [
        { value: 'admin_master', label: 'Admin Master' },
        { value: 'company_admin', label: 'Admin Empresa' },
        { value: 'user', label: 'Usuário' },
      ]
    : [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'Usuário' },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Gerenciamento de Usuários</h2>
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
              <TableHead>Papel</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin_master'
                      ? 'bg-destructive/10 text-destructive'
                      : u.role === 'admin' || u.role === 'company_admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{getCompanyName(u.company_id)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
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
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" required />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {companies.length > 0 && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={form.company_id} onValueChange={v => setForm(p => ({ ...p, company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
