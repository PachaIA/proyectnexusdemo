import type { Lead } from '@/hooks/useLeads';

export const QUARTER_SCENARIO_STAGES = ['propuesta', 'negociacion', 'ganada'] as const;

export const isQuarterScenarioOpportunity = (lead: Pick<Lead, 'estado' | 'archived_at'>) =>
  !lead.archived_at && QUARTER_SCENARIO_STAGES.includes(lead.estado as (typeof QUARTER_SCENARIO_STAGES)[number]);

export const isLockedQuarterScenarioOpportunity = (lead: Pick<Lead, 'estado'>) => lead.estado === 'ganada';