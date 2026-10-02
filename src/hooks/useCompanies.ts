import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/data/companies';

const parseJsonLikeObject = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
};

const normalizeDataSources = (value: any): any => {
  if (Array.isArray(value)) return value;
  const parsed = parseJsonLikeObject(value);
  return Object.keys(parsed).length > 0 ? parsed : [];
};

// Normalize contact_info from DB (wasp uses telefono/nombre, static uses phone/contactPerson)
const normalizeContactInfo = (info: any, row: any): any => {
  const parsed = parseJsonLikeObject(info);

  const nombre = parsed.nombre || parsed.contactPerson || row?.contacto_wasp || '';
  const telefono = parsed.telefono || parsed.phone || '';
  const email = parsed.email || '';

  return {
    ...parsed,
    nombre,
    telefono,
    phone: telefono,
    email,
    contactPerson: nombre,
  };
};

// Map DB row to client Company interface
const mapRowToCompany = (row: any): Company => ({
  id: row.id,
  name: row.name,
  cif: row.cif || '',
  sector: row.sector,
  employees: row.employees,
  address: row.address || '',
  location: row.location || '',
  locationType: row.location_type || 'centro',
  lat: row.lat,
  lng: row.lng,
  website: row.website || '',
  linkedin: row.linkedin,
  digitalizationLevel: row.digitalization_level || 'medio',
  opportunityScore: row.opportunity_score,
  description: row.description || '',
  detectedNeeds: row.detected_needs || [],
  recommendedProducts: row.recommended_products || [],
  recentNews: row.recent_news || [],
  contactInfo: normalizeContactInfo(row.contact_info, row),
  isMultiSite: row.is_multi_site || false,
  itComplexity: row.it_complexity || 'media',
  growthSignals: row.growth_signals || [],
  estimatedARPU: row.estimated_arpu || 0,
  nextBestAction: row.next_best_action || { type: 'call', reason: '', priority: 'media' },
  dataSources: normalizeDataSources(row.data_sources),
  decisionMakers: row.decision_makers || [],
  scoreBreakdown: row.score_breakdown || [],
  // WASP / Telco fields
  operadorActual: row.operador_actual || '',
  lineasMovil: row.lineas_movil || 0,
  lineasFijo: row.lineas_fijo || 0,
  lineasTotal: row.lineas_total || 0,
  permanencia: row.permanencia || 0,
  penalizacion: row.penalizacion != null ? Number(row.penalizacion) : 0,
  contactoWasp: row.contacto_wasp || '',
  tamanioCliente: row.tamanio_cliente || '',
  comercialWasp: row.comercial_wasp || '',
  idWasp: row.id_wasp || '',
  archivedAt: row.archived_at || null,
  archiveReason: row.archive_reason || null,
  rentabilidadLinea: row.rentabilidad_linea != null ? Number(row.rentabilidad_linea) : null,
  isHot: row.is_hot || false,
  origen: row.origen || null,
  triajeEstado: row.triaje_estado || null,
  triajeFecha: row.triaje_fecha || null,
});

export const useCompanies = () => {
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading, error, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      let allCompanies: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await (supabase as any)
          .from('companies')
          .select('*')
          .range(from, from + pageSize - 1)
          .order('opportunity_score', { ascending: false });
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allCompanies = [...allCompanies, ...data];
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      return allCompanies.map(mapRowToCompany);
    },
    staleTime: 5 * 60 * 1000,
  });


  return { companies, isLoading, error, totalCompanies: companies.length, refetch };
};
