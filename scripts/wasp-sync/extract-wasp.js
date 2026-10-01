/* ===========================================================================
 * Nexus · Wasp Sync — Extractor de fichas
 * ---------------------------------------------------------------------------
 * USO:
 *   1. Abrir https://waspapp.es y loguearse.
 *   2. Navegar a una lista de leads:
 *        /quotes/org_calientes_lists
 *        /quotes/org_agendadas_lists
 *        /quotes/org_presentadas_lists
 *        /quotes/org_general_lists
 *        /quotes/org_caducadas_lists
 *   3. F12 → Consola → pegar este archivo entero → Enter.
 *   4. Esperar. Progreso: window._waspSync.done / window._waspSync.total
 *   5. Al acabar se descarga wasp-sync-{segmento}-{fecha}.json.
 *
 * MANTENIMIENTO — qué tocar si Wasp cambia algo:
 *   - IDs de inputs renombrados:     editar FIELD_MAP.
 *   - Endpoint movido:               editar FICHA_URL.
 *   - Selector de filas cambiado:    editar SELECTOR_LINKS.
 *   - Rate-limit / 429:              subir DELAY_MS.
 *
 * NOTAS DE DISEÑO:
 *   - Los IDs reales de lead se extraen del href de offers_infinity_view,
 *     NO del id="filaN" del <tr> (eso es solo un índice cosmético).
 *   - Se inyecta como <script> en el DOM para no chocar con el timeout
 *     de 45s del MCP javascript_exec en pestañas grandes.
 *   - El JSON crudo conserva los valores como string (tal como llegan
 *     del HTML). La normalización de tipos vive en el script Node de
 *     importación, no aquí.
 * =========================================================================== */

(() => {
  'use strict';

  // --- Configuración ---
  const DELAY_MS       = 500;
  const FICHA_URL      = '/quotes/clients_update/';
  const SELECTOR_LINKS = '#tabla tr[id^="fila"] a[href*="offers_infinity_view"]';

  // Mapa: clave de salida → id del input HTML en la ficha.
  // Si Wasp renombra un campo, se cambia AQUÍ.
  const FIELD_MAP = {
    cif:                 'documents',
    nombre:              'nombre',
    direccion:           'direccion',
    cp:                  'cp',
    localidad:           'localidad',
    provincia:           'provincia',
    admin_nombre:        'admin_name',
    admin_apellidos:     'admin_surnames',
    admin_dni:           'admin_document',
    contacto_nombre:     'contact_name',
    contacto_apellidos:  'contact_surnames',
    contacto_telefono:   'contact_phone',
    contacto_email:      'contact_email',
    telefono1:           'cto1',
    telefono2:           'cto2',
    operador_movil:      'operador_movil',
    total_movil:         'total_movil',
    total_fijo:          'total_fijo',
    lineas_total:        'lineas_total',
    lineas_cp:           'lineas_cp',
    penalizacion:        'penalizacion',
  };

  // --- Detectar segmento de la URL ---
  const m = location.pathname.match(/\/quotes\/org_(\w+)_lists/);
  const segmento = m ? m[1] : 'desconocido';

  // --- Extraer IDs reales del DOM ---
  const ids = Array.from(document.querySelectorAll(SELECTOR_LINKS))
    .map(a => { const m = a.href.match(/offers_infinity_view\/(\d+)/); return m ? m[1] : null; })
    .filter(Boolean);

  if (!ids.length) {
    console.error('[Nexus] Sin IDs. ¿Estás en una /quotes/org_*_lists con leads?');
    return;
  }
  console.log(`[Nexus] Segmento: ${segmento}. IDs detectados: ${ids.length}`);

  // --- Estado expuesto en window (recuperación + polling) ---
  window._waspSync = { status: 'running', total: ids.length, done: 0, errors: [], records: [] };

  // --- Loop inyectado como <script> en la página (evita timeout del MCP) ---
  const src = `
    (async () => {
      const IDS   = ${JSON.stringify(ids)};
      const MAP   = ${JSON.stringify(FIELD_MAP)};
      const DELAY = ${DELAY_MS};
      const FICHA = '${FICHA_URL}';
      const SEG   = '${segmento}';

      const extract = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const out = {};
        for (const [k, htmlId] of Object.entries(MAP)) {
          const el = doc.getElementById(htmlId);
          if (!el) { out[k] = null; continue; }
          if (el.tagName === 'SELECT') {
            const opt = el.options[el.selectedIndex];
            out[k] = opt ? (opt.text || '').trim() : '';
          } else {
            out[k] = (el.value || '').trim();
          }
        }
        return out;
      };

      for (let i = 0; i < IDS.length; i++) {
        const id = IDS[i];
        try {
          const r = await fetch(FICHA + id, { credentials: 'include' });
          if (!r.ok || r.redirected) {
            window._waspSync.errors.push({ id, status: r.status, redirected: r.redirected });
            if (r.redirected) {
              console.error('[Nexus] Redirección — sesión caducada. Detenido.');
              window._waspSync.status = 'session_expired';
              break;
            }
            continue;
          }
          const html = await r.text();
          window._waspSync.records.push({ wasp_id: id, segmento: SEG, ...extract(html) });
          window._waspSync.done++;
        } catch (e) {
          window._waspSync.errors.push({ id, error: String(e) });
        }
        if (i > 0 && i % 25 === 0) {
          console.log('[Nexus]', window._waspSync.done, '/', IDS.length);
        }
        await new Promise(r => setTimeout(r, DELAY));
      }

      if (window._waspSync.status === 'running') window._waspSync.status = 'done';
      console.log('[Nexus] Fin.', { done: window._waspSync.done, errors: window._waspSync.errors.length, status: window._waspSync.status });

      // --- Descargar JSON ---
      const payload = {
        meta: {
          segmento: SEG,
          extracted_at: new Date().toISOString(),
          total_ids: IDS.length,
          extracted: window._waspSync.records.length,
          errors: window._waspSync.errors.length,
          source: 'waspapp.es/quotes/clients_update/{id}',
          schema_version: 1,
        },
        errors: window._waspSync.errors,
        records: window._waspSync.records,
      };
      const blob  = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url   = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
      const a     = document.createElement('a');
      a.href = url;
      a.download = 'wasp-sync-' + SEG + '-' + stamp + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    })();
  `;

  const tag = document.createElement('script');
  tag.textContent = src;
  document.body.appendChild(tag);
  tag.remove();

  console.log('[Nexus] Lanzado. Progreso: window._waspSync');
})();
