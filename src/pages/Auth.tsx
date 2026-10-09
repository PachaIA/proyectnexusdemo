import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import nexusAccess from '@/assets/nexus-access.png';

const credentialsSchema = z.object({
  email: z.string().trim().email('Introduce un correo electrónico válido').max(254, 'El correo es demasiado largo'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72, 'La contraseña es demasiado larga'),
});

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
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [formError, setFormError] = useState('');
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
      toast.error('No se ha podido enviar el correo de recuperación');
      return;
    }
    toast.success('Te hemos enviado un email para restablecer la contraseña');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Revisa los datos introducidos');
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success('Sesión iniciada');
        if (data.session?.user) {
          goAfterAuth();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: `${window.location.origin}/auth${next ? `?next=${encodeURIComponent(next)}` : ''}` }
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmationSent(true);
          toast.success('Revisa tu correo para confirmar la cuenta');
        }
      }
    } catch {
      setFormError(isLogin ? 'Correo o contraseña incorrectos' : 'No se ha podido crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(400px,0.85fr)_minmax(0,1.4fr)]">
      <div className="order-2 flex items-center justify-center bg-card px-6 py-10 sm:px-12 lg:order-1 lg:min-h-screen lg:py-16">
      <div className="w-full max-w-sm">
        {confirmationSent ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <h1 className="text-xl font-semibold text-foreground">Confirma tu cuenta</h1>
            <p className="text-sm text-muted-foreground">Revisa tu correo y pulsa el enlace para entrar en Nexus.</p>
            <Button variant="outline" className="w-full" onClick={() => { setConfirmationSent(false); setIsLogin(true); }}>
              Volver a iniciar sesión
            </Button>
          </div>
        ) : (
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{isLogin ? 'Accede a tu espacio comercial.' : 'Regístrate con tu correo profesional.'}</p>
          </div>

          <div className="space-y-5">
            <label htmlFor="auth-email" className="block text-sm font-medium text-foreground">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                placeholder="nombre@empresa.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-background pl-10"
                required
                autoComplete="email"
                maxLength={254}
              />
            </div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-foreground">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background pl-10"
                required
                minLength={8}
                maxLength={72}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" className="h-12 w-full" disabled={loading}>
            {loading ? 'Espera…' : isLogin ? 'Entrar' : 'Registrarse'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {isLogin && (
            <Button
              variant="link"
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="h-auto w-full text-sm text-muted-foreground"
            >
              ¿Olvidaste tu contraseña?
            </Button>
          )}

          <Button
            variant="ghost"
            type="button"
            onClick={() => { setIsLogin(!isLogin); setFormError(''); }}
            className="w-full text-sm text-muted-foreground"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </Button>
        </form>
        )}
      </div>
      </div>
      <div className="order-1 flex min-w-0 flex-col items-center justify-center px-6 py-8 lg:order-2 lg:min-h-screen lg:px-12 lg:py-12">
        <img src={nexusAccess} alt="Nexus" className="w-full max-w-[300px] object-contain lg:max-w-[660px]" />
        <h2 className="mt-2 text-4xl font-semibold text-foreground lg:text-6xl">NEXUS</h2>
        <p className="mt-3 text-center text-sm font-medium uppercase text-primary lg:text-base">Inteligencia comercial</p>
        <p className="mt-3 text-center text-sm text-muted-foreground">B2B · Telecomunicaciones</p>
      </div>
    </main>
  );
};

export default Auth;
