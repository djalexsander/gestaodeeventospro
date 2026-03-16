import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
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
}

export default function Admin() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');

    if (profiles && roles) {
      setUsers(profiles.map((p: any) => {
        const userRole = roles.find((r: any) => r.user_id === p.id);
        return { id: p.id, name: p.name || p.email, email: p.email, role: userRole?.role || 'user' };
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
    setForm({ name: '', email: '', password: '', role: 'user' });
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingUser) {
      // Update name in profile
      await supabase.from('profiles').update({ name: form.name }).eq('id', editingUser.id);
      // Update role
      await supabase.from('user_roles').update({ role: form.role as any }).eq('user_id', editingUser.id);
      toast.success('Usuário atualizado');
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: form.name, role: form.role } : u));
    } else {
      // Create user via edge function
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: { email: form.email, password: form.password, name: form.name, role: form.role },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Erro ao criar usuário');
      } else {
        toast.success('Usuário criado com sucesso');
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
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Usuário'}
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
                      onClick={() => deleteUser(u.id)}
                      disabled={u.id === user?.id}
                    >
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
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select
                value={form.role}
                onValueChange={v => setForm(p => ({ ...p, role: v }))}
                disabled={editingUser?.id === user?.id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingUser ? 'Salvar' : 'Criar'}
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
