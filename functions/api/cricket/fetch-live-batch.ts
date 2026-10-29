/**
 * Cloudflare Pages Function: /api/cricket/fetch-live-batch
 * Runs serverlessly on Cloudflare Edge for https://md-akbor-hosen.pages.dev/api/cricket/fetch-live-batch
 */

import { parseLiveCricketUrlEdge } from './fetch-live-url';

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
    const items = Array.isArray(body?.items) ? body.items.slice(0, 10) : [];
    const results: Record<string, any> = {};

    await Promise.allSettled(
      items.map(async (item: any) => {
        const url = String(item?.url || '').trim();
        const key = String(item?.id || url).trim();
        if (!url || !key) return;
        try {
          const data = await parseLiveCricketUrlEdge(url, item?.team1, item?.team2, item?.sport);
          if (data && data.success) {
            results[key] = data;
          }
        } catch {}
      })
    );

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Batch fetch failed' }), {
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
