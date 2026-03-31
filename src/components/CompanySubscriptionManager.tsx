import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, CreditCard, Building2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface SubRow {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  notes: string;
  companies: { name: string } | null;
  plans: { name: string; type: string; duration_days: number | null } | null;
}

interface PlanRow { id: string; name: string; type: string; duration_days: number | null; }
interface CompanyRow { id: string; name: string; }

export default function CompanySubscriptionManager() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ company_id: '', plan_id: '', notes: '', status: 'active', starts_at: '', expires_at: '' });

  const fetchAll = async () => {
    setLoading(true);
    const [subsRes, plansRes, compRes] = await Promise.all([
      supabase.from('company_subscriptions').select('*, companies(name), plans(name, type, duration_days)').order('created_at', { ascending: false }),
      supabase.from('plans').select('id, name, type, duration_days').eq('is_active', true).order('price'),
      supabase.from('companies').select('id, name').order('name'),
    ]);
    if (subsRes.data) setSubs(subsRes.data as any);
    if (plansRes.data) setPlans(plansRes.data as any);
    if (compRes.data) setCompanies(compRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ company_id: '', plan_id: '', notes: '', status: 'active', starts_at: '', expires_at: '' });
    setDialogOpen(true);
  };

  const openEdit = (s: SubRow) => {
    setEditingId(s.id);
    setForm({
      company_id: s.company_id,
      plan_id: s.plan_id,
      notes: s.notes || '',
      status: s.status,
      starts_at: s.starts_at ? s.starts_at.slice(0, 10) : '',
      expires_at: s.expires_at ? s.expires_at.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (editingId) {
      const updateData: any = {
        plan_id: form.plan_id,
        status: form.status,
        notes: form.notes,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      const { error } = await supabase.from('company_subscriptions').update(updateData).eq('id', editingId);
      if (error) toast.error('Erro ao atualizar');
      else { toast.success('Assinatura atualizada'); fetchAll(); }
    } else {
      const plan = plans.find(p => p.id === form.plan_id);
      const startsAt = form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString();
      let expiresAt: string | null = form.expires_at ? new Date(form.expires_at).toISOString() : null;
      if (!expiresAt && plan?.duration_days) {
        const exp = new Date(startsAt);
        exp.setDate(exp.getDate() + plan.duration_days);
        expiresAt = exp.toISOString();
      }

      await supabase.from('company_subscriptions')
        .update({ status: 'cancelled' } as any)
        .eq('company_id', form.company_id)
        .eq('status', 'active');

      const { error } = await supabase.from('company_subscriptions').insert({
        company_id: form.company_id,
        plan_id: form.plan_id,
        starts_at: startsAt,
        expires_at: expiresAt,
        notes: form.notes,
        status: form.status,
      });
      if (error) toast.error('Erro ao atribuir plano');
      else { toast.success('Plano atribuído com sucesso'); fetchAll(); }
    }
    setSubmitting(false);
    setDialogOpen(false);
  };

  const deleteSub = async (id: string) => {
    const { error } = await supabase.from('company_subscriptions').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Assinatura excluída'); fetchAll(); }
  };

  const statusColor = (s: string): "default" | "destructive" | "secondary" => {
    if (s === 'active') return 'default';
    if (s === 'expired') return 'destructive';
    return 'secondary';
  };

  const statusLabel = (s: string) => {
    if (s === 'active') return 'Ativo';
    if (s === 'expired') return 'Expirado';
    return 'Cancelado';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Assinaturas das Empresas</h3>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Atribuir Plano
        </Button>
      </div>

      {/* Desktop table */}
      <div className="bg-card rounded-xl border overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Expira</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : subs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma assinatura</TableCell></TableRow>
            ) : subs.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.companies?.name || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    <CreditCard className="h-3 w-3" /> {s.plans?.name || '—'}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant={statusColor(s.status)}>{statusLabel(s.status)}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(s.starts_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {s.expires_at ? new Date(s.expires_at).toLocaleDateString('pt-BR') : '∞'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir assinatura?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSub(s.id)}>Excluir</AlertDialogAction>
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
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : subs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhuma assinatura</p>
        ) : subs.map(s => (
          <div key={s.id} className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.companies?.name || '—'}</span>
              <Badge variant={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">Plano: <span className="text-foreground">{s.plans?.name || '—'}</span></p>
              <p className="text-muted-foreground">Início: {new Date(s.starts_at).toLocaleDateString('pt-BR')}</p>
              <p className="text-muted-foreground">Expira: {s.expires_at ? new Date(s.expires_at).toLocaleDateString('pt-BR') : '∞'}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openEdit(s)}>
                <Pencil className="h-3 w-3" /> Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir assinatura?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteSub(s.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Assinatura' : 'Atribuir Plano a Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Empresa <span className="text-destructive">*</span></Label>
              <Select value={form.company_id} onValueChange={v => setForm(p => ({ ...p, company_id: v }))} disabled={!!editingId} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plano <span className="text-destructive">*</span></Label>
              <Select value={form.plan_id} onValueChange={v => setForm(p => ({ ...p, plan_id: v }))} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={submitting || !form.company_id || !form.plan_id}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? 'Salvar' : 'Atribuir'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
