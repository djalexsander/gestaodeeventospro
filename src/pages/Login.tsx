import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
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
                window.location.href = '/primeiro-acesso';
              }}
            >
              Primeiro Acesso
            </Button>
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.error('Preencha o email primeiro'); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/set-password`,
                });
                if (error) toast.error(error.message);
                else toast.success('Email de recuperação enviado!');
              }}
              className="text-xs text-primary hover:underline"
            >
              Esqueceu sua senha?
            </button>
            <p className="text-xs text-muted-foreground">
              Acesso restrito. Solicite ao administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
