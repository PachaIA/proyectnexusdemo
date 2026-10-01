import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "registrar_venta",
  title: "Registrar venta cerrada",
  description:
    "Registra una venta cerrada de una empresa (líneas móvil, fibras, SNAV, margen y si es producto estratégico). Alimenta los KPIs del trimestre en la pestaña Hoy.",
  inputSchema: {
    company_id: z.string().trim().min(1).describe("ID de la empresa."),
    lineas_movil: z.number().int().min(0).default(0).describe("Altas de líneas móviles."),
    lineas_fibra: z.number().int().min(0).default(0).describe("Altas de fibras."),
    snav: z.number().min(0).default(0).describe("SNAV en euros."),
    margen: z.number().min(0).default(0).describe("Margen en euros."),
    producto: z.string().trim().max(200).optional().describe("Producto vendido."),
    producto_estrategico: z.boolean().default(false).describe("Si es producto estratégico acelerador."),
    fecha: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Fecha de la venta (YYYY-MM-DD). Por defecto hoy."),
    notas: z.string().trim().max(2000).optional().describe("Notas de la venta."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("sales")
      .insert({
        company_id: input.company_id,
        lineas_movil: input.lineas_movil ?? 0,
        lineas_fibra: input.lineas_fibra ?? 0,
        snav: input.snav ?? 0,
        margen: input.margen ?? 0,
        producto: input.producto ?? null,
        producto_estrategico: input.producto_estrategico ?? false,
        ...(input.fecha ? { fecha: input.fecha } : {}),
        notas: input.notas ?? null,
      })
      .select();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data?.[0] ?? {}, null, 2) }],
      structuredContent: { venta: data?.[0] ?? null },
    };
  },
});
