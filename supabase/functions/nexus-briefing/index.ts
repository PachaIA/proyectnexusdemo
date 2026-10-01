import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeField, sanitizeArray, SAFETY_SUFFIX } from "../_shared/sanitize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth check ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !data?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Business logic ──────────────────────────────────────────────────
    const { messages, company } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const c = company || {};
    const safeName = sanitizeField(c.name);
    const safeSector = sanitizeField(c.sector);
    const safeEmployees = sanitizeField(c.employees, 10);
    const safeScore = sanitizeField(c.opportunityScore, 10);
    const safeDigital = sanitizeField(c.digitalizationLevel, 50);
    const safeMulti = c.isMultiSite ? "Sí" : "No";
    const safeNeeds = sanitizeArray(c.detectedNeeds).join(", ");
    const safeProducts = sanitizeArray(c.recommendedProducts).join(", ");
    const safeGrowth = sanitizeArray(c.growthSignals).join(", ");
    const safeNbaType = sanitizeField(c.nextBestAction?.type, 50);
    const safeNbaReason = sanitizeField(c.nextBestAction?.reason, 300);
    const decisionMakers = Array.isArray(c.decisionMakers) ? c.decisionMakers.slice(0, 10) : [];
    const safeDecisionMakers = decisionMakers
      .map((d: any) =>
        sanitizeField(d?.role, 80) +
        " (poder: " + sanitizeField(d?.decisionPower, 30) +
        ", accesibilidad: " + sanitizeField(d?.accessibility, 30) +
        ", canal: " + sanitizeField(d?.contactChannel, 30) + ")"
      )
      .join(" | ");

    const systemPrompt = "Eres NEXUS AI, el asistente de inteligencia comercial para un comercial de telecomunicaciones B2B en Málaga.\n" +
      "Hablas en español, eres directo, conciso y orientado a acción. Nunca dices \"Entendido\" ni rellenas con palabras vacías.\n" +
      "Conoces esta empresa en detalle:\n" +
      "- Nombre: " + safeName + "\n" +
      "- Sector: " + safeSector + " | Empleados: " + safeEmployees + "\n" +
      "- Score de oportunidad: " + safeScore + "/100\n" +
      "- Digitalización: " + safeDigital + " | Multi-sede: " + safeMulti + "\n" +
      "- Necesidades detectadas: " + safeNeeds + "\n" +
      "- Productos recomendados: " + safeProducts + "\n" +
      "- Señales de crecimiento: " + safeGrowth + "\n" +
      "- Acción recomendada: " + safeNbaType + " — " + safeNbaReason + "\n" +
      "- Decisores: " + safeDecisionMakers + "\n\n" +
      "Tu misión: ayudar al comercial a preparar la visita/llamada. Da consejos específicos, anticipa objeciones, sugiere el pitch de apertura ideal, explica por qué ahora es el momento de contactar.\n\n" +
      SAFETY_SUFFIX;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones alcanzado. Inténtalo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Añade fondos en Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nexus-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
