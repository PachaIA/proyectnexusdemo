import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Sale {
  id: string;
  company_id: string;
  fecha: string; // YYYY-MM-DD
  lineas_movil: number;
  lineas_fibra: number;
  snav: number;
  margen: number;
  producto_estrategico: boolean;
  producto: string | null;
  notas: string | null;
  created_at: string;
}

export const useSales = (companyId?: string) => {
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', companyId ?? 'all'],
    queryFn: async () => {
      let q = (supabase as any).from('sales').select('*').order('fecha', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Sale[];
    },
  });

  const createSale = useMutation({
    mutationFn: async (payload: Omit<Sale, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase as any).from('sales').insert(payload).select().single();
      if (error) throw error;
      return data as Sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  return { sales, isLoading, createSale: createSale.mutateAsync, deleteSale: deleteSale.mutateAsync };
};
