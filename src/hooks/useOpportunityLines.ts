import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OpportunityLine {
  id: string;
  lead_id: string;
  producto: string;
  cantidad: number;
  monthly_revenue: number;
  monthly_cost: number;
}

// Margen calculado al leer: nunca se guarda en BD.
export const lineMargin = (l: Pick<OpportunityLine, 'monthly_revenue' | 'monthly_cost'>) => {
  const rev = Number(l.monthly_revenue) || 0;
  const eur = rev - (Number(l.monthly_cost) || 0);
  return { margin_eur: eur, margin_pct: rev > 0 ? eur / rev : null };
};

export const rollUp = (lines: OpportunityLine[]) => {
  const monthly_revenue = lines.reduce((s, l) => s + (Number(l.monthly_revenue) || 0), 0);
  const margin_eur = lines.reduce((s, l) => s + lineMargin(l).margin_eur, 0);
  return { monthly_revenue, margin_eur, margin_pct: monthly_revenue > 0 ? margin_eur / monthly_revenue : null };
};

const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' as any });
const pctFmt = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtEur = (n: number | null | undefined) => (n == null ? '—' : eurFmt.format(n));
export const fmtPct = (n: number | null | undefined) => (n == null ? '—' : pctFmt.format(n));

export const useOpportunityLines = () => {
  const qc = useQueryClient();
  const { data: lines = [] } = useQuery({
    queryKey: ['opportunity_lines'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('opportunity_lines').select('*').order('created_at');
      if (error) throw error;
      return (data || []) as OpportunityLine[];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['opportunity_lines'] });

  const upsert = useMutation({
    mutationFn: async (l: Partial<OpportunityLine> & { lead_id: string }) => {
      const { id, ...rest } = l;
      const q = (supabase as any).from('opportunity_lines');
      const { error } = id ? await q.update(rest).eq('id', id) : await q.insert(rest);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('opportunity_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { lines, saveLine: upsert.mutateAsync, deleteLine: remove.mutateAsync };
};
