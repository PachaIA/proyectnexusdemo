import { createClient } from 'npm:@supabase/supabase-js@2';
import { BATCH_SIZE, geocodeUpdate, pendingCompanies, type GeocodeResult } from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_KEY = Deno.env.get('GOOGLE_GEOCODING_API_KEY');

async function geocode(address: string): Promise<GeocodeResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}&region=es`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat, lng,
        location_type: data.results[0].geometry.location_type,
        formatted_address: data.results[0].formatted_address,
      };
    }
  } catch (e) {
    console.error('geocode error', e);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GOOGLE_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_GEOCODING_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rows, error } = await pendingCompanies(admin
      .from('companies')
      .select('id, address, cp, localidad, provincia'))
      .limit(BATCH_SIZE);

    if (error) throw error;

    let actualizados = 0;
    let aproximados = 0;
    let sin_resultado = 0;

    for (const r of rows ?? []) {
      const parts = [r.address, r.cp, r.localidad, r.provincia].filter(Boolean).join(', ');
      const full = parts ? `${parts}, España` : 'España';
      const result = parts ? await geocode(full) : null;
      const update = geocodeUpdate(result, new Date().toISOString());
      const { error: updErr } = await admin
        .from('companies')
        .update(update)
        .eq('id', r.id);
      if (updErr) throw updErr;
      if (update.geocode_status === 'ok') actualizados++;
      else if (update.geocode_status === 'aproximado') aproximados++;
      else sin_resultado++;
    }

    const { count: restantes, error: countError } = await pendingCompanies(admin
      .from('companies')
      .select('id', { count: 'exact', head: true }));
    if (countError) throw countError;

    return new Response(JSON.stringify({
      procesados: rows?.length ?? 0,
      actualizados,
      aproximados,
      sin_resultado,
      restantes: restantes ?? 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? 'error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
