/**
 * NCS Scoring — Nexus V2
 *
 * Única fuente de verdad para la puntuación de leads. Usada por:
 *   - Simulador NCS (src/components/SimuladorNCS.tsx)
 *   - Scoring masivo (src/hooks/useScoredLeads.ts)
 *   - Coloreado del mapa (src/components/LeadMarker.tsx)
 *
 * Cualquier ajuste en la lógica se propaga automáticamente a los tres sitios.
 * No crees funciones alternativas de scoring en componentes. Importa siempre
 * desde aquí.
 */

export type Sector =
  | 'hosteleria'
  | 'retail'
  | 'servicios'
  | 'industrial'
  | 'salud'
  | 'construccion'
  | 'otro';

export type PresenciaDigital = 'none' | 'basic' | 'advanced';
export type Crecimiento = 'declining' | 'stable' | 'growing' | 'fast';
export type OperadorActual = 'movistar' | 'orange' | 'digi' | 'none' | 'unknown';
export type Bucket = 'hot' | 'warm' | 'cold';

export interface LeadInput {
  sector: Sector;
  empleados?: number | null;        // null => desconocido, asume 25
  antiguedadAnios?: number | null;  // null => desconocido, asume 10
  presenciaDigital?: PresenciaDigital;
  crecimiento?: Crecimiento;
  operadorActual?: OperadorActual;
  googleRating?: number | null;     // 0-5, enriquece el score si está
  reviewCount?: number | null;      // nº reseñas Google, idem
}

export interface NcsScore {
  score: number;          // 0-100
  bucket: Bucket;
  priority: string;       // 'Contactar en 48h', etc.
  reasons: string[];      // Explicabilidad: por qué este score
}

// ---------------------------------------------------------------------------
// Configuración por sector. Los multiplicadores reflejan tu experiencia
// comercial en Málaga/Andalucía. Ajústalos según vayas viendo conversiones
// reales (y como son un único sitio, cambias aquí y se propaga).
// ---------------------------------------------------------------------------
const SECTOR_CONFIG: Record<Sector, { multiplier: number; pain: string }> = {
  hosteleria:   { multiplier: 0.95, pain: 'gestión de reservas y conectividad multi-local' },
  retail:       { multiplier: 1.00, pain: 'TPV, datáfonos y conexión entre tiendas' },
  servicios:    { multiplier: 1.12, pain: 'movilidad del equipo y seguridad documental' },
  industrial:   { multiplier: 1.05, pain: 'conectividad de planta y fiabilidad 5G' },
  salud:        { multiplier: 1.18, pain: 'protección de datos clínicos bajo RGPD' },
  construccion: { multiplier: 0.92, pain: 'comunicación entre oficina y obras' },
  otro:         { multiplier: 1.00, pain: 'comunicación profesional y ciberseguridad' },
};

const OPERADOR_MULT: Record<OperadorActual, number> = {
  movistar: 0.90,  // satisfechos, más difícil desanclar
  orange:   1.10,  // churn medio-alto
  digi:     1.15,  // upgradable a fibra + convergente
  none:     1.25,  // virgen, máxima oportunidad
  unknown:  1.00,
};

