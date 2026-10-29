/**
 * Cloudflare Pages Function: /api/search-match-link
 * Enables automated match link generation by team names on md-akbor-hosen.pages.dev
 */

export async function onRequestPost(context: any): Promise<Response> {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    const body = await context.request.json().catch(() => ({}));
    const { team1 = '', team2 = '', sport = 'cricket' } = body || {};

    const t1 = String(team1).trim();
    const t2 = String(team2).trim();

    if (!t1 && !t2) {
      return new Response(JSON.stringify({ error: 'Team names required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const isFb = sport === 'football' || /football|soccer/i.test(sport);
    let directUrl = '';

    if (isFb) {
      const q = encodeURIComponent(`${t1} ${t2}`);
      const sfRes = await fetch(`https://api.sofascore.com/api/v1/search/all?q=${q}`, {
        headers: { Accept: 'application/json' }
      });
      if (sfRes.ok) {
        const json: any = await sfRes.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        const evHit = results.find((item: any) => item?.type === 'event' && item?.entity);
        if (evHit?.entity?.id) {
          directUrl = `https://www.sofascore.com/football/match/${t1.toLowerCase()}-${t2.toLowerCase()}/${evHit.entity.id}#id:${evHit.entity.id}`;
        }
      }
      if (!directUrl) {
        directUrl = `https://www.sofascore.com/football/match/${t1.toLowerCase()}-${t2.toLowerCase()}`;
      }
    } else {
      // Cricket Crex link generator
      const cleanSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      directUrl = `https://crex.com/cricket-live-score/${cleanSlug(t1)}-vs-${cleanSlug(t2)}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        matchUrl: directUrl,
        directUrl,
        source: isFb ? 'sofascore' : 'crex'
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Search failed' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
