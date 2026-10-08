import { supabase } from '@/integrations/supabase/client';
import { refreshLeads } from './queryClient';

// Única fuente de verdad de las etapas de oportunidad (enum opportunity_stage en BD).
export const STAGES = ['lead', 'contactado', 'propuesta', 'negociacion', 'ganada', 'perdida'] as const;
export type StageId = typeof STAGES[number];
export const STAGE_LABEL: Record<StageId, string> = {
  lead: 'Lead',
  contactado: 'Contactado',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganada: 'Ganada',
  perdida: 'Perdida',
};

// Valores antiguos (p. ej. guardados en el móvil) → etapa actual.
const LEGACY: Record<string, StageId> = {
  sin_empezar: 'lead', cualificado: 'contactado', ganado: 'ganada', perdido: 'perdida',
};
export const normalizeStage = (v: string | null | undefined): StageId =>
  (STAGES as readonly string[]).includes(v || '') ? (v as StageId) : LEGACY[v || ''] ?? 'lead';

export interface OpportunityFields {
  company_id: string;
  fecha_cierre_prevista: string; // YYYY-MM-DD
  importe_mensual_eur: number;
  margen_estimado_eur: number;
  next_action?: string | null;
  next_action_date?: string | null;
}

export type OpportunityDraft = {
  company_id: string;
  fecha_cierre_prevista: string;
  importe_mensual_eur: string;
  margen_estimado_eur: string;
  next_action?: string;
  next_action_date?: string;
};

export const validateOpportunity = (d: OpportunityDraft): Partial<Record<keyof OpportunityDraft, string>> => {
  const e: Partial<Record<keyof OpportunityDraft, string>> = {};
  if (!d.company_id) e.company_id = 'Falta el cliente';
  if (!d.fecha_cierre_prevista) e.fecha_cierre_prevista = 'Falta la fecha prevista de cierre';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha_cierre_prevista)) e.fecha_cierre_prevista = 'La fecha prevista de cierre no es válida';
  const imp = d.importe_mensual_eur.trim().replace(',', '.');
  if (!imp) e.importe_mensual_eur = 'Falta el importe mensual recurrente';
  else if (isNaN(Number(imp))) e.importe_mensual_eur = 'El importe mensual debe ser un número';
  else if (Number(imp) < 0) e.importe_mensual_eur = 'El importe mensual no puede ser negativo';
  const mar = d.margen_estimado_eur.trim().replace(',', '.');
  if (d.next_action?.trim() && !d.next_action_date) e.next_action_date = 'Falta la fecha de la próxima acción';
  if (!mar) e.margen_estimado_eur = 'Falta el margen estimado';
  else if (isNaN(Number(mar))) e.margen_estimado_eur = 'El margen estimado debe ser un número';
  return e;
};

export const draftToFields = (d: OpportunityDraft): OpportunityFields => ({
  company_id: d.company_id,
  fecha_cierre_prevista: d.fecha_cierre_prevista,
  importe_mensual_eur: Number(d.importe_mensual_eur.trim().replace(',', '.')),
  margen_estimado_eur: Number(d.margen_estimado_eur.trim().replace(',', '.')),
  ...(d.next_action?.trim() ? { next_action: d.next_action.trim().slice(0, 140) } : {}),
  ...(d.next_action_date ? { next_action_date: d.next_action_date } : {}),
});

export const missingFields = (l: { company_id?: string | null; fecha_cierre_prevista?: string | null; importe_mensual_eur?: number | null; margen_estimado_eur?: number | null }) => {
  const m: string[] = [];
  if (!l.company_id) m.push('cliente');
  if (!l.fecha_cierre_prevista) m.push('fecha prevista de cierre');
  if (l.importe_mensual_eur == null) m.push('importe mensual');
  if (l.margen_estimado_eur == null) m.push('margen estimado');
  return m;
};

// --- Diálogo de datos de oportunidad (host montado en App) ---
export interface OpportunityRequest {
  title: string;
  initial: Partial<OpportunityDraft>;
  lockClient?: boolean;
  resolve: (v: OpportunityFields | null) => void;
}
type Listener = (r: OpportunityRequest | null) => void;
let listener: Listener | null = null;
export const subscribeOpportunityDialog = (l: Listener) => { listener = l; return () => { if (listener === l) listener = null; }; };

export const requestOpportunityFields = (opts: { title?: string; companyId?: string; initial?: Partial<OpportunityDraft>; lockClient?: boolean }) =>
  new Promise<OpportunityFields | null>((resolve) => {
    if (!listener) return resolve(null);
    listener({
      title: opts.title || 'Nueva oportunidad',
      initial: { company_id: opts.companyId || '', ...opts.initial },
      lockClient: opts.lockClient,
      resolve: (v) => { listener?.(null); resolve(v); },
    });
  });

// Edición: abre el diálogo con los valores actuales y guarda.
export const editOpportunity = async (lead: { id: string; company_id: string; fecha_cierre_prevista?: string | null; importe_mensual_eur?: number | null; margen_estimado_eur?: number | null; next_action?: string | null; next_action_date?: string | null }) => {
  const CODES: Record<string, string> = { call: 'Llamar', visit: 'Visitar', email: 'Enviar email', 'follow-up': 'Seguimiento', proposal: 'Enviar propuesta' };
  const f = await requestOpportunityFields({
    title: 'Editar oportunidad',
    initial: {
      company_id: lead.company_id,
      fecha_cierre_prevista: lead.fecha_cierre_prevista || '',
      importe_mensual_eur: lead.importe_mensual_eur != null ? String(lead.importe_mensual_eur) : '',
      margen_estimado_eur: lead.margen_estimado_eur != null ? String(lead.margen_estimado_eur) : '',
      next_action: lead.next_action ? CODES[lead.next_action] ?? lead.next_action : '',
      next_action_date: lead.next_action_date || '',
    },
  });
  if (!f) return false;
  if (!('next_action' in f)) f.next_action = null;
  if (!('next_action_date' in f)) f.next_action_date = null;
  const { error } = await (supabase as any).from('leads').update(f).eq('id', lead.id);
  if (error) throw error;
  refreshLeads();
  return true;
};