export function scoreNcs(lead: LeadInput): NcsScore {
  const sectorCfg = SECTOR_CONFIG[lead.sector] ?? SECTOR_CONFIG.otro;
  const reasons: string[] = [];

  // Tamaño: punto dulce 20-60 empleados
  const emp = lead.empleados ?? 25;
  let sizeScore: number;
  if (emp < 20) sizeScore = (emp - 5) * 1.6;
  else if (emp > 60) sizeScore = 28 - (emp - 60) * 0.25;
  else sizeScore = 28;
  sizeScore = Math.max(0, sizeScore);
  if (lead.empleados == null) reasons.push('Sin dato de empleados (asumido 25)');

  // Antigüedad: punto dulce 5-15 años (establecida, lista para upgrade)
  const yrs = lead.antiguedadAnios ?? 10;
  let ageScore: number;
  if (yrs < 3) ageScore = yrs * 3;
  else if (yrs >= 5 && yrs <= 15) ageScore = 15;
  else ageScore = Math.max(0, 15 - Math.abs(yrs - 10) * 0.6);
  if (lead.antiguedadAnios == null) reasons.push('Sin dato de antigüedad (asumido 10 años)');

  // Presencia digital
  const pd = lead.presenciaDigital ?? 'basic';
  const webScore = pd === 'none' ? 3 : pd === 'basic' ? 11 : 18;

  // Crecimiento
  const g = lead.crecimiento ?? 'stable';
  const growthScore = g === 'declining' ? 0 : g === 'stable' ? 9 : g === 'growing' ? 17 : 24;
  if (lead.crecimiento == null) reasons.push('Sin dato de crecimiento (asumido estable)');

  // Operador actual
  const op = lead.operadorActual ?? 'unknown';
  const opMult = OPERADOR_MULT[op];
  if (op === 'unknown') reasons.push('Operador actual desconocido (multiplicador neutro)');

  // Bonus por engagement en Google Places (si está disponible)
  let engagementBonus = 0;
  if (lead.reviewCount != null) {
    if (lead.reviewCount > 50) engagementBonus = 6;
    else if (lead.reviewCount > 20) engagementBonus = 3;
    else if (lead.reviewCount < 5) engagementBonus = -3;
  }

  const raw =
    (sizeScore + ageScore + webScore + growthScore) *
      sectorCfg.multiplier *
      opMult +
    engagementBonus +
    6; // base de salida

  const score = Math.round(Math.max(0, Math.min(100, raw)));
  const bucket: Bucket = score >= 70 ? 'hot' : score >= 50 ? 'warm' : 'cold';
  const priority =
    bucket === 'hot'
      ? 'Prioridad alta — contactar en 48h'
      : bucket === 'warm'
      ? 'Prioridad media — seguimiento en 14 días'
      : 'Nurturing — revisar a 60 días';

  // Razones positivas destacadas (al principio del array para UX)
  if (sizeScore >= 25) reasons.unshift(`Tamaño en punto dulce (${emp} empleados)`);
  if (sectorCfg.multiplier >= 1.1) reasons.unshift(`Sector ${lead.sector} con alta propensión telco/ciber`);
  if (opMult >= 1.15) reasons.unshift('Operador actual altamente churneable');
  if (pd === 'advanced') reasons.unshift('Presencia digital avanzada (señal de madurez)');

  return { score, bucket, priority, reasons };
}

// ---------------------------------------------------------------------------
// Recomendador de producto. Usado por el simulador y por el módulo de
// outreach (cuando lo integres con Make.com para generar emails).
// ---------------------------------------------------------------------------
export interface ProductRec {
  title: string;
  rationale: string;
}

export function recommendProducts(lead: LeadInput, result: NcsScore): ProductRec[] {
  const emp = lead.empleados ?? 25;
  const sectorCfg = SECTOR_CONFIG[lead.sector] ?? SECTOR_CONFIG.otro;
  const pd = lead.presenciaDigital ?? 'basic';

  const products: ProductRec[] = [];

  products.push({
    title: 'Bono Red Infinity PRO',
    rationale:
      'Base de toda propuesta: centralita One Net Plus, Fibra 1Gbps, llamadas ilimitadas, 1TB datos 5G.',
  });

  if (emp >= 15 && (pd !== 'none' || sectorCfg.multiplier >= 1.1)) {
    products.push({
      title: 'Seguridad Digital Plus + Lookout',
      rationale: `Prioritario por el perfil: ${sectorCfg.pain}. Protección endpoint y gestión de dispositivos móviles.`,
    });
  }

  if (emp >= 20) {
    products.push({
      title: 'Sesame HR',
      rationale:
        'Upselling natural a partir de 20 empleados. Control horario es obligación legal, venta poco friccional.',
    });
  }

  if (result.bucket === 'hot' && sectorCfg.multiplier >= 1.0) {
    products.push({
      title: 'SOC gestionado',
      rationale:
        'Solo si ya tiene IT interno o un incidente reciente. Conversación de presupuesto, no de precio.',
    });
  }

  products.push({
    title: 'Repsol Negocios',
    rationale:
      'Cross-sell energético de cierre. Bajo esfuerzo, gran ancla de fidelización a 24 meses.',
  });

  return products;
}

