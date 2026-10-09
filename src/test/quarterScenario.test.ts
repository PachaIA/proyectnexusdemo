import { describe, expect, it } from 'vitest';
import { isLockedQuarterScenarioOpportunity, isQuarterScenarioOpportunity } from '@/lib/quarterScenario';

describe('oportunidades del escenario trimestral', () => {
  it.each(['propuesta', 'negociacion', 'ganada'])('incluye la etapa %s', (estado) => {
    expect(isQuarterScenarioOpportunity({ estado, archived_at: null })).toBe(true);
  });

  it.each(['lead', 'contactado', 'perdida'])('excluye la etapa %s', (estado) => {
    expect(isQuarterScenarioOpportunity({ estado, archived_at: null })).toBe(false);
  });

  it('excluye oportunidades archivadas', () => {
    expect(isQuarterScenarioOpportunity({ estado: 'ganada', archived_at: '2026-10-09T00:00:00Z' })).toBe(false);
  });

  it('bloquea únicamente las oportunidades ganadas', () => {
    expect(isLockedQuarterScenarioOpportunity({ estado: 'ganada' })).toBe(true);
    expect(isLockedQuarterScenarioOpportunity({ estado: 'negociacion' })).toBe(false);
  });
});