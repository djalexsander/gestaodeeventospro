import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { consumeRecoveryError, setRecoveryPending } from '@/lib/recovery';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [resending, setResending] = useState(false);
  const [resendEmail, setResendEmail] = useState(() => localStorage.getItem('remembered_login_email') || '');

  useEffect(() => {
    let mounted = true;
    const linkError = consumeRecoveryError();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) setStatus('ready');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) setStatus('ready');
      else setStatus(linkError ? 'invalid' : 'invalid');
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return; }
    if (password !== confirmPassword) { toast.error('As senhas não coincidem'); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message || 'Não foi possível alterar a senha');
      setSubmitting(false);
      return;
    }

    setRecoveryPending(false);
    setStatus('done');
    toast.success('Senha alterada com sucesso!');
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login', { replace: true }), 1800);
  };

  const resend = async () => {
    if (!resendEmail) { toast.error('Informe seu email'); return; }
    setResending(true);
    await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    setResending(false);
    toast.success('Se existir uma conta associada a este email, você receberá as instruções para redefinir sua senha.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mx-auto">
            <Calendar className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Redefinir sua senha</h1>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          {status === 'checking' && (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}

          {status === 'invalid' && (
            <div className="space-y-4 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm text-foreground">Este link de recuperação expirou ou não é mais válido.</p>
              <div className="space-y-2 text-left">
                <Label htmlFor="resendEmail">Email</Label>
                <Input
                  id="resendEmail"
                  type="email"
                  autoComplete="username"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <Button className="w-full" onClick={resend} disabled={resending}>
                {resending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enviar novo link
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate('/login', { replace: true })}>
                Voltar ao login
              </Button>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <p className="text-foreground font-medium">Senha alterada com sucesso.</p>
              <p className="text-sm text-muted-foreground">Entre novamente com a nova senha...</p>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Crie uma nova senha com no mínimo 6 caracteres.
              </p>
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar nova senha
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}