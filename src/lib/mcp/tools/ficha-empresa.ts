import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated } from "../supabase";

export default defineTool({
  name: "ficha_empresa",
  title: "Ficha de empresa",
  description:
    "Devuelve la ficha completa de una empresa (datos telecom, contactos, decisores), sus sedes, su lead en el pipeline y sus ventas cerradas.",
  inputSchema: {
    company_id: z.string().trim().min(1).describe("ID de la empresa (campo id de companies)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ company_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const [company, sedes, leads, sales] = await Promise.all([
      supabase.from("companies").select("*").eq("id", company_id).maybeSingle(),
      supabase.from("sedes").select("*").eq("company_id", company_id),
      supabase.from("leads").select("*").eq("company_id", company_id),
      supabase.from("sales").select("*").eq("company_id", company_id).order("fecha", { ascending: false }),
    ]);

    const err = company.error ?? sedes.error ?? leads.error ?? sales.error;
    if (err) return { content: [{ type: "text", text: err.message }], isError: true };
    if (!company.data) {
      return { content: [{ type: "text", text: "Empresa no encontrada." }], isError: true };
    }

    const payload = {
      empresa: company.data,
      sedes: sedes.data ?? [],
      leads: leads.data ?? [],
      ventas: sales.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
