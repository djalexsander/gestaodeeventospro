import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const REMEMBER_KEY = 'remembered_login_email';

export default function Login() {
  const { session, loading, signIn, passwordRecoveryRequired } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    () => localStorage.getItem(REMEMBER_KEY) || localStorage.getItem('saved_email') || ''
  );
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(
    () => !!(localStorage.getItem(REMEMBER_KEY) || localStorage.getItem('saved_email'))
  );
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session && passwordRecoveryRequired) {
    return <Navigate to="/reset-password" replace />;
  }

  if (session) {
    let target = "/";
    try {
      const pending = sessionStorage.getItem("pendingRoute");
      if (pending) {
        target = pending;
        sessionStorage.removeItem("pendingRoute");
      }
    } catch { /* noop */ }
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    localStorage.removeItem('saved_email');
    const { error } = await signIn(email, password);
    if (error) {
      toast.error('Email ou senha inválidos');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mx-auto">
            <Calendar className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Gestão de Eventos Pro</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestão de Eventos</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold mb-6 text-center">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Lembrar meu e-mail
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Entrar
            </Button>
          </form>

          <div className="mt-4 text-center space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                navigate('/primeiro-acesso');
              }}
            >
              Primeiro Acesso
            </Button>
            <button
              type="button"
              disabled={sendingReset}
              onClick={async () => {
                if (!email) { toast.error('Preencha o email primeiro'); return; }
                setSendingReset(true);
                await supabase.auth.resetPasswordForEmail(email.trim(), {
                  redirectTo: `${window.location.origin}/#/reset-password`,
                });
                setSendingReset(false);
                toast.success(
                  'Se existir uma conta associada a este e-mail, você receberá as instruções para redefinir sua senha.'
                );
              }}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Esqueceu sua senha?
            </button>
            <p className="text-xs text-muted-foreground">
              Acesso restrito. Solicite ao administrador.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">v{__APP_VERSION__}</p>
      </div>
    </div>
  );
}
