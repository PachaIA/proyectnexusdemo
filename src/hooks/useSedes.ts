import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SedeTipo = 'Oficina' | 'Nave' | 'Domicilio' | 'Otro';

export interface Sede {
  id: string;
  company_id: string;
  tipo: SedeTipo;
  direccion: string | null;
  cp: string | null;
  localidad: string | null;
  provincia: string | null;
  lat: number;
  lng: number;
  principal: boolean;
  created_at: string;
}

export type SedeInsert = Omit<Sede, 'id' | 'created_at'>;
export type SedeUpdate = Partial<Omit<Sede, 'id' | 'company_id' | 'created_at'>>;

export function useSedes(companyId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['sedes', companyId];

  const { data: sedes = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sedes')
        .select('*')
        .eq('company_id', companyId!)
        .order('principal', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as Sede[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createSede = useMutation({
    mutationFn: async (s: SedeInsert) => {
      const { data, error } = await supabase.from('sedes').insert(s).select().single();
      if (error) throw error;
      return data as Sede;
    },
    onSuccess: invalidate,
  });

  const updateSede = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SedeUpdate }) => {
      const { error } = await supabase.from('sedes').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSede = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sedes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setPrincipal = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) return;
      // unset all then set selected
      const { error: e1 } = await supabase
        .from('sedes')
        .update({ principal: false })
        .eq('company_id', companyId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('sedes').update({ principal: true }).eq('id', id);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
  });

  return {
    sedes,
    isLoading,
    createSede: createSede.mutateAsync,
    updateSede: updateSede.mutateAsync,
    deleteSede: deleteSede.mutateAsync,
    setPrincipal: setPrincipal.mutateAsync,
  };
}
