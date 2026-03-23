import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Loader2, CreditCard, Infinity, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PlanRow {
  id: string;
  name: string;
  type: string;
  duration_days: number | null;
  price: number;
  description: string;
  is_active: boolean;
}

export default function PlansManager() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'monthly' as string, duration_days: '30',
    price: '0', description: '',
  });

  const fetchPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from('plans').select('*').order('price');
    if (data) setPlans(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', type: 'monthly', duration_days: '30', price: '0', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (p: PlanRow) => {
    setEditing(p);
    setForm({
      name: p.name, type: p.type,
      duration_days: p.duration_days?.toString() || '',
      price: p.price.toString(), description: p.description,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: form.name, type: form.type,
      duration_days: form.type === 'lifetime' ? null : parseInt(form.duration_days) || 7,
      price: parseFloat(form.price) || 0,
      description: form.description,
    };

    if (editing) {
      const { error } = await supabase.from('plans').update(payload).eq('id', editing.id);
      if (error) toast.error('Erro ao atualizar plano');
      else { toast.success('Plano atualizado'); fetchPlans(); }
    } else {
      const { error } = await supabase.from('plans').insert(payload);
      if (error) toast.error('Erro ao criar plano');
      else { toast.success('Plano criado'); fetchPlans(); }
    }
    setSubmitting(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir plano');
    else { toast.success('Plano excluído'); setPlans(prev => prev.filter(p => p.id !== id)); }
  };

  const toggleActive = async (p: PlanRow) => {
    const { error } = await supabase.from('plans').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) toast.error('Erro ao alterar status');
    else { toast.success(p.is_active ? 'Plano desativado' : 'Plano ativado'); fetchPlans(); }
  };

  const typeIcon = (type: string) => {
    if (type === 'trial') return <Clock className="h-3 w-3" />;
    if (type === 'monthly') return <Calendar className="h-3 w-3" />;
    return <Infinity className="h-3 w-3" />;
  };

  const typeLabel = (type: string) => {
    if (type === 'trial') return 'Trial';
    if (type === 'monthly') return 'Mensal';
    return 'Vitalício';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Planos</h3>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Plano</Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : plans.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado</TableCell></TableRow>
            ) : plans.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {typeIcon(p.type)} {typeLabel(p.type)}
                  </Badge>
                </TableCell>
                <TableCell>{p.duration_days ? `${p.duration_days} dias` : '∞'}</TableCell>
                <TableCell>R$ {p.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    variant={p.is_active ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => toggleActive(p)}
                  >
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
            <DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Teste)</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type !== 'lifetime' && (
              <div className="space-y-2">
                <Label>Duração (dias)</Label>
                <Input type="number" value={form.duration_days} onChange={e => setForm(p => ({ ...p, duration_days: e.target.value }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? 'Salvar' : 'Criar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
