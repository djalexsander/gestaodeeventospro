import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, Globe, ImageIcon, Upload, Save, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Configuracoes() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const [platformName, setPlatformName] = useState('');
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [pixKeyType, setPixKeyType] = useState('celular');
  const [pixKey, setPixKey] = useState('');
  const [pixReceiverName, setPixReceiverName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [pixBank, setPixBank] = useState('');

  useEffect(() => {
    if (!isAdminMaster) return;
    const fetchAll = async () => {
      const [settingsRes, pixRes] = await Promise.all([
        supabase.from('system_settings' as any).select('*').limit(1).single(),
        supabase.from('pix_settings' as any).select('*').limit(1).single(),
      ]);
      if (settingsRes.data) {
        setPlatformName((settingsRes.data as any).platform_name || '');
        setPlatformLogoUrl((settingsRes.data as any).platform_logo_url || null);
      }
      if (pixRes.data) {
        const pix = pixRes.data as any;
        setPixKeyType(pix.key_type || 'celular');
        setPixKey(pix.pix_key || '');
        setPixReceiverName(pix.receiver_name || '');
        setPixCity(pix.city || '');
        setPixBank(pix.bank || '');
      }
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

    const [settingsRes, pixRes] = await Promise.all([
      supabase
        .from('system_settings' as any)
        .update({ platform_name: platformName, platform_logo_url: logoUrl, updated_at: new Date().toISOString() } as any)
        .not('id', 'is', null),
      supabase
        .from('pix_settings' as any)
        .update({
          key_type: pixKeyType,
          pix_key: pixKey.trim(),
          receiver_name: pixReceiverName.trim(),
          city: pixCity.trim(),
          bank: pixBank.trim(),
          updated_at: new Date().toISOString(),
        } as any)
        .not('id', 'is', null),
    ]);

    if (settingsRes.error || pixRes.error) {
      toast.error('Erro ao salvar configurações');
    } else {
      setPlatformLogoUrl(logoUrl);
      setLogoFile(null);
      toast.success('Configurações salvas com sucesso!');
      window.location.reload();
    }
    setSubmitting(false);
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
              <Input value={platformName} onChange={e => setPlatformName(e.target.value)} placeholder="Gestão de Eventos Pro" />
            </div>
          </CardContent>
        </Card>

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
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
              </label>
              <span className="text-xs text-muted-foreground">{logoFile ? logoFile.name : 'Nenhum escolhido'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Configuração PIX</CardTitle>
            </div>
            <CardDescription>Dados para geração de QR Code PIX nas cobranças.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo da Chave</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celular">Celular</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="+5500000000000" />
              </div>
              <div className="space-y-2">
                <Label>Nome do Recebedor</Label>
                <Input value={pixReceiverName} onChange={e => setPixReceiverName(e.target.value)} placeholder="NOME COMPLETO" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={pixCity} onChange={e => setPixCity(e.target.value)} placeholder="CIDADE" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Banco</Label>
                <Input value={pixBank} onChange={e => setPixBank(e.target.value)} placeholder="NOME DO BANCO" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
