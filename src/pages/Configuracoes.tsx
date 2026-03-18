import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Settings, Loader2, Globe, ImageIcon, Upload, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Configuracoes() {
  const { isAdminMaster, loading: authLoading } = useAuth();
  const [platformName, setPlatformName] = useState('');
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdminMaster) return;
    const fetch = async () => {
      const { data } = await supabase.from('system_settings' as any).select('*').limit(1).single();
      if (data) {
        setPlatformName((data as any).platform_name || '');
        setPlatformLogoUrl((data as any).platform_logo_url || null);
      }
      setLoading(false);
    };
    fetch();
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
      // Force reload to update sidebar
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
    </div>
  );
}
