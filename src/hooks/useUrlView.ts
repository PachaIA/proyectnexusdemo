import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { lastActivityByCompany } from '@/lib/pipelineBoard';

/**
 * Vista + filtros de una página guardados en la URL (?vista=tabla&filtro=...).
 * Los valores por defecto no se escriben, así la URL queda limpia y reproducible.
 */
export function useUrlView<D extends Record<string, string>>(defaults: D) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => {
    const out = { ...defaults } as Record<string, string>;
    for (const k of Object.keys(defaults)) { const v = params.get(k); if (v != null) out[k] = v; }
    return out as D;
  }, [params, defaults]);

  const set = useCallback((patch: Partial<D>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '' || v === defaults[k]) next.delete(k); else next.set(k, String(v));
      }
      return next;
    }, { replace: true });
  }, [setParams, defaults]);

  return [values, set, params.toString()] as const;
}

export interface SavedView { label: string; query: string }

/** Vistas guardadas con nombre: solo etiqueta + query string, por página. */
export function useSavedViews(page: string) {
  const key = `nexus_vistas_${page}`;
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]') as SavedView[]; } catch { return []; } };
  const [views, setViews] = useState<SavedView[]>(read);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(views)); }, [key, views]);
  const save = (label: string, query: string) => setViews(v => [...v.filter(x => x.label !== label), { label, query }]);
  const remove = (label: string) => setViews(v => v.filter(x => x.label !== label));
  return { views, save, remove };
}

/** Última actividad registrada por empresa (compartido por Clientes y Pipeline). */
export function useLastActivity() {
  const { data = [] } = useQuery({
    queryKey: ['company_activities', 'last-dates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_activities').select('company_id, activity_date');
      if (error) throw error;
      return data as { company_id: string; activity_date: string }[];
    },
  });
  return useMemo(() => lastActivityByCompany(data), [data]);
}
