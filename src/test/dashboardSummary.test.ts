import { describe, expect, it } from 'vitest';
import { pendingActions, summarizePipeline, summarizeClosedMonths } from '@/lib/dashboardSummary';
import type { Lead } from '@/hooks/useLeads';
import type { Sale } from '@/hooks/useSales';
import type { OpportunityLine } from '@/hooks/useOpportunityLines';

const lead = (id: string, estado: string, margin: number | null = null) => ({ id, estado, margen_estimado_eur: margin, archived_at: null, next_action_date: '2026-10-08' }) as Lead;
describe('dashboard summary', () => {
  it('groups all six stages with line margins preferred to estimates without counting archived leads', () => {
    const leads = [lead('a', 'propuesta', 999), lead('b', 'propuesta', 20), lead('c', 'ganada', 40), { ...lead('d', 'propuesta', 500), archived_at: '2026-10-01' }];
    const lines = [{ lead_id: 'a', monthly_revenue: 100, monthly_cost: 30 }] as OpportunityLine[];
    const result = summarizePipeline(leads, lines);
    expect(result.map(s => s.stage)).toEqual(['lead', 'contactado', 'propuesta', 'negociacion', 'ganada', 'perdida']);
    expect(result.find(s => s.stage === 'propuesta')?.margin).toBe(90);
    expect(result.find(s => s.stage === 'ganada')?.margin).toBe(40);
  });
  it('does not replace unknown margins with invented amounts', () => {
    expect(summarizePipeline([lead('a', 'lead')], [])[0].margin).toBeNull();
    expect(summarizePipeline([lead('a', 'lead')], [])[0].missing).toBe(1);
  });
  it('compares recorded closed margin in current and previous calendar months including year change', () => {
    const sales = [{ fecha: '2026-01-05', margen: 100 }, { fecha: '2025-12-31', margen: 60 }, { fecha: '2025-11-30', margen: 900 }, { fecha: '2026-01-20', margen: 500 }] as Sale[];
    const result = summarizeClosedMonths(sales, new Date(2026, 0, 8));
    expect(result.current).toBe(100);
    expect(result.previous).toBe(60);
  });
  it('keeps all pending dates ordered, excluding won lost archived and undated opportunities', () => {
    const rows = [lead('closed', 'ganada'), lead('lost', 'perdida'), { ...lead('none', 'lead'), next_action_date: null }, { ...lead('later', 'lead'), next_action_date: '2026-12-01' }, { ...lead('overdue', 'contactado'), next_action_date: '2026-10-01' }];
    expect(pendingActions(rows).map(l => l.id)).toEqual(['overdue', 'later']);
  });
});