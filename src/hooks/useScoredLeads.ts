/**
 * useScoredLeads — Aplica el scoring NCS (src/lib/ncsScoring.ts) sobre la
 * misma fuente de datos que ya consume la app (useCompanies / Supabase).
 *
 * Devuelve la lista enriquecida con `ncs: NcsScore` y los counts por bucket
 * para alimentar tanto el mapa como la tabla.
 */
import { useMemo } from 'react';
import { useCompanies } from './useCompanies';
import { Company, Origen } from '@/data/companies';
import {
  scoreNcs,
  rowToLeadInput,
  NcsScore,
  Bucket,
  Sector,
  OperadorActual,
  PresenciaDigital,
} from '@/lib/ncsScoring';

export type ScoredCompany = Company & { ncs: NcsScore };

export interface BucketCounts {
  hot: number;
  warm: number;
  cold: number;
  total: number;
}

export type OriginCounts = Record<Origen, number>;

export interface ScoredLeadsFilters {
  onlyHot?: boolean;
  bucket?: Bucket | 'all';
  origenes?: Origen[]; // si se pasa, sólo incluye estos origenes
}

const SECTOR_KEYWORDS: { match: string; sector: Sector }[] = [
  { match: 'hosteleria', sector: 'hosteleria' },
  { match: 'hostel', sector: 'hosteleria' },
  { match: 'restaur', sector: 'hosteleria' },
  { match: 'retail', sector: 'retail' },
  { match: 'comercio', sector: 'retail' },
  { match: 'tienda', sector: 'retail' },
  { match: 'industrial', sector: 'industrial' },
  { match: 'industria', sector: 'industrial' },
  { match: 'salud', sector: 'salud' },
  { match: 'clinic', sector: 'salud' },
  { match: 'medic', sector: 'salud' },
  { match: 'construccion', sector: 'construccion' },
  { match: 'construc', sector: 'construccion' },
  { match: 'servicios', sector: 'servicios' },
  { match: 'consultor', sector: 'servicios' },
  { match: 'asesor', sector: 'servicios' },
  { match: 'abogad', sector: 'servicios' },
];

const normalizeSector = (raw: string | undefined | null): Sector => {
  const s = (raw ?? '').toString().toLowerCase().trim();
  const hit = SECTOR_KEYWORDS.find((k) => s.includes(k.match));
  return hit?.sector ?? 'otro';
};

const normalizeOperador = (raw: string | undefined | null): OperadorActual => {
  const o = (raw ?? '').toString().toLowerCase().trim();
  if (!o) return 'unknown';
  if (o.includes('movistar') || o.includes('telefonica')) return 'movistar';
  if (o.includes('orange') || o.includes('masmovil') || o.includes('jazztel')) return 'orange';
  if (o.includes('digi')) return 'digi';
  if (o === 'ninguno' || o === 'none' || o === 'sin contrato') return 'none';
  return 'unknown';
};

const presenciaFromCompany = (c: Company): PresenciaDigital => {
  const hasWeb = !!(c.website && c.website.trim() !== '');
  const hasLinkedin = !!(c.linkedin && c.linkedin.trim() !== '');
  if (!hasWeb && !hasLinkedin) return 'none';
  if (hasWeb && c.digitalizationLevel === 'alto') return 'advanced';
  return 'basic';
};

const EMPTY_ORIGIN_COUNTS: OriginCounts = {
  wasp_alejandro_activo: 0,
  wasp_alejandro_asignado: 0,
  wasp_tamara_activo: 0,
  wasp_tamara_asignado: 0,
  scraping_enriquecido: 0,
  scraping_frio: 0,
};

export const useScoredLeads = (filters: ScoredLeadsFilters = {}) => {
  const { onlyHot = false, bucket = 'all', origenes } = filters;
  const { companies, isLoading, error } = useCompanies();

  // 1) Enriquecer todas las companies activas con scoring NCS (sin filtrar)
  const allEnriched = useMemo<ScoredCompany[]>(() => {
    const active = companies.filter((c) => !c.archivedAt);
    return active.map((c) => {
      const leadInput = {
        sector: normalizeSector(c.sector),
        empleados: c.employees > 0 ? c.employees : null,
        antiguedadAnios: null,
        presenciaDigital: presenciaFromCompany(c),
        crecimiento: undefined,
        operadorActual: normalizeOperador(c.operadorActual),
        googleRating: null,
        reviewCount: null,
      };
      void rowToLeadInput;
      const ncs = scoreNcs(leadInput);
      return { ...c, ncs };
    });
  }, [companies]);

  // 2) Counts globales (independientes de los filtros, para el toolbar)
  const counts = useMemo<BucketCounts>(() => ({
    hot: allEnriched.filter((l) => l.ncs.bucket === 'hot').length,
    warm: allEnriched.filter((l) => l.ncs.bucket === 'warm').length,
    cold: allEnriched.filter((l) => l.ncs.bucket === 'cold').length,
    total: allEnriched.length,
  }), [allEnriched]);

  const originCounts = useMemo<OriginCounts>(() => {
    const acc: OriginCounts = { ...EMPTY_ORIGIN_COUNTS };
    for (const l of allEnriched) {
      const o = l.origen as Origen | null | undefined;
      if (o && o in acc) acc[o] += 1;
    }
    return acc;
  }, [allEnriched]);

  // 3) Aplicar filtros (AND) sobre la lista enriquecida
  const leads = useMemo<ScoredCompany[]>(() => {
    let rows = allEnriched;
    if (onlyHot) rows = rows.filter((l) => l.isHot === true);
    if (bucket !== 'all') rows = rows.filter((l) => l.ncs.bucket === bucket);
    if (origenes) {
      const set = new Set(origenes);
      rows = rows.filter((l) => l.origen && set.has(l.origen as Origen));
    }
    return rows;
  }, [allEnriched, onlyHot, bucket, origenes]);

  return { leads, allLeads: allEnriched, isLoading, error, counts, originCounts };
};

export type { Bucket };
