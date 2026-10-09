import { describe, expect, it } from 'vitest';
import { DAILY_INTRO_STORAGE_KEY, localCalendarDate, shouldShowDailyIntro } from '@/lib/dailyIntro';

describe('entrada diaria de Nexus', () => {
  it('usa el registro diario que espera a que el logo esté disponible', () => {
    expect(DAILY_INTRO_STORAGE_KEY).toBe('nexus-intro-date-v2');
  });

  it('usa la fecha del calendario local', () => {
    expect(localCalendarDate(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09');
  });

  it('se muestra si aún no se ha visto hoy', () => {
    expect(shouldShowDailyIntro(null, '2026-10-09')).toBe(true);
    expect(shouldShowDailyIntro('2026-10-08', '2026-10-09')).toBe(true);
  });

  it('no se repite durante el mismo día', () => {
    expect(shouldShowDailyIntro('2026-10-09', '2026-10-09')).toBe(false);
  });
});