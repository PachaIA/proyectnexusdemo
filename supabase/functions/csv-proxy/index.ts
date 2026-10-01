import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1PVcDSeIa50mht3OavtTb0a3V7QhiiflCUVAv9UXeQ28/export?format=csv";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) {
      throw new Error(`Google Sheets returned ${res.status}`);
    }
    const text = await res.text();

    return new Response(text, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
