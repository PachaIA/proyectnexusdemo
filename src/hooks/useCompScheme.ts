import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseCompScheme } from '@/lib/compScheme';

export function useCompScheme() {
  return useQuery({
    queryKey: ['comp_schemes', 'active'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from('comp_schemes').select('*').eq('active', true).single();
      if (error) throw new Error('No se ha podido cargar el esquema de compensación activo.');
      return parseCompScheme(data);
    },
  });
}