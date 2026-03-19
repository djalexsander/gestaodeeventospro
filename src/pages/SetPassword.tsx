import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The invite link will auto-sign in the user via the URL token
    // We just need to wait for the session to be established
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Check if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    setDone(true);
    toast.success('Senha definida com sucesso!');
    setTimeout(() => navigate('/'), 2000);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mx-auto">
            <Calendar className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Gestão de Eventos Pro</h1>
          <p className="text-sm text-muted-foreground">Defina sua senha de acesso</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <p className="text-foreground font-medium">Senha definida com sucesso!</p>
              <p className="text-sm text-muted-foreground">Redirecionando...</p>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-lg font-semibold mb-2 text-center">Primeiro Acesso</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Crie uma senha para acessar o sistema.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Definir Senha
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
