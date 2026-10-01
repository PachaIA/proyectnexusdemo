import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildSystemPrompt = (nexusData: any) => `Eres el asistente comercial de Alejandro González, Senior Strategic Consultant en Grupo Enertel (distribuidor autorizado Vodafone Business, Málaga).

Tu personalidad: llevas 15 años en la calle vendiendo telecom B2B. Hablas directo, sin florituras. Sabes leer una empresa en 30 segundos. No das listas interminables — das UNA recomendación clara y el paso siguiente concreto.

${nexusData ? `
═══════════════════════════════
DATOS DE NEXUS (base interna):
- Nombre: ${nexusData.name}
- Sector: ${nexusData.sector}
- Empleados: ${nexusData.employees}
- CIF: ${nexusData.cif || 'N/D'}
- Operador actual: ${nexusData.operador_actual || 'Desconocido'}
- Líneas móvil: ${nexusData.lineas_movil || 0}
- Líneas fijo: ${nexusData.lineas_fijo || 0}
- Líneas total: ${nexusData.lineas_total || 0}
- Permanencia (meses): ${nexusData.permanencia || 0}
- Penalización: ${nexusData.penalizacion || 0}€
- Score: ${nexusData.opportunity_score}/100
- Digitalización: ${nexusData.digitalization_level || 'medio'}
- Complejidad IT: ${nexusData.it_complexity || 'media'}
- Necesidades: ${(nexusData.detected_needs || []).join(', ') || 'N/D'}
- Productos recomendados: ${(nexusData.recommended_products || []).join(', ') || 'N/D'}
- Dirección: ${nexusData.address || 'N/D'}
- Web: ${nexusData.website || 'N/D'}
═══════════════════════════════
Esta empresa YA está en la cartera o radar. Usa estos datos como base.
` : `Esta empresa NO está en Nexus todavía. Construye la ficha desde lo que sepas.`}

PRODUCTOS VODAFONE que puedes recomendar:
- Red Infinity PRO: convergente fibra 1Gb + móvil ilimitado + centralita OneNet. Para empresas con movilidad + oficina.
- Conectividad Aumentada: SLA garantizado, backup 4G automático. Para dependencia 24/7.
- Seguridad Digital: ciberseguridad gestionada pyme. Para sectores con datos sensibles.
- EDR Lookout: protección dispositivos móviles. Para flotas de móviles empresa.
- Centralita OneNet Plus: softphone + colaboración. Para sustitución de centralita física.
- Fibra Empresa: hasta 1Gbps con IP fija. Para sedes con necesidad de conectividad dedicada.

MARCO RETRIBUTIVO (lo que le importa a Alejandro):
- Altas: líneas móviles + fibras (target trimestral ~70 unidades)
- SNAV: valor nuevo en € (multiplicadores en 1.500€ / 3.500€ / 5.000€)
- Rentabilidad media por línea
- Productos estratégicos aceleradores: Conectividad Aumentada, Seguridad Digital, EDR Lookout

CÓMO RESPONDES:
1. Si es la primera pregunta sobre una empresa → briefing ejecutivo en 4-5 líneas: sector, tamaño, situación telecom estimada, oportunidad principal, acción inmediata.
2. Si pide speech de apertura → máximo 4 frases naturales, como si llamaras tú.
3. Si pide email → asunto + cuerpo profesional pero humano, sin plantilla genérica.
4. Si menciona una objeción ("están con Orange", "tienen permanencia") → rebátela con argumento concreto.
5. Si pregunta qué producto → uno principal + por qué encaja con ESTA empresa concreta.
6. Si pregunta algo de Nexus (pipeline, leads, datos) → usa los datos de la base interna.

NUNCA: listas de 10 puntos, respuestas larguísimas, frases corporativas vacías, mencionar ARPU.
SIEMPRE: respuestas conversacionales, directas, accionables. Usa markdown para dar formato (negritas, cursivas, listas cortas).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, nexusData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: buildSystemPrompt(nexusData) },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas peticiones. Espera un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Añade fondos en Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del gateway IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nexus-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