// ---------------------------------------------------------------------------
// Pitch sugerido según bucket. Puede llamarlo tanto el simulador como un
// prompt de Claude/Gemini para generar el email real.
// ---------------------------------------------------------------------------
export function pitchFor(lead: LeadInput, result: NcsScore): string {
  const sectorCfg = SECTOR_CONFIG[lead.sector] ?? SECTOR_CONFIG.otro;
  const emp = lead.empleados ?? 25;
  const yrs = lead.antiguedadAnios ?? 10;

  if (result.bucket === 'hot') {
    return `Lead prioritario. Llamada directa esta semana. Abrir por ${sectorCfg.pain} y proponer diagnóstico de 30 min en su oficina. Con ${emp} empleados y ${yrs} años de recorrido, el argumento es consolidación de proveedor y ahorro operativo, no precio.`;
  }

  if (result.bucket === 'warm') {
    return `Lead cualificable. Email inicial con caso de éxito sectorial en la zona de Málaga. Objetivo no es vender, es agendar café. Segundo toque en LinkedIn a los cinco días si no responde.`;
  }

  return `Lead frío. No gastes hora comercial en llamada. Mandar a secuencia de contenido (guía sectorial) y revisar el score a 60 días cuando alguna señal mejore. Si sigue bajo, archivar.`;
}

// ---------------------------------------------------------------------------
// Labels y colores para UI. Expuestos aquí para que el simulador, el mapa y
// la tabla los compartan.
// ---------------------------------------------------------------------------
export const SECTOR_LABELS: Record<Sector, string> = {
  hosteleria: 'Hostelería',
  retail: 'Retail y comercio',
  servicios: 'Servicios profesionales',
  industrial: 'Industrial',
  salud: 'Salud y clínicas',
  construccion: 'Construcción',
  otro: 'Otro',
};

export const BUCKET_STYLE: Record<
  Bucket,
  { label: string; bg: string; fg: string; marker: string }
> = {
  hot:  { label: 'Hot lead',  bg: '#FEE4E2', fg: '#B42318', marker: '#E60000' }, // Rojo Vodafone
  warm: { label: 'Warm lead', bg: '#FEF0C7', fg: '#B54708', marker: '#F59E0B' },
  cold: { label: 'Cold lead', bg: '#DBEAFE', fg: '#1E40AF', marker: '#3B82F6' },
};

// ---------------------------------------------------------------------------
// Helper: mapea una fila de "Lead Malaga" (Google Sheets) al LeadInput
// esperado por scoreNcs. Ajusta los nombres de columna si difieren.
// ---------------------------------------------------------------------------
export interface SheetRow {
  nombre?: string;
  sector?: string;
  web?: string;
  empleados?: string | number;
  antiguedad?: string | number;
  operador?: string;
  rating?: string | number;
  review_count?: string | number;
  [key: string]: unknown;
}

export function rowToLeadInput(row: SheetRow): LeadInput {
  const sectorNorm = (row.sector ?? '').toString().toLowerCase().trim();
  const sectorMatch: Sector =
    (['hosteleria', 'retail', 'servicios', 'industrial', 'salud', 'construccion'].find(
      (s) => sectorNorm.includes(s),
    ) as Sector) ?? 'otro';

  const hasWeb = !!(row.web && row.web.toString().trim() !== '');

  const opNorm = (row.operador ?? '').toString().toLowerCase();
  const operadorActual: OperadorActual = opNorm.includes('movistar')
    ? 'movistar'
    : opNorm.includes('orange') || opNorm.includes('masmovil')
    ? 'orange'
    : opNorm.includes('digi')
    ? 'digi'
    : opNorm === 'ninguno' || opNorm === 'none'
    ? 'none'
    : 'unknown';

  const toNum = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    sector: sectorMatch,
    empleados: toNum(row.empleados),
    antiguedadAnios: toNum(row.antiguedad),
    presenciaDigital: hasWeb ? 'basic' : 'none',
    crecimiento: undefined, // hay que enriquecer — asume 'stable' por defecto
    operadorActual,
    googleRating: toNum(row.rating),
    reviewCount: toNum(row.review_count),
  };
}

