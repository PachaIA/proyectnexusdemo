import { supabase } from '@/integrations/supabase/client';

// TEMPORAL: modo abierto sin login. Si no hay sesión, se usa un usuario compartido fijo.
// Al reactivar el login, eliminar este fallback y las políticas "TEMP open" de la BD.
export const OPEN_USER_ID = '00000000-0000-0000-0000-000000000001';

export const getEffectiveUser = async () => {
  const res = await supabase.auth.getUser();
  const user = res.data.user ?? ({ id: OPEN_USER_ID } as any);
  return { data: { user }, error: null };
};
