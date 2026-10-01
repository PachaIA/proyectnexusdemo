#!/usr/bin/env node
/* ===========================================================================
 * Nexus · Wasp Sync — Importador a Supabase
 * ---------------------------------------------------------------------------
 * Lee uno o varios JSON producidos por extract-wasp.js y los importa a la
 * tabla `companies` de Supabase respetando:
 *
 *   - Pasada A (por defecto): INSERTA solo los CIF que NO existen en companies.
 *   - Pasada B (--refresh-existing): ACTUALIZA data_sources.wasp en los CIF
 *     que ya existen. NO toca companies.estado (regla del proyecto:
 *     Wasp se replica como inteligencia, no como verdad del pipeline).
 *
 * USO:
 *   cp .env.example .env   # rellenar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *   node import-to-supabase.mjs ./wasp-sync-calientes-2026-05-23-14-30.json
 *   node import-to-supabase.mjs --refresh-existing ./wasp-sync-*.json
 *   node import-to-supabase.mjs --dry-run ./wasp-sync-calientes-*.json
 *
 * REGLAS DURAS (de nexus-aprendizajes.md §7):
 *   - Batch de 10 registros.
 *   - Mismas claves para todos los registros del batch.
 *   - Faltantes explícitos: JSONB → null, numérico → 0, string → "".
 *
 * ANTI-DUPLICADO:
 *   - Por CIF (clave de negocio). Estable ante reasignaciones de IDs Wasp.
 * =========================================================================== */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import 'dotenv/config';

// --- Configuración ---
const BATCH_SIZE = 10;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

// --- Parseo de args ---
const args = process.argv.slice(2);
const refreshExisting = args.includes('--refresh-existing');
const dryRun = args.includes('--dry-run');
const jsonPaths = args.filter(a => !a.startsWith('--'));

if (!jsonPaths.length) {
  console.error('Uso: node import-to-supabase.mjs [--refresh-existing] [--dry-run] <archivo.json> [archivo.json ...]');
  process.exit(1);
}

