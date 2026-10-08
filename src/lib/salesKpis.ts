import { getVodafoneFiscalQuarter } from '@/lib/vodafoneFiscalQuarter';
import type { Sale } from '@/hooks/useSales';
import { baseMultiplier, rentBracketIndex, type CompScheme } from '@/lib/compScheme';

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

export const rentLabel = (r: number, scheme: CompScheme) =>
  scheme.config.rent_brackets[rentBracketIndex(r, scheme.config.rent_brackets)].label;

export interface QuarterKpis {
  altas: number;
  snav: number;
  rentabilidadMedia: number;
  multiplicador: number;
  baseMultiplicador: number;
  acelerador: boolean;
  acceleratorBonus: number;
  totalVentas: number;
}

export const computeQuarterKpis = (sales: Sale[], scheme: CompScheme): QuarterKpis => {
  const { startStr, endStr } = getCurrentFiscalQuarterRange();
  const trimSales = sales.filter(s => s.fecha >= startStr && s.fecha < endStr);
  const altas = trimSales.reduce((a, s) => a + (s.lineas_movil || 0) + (s.lineas_fibra || 0), 0);
  const snav = trimSales.reduce((a, s) => a + Number(s.snav || 0), 0);
  const margen = trimSales.reduce((a, s) => a + Number(s.margen || 0), 0);
  const rentabilidadMedia = altas > 0 ? margen / altas : 0;
  const base = baseMultiplier(snav, rentabilidadMedia, scheme);
  const estrategicas = trimSales.filter(s => s.producto_estrategico).length;
  const activeAccelerators = scheme.config.accelerators.filter(a => snav >= a.min_snav && trimSales.length > 0 && (estrategicas / trimSales.length) >= a.min_strategic_share);
  const acelerador = activeAccelerators.length > 0;
  const acceleratorBonus = activeAccelerators.reduce((sum, a) => sum + a.bonus, 0);
  const multiplicador = Math.min(scheme.config.multiplier_cap, base + acceleratorBonus);
  return {
    altas,
    snav,
    rentabilidadMedia,
    multiplicador: Math.round(multiplicador * 10) / 10,
    baseMultiplicador: base,
    acelerador,
    acceleratorBonus,
    totalVentas: trimSales.length,
  };
};

export const useAllSalesQueryKey = ['sales', 'all'];
