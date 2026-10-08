import { getEffectiveUser } from '@/lib/openUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getVodafoneFiscalQuarterLabel } from '@/lib/vodafoneFiscalQuarter';
import { useCompScheme } from '@/hooks/useCompScheme';
import { baseMultiplier, type CompScheme } from '@/lib/compScheme';

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

// Preserve the historical lookup's distinct rent bracket and no accelerator.
export const getMultiplicador = (snav: number, rent: number, scheme: CompScheme): number => baseMultiplier(snav, rent, scheme, true);

export const useQuarterlyKpis = () => {
  const queryClient = useQueryClient();
  const quarter = getCurrentQuarter();
  const { data: scheme, isLoading: loadingScheme, error: schemeError } = useCompScheme();

  const { data: kpi, isLoading } = useQuery({
    queryKey: ['quarterly_kpis', quarter],
    enabled: !!scheme,
    queryFn: async () => {
      if (!scheme) throw new Error('Falta el esquema de compensación activo.');
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
          .insert({ user_id: user.id, quarter, altas_target: scheme.target_units, altas_actual: 0, snav_total: 0, rentabilidad_media: 0 })
          .select()
          .single();
        if (insertErr) throw insertErr;
        return created as QuarterlyKpi;
      }
      return data as QuarterlyKpi;
    },
  });

  const updateKpi = useMutation({
    mutationFn: async (updates: Partial<Pick<QuarterlyKpi, 'altas_actual' | 'snav_total' | 'rentabilidad_media'>>) => {
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

  return { kpi: kpi && scheme ? { ...kpi, altas_target: scheme.target_units } : kpi, isLoading: isLoading || loadingScheme, error: schemeError, quarter, quarterLabel: getVodafoneFiscalQuarterLabel(), updateKpi: updateKpi.mutateAsync, getMultiplicador: (snav: number, rent: number) => {
    if (!scheme) throw new Error('Falta el esquema de compensación activo.');
    return getMultiplicador(snav, rent, scheme);
  } };
};
