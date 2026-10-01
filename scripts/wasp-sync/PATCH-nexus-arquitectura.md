# Fix para `nexus-arquitectura.md` §3

Aplicar a mano sobre el archivo del Knowledge del Proyecto.

## Bloque a sustituir

**Antes** (sección `data_sources.wasp`):

```json
{
  "operador_actual": "...",
  "lineas_movil": 0,
  "lineas_fijo": 0,
  "permanencia": "...",
  "penalizacion": 0,
  "tamanio": "...",
  "comercial": "..."
}
```

**Después**:

```json
{
  "operador_actual": "ORANGE",
  "lineas_movil": 13,
  "lineas_fijo": 0,
  "lineas_total": 13,
  "permanencia": 1,
  "penalizacion": 70.00,
  "tamanio": "BASIC (6)",
  "comercial": "...",
  "estado_oportunidad": "calientes",
  "wasp_id": "97876",
  "extracted_at": "2026-05-23T14:30:00.000Z"
}
```

## Cambios y razón

1. **`permanencia` pasa de string a entero.** El campo viene del input
   `lineas_cp` de la ficha Wasp (`/quotes/clients_update/{id}`) y
   representa **nº de líneas con permanencia activa**, no una fecha
   ni una descripción textual. Confirmado por captura real en
   waspapp.es el 23/5/2026 (CIF anónimo: `lineas_cp = "1"`,
   `penalizacion = "70.00"`).

2. **Nuevo campo `lineas_total`.** Ya viene del input `lineas_total` de
   Wasp. Útil porque puede no coincidir con `lineas_movil + lineas_fijo`
   (algunos contratos tienen líneas no clasificadas).

3. **Nuevo campo `estado_oportunidad`.** Refleja el segmento Wasp
   (`calientes`, `agendadas`, `presentadas`, `general`, `caducadas`).
   Vive aquí, NO en `companies.estado` (regla del proyecto: Wasp se
   replica como inteligencia, no como verdad del pipeline).

4. **Nuevos campos `wasp_id` y `extracted_at`.** Trazabilidad. Permiten
   saber de qué lead Wasp viene y cuándo se hizo la última sync.

5. **`penalizacion` pasa de `0` (entero) a `70.00` (float).** El campo
   viene con dos decimales en Wasp (separador punto). Ya estaba bien
   tratado en código, solo se documenta correctamente.

## Sección §8 (Operaciones de datos — convenciones)

Añadir al final el siguiente bullet:

> - **Sincronización Wasp incremental:** vive en
>   `scripts/wasp-sync/`. Pasada A mensual (CIF nuevos); pasada B con
>   flag `--refresh-existing` para refrescar `data_sources.wasp` de los
>   existentes. Nunca toca `companies.estado`. Ritual descrito en
>   `scripts/wasp-sync/README.md`.

## Sección de deuda — actualizar `nexus-aprendizajes.md §6`

El segundo "Pendiente operativo" decía:

> Reconstruir el script de extracción y versionarlo en el repo como
> referencia.

Pasa a estar resuelto con este paquete. Sustituir por:

> Script versionado en `scripts/wasp-sync/`. Validado el 23/5/2026 sobre
> la lista de calientes (3 leads, 0 errores). Pendiente solo: fijar día
> del mes para el ritual recurrente.
