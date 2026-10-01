// Vodafone uses the UK fiscal year: 1 Apr → 31 Mar.
// Q1 Apr–Jun · Q2 Jul–Sep · Q3 Oct–Dec · Q4 Jan–Mar.
// Label format: "Qx FYyy/yy" where yy/yy are the last two digits of the start
// and end calendar years of the fiscal year (e.g. May 2026 → Q1 FY26/27).

export interface VodafoneFiscalQuarter {
  quarter: 1 | 2 | 3 | 4;
  fyStart: number; // calendar year when the FY starts (April)
  fyEnd: number;   // calendar year when the FY ends (March)
  label: string;   // "Qx FYyy/yy"
}

export const getVodafoneFiscalQuarter = (date: Date = new Date()): VodafoneFiscalQuarter => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  let fyStart: number;
  let quarter: 1 | 2 | 3 | 4;

  if (month >= 4) {
    fyStart = year;
    // Apr-Jun→1, Jul-Sep→2, Oct-Dec→3
    quarter = (Math.floor((month - 4) / 3) + 1) as 1 | 2 | 3;
  } else {
    // Jan-Mar → Q4 of the FY that started the previous April
    fyStart = year - 1;
    quarter = 4;
  }

  const fyEnd = fyStart + 1;
  const pad = (n: number) => String(n % 100).padStart(2, '0');
  const label = `Q${quarter} FY${pad(fyStart)}/${pad(fyEnd)}`;

  return { quarter, fyStart, fyEnd, label };
};

export const getVodafoneFiscalQuarterLabel = (date?: Date): string =>
  getVodafoneFiscalQuarter(date).label;
