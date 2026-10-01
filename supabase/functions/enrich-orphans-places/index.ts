import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

const SUFFIX_PATTERNS = [
  /\bSOCIEDAD\s+LIMITADA\b/gi,
  /\bSOCIEDAD\s+ANONIMA\b/gi,
  /\bS\.?L\.?U\.?\b/gi,
  /\bS\.?L\.?L\.?\b/gi,
  /\bS\.?L\.?\b/gi,
  /\bS\.?A\.?\b/gi,
  /\bS\.?C\.?A\.?\b/gi,
  /\bS\.?C\.?\b/gi,
  /\bC\.?B\.?\b/gi,
  /\bA\.?I\.?E\.?\b/gi,
];

function cleanName(name: string): string {
  let n = name || '';
  for (const p of SUFFIX_PATTERNS) n = n.replace(p, '');
  return n.replace(/[,\.]+\s*$/g, '').replace(/\s+/g, ' ').trim();
}

interface AddrComp {
  long_name: string;
  short_name: string;
  types: string[];
}

function pickComp(comps: AddrComp[], type: string): string | null {
  const c = comps.find((x) => x.types.includes(type));
  return c?.long_name ?? null;
}

async function textSearch(query: string) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=es&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  return await res.json();
}

async function placeDetails(placeId: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_components,geometry,formatted_address&language=es&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GOOGLE_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY not configured' }), {
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

    const batchSize = 25;
    const { data: rows, error } = await admin
      .from('companies')
      .select('id, name')
      .eq('location_type', 'wasp')
      .eq('enrichment_attempted', false)
      .or('address.is.null,address.eq.')
      .limit(batchSize);

    if (error) throw error;

    let enriquecidos = 0;
    let sin_match = 0;

    for (const r of rows ?? []) {
      const cleaned = cleanName(r.name ?? '');
      if (!cleaned) {
        await admin.from('companies').update({ enrichment_attempted: true }).eq('id', r.id);
        sin_match++;
        continue;
      }

      const query = `${cleaned}, Málaga, España`;
      let matched = false;

      try {
        const ts = await textSearch(query);
        const first = ts?.results?.[0];
        const fa: string = first?.formatted_address ?? '';
        if (first?.place_id && /m[aá]laga/i.test(fa)) {
          const det = await placeDetails(first.place_id);
          const result = det?.result;
          const comps: AddrComp[] = result?.address_components ?? [];
          const loc = result?.geometry?.location;
          if (comps.length && loc) {
            const route = pickComp(comps, 'route');
            const streetNumber = pickComp(comps, 'street_number');
            const address = [route, streetNumber].filter(Boolean).join(' ').trim() || null;
            const cp = pickComp(comps, 'postal_code');
            const localidad = pickComp(comps, 'locality');
            const provincia = pickComp(comps, 'administrative_area_level_2') ?? 'Málaga';

            const { error: updErr } = await admin.from('companies').update({
              address,
              cp,
              localidad,
              provincia,
              lat: loc.lat,
              lng: loc.lng,
              enrichment_attempted: true,
            }).eq('id', r.id);
            if (!updErr) {
              enriquecidos++;
              matched = true;
            }
          }
        }
      } catch (e) {
        console.error('places error', r.id, e);
      }

      if (!matched) {
        await admin.from('companies').update({ enrichment_attempted: true }).eq('id', r.id);
        sin_match++;
      }
    }

    const { count: restantes } = await admin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('location_type', 'wasp')
      .eq('enrichment_attempted', false)
      .or('address.is.null,address.eq.');

    return new Response(JSON.stringify({
      procesados: rows?.length ?? 0,
      enriquecidos,
      sin_match,
      restantes: restantes ?? 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? 'error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
