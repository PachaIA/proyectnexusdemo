import { describe, expect, it } from 'vitest';
import fixture from './mrPro.fixture.json';
import { baseMultiplier, parseCompScheme } from '@/lib/compScheme';
import { computeQuarterKpis, getCurrentFiscalQuarterRange } from '@/lib/salesKpis';
import type { Sale } from '@/hooks/useSales';

const scheme = parseCompScheme(fixture);
const sale = (snav: number, rent: number, strategic = false): Sale => ({
  id: 'test', company_id: 'test', fecha: getCurrentFiscalQuarterRange().startStr,
  lineas_movil: 1, lineas_fibra: 0, snav, margen: rent, producto_estrategico: strategic,
  producto: null, notas: null, created_at: '',
});

describe('MR PRO preserved compensation rules', () => {
  it('keeps the 70 unit target', () => expect(scheme.target_units).toBe(70));
  it('uses the requested 13330 EUR payout target', () => expect(scheme.target_payout_eur).toBe(13330));
  it('preserves every legacy matrix cell and exact boundary', () => {
    const matrix = [[0,0,.3,.6],[.2,.4,.6,.8],[.4,.6,.8,1.2],[.6,1,1.2,1.4],[.8,1.2,1.4,1.8],[1,1.4,1.6,2]];
    for (const snav of [0,1499.99,1500,3499.99,3500,4999.99,5000]) {
      for (const rent of [0,8.99,9,9.99,10,29.99,30,49.99,50,79.99,80,120,120.01]) {
        const col = snav < 1500 ? 0 : snav < 3500 ? 1 : snav < 5000 ? 2 : 3;
        const row = rent < 10 ? 0 : rent < 30 ? 1 : rent < 50 ? 2 : rent < 80 ? 3 : rent <= 120 ? 4 : 5;
        expect(computeQuarterKpis([sale(snav, rent)], scheme).multiplicador).toBe(matrix[row][col]);
        const legacyRow = rent < 9 ? 0 : row === 0 ? 1 : row;
        expect(baseMultiplier(snav, rent, scheme, true)).toBe(matrix[legacyRow][col]);
      }
    }
  });
  it('activates at 1800 SNAV, not below', () => {
    expect(computeQuarterKpis([sale(1799.99, 50, true)], scheme).acelerador).toBe(false);
    expect(computeQuarterKpis([sale(1800, 50, true)], scheme).multiplicador).toBe(1.2);
  });
  it('requires at least half of sales to be strategic', () => {
    expect(computeQuarterKpis([sale(1800, 50, true),sale(0,50)], scheme).acelerador).toBe(true);
    expect(computeQuarterKpis([sale(1800,50,true),sale(0,50),sale(0,50)],scheme).acelerador).toBe(false);
  });
  it('caps the accelerator at 2', () => expect(computeQuarterKpis([sale(5000,121,true)],scheme).multiplicador).toBe(2));
  it('excludes sales outside the fiscal quarter', () => expect(computeQuarterKpis([{...sale(5000,121,true),fecha:'2000-01-01'}],scheme).altas).toBe(0));
  it('reads altered rules rather than MR PRO constants', () => {
    const changed = structuredClone(scheme);
    changed.config.snav_tiers = [100,200,300];
    changed.config.multiplier_matrix[3][3] = 1.7;
    changed.config.accelerators = [{min_snav:250,min_strategic_share:1,bonus:.4}];
    changed.config.multiplier_cap = 3;
    expect(computeQuarterKpis([sale(300,50,true)],changed).multiplicador).toBe(2.1);
  });
  it('rejects missing/invalid schemes rather than falling back', () => {
    expect(() => parseCompScheme(null)).toThrow();
    expect(() => parseCompScheme({...fixture,config:{}})).toThrow();
  });
});