console.log(`Modo: ${refreshExisting ? 'PASADA B (refresh-existing)' : 'PASADA A (solo nuevos)'}${dryRun ? ' [DRY RUN]' : ''}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// --- Helpers de normalización (centralizan reglas del proyecto) ---
const toInt = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseInt(String(v).replace(',', '.'), 10);
  return Number.isFinite(n) ? n : 0;
};
const toFloat = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const strOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

// --- Mapeo Wasp crudo → esquema canónico ---
// Esquema canónico de nexus-arquitectura.md §3, claves siempre presentes.
function mapWaspRecord(raw) {
  const wasp = {
    operador_actual: strOrNull(raw.operador_movil),
    lineas_movil:    toInt(raw.total_movil),
    lineas_fijo:     toInt(raw.total_fijo),
    lineas_total:    toInt(raw.lineas_total),
    permanencia:     toInt(raw.lineas_cp),       // nº líneas con permanencia (NO fecha)
    penalizacion:    toFloat(raw.penalizacion),
    tamanio:         null,                        // no viene en clients_update
    comercial:       null,                        // no viene en clients_update
    estado_oportunidad: strOrNull(raw.segmento),  // calientes/agendadas/...
    wasp_id:         strOrNull(raw.wasp_id),
    extracted_at:    new Date().toISOString(),
  };

  const contacto = {
    nombre:   [strOrNull(raw.contacto_nombre), strOrNull(raw.contacto_apellidos)].filter(Boolean).join(' ') || null,
    telefono: strOrNull(raw.contacto_telefono),
    email:    strOrNull(raw.contacto_email),
  };

  return {
    cif: strOrNull(raw.cif),
    nombre: strOrNull(raw.nombre),
    direccion: strOrNull(raw.direccion),
    cp: strOrNull(raw.cp),
    contact_info: contacto,
    data_sources_wasp: wasp,
  };
}

// --- Carga y dedup ---
function loadRecords(paths) {
  const all = [];
  for (const p of paths) {
    const abs = resolve(p);
    const raw = JSON.parse(readFileSync(abs, 'utf-8'));
    const recs = Array.isArray(raw.records) ? raw.records : [];
    console.log(`  ${basename(abs)}: ${recs.length} registros`);
    for (const r of recs) all.push(r);
  }
  // Dedup intra-payload por CIF (los mismos clientes pueden aparecer en varias listas)
  const byCif = new Map();
  for (const r of all) {
    const mapped = mapWaspRecord(r);
    if (!mapped.cif) continue;
    if (!byCif.has(mapped.cif)) byCif.set(mapped.cif, mapped);
  }
  return Array.from(byCif.values());
}

// --- Diff contra companies ---
async function fetchExistingCifs(cifs) {
  const existing = new Set();
  // Trocear para no pasar querystrings enormes
  for (let i = 0; i < cifs.length; i += 200) {
    const chunk = cifs.slice(i, i + 200);
    const { data, error } = await supabase
      .from('companies')
      .select('cif')
      .in('cif', chunk);
    if (error) throw error;
    for (const row of data) existing.add(row.cif);
  }
  return existing;
}

// --- Insert batch (PASADA A) ---
async function insertBatch(records) {
  // Estructura idéntica para todos los registros del batch
  const rows = records.map(r => ({
    cif: r.cif,
    nombre: r.nombre,
    direccion: r.direccion,
    location_type: 'wasp',
    contact_info: r.contact_info,
    data_sources: [{ source: 'wasp', ...r.data_sources_wasp }],
  }));
  if (dryRun) { console.log('  [dry-run] insert', rows.length); return { inserted: rows.length }; }
  const { error } = await supabase.from('companies').insert(rows);
  if (error) throw error;
  return { inserted: rows.length };
}

// --- Update batch (PASADA B) ---
// Actualiza únicamente la entrada wasp dentro de data_sources.
// NO toca companies.estado (regla del proyecto).
async function refreshOne(record) {
  if (dryRun) return { updated: true };
  // Leer data_sources actual
  const { data, error: e1 } = await supabase
    .from('companies')
    .select('id, data_sources')
    .eq('cif', record.cif)
    .limit(1)
    .maybeSingle();
  if (e1 || !data) return { updated: false, error: e1?.message || 'not_found' };

  const sources = Array.isArray(data.data_sources) ? data.data_sources : [];
  const next = sources.filter(s => s?.source !== 'wasp');
  next.push({ source: 'wasp', ...record.data_sources_wasp });

  const { error: e2 } = await supabase
    .from('companies')
    .update({ data_sources: next, contact_info: record.contact_info })
    .eq('id', data.id);
  if (e2) return { updated: false, error: e2.message };
  return { updated: true };
}

// --- Main ---
(async () => {
  console.log('\nCargando JSONs...');
  const records = loadRecords(jsonPaths);
  console.log(`Total únicos por CIF: ${records.length}`);

  const cifs = records.map(r => r.cif).filter(Boolean);
  console.log('\nConsultando CIFs existentes en Supabase...');
  const existing = await fetchExistingCifs(cifs);
  console.log(`Existentes: ${existing.size} · Nuevos: ${cifs.length - existing.size}`);

  // PASADA A: insertar nuevos
  const toInsert = records.filter(r => !existing.has(r.cif));
  if (toInsert.length) {
    console.log(`\n[PASADA A] Insertando ${toInsert.length} nuevos en batches de ${BATCH_SIZE}...`);
    let ok = 0, fail = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      try {
        const res = await insertBatch(batch);
        ok += res.inserted;
        process.stdout.write(`  ${ok}/${toInsert.length}\r`);
      } catch (e) {
        fail += batch.length;
        console.error(`\n  batch ${i}-${i+batch.length} fallo:`, e.message);
      }
    }
    console.log(`\n  Insertados: ${ok} · Fallidos: ${fail}`);
  } else {
    console.log('\n[PASADA A] No hay nuevos.');
  }

  // PASADA B: refrescar existentes
  if (refreshExisting) {
    const toUpdate = records.filter(r => existing.has(r.cif));
    console.log(`\n[PASADA B] Refrescando ${toUpdate.length} existentes (uno a uno por merge JSONB)...`);
    let ok = 0, fail = 0;
    for (let i = 0; i < toUpdate.length; i++) {
      const res = await refreshOne(toUpdate[i]);
      if (res.updated) ok++; else fail++;
      if (i % 25 === 0 || i === toUpdate.length - 1) process.stdout.write(`  ${i+1}/${toUpdate.length}\r`);
    }
    console.log(`\n  Refrescados: ${ok} · Fallidos: ${fail}`);
  }

  console.log('\nDone.');
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
