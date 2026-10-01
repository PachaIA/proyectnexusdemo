import { useQuery } from '@tanstack/react-query';

export interface CsvCompany {
  id: string;
  name: string;
  sector: string;
  address: string;
  website: string;
  phone: string;
  lat: number;
  lng: number;
  rating: number;
  totalReviews: number;
  horario24h: string;
  tipoNegocio: string;
  estado: string;
  ncsScore: number;
}

const CSV_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csv-proxy`;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCsvLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || '').trim();
    });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export const useCsvCompanies = () => {
  return useQuery({
    queryKey: ['csv-companies'],
    queryFn: async (): Promise<CsvCompany[]> => {
      const res = await fetch(`${CSV_URL}?_t=${Date.now()}`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch CSV');
      const text = await res.text();
      const rows = parseCsv(text);

      console.log('[CSV] Raw rows parsed:', rows.length);
      if (rows.length > 0) {
        console.log('[CSV] Headers found:', Object.keys(rows[0]));
        console.log('[CSV] First row:', rows[0]);
      }

      const companies = rows
        .filter(r => {
          const lat = parseFloat(r['Latitud'] || r['lat'] || '');
          const lng = parseFloat(r['Longitud'] || r['lng'] || '');
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map((r, i) => ({
          id: `csv-${i}`,
          name: r['Nombre'] || r['Empresa'] || r['empresa'] || r['Name'] || r['name'] || '',
          sector: r['Sector'] || r['sector'] || '',
          address: r['Direccion'] || r['Dirección'] || r['direccion'] || r['Address'] || r['address'] || '',
          website: r['Web'] || r['web'] || r['Website'] || r['website'] || '',
          phone: r['Telefono'] || r['telefono'] || r['Phone'] || r['phone'] || '',
          lat: parseFloat(r['Latitud'] || r['lat'] || '0'),
          lng: parseFloat(r['Longitud'] || r['lng'] || '0'),
          rating: parseFloat(r['Rating'] || r['rating'] || '0') || 0,
          totalReviews: parseInt(r['Total Reseñas'] || r['Total Resenas'] || '0', 10) || 0,
          horario24h: r['Horario 24h'] || '',
          tipoNegocio: r['Tipo Negocio'] || '',
          estado: r['Estado'] || '',
          ncsScore: parseInt(r['NCS Score'] || r['NCS score'] || '0', 10) || 0,
        }));

      console.log('[CSV] Valid companies with coords:', companies.length);
      return companies;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });
};
