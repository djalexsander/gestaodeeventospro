import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function PrimeiroAcesso() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'checking' | 'invalid' | 'ready' | 'done'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let mounted = true;
    if (!/^[a-f0-9]{64}$/.test(token)) { setStatus('invalid'); return; }
    supabase.functions.invoke('first-access', { body: { action: 'validate', token } })
      .then(({ data, error }) => { if (mounted) setStatus(!error && data?.valid ? 'ready' : 'invalid'); })
      .catch(() => { if (mounted) setStatus('invalid'); });
    return () => { mounted = false; };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || status !== 'ready') return;
    if (password !== confirm) { toast.error('As senhas não coincidem'); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('first-access', { body: { token, password } });
      if (error || !data?.success) { setStatus('invalid'); return; }
      setStatus('done');
      setPassword(''); setConfirm('');
      // Remove the bearer invitation from browser history after consumption.
      navigate('/primeiro-acesso', { replace: true });
      toast.success('Conta ativada. Entre com sua nova senha.');
      navigate('/login', { replace: true });
    } catch { setStatus('invalid'); }
    finally { setSubmitting(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Calendar className="h-10 w-10 text-primary mx-auto" />
          <h1 className="font-heading text-2xl font-bold">Primeiro Acesso</h1>
        </div>
        {status === 'checking' && <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />}
        {status === 'invalid' && <p className="text-sm text-muted-foreground text-center">Convite inválido ou indisponível. Solicite um convite ao administrador. Se já possui acesso, utilize “Esqueci minha senha” na tela de login.</p>}
        {status === 'ready' && <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="password">Nova senha</Label><Input id="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
          <Button className="w-full" disabled={submitting} type="submit">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Ativar conta</Button>
        </form>}
        <Button variant="ghost" className="w-full" onClick={() => navigate('/login')}><ArrowLeft className="h-4 w-4" />Voltar ao login</Button>
      </div>
    </div>
  );
}