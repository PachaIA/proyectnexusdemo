import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_KEY = Deno.env.get('GOOGLE_GEOCODING_API_KEY');

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}&region=es`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
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

    const batchSize = 100;
    const { data: rows, error } = await admin
      .from('companies')
      .select('id, address, cp, localidad, provincia')
      .or('lat.eq.0,lng.eq.0')
      .not('address', 'is', null)
      .neq('address', '')
      .limit(batchSize);

    if (error) throw error;

    let actualizados = 0;
    let sin_resultado = 0;

    for (const r of rows ?? []) {
      const parts = [r.address, r.cp, r.localidad, r.provincia].filter(Boolean).join(', ');
      const full = parts ? `${parts}, España` : 'España';
      if (!parts) { sin_resultado++; continue; }
      const result = await geocode(full);
      if (!result) { sin_resultado++; continue; }
      const { error: updErr } = await admin
        .from('companies')
        .update({ lat: result.lat, lng: result.lng })
        .eq('id', r.id);
      if (updErr) { console.error('update fail', r.id, updErr); sin_resultado++; continue; }
      actualizados++;
    }

    const { count: restantes } = await admin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .or('lat.eq.0,lng.eq.0')
      .not('address', 'is', null)
      .neq('address', '');

    return new Response(JSON.stringify({
      procesados: rows?.length ?? 0,
      actualizados,
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
