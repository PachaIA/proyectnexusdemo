import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export const ESTADOS = [
  "sin_empezar",
  "contactado",
  "cualificado",
  "propuesta",
  "negociacion",
  "ganado",
  "perdido",
] as const;

export default defineTool({
  name: "listar_pipeline",
  title: "Listar pipeline",
  description:
    "Lista los leads del pipeline comercial del usuario, opcionalmente filtrados por estado (sin_empezar, contactado, cualificado, propuesta, negociacion, ganado, perdido).",
  inputSchema: {
    estado: z.enum(ESTADOS).optional().describe("Estado del pipeline por el que filtrar."),
    limit: z.number().int().min(1).max(100).default(50).describe("Máximo de leads a devolver."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ estado, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("leads")
      .select(
        "id,company_id,empresa,cif,sector,tamano,estado,opportunity_score,next_action,next_action_date,notas,updated_at",
      )
      .order("opportunity_score", { ascending: false })
      .limit(limit ?? 50);
    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { leads: data ?? [] },
    };
  },
});
