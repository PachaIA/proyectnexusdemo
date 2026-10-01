import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "kpis_ventas",
  title: "KPIs de ventas del periodo",
  description:
    "Agrega las ventas cerradas en un rango de fechas: altas de líneas móviles y fibras, SNAV total, margen total y rentabilidad media por línea.",
  inputSchema: {
    desde: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Fecha inicial (YYYY-MM-DD)."),
    hasta: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Fecha final (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ desde, hasta }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sales")
      .select("lineas_movil,lineas_fibra,snav,margen,producto_estrategico")
      .gte("fecha", desde)
      .lte("fecha", hasta);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    const altasMovil = rows.reduce((a, r) => a + (r.lineas_movil ?? 0), 0);
    const altasFibra = rows.reduce((a, r) => a + (r.lineas_fibra ?? 0), 0);
    const altas = altasMovil + altasFibra;
    const snav = rows.reduce((a, r) => a + Number(r.snav ?? 0), 0);
    const margen = rows.reduce((a, r) => a + Number(r.margen ?? 0), 0);
    const estrategicas = rows.filter((r) => r.producto_estrategico).length;

    const kpis = {
      ventas: rows.length,
      altas_movil: altasMovil,
      altas_fibra: altasFibra,
      altas_totales: altas,
      snav_total: Math.round(snav * 100) / 100,
      margen_total: Math.round(margen * 100) / 100,
      rentabilidad_media_linea: altas ? Math.round((margen / altas) * 100) / 100 : 0,
      ventas_estrategicas: estrategicas,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(kpis, null, 2) }],
      structuredContent: kpis,
    };
  },
});
