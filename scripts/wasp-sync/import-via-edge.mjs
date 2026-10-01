#!/usr/bin/env node
/* ===========================================================================
 * Nexus · Wasp Sync — Importador vía Edge Function (Lovable Cloud)
 * ---------------------------------------------------------------------------
 * Lee los JSON producidos por extract-wasp.js y los envía a la edge
 * function `wasp-import` desplegada en Lovable Cloud. La función hace los
 * inserts/updates con el service_role inyectado por Lovable.
 *
 * USO:
 *   cp .env.example .env   # rellenar WASP_IMPORT_URL y WASP_SYNC_TOKEN
 *   node import-via-edge.mjs ./wasp-sync-*.json
 *   node import-via-edge.mjs --refresh-existing ./wasp-sync-*.json
 *   node import-via-edge.mjs --dry-run ./wasp-sync-*.json
 *
 * .env:
 *   WASP_IMPORT_URL=https://<project>.supabase.co/functions/v1/wasp-import
 *   WASP_SYNC_TOKEN=<el mismo valor que el Secret en Lovable Cloud>
 *
 * NOTAS:
 *   - El service_role NO vive aquí. Vive en Lovable Cloud, inyectado a la
 *     edge function. Si alguien roba este .env, lo único que puede hacer
 *     es invocar wasp-import (que solo escribe estructuras controladas).
 * =========================================================================== */

import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import 'dotenv/config';

const URL = process.env.WASP_IMPORT_URL;
const TOKEN = process.env.WASP_SYNC_TOKEN;
const BATCH_RECORDS = 100; // partir payloads grandes para no agotar timeout

if (!URL || !TOKEN) {
  console.error('Faltan WASP_IMPORT_URL o WASP_SYNC_TOKEN en .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const refreshExisting = args.includes('--refresh-existing');
const dryRun = args.includes('--dry-run');
const jsonPaths = args.filter(a => !a.startsWith('--'));

if (!jsonPaths.length) {
  console.error('Uso: node import-via-edge.mjs [--refresh-existing] [--dry-run] <archivo.json> [...]');
  process.exit(1);
}

console.log(`Modo: ${refreshExisting ? 'refresh' : 'insert'}${dryRun ? ' [DRY RUN]' : ''}`);

// Cargar y unir todos los records
const allRecords = [];
for (const p of jsonPaths) {
  try {
    const raw = JSON.parse(readFileSync(resolve(p), 'utf-8'));
    const recs = Array.isArray(raw.records) ? raw.records : [];
    console.log(`  ${basename(p)}: ${recs.length} registros`);
    for (const r of recs) allRecords.push(r);
  } catch (e) {
    console.warn(`  ${basename(p)}: no es JSON de Wasp, omitido (${e.message})`);
  }
}
console.log(`Total cargados: ${allRecords.length}`);

if (dryRun) {
  console.log('[dry-run] No se envía nada. Resumen de lo que se mandaría:');
  console.log(`  - ${allRecords.length} records`);
  console.log(`  - modo ${refreshExisting ? 'refresh' : 'insert'}`);
  console.log(`  - ${Math.ceil(allRecords.length / BATCH_RECORDS)} batch(es) de hasta ${BATCH_RECORDS}`);
  process.exit(0);
}

// Envío por batches
const totals = { inserted: 0, updated: 0, skipped: 0, errors: [] };
for (let i = 0; i < allRecords.length; i += BATCH_RECORDS) {
  const batch = allRecords.slice(i, i + BATCH_RECORDS);
  console.log(`\nBatch ${Math.floor(i / BATCH_RECORDS) + 1}: enviando ${batch.length} records...`);
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wasp-sync-token': TOKEN },
      body: JSON.stringify({ mode: refreshExisting ? 'refresh' : 'insert', records: batch }),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { ok: false, raw: text }; }
    if (!res.ok || !json.ok) {
      console.error(`  ✗ HTTP ${res.status}:`, json);
      totals.errors.push({ batch: i, status: res.status, body: json });
      continue;
    }
    console.log(`  ✓ insert:${json.inserted || 0} update:${json.updated || 0} skip:${json.skipped || 0} err:${(json.errors || []).length}`);
    totals.inserted += json.inserted || 0;
    totals.updated += json.updated || 0;
    totals.skipped += json.skipped || 0;
    if (Array.isArray(json.errors)) totals.errors.push(...json.errors);
  } catch (e) {
    console.error(`  ✗ red:`, e.message);
    totals.errors.push({ batch: i, error: e.message });
  }
}

console.log('\n=== RESUMEN ===');
console.log(`Insertados: ${totals.inserted}`);
console.log(`Actualizados: ${totals.updated}`);
console.log(`Omitidos (ya existían): ${totals.skipped}`);
console.log(`Errores: ${totals.errors.length}`);
if (totals.errors.length) console.log(JSON.stringify(totals.errors, null, 2));
