import { describe, it, expect } from 'vitest';
import { activityTone, daysSince, byMarginDesc, lastActivityByCompany } from '@/lib/pipelineBoard';

describe('pipeline board', () => {
  it('under 7 days is brand', () => expect(activityTone(6)).toBe('brand'));
  it('7 to 14 days is money', () => { expect(activityTone(7)).toBe('money'); expect(activityTone(14)).toBe('money'); });
  it('over 14 days is alert', () => expect(activityTone(15)).toBe('alert'));
  it('counts calendar days', () => expect(daysSince('2026-10-01T23:00:00', new Date('2026-10-09T08:00:00'))).toBe(8));
  it('sorts by margin descending, missing last', () =>
    expect(byMarginDesc([{ m: 10 }, { m: null }, { m: 500 }], x => x.m).map(x => x.m)).toEqual([500, 10, null]));
  it('keeps latest activity per company', () =>
    expect(lastActivityByCompany([{ company_id: 'a', activity_date: '2026-10-01' }, { company_id: 'a', activity_date: '2026-10-05' }]).get('a')).toBe('2026-10-05'));
});
