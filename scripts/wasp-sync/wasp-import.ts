// supabase/functions/wasp-import/index.ts
//
// Nexus · Edge Function de sincronización Wasp → Supabase
// -------------------------------------------------------
// Recibe un payload JSON con los records extraídos de Wasp y los inserta/
// actualiza en la tabla `companies`. Diseñada para ejecutarse en Lovable
// Cloud, que inyecta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY automática-
// mente vía Deno.env.
//
// Auth:
//   - El cliente debe enviar header `x-wasp-sync-token: <WASP_SYNC_TOKEN>`.
//   - WASP_SYNC_TOKEN se define como Secret en Lovable Cloud.
//
// Endpoint:  POST /functions/v1/wasp-import
// Body:      { mode: "insert" | "refresh", records: WaspRecord[] }
// Respuesta: { ok: true, inserted: N, updated: N, skipped: N, errors: [] }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface WaspRecord {
  wasp_id?: string;
  segmento?: string;
  cif?: string;
  nombre?: string;
  direccion?: string;
  cp?: string;
  admin_nombre?: string;
  admin_apellidos?: string;
  admin_dni?: string;
  contacto_nombre?: string;
  contacto_apellidos?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  telefono1?: string;
  telefono2?: string;
  operador_movil?: string;
  total_movil?: string;
  total_fijo?: string;
  lineas_total?: string;
  lineas_cp?: string;
  penalizacion?: string;
  localidad?: string;
  provincia?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wasp-sync-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- Helpers de normalización ---
const toInt = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseInt(String(v).replace(',', '.'), 10);
  return Number.isFinite(n) ? n : 0;
};
const toFloat = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

function mapWaspRecord(raw: WaspRecord) {
  const contactoNombre = [strOrNull(raw.contacto_nombre), strOrNull(raw.contacto_apellidos)].filter(Boolean).join(' ') || null;
  const contactInfo = {
    nombre: contactoNombre,
    telefono: strOrNull(raw.contacto_telefono),
    email: strOrNull(raw.contacto_email),
  };
  const wasp_jsonb = {
    operador_actual: strOrNull(raw.operador_movil),
    lineas_movil: toInt(raw.total_movil),
    lineas_fijo: toInt(raw.total_fijo),
    lineas_total: toInt(raw.lineas_total),
    permanencia: toInt(raw.lineas_cp),
    penalizacion: toFloat(raw.penalizacion),
    estado_oportunidad: strOrNull(raw.segmento),
    wasp_id: strOrNull(raw.wasp_id),
    extracted_at: new Date().toISOString(),
  };
  // Devuelve estructura plana lista para INSERT en companies (esquema real).
  // `id` se genera aquí porque la columna no tiene DEFAULT en la BD.
  // `sector`, `lat`, `lng` son NOT NULL en la BD → placeholders que se
  // enriquecen después (sector con AI/lookup, lat/lng con geocoding).
  return {
    id: crypto.randomUUID(),
    cif: strOrNull(raw.cif),
    name: strOrNull(raw.nombre),
    sector: 'desconocido',
    lat: 0,
    lng: 0,
    address: strOrNull(raw.direccion),
    cp: strOrNull(raw.cp),
    localidad: strOrNull(raw.localidad),
    provincia: strOrNull(raw.provincia),
    location_type: 'wasp',
    origen: 'wasp',
    contact_info: contactInfo,
    data_sources: [{ source: 'wasp', ...wasp_jsonb }],
    // Columnas directas (esquema real de companies)
    operador_actual: strOrNull(raw.operador_movil),
    lineas_movil: toInt(raw.total_movil),
    lineas_fijo: toInt(raw.total_fijo),
    lineas_total: toInt(raw.lineas_total),
    permanencia: toInt(raw.lineas_cp),
    penalizacion: toFloat(raw.penalizacion),
    contacto_wasp: contactoNombre,
    id_wasp: strOrNull(raw.wasp_id),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // --- Auth por token compartido ---
  const expected = Deno.env.get('WASP_SYNC_TOKEN');
  const got = req.headers.get('x-wasp-sync-token');
  if (!expected || got !== expected) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { mode?: string; records?: WaspRecord[] };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  const mode = body.mode === 'refresh' ? 'refresh' : 'insert';
  const records = Array.isArray(body.records) ? body.records : [];
  if (!records.length) {
    return new Response(JSON.stringify({ ok: false, error: 'no_records' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // --- Cliente Supabase con service_role inyectada por Lovable ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Dedup por CIF dentro del payload ---
  const byCif = new Map<string, ReturnType<typeof mapWaspRecord>>();
  for (const r of records) {
    const m = mapWaspRecord(r);
    if (m.cif && !byCif.has(m.cif)) byCif.set(m.cif, m);
  }
  const unique = Array.from(byCif.values());

  // --- CIFs existentes ---
  const cifs = unique.map(r => r.cif!).filter(Boolean);
  const existing = new Set<string>();
  for (let i = 0; i < cifs.length; i += 200) {
    const chunk = cifs.slice(i, i + 200);
    const { data, error } = await supabase.from('companies').select('cif').in('cif', chunk);
    if (error) return new Response(JSON.stringify({ ok: false, error: 'select_failed', detail: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    for (const row of data || []) if (row.cif) existing.add(row.cif);
  }

  let inserted = 0, updated = 0, skipped = 0;
  const errors: Array<{ cif?: string; error: string }> = [];

  if (mode === 'insert') {
    const toInsert = unique.filter(r => !existing.has(r.cif!));
    const BATCH = 10;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      // mapWaspRecord ya devuelve filas listas para insert en companies (esquema real)
      const { error } = await supabase.from('companies').insert(batch);
      if (error) {
        errors.push({ error: `batch ${i}: ${error.message}` });
      } else {
        inserted += batch.length;
      }
    }
    skipped = unique.length - toInsert.length;
  } else {
    // refresh: actualizar columnas Wasp + data_sources.wasp + contact_info de los existentes
    const toUpdate = unique.filter(r => existing.has(r.cif!));
    for (const r of toUpdate) {
      const { data, error: e1 } = await supabase
        .from('companies').select('id, data_sources').eq('cif', r.cif!).maybeSingle();
      if (e1 || !data) { errors.push({ cif: r.cif!, error: e1?.message || 'not_found' }); continue; }
      const sources = Array.isArray(data.data_sources) ? data.data_sources : [];
      const next = sources.filter((s: { source?: string }) => s?.source !== 'wasp');
      // Reusar el primer elemento (que es lo que metimos en data_sources arriba)
      const newWaspSource = (r.data_sources as Array<Record<string, unknown>>)[0];
      next.push(newWaspSource);
      const { error: e2 } = await supabase
        .from('companies').update({
          data_sources: next,
          contact_info: r.contact_info,
          operador_actual: r.operador_actual,
          lineas_movil: r.lineas_movil,
          lineas_fijo: r.lineas_fijo,
          lineas_total: r.lineas_total,
          permanencia: r.permanencia,
          penalizacion: r.penalizacion,
          contacto_wasp: r.contacto_wasp,
          id_wasp: r.id_wasp,
          cp: r.cp,
          localidad: r.localidad,
          provincia: r.provincia,
        }).eq('id', data.id);
      if (e2) errors.push({ cif: r.cif!, error: e2.message });
      else updated++;
    }
    skipped = unique.length - toUpdate.length;
  }

  return new Response(JSON.stringify({ ok: true, mode, total_unique: unique.length, inserted, updated, skipped, errors }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
