export type GeocodeResult = {
  lat: number;
  lng: number;
  location_type: string;
  formatted_address: string;
};

export const BATCH_SIZE = 100;

type PendingQuery<T> = {
  or(filters: string): T;
  not(column: string, operator: string, value: null): T;
  neq(column: string, value: string): T;
  is(column: string, value: null): T;
};

export function pendingCompanies<T extends PendingQuery<T>>(query: T): T {
  return query
    .or('lat.eq.0,lng.eq.0')
    .not('address', 'is', null)
    .neq('address', '')
    .is('archived_at', null)
    .is('geocode_status', null);
}

export function geocodeUpdate(result: GeocodeResult | null, timestamp: string) {
  const precise = result !== null &&
    ['ROOFTOP', 'RANGE_INTERPOLATED', 'GEOMETRIC_CENTER'].includes(result.location_type);
  const geocode_status = precise ? 'ok' :
    result?.location_type === 'APPROXIMATE' ? 'aproximado' : 'sin_resultado';
  return {
    lat: precise && result ? result.lat : 0,
    lng: precise && result ? result.lng : 0,
    geocode_status,
    geocoded_at: timestamp,
  };
}