import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hasRecoveryToken = new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (hasRecoveryToken && session?.user)) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hasRecoveryToken && session?.user) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Contraseña actualizada');
    navigate('/hoy', { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground mt-1">Define una contraseña para tu cuenta</p>
        </div>

        <form onSubmit={submit} className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-sm">
          {!ready && (
            <p className="text-xs text-muted-foreground">
              Abre esta página desde el enlace del email de recuperación. Si acabas de hacerlo, espera un segundo.
            </p>
          )}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              minLength={6}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-10"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !ready}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
