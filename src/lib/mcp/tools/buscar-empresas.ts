import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "buscar_empresas",
  title: "Buscar empresas",
  description:
    "Busca empresas del radar comercial por nombre, CIF, sector, localidad u operador y devuelve sus datos clave (líneas, score, estado telecom).",
  inputSchema: {
    query: z.string().trim().min(1).describe("Texto a buscar en nombre, CIF, sector o localidad."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de resultados (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const q = `%${query.replace(/\s+/g, "%")}%`;
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id,name,cif,sector,employees,localidad,provincia,address,operador_actual,operador_fijo,lineas_movil,lineas_fijo,lineas_total,opportunity_score,is_hot",
      )
      .or(`name.ilike.${q},cif.ilike.${q},sector.ilike.${q},localidad.ilike.${q}`)
      .order("opportunity_score", { ascending: false })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { empresas: data ?? [] },
    };
  },
});
