import type { Lead } from '@/hooks/useLeads';
import type { Sale } from '@/hooks/useSales';
import { rollUp, type OpportunityLine } from '@/hooks/useOpportunityLines';
import { STAGES, normalizeStage } from '@/lib/opportunity';

export function opportunityMargin(lead: Lead, lines: OpportunityLine[]): number | null {
  const own = lines.filter(line => line.lead_id === lead.id);
  return own.length ? rollUp(own).margin_eur : lead.margen_estimado_eur ?? null;
}

export function summarizePipeline(leads: Lead[], lines: OpportunityLine[]) {
  return STAGES.map(stage => {
    const rows = leads.filter(lead => !lead.archived_at && normalizeStage(lead.estado) === stage);
    const margins = rows.map(lead => opportunityMargin(lead, lines));
    const known = margins.filter((margin): margin is number => margin !== null);
    return { stage, leads: rows, margin: rows.length && !known.length ? null : known.reduce((sum, margin) => sum + margin, 0), missing: margins.length - known.length };
  });
}

// Todos los pendientes fechados, sin límite oculto; primero los más antiguos.
export function pendingActions(leads: Lead[]) {
  return leads.filter(lead => !lead.archived_at && !['ganada', 'perdida'].includes(normalizeStage(lead.estado)) && lead.next_action_date)
    .sort((a, b) => (a.next_action_date ?? '').localeCompare(b.next_action_date ?? ''));
}

// Margen cerrado real: sales.margen, nunca estimaciones ni updated_at de leads.
export function summarizeClosedMonths(sales: Sale[], now = new Date()) {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const total = (date: Date) => sales.filter(sale => sale.fecha.slice(0, 7) === key(date) && sale.fecha <= `${key(now)}-${String(now.getDate()).padStart(2, '0')}`)
    .reduce((sum, sale) => sum + (Number(sale.margen) || 0), 0);
  return { currentStart, previousStart, current: total(currentStart), previous: total(previousStart) };
}