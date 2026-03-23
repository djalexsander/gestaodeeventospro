import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, CreditCard, Building2, Trash2 } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ company_id: '', plan_id: '', notes: '' });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const plan = plans.find(p => p.id === form.plan_id);
    const startsAt = new Date().toISOString();
    let expiresAt: string | null = null;
    if (plan && plan.duration_days) {
      const exp = new Date();
      exp.setDate(exp.getDate() + plan.duration_days);
      expiresAt = exp.toISOString();
    }

    // Deactivate existing active subscriptions for this company
    await supabase.from('company_subscriptions')
      .update({ status: 'cancelled' })
      .eq('company_id', form.company_id)
      .eq('status', 'active');

    const { error } = await supabase.from('company_subscriptions').insert({
      company_id: form.company_id,
      plan_id: form.plan_id,
      starts_at: startsAt,
      expires_at: expiresAt,
      notes: form.notes,
      status: 'active',
    });

    if (error) toast.error('Erro ao atribuir plano');
    else { toast.success('Plano atribuído com sucesso'); fetchAll(); }
    setSubmitting(false);
    setDialogOpen(false);
  };

  const cancelSub = async (id: string) => {
    const { error } = await supabase.from('company_subscriptions').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast.error('Erro ao cancelar');
    else { toast.success('Assinatura cancelada'); fetchAll(); }
  };

  const statusColor = (s: string) => {
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
        <Button size="sm" onClick={() => { setForm({ company_id: '', plan_id: '', notes: '' }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Atribuir Plano
        </Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Início</TableHead>
              <TableHead className="hidden md:table-cell">Expira</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
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
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {new Date(s.starts_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {s.expires_at ? new Date(s.expires_at).toLocaleDateString('pt-BR') : '∞'}
                </TableCell>
                <TableCell>
                  {s.status === 'active' && (
                    <Button variant="ghost" size="icon" onClick={() => cancelSub(s.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Plano a Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Empresa <span className="text-destructive">*</span></Label>
              <Select value={form.company_id} onValueChange={v => setForm(p => ({ ...p, company_id: v }))} required>
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
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={submitting || !form.company_id || !form.plan_id}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Atribuir
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
