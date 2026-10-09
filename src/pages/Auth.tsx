import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

// Only allow same-origin relative paths as redirect targets.
const safeNext = (value: string | null): string | null => {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const goAfterAuth = () => {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate('/hoy', { replace: true });
  };

  // Redirect if already logged in, and listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        goAfterAuth();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        goAfterAuth();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  const handleReset = async () => {
    if (!email) {
      toast.error('Escribe tu email primero');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Te hemos enviado un email para restablecer la contraseña');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Sesión iniciada');
        if (data.session?.user) {
          goAfterAuth();
        }
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}${next ?? '/'}` }
        });
        if (error) throw error;
        toast.success('Revisa tu email para confirmar la cuenta');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/nexus-lockup.png"
            alt="Nexus"
            className="mx-auto mb-4 w-full max-w-[420px] min-w-[160px]"
          />
          <h1 className="text-2xl font-bold text-foreground">Grupo Enertel</h1>
          <p className="text-sm text-muted-foreground mt-1">Herramienta Comercial B2B</p>
        </div>

        <form onSubmit={handleAuth} className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarse'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {isLogin && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
