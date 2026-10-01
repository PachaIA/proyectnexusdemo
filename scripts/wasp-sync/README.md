# Nexus · Wasp Sync

Sincronización mensual incremental de Wasp (`waspapp.es`) hacia Supabase
(`companies` / `data_sources.wasp` / `contact_info`).

Wasp es el CRM corporativo obligatorio. Nexus lo **replica**, no lo
sustituye (ver `nexus-arquitectura.md §7`). Este script mantiene Nexus al
día sin tocar Wasp.

## Qué hace

Dos pasadas:

- **Pasada A (por defecto):** inserta en `companies` los CIF que **no
  existen**. Pensada para el ritual mensual: nuevos leads que han entrado
  en Wasp desde la última sync.

- **Pasada B (`--refresh-existing`):** actualiza `data_sources.wasp` y
  `contact_info` de los CIF que **sí existen**. Pensada para refrescar
  estado/líneas/penalización cada cierto tiempo (ritual trimestral o
  cuando notes pipeline desactualizado).

**Lo que nunca toca:** `companies.estado`. El pipeline de Nexus es la
verdad operativa; Wasp es inteligencia externa.

Anti-duplicado por **CIF** (clave de negocio estable, no por `wasp_id`).

## Setup (una vez)

```bash
cd scripts/wasp-sync
npm install
cp .env.example .env
# Editar .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
```

> El `service_role` key solo vive aquí en local. No se commitea, no
> entra al frontend, no se pone en `.env` de Lovable.

## Ritual mensual (5 minutos)

1. **Extraer en Wasp.** Abrir https://waspapp.es, logueado. Para cada
   lista relevante:

   - `/quotes/org_calientes_lists`
   - `/quotes/org_agendadas_lists`
   - `/quotes/org_presentadas_lists`
   - `/quotes/org_general_lists`

   F12 → Consola → pegar el contenido de `extract-wasp.js` → Enter.
   Esperar (`window._waspSync` muestra progreso). Al acabar se descarga
   `wasp-sync-{segmento}-{fecha}.json`.

2. **Importar a Supabase.**

   ```bash
   node import-to-supabase.mjs ./wasp-sync-calientes-*.json \
                               ./wasp-sync-agendadas-*.json \
                               ./wasp-sync-presentadas-*.json \
                               ./wasp-sync-general-*.json
   ```

   Si quieres además refrescar los existentes:

   ```bash
   node import-to-supabase.mjs --refresh-existing ./wasp-sync-*.json
   ```

   Para probar sin tocar Supabase:

   ```bash
   node import-to-supabase.mjs --dry-run ./wasp-sync-*.json
   ```

3. **Limpiar.** Borrar los JSON locales después de importar — contienen
   PII (CIFs, teléfonos, emails). RGPD.

## Mantenimiento

Si Wasp cambia algo, los puntos a tocar están comentados arriba de cada
script:

- **IDs de inputs renombrados** → `FIELD_MAP` en `extract-wasp.js`.
- **Endpoint movido** → `FICHA_URL` en `extract-wasp.js`.
- **Tabla / selector de filas cambiados** → `SELECTOR_LINKS` en
  `extract-wasp.js`.
- **Rate-limit / 429** → subir `DELAY_MS` en `extract-wasp.js`.
- **Esquema canónico de `data_sources.wasp`** → `mapWaspRecord` en
  `import-to-supabase.mjs` (debe coincidir con `nexus-arquitectura.md §3`).

## Estructura del JSON extraído

```json
{
  "meta": {
    "segmento": "calientes",
    "extracted_at": "2026-05-23T14:30:00.000Z",
    "total_ids": 3,
    "extracted": 3,
    "errors": 0,
    "schema_version": 1
  },
  "errors": [],
  "records": [
    {
      "wasp_id": "97876",
      "segmento": "calientes",
      "cif": "...",
      "nombre": "...",
      "direccion": "...",
      "cp": "04745",
      "contacto_nombre": "...",
      "contacto_telefono": "...",
      "contacto_email": "...",
      "operador_movil": "ORANGE",
      "total_movil": "13",
      "total_fijo": "0",
      "lineas_total": "13",
      "lineas_cp": "1",
      "penalizacion": "70.00"
    }
  ]
}
```

Todos los valores numéricos vienen como **string** (tal cual los emite
el HTML). La normalización a `int` / `float` la hace
`import-to-supabase.mjs`.

## Notas

- **`permanencia`** en `data_sources.wasp` es un **entero** (nº de líneas
  con permanencia activa), no fecha ni texto. Viene del input
  `lineas_cp` de la ficha Wasp.
- **`tamanio` y `comercial`** no salen de `clients_update`. Salen de la
  columna de la lista (`#tabla`). Si los necesitas, ampliar el script
  para leerlos del DOM antes del bucle de fetches y mergearlos por
  `wasp_id`.
- Pestaña por pestaña: lanzar el script en una `/quotes/org_*_lists`
  cada vez. No mezclar segmentos en una misma extracción.
- Sesión PHP en cookie. Si caduca a mitad, el script detecta la
  redirección a login y para. Los registros ya extraídos siguen en
  `window._waspSync.records`.
