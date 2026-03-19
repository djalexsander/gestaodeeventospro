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
import { Globe, Loader2, Trash2, Pencil, ShieldCheck, Shield, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string | null;
}

const ROLE_LABELS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  admin_master: {
    label: 'Master Admin',
    icon: <ShieldCheck className="h-3 w-3 mr-1" />,
    className: 'bg-destructive/10 text-destructive',
  },
  company_admin: {
    label: 'Admin Empresa',
    icon: <Shield className="h-3 w-3 mr-1" />,
    className: 'bg-primary/10 text-primary',
  },
  admin: {
    label: 'Admin',
    icon: <Shield className="h-3 w-3 mr-1" />,
    className: 'bg-primary/10 text-primary',
  },
  user: {
    label: 'Usuário',
    icon: <UsersIcon className="h-3 w-3 mr-1" />,
    className: 'bg-muted text-muted-foreground',
  },
};

export default function Admin() {
  const { isAdmin, isAdminMaster, loading: authLoading, user } = useAuth();
  const { companies } = useCompany();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: '', role: '', company_id: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');

    if (profiles && roles) {
      const mapped = profiles.map((p: any) => {
        const userRole = roles.find((r: any) => r.user_id === p.id);
        return {
          id: p.id, name: p.name || p.email, email: p.email,
          role: userRole?.role || 'user', company_id: p.company_id || null,
        };
      });
      setUsers(mapped);
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

  if (!isAdminMaster) return <Navigate to="/" replace />;

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({ name: u.name, role: u.role, company_id: u.company_id || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);

    await supabase.from('profiles').update({
      name: form.name,
      ...(form.company_id && form.company_id !== 'none' ? { company_id: form.company_id } : { company_id: null }),
    } as any).eq('id', editingUser.id);
    await supabase.from('user_roles').update({ role: form.role as any }).eq('user_id', editingUser.id);
    toast.success('Usuário atualizado');
    await fetchUsers();

    setSubmitting(false);
    setDialogOpen(false);
  };

  const deleteUser = async (userId: string) => {
    if (deletingId) return;
    setDeletingId(userId);
    const res = await supabase.functions.invoke('delete-user', {
      body: { userId },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao excluir usuário');
    } else {
      toast.success('Usuário excluído');
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeletingId(null);
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return '—';
    return companies.find(c => c.id === companyId)?.name || '—';
  };

  const availableRoles = [
    { value: 'admin_master', label: 'Master Admin' },
    { value: 'company_admin', label: 'Admin Empresa' },
    { value: 'user', label: 'Usuário' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="font-heading text-2xl font-bold">Usuários Globais</h2>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
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
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : users.map(u => {
              const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
              const isSelf = u.id === user?.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{getCompanyName(u.company_id)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.className}`}>
                      {roleInfo.icon}
                      {roleInfo.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="gap-1">
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                      {!isSelf && u.role !== 'admin_master' && (
                        <Button variant="ghost" size="icon" disabled={deletingId === u.id} onClick={() => deleteUser(u.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
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
                Salvar
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
