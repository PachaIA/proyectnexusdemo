import { describe, expect, it } from 'vitest';
import { localCalendarDate, shouldShowDailyIntro } from '@/lib/dailyIntro';

describe('entrada diaria de Nexus', () => {
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