import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Settings, Loader2, Globe, ImageIcon, Upload, Save, Shield, Pencil, Trash2, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface MasterUser {
  id: string;
  name: string;
  email: string;
}

export default function Configuracoes() {
  const { isAdminMaster, loading: authLoading, user } = useAuth();
  const [platformName, setPlatformName] = useState('');
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [masterUsers, setMasterUsers] = useState<MasterUser[]>([]);
  const [editDialog, setEditDialog] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterUser | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMasterUsers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('*').eq('role', 'admin_master');
    if (roles && roles.length > 0) {
      const userIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
      if (profiles) {
        setMasterUsers(profiles.map((p: any) => ({ id: p.id, name: p.name, email: p.email })));
      }
    }
  };

  useEffect(() => {
    if (!isAdminMaster) return;
    const fetchAll = async () => {
      const { data } = await supabase.from('system_settings' as any).select('*').limit(1).single();
      if (data) {
        setPlatformName((data as any).platform_name || '');
        setPlatformLogoUrl((data as any).platform_logo_url || null);
      }
      await fetchMasterUsers();
      setLoading(false);
    };
    fetchAll();
  }, [isAdminMaster]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview(null);
  }, [logoFile]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminMaster) return <Navigate to="/" replace />;

  const handleSave = async () => {
    setSubmitting(true);
    let logoUrl = platformLogoUrl;

    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `platform-logo.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('company-logos').upload(path, logoFile, { upsert: true });
      if (uploadErr) {
        toast.error('Erro ao enviar logo');
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(path);
      logoUrl = urlData.publicUrl + '?t=' + Date.now();
    }

    const { error } = await supabase
      .from('system_settings' as any)
      .update({ platform_name: platformName, platform_logo_url: logoUrl, updated_at: new Date().toISOString() } as any)
      .not('id', 'is', null);

    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      setPlatformLogoUrl(logoUrl);
      setLogoFile(null);
      toast.success('Configurações salvas com sucesso!');
      window.location.reload();
    }
    setSubmitting(false);
  };

  const openEditMaster = (u: MasterUser) => {
    setEditingMaster(u);
    setEditName(u.name);
    setEditDialog(true);
  };

  const handleEditMaster = async () => {
    if (!editingMaster) return;
    await supabase.from('profiles').update({ name: editName } as any).eq('id', editingMaster.id);
    setMasterUsers(prev => prev.map(u => u.id === editingMaster.id ? { ...u, name: editName } : u));
    setEditDialog(false);
    toast.success('Usuário master atualizado');
  };

  const handleDeleteMaster = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Você não pode excluir sua própria conta');
      return;
    }
    if (deletingId) return;
    setDeletingId(userId);
    const res = await supabase.functions.invoke('delete-user', { body: { userId } });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao excluir usuário');
    } else {
      toast.success('Usuário master excluído');
      setMasterUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeletingId(null);
  };

  const displayLogo = logoPreview || platformLogoUrl;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold">Configurações do Sistema</h2>
        <Button onClick={handleSave} disabled={submitting} className="bg-primary hover:bg-primary/90">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Identity */}
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Identidade da Plataforma</CardTitle>
            </div>
            <CardDescription>Nome e marca exibidos no sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Plataforma</Label>
              <Input
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                placeholder="Gestão de Eventos Pro"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="bg-card border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Logo da Plataforma</CardTitle>
            </div>
            <CardDescription>Logo exibida na sidebar e telas de login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 min-h-[120px]">
              {displayLogo ? (
                <img src={displayLogo} alt="Logo" className="max-h-20 max-w-full rounded-lg object-contain" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma logo definida</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer hover:bg-muted transition-colors text-sm">
                <Upload className="h-4 w-4" />
                Escolher arquivo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={e => setLogoFile(e.target.files?.[0] || null)}
                />
              </label>
              <span className="text-xs text-muted-foreground">
                {logoFile ? logoFile.name : 'Nenhum escolhido'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Users */}
      <Card className="bg-card border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Administradores Master</CardTitle>
          </div>
          <CardDescription>Usuários com acesso total ao sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    Nenhum administrador master
                  </TableCell>
                </TableRow>
              ) : masterUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditMaster(u)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {u.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === u.id}
                          onClick={() => handleDeleteMaster(u.id)}
                        >
                          {deletingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Master Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Administrador Master</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingMaster?.email || ''} disabled className="opacity-60" />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleEditMaster} className="flex-1">Salvar</Button>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
