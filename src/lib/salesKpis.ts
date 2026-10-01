import { getVodafoneFiscalQuarter } from '@/lib/vodafoneFiscalQuarter';
import type { Sale } from '@/hooks/useSales';

export interface QuarterRange {
  start: Date;
  end: Date; // exclusive
  startStr: string; // YYYY-MM-DD
  endStr: string;
}

export const getCurrentFiscalQuarterRange = (date: Date = new Date()): QuarterRange => {
  const { quarter, fyStart } = getVodafoneFiscalQuarter(date);
  // Q1 Apr–Jun (start year fyStart); Q2 Jul–Sep; Q3 Oct–Dec; Q4 Jan–Mar of fyStart+1
  let startMonth: number, startYear: number;
  if (quarter === 1) { startMonth = 3; startYear = fyStart; }
  else if (quarter === 2) { startMonth = 6; startYear = fyStart; }
  else if (quarter === 3) { startMonth = 9; startYear = fyStart; }
  else { startMonth = 0; startYear = fyStart + 1; }
  const start = new Date(startYear, startMonth, 1);
  const end = new Date(startYear, startMonth + 3, 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start, end, startStr: fmt(start), endStr: fmt(end) };
};

// Matriz 6 (rentabilidad) x 4 (SNAV)
// Cols: <1500, >=1500, >=3500, >=5000
const MATRIX: number[][] = [
  [0.0, 0.0, 0.3, 0.6], // <10
  [0.2, 0.4, 0.6, 0.8], // 10-29
  [0.4, 0.6, 0.8, 1.2], // 30-49
  [0.6, 1.0, 1.2, 1.4], // 50-79
  [0.8, 1.2, 1.4, 1.8], // 80-120
  [1.0, 1.4, 1.6, 2.0], // >120
];

const snavCol = (snav: number) => {
  if (snav < 1500) return 0;
  if (snav < 3500) return 1;
  if (snav < 5000) return 2;
  return 3;
};

const rentRow = (rent: number) => {
  if (rent < 10) return 0;
  if (rent < 30) return 1;
  if (rent < 50) return 2;
  if (rent < 80) return 3;
  if (rent <= 120) return 4;
  return 5;
};

export const rentLabel = (r: number) => {
  if (r < 10) return '<10€';
  if (r < 30) return '10-29€';
  if (r < 50) return '30-49€';
  if (r < 80) return '50-79€';
  if (r <= 120) return '80-120€';
  return '>120€';
};

export interface QuarterKpis {
  altas: number;
  snav: number;
  rentabilidadMedia: number;
  multiplicador: number;
  baseMultiplicador: number;
  acelerador: boolean;
  totalVentas: number;
}

export const computeQuarterKpis = (sales: Sale[]): QuarterKpis => {
  const { startStr, endStr } = getCurrentFiscalQuarterRange();
  const trimSales = sales.filter(s => s.fecha >= startStr && s.fecha < endStr);
  const altas = trimSales.reduce((a, s) => a + (s.lineas_movil || 0) + (s.lineas_fibra || 0), 0);
  const snav = trimSales.reduce((a, s) => a + Number(s.snav || 0), 0);
  const margen = trimSales.reduce((a, s) => a + Number(s.margen || 0), 0);
  const rentabilidadMedia = altas > 0 ? margen / altas : 0;
  const base = MATRIX[rentRow(rentabilidadMedia)][snavCol(snav)];
  const estrategicas = trimSales.filter(s => s.producto_estrategico).length;
  const acelerador = snav >= 1800 && trimSales.length > 0 && (estrategicas / trimSales.length) >= 0.5;
  const multiplicador = Math.min(2.0, base + (acelerador ? 0.2 : 0));
  return {
    altas,
    snav,
    rentabilidadMedia,
    multiplicador: Math.round(multiplicador * 10) / 10,
    baseMultiplicador: base,
    acelerador,
    totalVentas: trimSales.length,
  };
};

export const useAllSalesQueryKey = ['sales', 'all'];
