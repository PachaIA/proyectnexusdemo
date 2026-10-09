import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthSessionState = {
  user: User | null;
  loading: boolean;
};

const AuthSessionContext = createContext<AuthSessionState>({ user: null, loading: true });

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const refreshUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      setUser(error ? null : data.user);
      setLoading(false);
    };

    void refreshUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void refreshUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export const useAuthSession = () => useContext(AuthSessionContext);