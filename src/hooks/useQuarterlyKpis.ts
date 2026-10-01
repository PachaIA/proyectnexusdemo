import { getEffectiveUser } from '@/lib/openUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVodafoneFiscalQuarterLabel } from '@/lib/vodafoneFiscalQuarter';

export interface QuarterlyKpi {
  id: string;
  user_id: string;
  quarter: string;
  altas_target: number;
  altas_actual: number;
  snav_total: number;
  rentabilidad_media: number;
  created_at: string;
  updated_at: string;
}

const getCurrentQuarter = (): string => {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q}-${now.getFullYear()}`;
};

// Multiplicador lookup table
const MULT_TABLE: number[][] = [
  // Rent <9, 10-29, 30-49, 50-79, 80-120, >120
  [0,   0.2, 0.4, 0.6, 0.8, 1.0],   // SNAV <1500
  [0,   0.4, 0.6, 1.0, 1.2, 1.4],   // SNAV 1500-3499
  [0.3, 0.6, 0.8, 1.2, 1.4, 1.6],   // SNAV 3500-4999
  [0.6, 0.8, 1.2, 1.4, 1.8, 2.0],   // SNAV >=5000
];

const getSnavIndex = (snav: number): number => {
  if (snav < 1500) return 0;
  if (snav < 3500) return 1;
  if (snav < 5000) return 2;
  return 3;
};

const getRentIndex = (rent: number): number => {
  if (rent < 9) return 0;
  if (rent < 30) return 1;
  if (rent < 50) return 2;
  if (rent < 80) return 3;
  if (rent <= 120) return 4;
  return 5;
};

export const getMultiplicador = (snav: number, rent: number): number => {
  return MULT_TABLE[getSnavIndex(snav)][getRentIndex(rent)];
};

export const useQuarterlyKpis = () => {
  const queryClient = useQueryClient();
  const quarter = getCurrentQuarter();

  const { data: kpi, isLoading } = useQuery({
    queryKey: ['quarterly_kpis', quarter],
    queryFn: async () => {
      const { data: { user } } = await getEffectiveUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from('quarterly_kpis')
        .select('*')
        .eq('user_id', user.id)
        .eq('quarter', quarter)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default record
        const { data: created, error: insertErr } = await (supabase as any)
          .from('quarterly_kpis')
          .insert({ user_id: user.id, quarter, altas_target: 70, altas_actual: 0, snav_total: 0, rentabilidad_media: 0 })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return created as QuarterlyKpi;
      }
      return data as QuarterlyKpi;
    },
  });

  const updateKpi = useMutation({
    mutationFn: async (updates: Partial<Pick<QuarterlyKpi, 'altas_actual' | 'altas_target' | 'snav_total' | 'rentabilidad_media'>>) => {
      if (!kpi) throw new Error('No KPI record');
      const { error } = await (supabase as any)
        .from('quarterly_kpis')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', kpi.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarterly_kpis'] });
    },
  });

  return { kpi, isLoading, quarter, quarterLabel: getVodafoneFiscalQuarterLabel(), updateKpi: updateKpi.mutateAsync, getMultiplicador };
};
