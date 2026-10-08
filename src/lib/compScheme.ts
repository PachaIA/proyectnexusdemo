export interface RentBracket { upper: number | null; inclusive: boolean; label?: string }
export interface CompConfig {
  version: number;
  snav_tiers: number[];
  rent_brackets: RentBracket[];
  legacy_rent_brackets: RentBracket[];
  multiplier_matrix: number[][];
  multiplier_cap: number;
  multiplier_goal: number;
  accelerators: { min_snav: number; min_strategic_share: number; bonus: number }[];
  rent_risk_buffer: number;
  simulation: { minimum_units: number; fallback_employees: number; units_per_employee: number; fallback_margin_per_unit: number; snav_margin_factor: number; fallback_probability: number };
}
export interface CompScheme {
  id: string;
  name: string;
  active: boolean;
  target_units: number;
  target_payout_eur: number;
  config: CompConfig;
}

// Configuration errors must never silently select a hardcoded fallback scheme.
export function parseCompScheme(row: unknown): CompScheme {
  const scheme = row as CompScheme | null;
  const c = scheme?.config;
  const validBrackets = (bands: RentBracket[]) => Array.isArray(bands) && bands.length > 0 && bands.every((b, i) =>
    typeof b.inclusive === 'boolean' && (i === bands.length - 1 ? b.upper === null : typeof b.upper === 'number' && Number.isFinite(b.upper) && (i === 0 || Number(b.upper) > Number(bands[i - 1].upper))));
  if (!scheme || !scheme.id || !scheme.name || scheme.active !== true || !Number.isFinite(Number(scheme.target_units)) || Number(scheme.target_units) <= 0 || !Number.isFinite(Number(scheme.target_payout_eur)) || !c ||
    !Array.isArray(c.snav_tiers) || c.snav_tiers.length === 0 || !c.snav_tiers.every((t, i) => Number.isFinite(t) && t > 0 && (i === 0 || t > c.snav_tiers[i - 1])) ||
    !validBrackets(c.rent_brackets) || !validBrackets(c.legacy_rent_brackets) || c.legacy_rent_brackets.length !== c.rent_brackets.length ||
    !Array.isArray(c.multiplier_matrix) || c.multiplier_matrix.length !== c.rent_brackets.length || !c.multiplier_matrix.every(r => Array.isArray(r) && r.length === c.snav_tiers.length + 1 && r.every(Number.isFinite)) ||
    !Number.isFinite(c.multiplier_cap) || !Number.isFinite(c.multiplier_goal) || !Number.isFinite(c.rent_risk_buffer) ||
    !Array.isArray(c.accelerators) || !c.accelerators.every(a => [a.min_snav, a.min_strategic_share, a.bonus].every(Number.isFinite)) ||
    !c.simulation || !['minimum_units', 'fallback_employees', 'units_per_employee', 'fallback_margin_per_unit', 'snav_margin_factor', 'fallback_probability'].every(k => Number.isFinite(c.simulation[k as keyof CompConfig['simulation']]))) {
    throw new Error('El esquema de compensación activo no tiene una configuración válida.');
  }
  return { ...scheme, target_units: Number(scheme.target_units), target_payout_eur: Number(scheme.target_payout_eur) };
}

export function rentBracketIndex(rent: number, brackets: RentBracket[]): number {
  return brackets.findIndex(b => b.upper === null || (b.inclusive ? rent <= b.upper : rent < b.upper));
}

export function baseMultiplier(snav: number, rent: number, scheme: CompScheme, legacy = false): number {
  const c = scheme.config;
  const col = c.snav_tiers.filter(t => snav >= t).length;
  const row = rentBracketIndex(rent, legacy ? c.legacy_rent_brackets : c.rent_brackets);
  return c.multiplier_matrix[row][col];
}