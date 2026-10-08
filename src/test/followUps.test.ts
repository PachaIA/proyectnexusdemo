import { describe, it, expect } from 'vitest';
import { bucketFollowUps } from '@/lib/followUps';

const now = new Date(2026, 9, 8, 15, 0); // 8 oct 2026
const l = (id: string, date: string | null, extra: object = {}) => ({ id, estado: 'contactado', archived_at: null, next_action_date: date, ...extra });

describe('bucketFollowUps', () => {
  it('fecha anterior a hoy es vencida', () => {
    expect(bucketFollowUps([l('a', '2026-10-07')], now).overdue.map((x) => x.id)).toEqual(['a']);
  });
  it('fecha de hoy va en Hoy', () => {
    expect(bucketFollowUps([l('a', '2026-10-08')], now).today.map((x) => x.id)).toEqual(['a']);
  });
  it('dentro de 7 días entra en próximos; día 8 no', () => {
    const r = bucketFollowUps([l('a', '2026-10-15'), l('b', '2026-10-16')], now);
    expect(r.upcoming.map((x) => x.id)).toEqual(['a']);
  });
  it('ganadas, perdidas y archivadas no aparecen', () => {
    const r = bucketFollowUps([l('a', '2026-10-01', { estado: 'ganada' }), l('b', '2026-10-01', { estado: 'perdida' }), l('c', '2026-10-01', { archived_at: 'x' })], now);
    expect(r.overdue).toEqual([]);
  });
});
