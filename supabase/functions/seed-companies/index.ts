import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth check (required — function uses service role) ──────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido o expirado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client only used after auth has been validated.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { companies } = await req.json();

    if (!companies || !Array.isArray(companies) || companies.length === 0) {
      return new Response(JSON.stringify({ error: "No companies provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap payload size to prevent abuse
    if (companies.length > 2000) {
      return new Response(JSON.stringify({ error: "Demasiados registros (máx. 2000 por petición)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map client-side Company objects to DB columns
    const rows = companies.map((c: any) => ({
      id: String(c.id),
      name: c.name,
      cif: c.cif || null,
      sector: c.sector,
      employees: c.employees,
      address: c.address || null,
      location: c.location || null,
      location_type: c.locationType || null,
      lat: c.lat,
      lng: c.lng,
      website: c.website || null,
      linkedin: c.linkedin || null,
      digitalization_level: c.digitalizationLevel || 'medio',
      opportunity_score: c.opportunityScore,
      description: c.description || null,
      detected_needs: c.detectedNeeds || [],
      recommended_products: c.recommendedProducts || [],
      recent_news: c.recentNews || [],
      contact_info: c.contactInfo || {},
      is_multi_site: c.isMultiSite || false,
      it_complexity: c.itComplexity || 'media',
      growth_signals: c.growthSignals || [],
      estimated_arpu: c.estimatedARPU || 0,
      next_best_action: c.nextBestAction || {},
      data_sources: c.dataSources || [],
      decision_makers: c.decisionMakers || [],
      score_breakdown: c.scoreBreakdown || [],
    }));

    // Upsert to handle re-runs
    const { error } = await supabase
      .from("companies")
      .upsert(rows, { onConflict: "id" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
