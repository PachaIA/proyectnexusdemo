import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeField, SAFETY_SUFFIX } from "../_shared/sanitize.ts";

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
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, company } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const c = company || {};
    const parts = [
      "Nombre: " + sanitizeField(c.name || "Desconocido"),
      "Sector: " + sanitizeField(c.sector || "N/A"),
      "Dirección: " + sanitizeField(c.address || "N/A", 300),
      "Teléfono: " + sanitizeField(c.phone || "N/A", 50),
      "Web: " + sanitizeField(c.website || "N/A", 200),
      "NCS Score: " + sanitizeField(c.score || 0, 10),
      "Rating Google: " + sanitizeField(c.rating || "N/A", 10),
      "Reseñas: " + sanitizeField(c.totalReviews || 0, 10),
      "Tipo Negocio: " + sanitizeField(c.tipoNegocio || "N/A"),
      "Estado comercial: " + sanitizeField(c.estado || "prospecto", 50),
    ];

    const systemPrompt = "Eres NEXUS AI, asistente de inteligencia comercial para un comercial de telecomunicaciones B2B en Málaga. " +
      "Hablas en español, eres directo, conciso y orientado a acción. " +
      "Conoces esta empresa:\n" + parts.join("\n") + "\n\n" +
      "Tu misión: dar un briefing comercial completo para preparar la visita/llamada. " +
      "Incluye: análisis del sector, posibles necesidades telecom (centralita virtual, fibra corporativa, móviles empresa, IoT), " +
      "pitch de apertura recomendado, objeciones probables y cómo rebatirlas, y por qué ahora es el momento de contactar.\n\n" +
      SAFETY_SUFFIX;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + LOVABLE_API_KEY,
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
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
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
    console.error("csv-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
