// Reglas del tablero de pipeline: antigüedad de la última actividad y orden por margen.
export type ActivityTone = 'brand' | 'money' | 'alert';

export const daysSince = (iso: string, now = new Date()): number => {
  const d = new Date(iso);
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((b - a) / 86_400_000));
};

// < 7 días: brand · 7–14: money · > 14: alert
export const activityTone = (days: number): ActivityTone => (days < 7 ? 'brand' : days <= 14 ? 'money' : 'alert');

export const lastActivityByCompany = (rows: { company_id: string; activity_date: string }[]) => {
  const map = new Map<string, string>();
  for (const r of rows) {
    const prev = map.get(r.company_id);
    if (!prev || r.activity_date > prev) map.set(r.company_id, r.activity_date);
  }
  return map;
};

// Sin margen al final; resto de mayor a menor.
export const byMarginDesc = <T>(items: T[], margin: (t: T) => number | null) =>
  [...items].sort((x, y) => (margin(y) ?? -Infinity) - (margin(x) ?? -Infinity));
