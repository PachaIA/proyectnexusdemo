import { describe, expect, it } from 'vitest';
import { BATCH_SIZE, geocodeUpdate, pendingCompanies } from '../../supabase/functions/geocode-companies/logic';

const timestamp = '2026-10-27T18:36:00.000Z';
const result = { lat: 36.72, lng: -4.42, formatted_address: 'Málaga, España' };

describe('geocode companies', () => {
  it.each(['ROOFTOP', 'RANGE_INTERPOLATED', 'GEOMETRIC_CENTER'])('stores precise %s coordinates', (location_type) => {
    expect(geocodeUpdate({ ...result, location_type }, timestamp)).toEqual({
      lat: 36.72, lng: -4.42, geocode_status: 'ok', geocoded_at: timestamp,
    });
  });

  it('marks approximate results without saving Google coordinates', () => {
    expect(geocodeUpdate({ ...result, location_type: 'APPROXIMATE' }, timestamp)).toEqual({
      lat: 0, lng: 0, geocode_status: 'aproximado', geocoded_at: timestamp,
    });
  });

  it('marks absent or failed results so they are not retried', () => {
    expect(geocodeUpdate(null, timestamp)).toEqual({
      lat: 0, lng: 0, geocode_status: 'sin_resultado', geocoded_at: timestamp,
    });
  });

  it('uses identical pending filters for row selection and remaining count', () => {
    function query() {
      const calls: unknown[][] = [];
      const builder = {
        or: (...args: unknown[]) => { calls.push(['or', ...args]); return builder; },
        not: (...args: unknown[]) => { calls.push(['not', ...args]); return builder; },
        neq: (...args: unknown[]) => { calls.push(['neq', ...args]); return builder; },
        is: (...args: unknown[]) => { calls.push(['is', ...args]); return builder; },
      };
      pendingCompanies(builder);
      return calls;
    }
    const expected = [
      ['or', 'lat.eq.0,lng.eq.0'], ['not', 'address', 'is', null],
      ['neq', 'address', ''], ['is', 'archived_at', null], ['is', 'geocode_status', null],
    ];
    expect(query()).toEqual(expected);
    expect(query()).toEqual(expected);
  });

  it('keeps batches at 100 companies', () => {
    expect(BATCH_SIZE).toBe(100);
  });
});