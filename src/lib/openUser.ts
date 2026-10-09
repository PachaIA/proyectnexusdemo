import { supabase } from '@/integrations/supabase/client';

export const getEffectiveUser = async () => {
  return supabase.auth.getUser();
};