// ---------------------------------------------------------------------------
// Desglose explicable del score. Replica EXACTAMENTE la aritmética de scoreNcs
// (sin modificarla) para exponer cuánto aporta cada factor.
// La suma de contribuciones + base + engagement = score bruto.
// ---------------------------------------------------------------------------
export interface NcsFactor {
  key: 'sector' | 'empleados' | 'antiguedad' | 'presencia' | 'crecimiento' | 'operador' | 'engagement' | 'base';
  label: string;
  detail: string;       // valor de entrada legible
  points: number;       // aportación real al score (puede ser negativa)
  maxPoints: number;    // escala para la barra (máximo absoluto posible)
  weight: string;       // peso del factor en la fórmula
}

export function explainNcs(lead: LeadInput): { factors: NcsFactor[]; raw: number; score: number } {
  const sectorCfg = SECTOR_CONFIG[lead.sector] ?? SECTOR_CONFIG.otro;
  const emp = lead.empleados ?? 25;
  let sizeScore: number;
  if (emp < 20) sizeScore = (emp - 5) * 1.6;
  else if (emp > 60) sizeScore = 28 - (emp - 60) * 0.25;
  else sizeScore = 28;
  sizeScore = Math.max(0, sizeScore);

  const yrs = lead.antiguedadAnios ?? 10;
  let ageScore: number;
  if (yrs < 3) ageScore = yrs * 3;
  else if (yrs >= 5 && yrs <= 15) ageScore = 15;
  else ageScore = Math.max(0, 15 - Math.abs(yrs - 10) * 0.6);

  const pd = lead.presenciaDigital ?? 'basic';
  const webScore = pd === 'none' ? 3 : pd === 'basic' ? 11 : 18;
  const g = lead.crecimiento ?? 'stable';
  const growthScore = g === 'declining' ? 0 : g === 'stable' ? 9 : g === 'growing' ? 17 : 24;
  const op = lead.operadorActual ?? 'unknown';
  const opMult = OPERADOR_MULT[op];
  let engagementBonus = 0;
  if (lead.reviewCount != null) {
    if (lead.reviewCount > 50) engagementBonus = 6;
    else if (lead.reviewCount > 20) engagementBonus = 3;
    else if (lead.reviewCount < 5) engagementBonus = -3;
  }

  const S = sizeScore + ageScore + webScore + growthScore; // máx 85
  const sm = sectorCfg.multiplier;
  const sectorPts = S * (sm - 1);
  const opPts = S * sm * (opMult - 1);
  const raw = S * sm * opMult + engagementBonus + 6;

  const factors: NcsFactor[] = [
    { key: 'sector', label: 'Sector', detail: SECTOR_LABELS[lead.sector], points: sectorPts, maxPoints: 16, weight: `×${sm.toFixed(2)} sobre la base` },
    { key: 'empleados', label: 'Empleados', detail: `${emp}${lead.empleados == null ? ' (asumido)' : ''}`, points: sizeScore, maxPoints: 28, weight: 'hasta 28 pts' },
    { key: 'antiguedad', label: 'Antigüedad', detail: `${yrs} años${lead.antiguedadAnios == null ? ' (asumido)' : ''}`, points: ageScore, maxPoints: 28, weight: 'hasta 15 pts' },
    { key: 'presencia', label: 'Presencia digital', detail: pd === 'none' ? 'Ninguna' : pd === 'basic' ? 'Básica' : 'Avanzada', points: webScore, maxPoints: 28, weight: 'hasta 18 pts' },
    { key: 'crecimiento', label: 'Señal de crecimiento', detail: { declining: 'En declive', stable: 'Estable', growing: 'En crecimiento', fast: 'Rápido' }[g], points: growthScore, maxPoints: 28, weight: 'hasta 24 pts' },
    { key: 'operador', label: 'Operador actual', detail: { movistar: 'Movistar', orange: 'Orange/MásMóvil', digi: 'Digi/OMV', none: 'Sin contrato B2B', unknown: 'Desconocido' }[op], points: opPts, maxPoints: 28, weight: `×${opMult.toFixed(2)} sobre la base` },
  ];
  if (lead.reviewCount != null) {
    factors.push({ key: 'engagement', label: 'Reseñas Google', detail: `${lead.reviewCount}`, points: engagementBonus, maxPoints: 28, weight: '−3 a +6 pts' });
  }
  factors.push({ key: 'base', label: 'Base de salida', detail: 'Fija', points: 6, maxPoints: 28, weight: '6 pts' });

  return { factors, raw, score: Math.round(Math.max(0, Math.min(100, raw))) };
}
