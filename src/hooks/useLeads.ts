import { getEffectiveUser } from '@/lib/openUser';
import { requestOpportunityFields } from '@/lib/opportunity';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSalesPlaybook } from '@/lib/salesPlaybook';

export interface Lead {
  id: string;
  company_id: string;
  empresa: string;
  cif: string | null;
  sector: string;
  tamano: number;
  opportunity_score: number;
  servicios_recomendados: string[] | null;
  necesidades_detectadas: string[] | null;
  estado: string;
  notas: string | null;
  next_action: string | null;
  next_action_date: string | null;
  decision_makers: any;
  arpu_estimado: number | null;
  sales_playbook: string | null;
  notion_synced: boolean | null;
  notion_sync_error: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useLeads = () => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead actualizado');
    },
    onError: (error) => {
      console.error('Error updating lead:', error);
      toast.error('Error al actualizar el lead');
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'sales_playbook' | 'notion_synced' | 'notion_sync_error' | 'archived_at'> & {
      digitalizationLevel?: string;
      companyName?: string;
      detectedNeedsRaw?: string[];
      recommendedProductsRaw?: string[];
    }) => {
      const { data: { user } } = await getEffectiveUser();
      if (!user) throw new Error('No autenticado');

      // Check for duplicate (same user + same company)
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', leadData.company_id)
        .maybeSingle();

      if (existing) {
        throw new Error('DUPLICATE');
      }

      const fields = await requestOpportunityFields({ companyId: leadData.company_id, lockClient: true });
      if (!fields) throw new Error('CANCELLED');

      // Generate Sales Playbook ONCE at creation
      const playbook = generateSalesPlaybook({
        opportunityScore: leadData.opportunity_score,
        digitalizationLevel: leadData.digitalizationLevel || 'medio',
        sector: leadData.sector,
        employees: leadData.tamano,
        detectedNeeds: leadData.detectedNeedsRaw || leadData.necesidades_detectadas || [],
        recommendedProducts: leadData.recommendedProductsRaw || leadData.servicios_recomendados || [],
        companyName: leadData.companyName || leadData.empresa,
      });

      // Clean up extra fields not in DB
      const { digitalizationLevel, companyName, detectedNeedsRaw, recommendedProductsRaw, ...dbData } = leadData;
      
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...dbData, ...fields, user_id: user.id, sales_playbook: playbook } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      console.error('Error creating lead:', error);
      throw error;
    }
  });

  const archiveLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .update({ archived_at: new Date().toISOString() } as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead archivado');
    },
    onError: (error) => {
      console.error('Error archiving lead:', error);
      toast.error('Error al archivar el lead');
    }
  });

  // Notion sync removed — all CRM managed within Nexus

  const isCompanyLead = (companyId: string): boolean => {
    return leads.some(lead => lead.company_id === companyId);
  };

  const getLeadByCompanyId = (companyId: string): Lead | undefined => {
    return leads.find(lead => lead.company_id === companyId);
  };

  const getLeadStats = () => {
    const active = leads.filter(l => !l.archived_at);
    const stats = {
      total: leads.length,
      lead: active.filter(l => l.estado === 'lead').length,
      contactado: active.filter(l => l.estado === 'contactado').length,
      propuesta: active.filter(l => l.estado === 'propuesta').length,
      negociacion: active.filter(l => l.estado === 'negociacion').length,
      ganada: active.filter(l => l.estado === 'ganada').length,
      perdida: active.filter(l => l.estado === 'perdida').length,
      totalARPU: active.reduce((sum, l) => sum + (l.arpu_estimado || 0), 0),
      avgScore: active.length > 0 
        ? Math.round(active.reduce((sum, l) => sum + l.opportunity_score, 0) / active.length)
        : 0,
      pipelineValue: active.filter(l => !['ganada', 'perdida'].includes(l.estado || '')).length * 25000,
    };
    return stats;
  };


  return {
    leads,
    isLoading,
    error,
    createLead: createLeadMutation.mutateAsync,
    updateLead: updateLeadMutation.mutate,
    archiveLead: archiveLeadMutation.mutate,
    isCompanyLead,
    getLeadByCompanyId,
    getLeadStats,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
  };
};
