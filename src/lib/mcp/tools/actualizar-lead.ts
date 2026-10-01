import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";
import { ESTADOS } from "./listar-pipeline";

export default defineTool({
  name: "actualizar_lead",
  title: "Actualizar lead del pipeline",
  description:
    "Cambia el estado del pipeline de un lead y/o su próxima acción y notas. Escribe únicamente en la tabla leads.",
  inputSchema: {
    lead_id: z.string().trim().min(1).describe("ID del lead a actualizar."),
    estado: z.enum(ESTADOS).optional().describe("Nuevo estado del pipeline."),
    next_action: z.string().trim().max(500).optional().describe("Próxima acción comercial."),
    next_action_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Fecha de la próxima acción (YYYY-MM-DD)."),
    notas: z.string().trim().max(4000).optional().describe("Notas del lead."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ lead_id, estado, next_action, next_action_date, notas }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (estado !== undefined) patch.estado = estado;
    if (next_action !== undefined) patch.next_action = next_action;
    if (next_action_date !== undefined) patch.next_action_date = next_action_date;
    if (notas !== undefined) patch.notas = notas;

    if (Object.keys(patch).length === 1) {
      return { content: [{ type: "text", text: "Nada que actualizar." }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("leads").update(patch).eq("id", lead_id).select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data?.length) {
      return { content: [{ type: "text", text: "Lead no encontrado o sin permisos." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data[0], null, 2) }],
      structuredContent: { lead: data[0] },
    };
  },
});
