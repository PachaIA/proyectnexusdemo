import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'llamada' | 'visita' | 'email' | 'reunion' | 'whatsapp' | 'nota' | 'otro';

export interface CompanyActivity {
  id: string;
  company_id: string;
  user_id: string;
  activity_date: string;
  activity_type: ActivityType;
  summary: string;
  outcome: string | null;
  next_step: string | null;
  next_action_date: string | null;
  created_at: string;
}

export type ActivityInput = {
  activity_date: string;
  activity_type: ActivityType;
  summary: string;
  outcome?: string | null;
  next_step?: string | null;
  next_action_date?: string | null;
};

export const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: string }[] = [
  { id: 'llamada', label: 'Llamada', icon: '📞' },
  { id: 'visita', label: 'Visita', icon: '🚗' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'reunion', label: 'Reunión', icon: '🤝' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'nota', label: 'Nota', icon: '📝' },
  { id: 'otro', label: 'Otro', icon: '•' },
];

export const useCompanyActivities = (companyId?: string) => {
  const qc = useQueryClient();
  const key = ['company-activities', companyId];

  const { data: activities = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('company_activities')
        .select('*')
        .eq('company_id', companyId)
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CompanyActivity[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createActivity = useMutation({
    mutationFn: async (input: ActivityInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');
      const { error } = await (supabase as any)
        .from('company_activities')
        .insert({ ...input, company_id: companyId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, ...input }: ActivityInput & { id: string }) => {
      const { error } = await (supabase as any)
        .from('company_activities')
        .update(input)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('company_activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { activities, isLoading, createActivity, updateActivity, deleteActivity };
};
