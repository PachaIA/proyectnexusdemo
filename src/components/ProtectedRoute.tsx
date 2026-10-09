import { Navigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '@/contexts/AuthSessionContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" aria-label="Comprobando sesión">
        <img src="/nexus-lockup.png" alt="Nexus" className="w-[min(420px,calc(100vw-32px))] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}