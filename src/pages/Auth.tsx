import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { applyTheme, initializeTheme } from '@/lib/theme';

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

  // The access screen is always dark, regardless of the saved theme.
  useEffect(() => {
    applyTheme('noche');
    return () => initializeTheme();
  }, []);

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
    <main className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[40%_60%]">
      <div
        aria-hidden="true"
        className="nexus-auth-hero order-1 aspect-video w-full lg:order-2 lg:aspect-auto lg:min-h-screen"
      />


      <div className="order-2 flex items-center justify-center bg-background px-6 py-10 lg:order-1 lg:min-h-screen lg:py-16">
        <div className="w-full max-w-[360px]">
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
              <h2 className="text-2xl font-semibold text-foreground">{isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{isLogin ? 'Accede a tu espacio comercial.' : 'Regístrate con tu correo profesional.'}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="block text-sm font-medium text-foreground">Correo electrónico</label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="nombre@empresa.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-[#253645] bg-[#16232D] text-[#EFE7D7] placeholder:text-[#8A8F94]"
                  required
                  autoComplete="email"
                  maxLength={254}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="auth-password" className="block text-sm font-medium text-foreground">Contraseña</label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-[#253645] bg-[#16232D] text-[#EFE7D7] placeholder:text-[#8A8F94]"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
            </div>


            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" className="h-12 w-full bg-[#6FA3B8] font-semibold text-[#101A22] hover:bg-[#6FA3B8]/90" disabled={loading}>
              {loading ? 'Espera…' : 'Entrar'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {isLogin && (
              <Button
                variant="link"
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="h-auto w-full px-0 text-sm text-[#6FA3B8]"
              >
                ¿Olvidaste tu contraseña?
              </Button>
            )}

            <Button
              variant="ghost"
              type="button"
              onClick={() => { setIsLogin(!isLogin); setFormError(''); }}
              className="w-full text-sm text-[#6FA3B8]"
            >

              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Button>
          </form>
          )}
        </div>
      </div>
    </main>
  );
};

export default Auth;
