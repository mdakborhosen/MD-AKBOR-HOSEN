/**
 * Cloudflare Pages Function: /api/cricket/fetch-live-url
 * Runs serverlessly on Cloudflare Edge for https://md-akbor-hosen.pages.dev/api/cricket/fetch-live-url
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
    const { url, team1, team2, sport } = body || {};

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Match URL is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const data = await parseLiveCricketUrlEdge(url.trim(), team1, team2, sport);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch live score' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestGet(context: any): Promise<Response> {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  try {
    const requestUrl = new URL(context.request.url);
    const targetUrl = requestUrl.searchParams.get('url');
    const team1 = requestUrl.searchParams.get('team1') || undefined;
    const team2 = requestUrl.searchParams.get('team2') || undefined;
    const sport = requestUrl.searchParams.get('sport') || undefined;

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'url parameter is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const data = await parseLiveCricketUrlEdge(targetUrl.trim(), team1, team2, sport);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch live score' }), {
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

/**
 * Universal Edge parser running on Cloudflare Workers without Node dependencies
 */
export async function parseLiveCricketUrlEdge(
  url: string,
  hintTeam1?: string,
  hintTeam2?: string,
  hintSport?: string
): Promise<any> {
  const isFb = hintSport === 'football' || url.toLowerCase().includes('sofascore') || url.toLowerCase().includes('football');

  // 1. SofaScore API for Football
  if (isFb) {
    const idMatch = url.match(/(?:#id:|\/event\/|[?&]id=|\/)(\d{7,10})\b/i);
    if (idMatch && idMatch[1]) {
      try {
        const sfRes = await fetch(`https://api.sofascore.com/api/v1/event/${idMatch[1]}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            Accept: 'application/json'
          }
        });
        if (sfRes.ok) {
          const sfJson: any = await sfRes.json();
          const ev = sfJson?.event;
          if (ev) {
            const t1 = ev.homeTeam?.name || hintTeam1 || 'Team 1';
            const t2 = ev.awayTeam?.name || hintTeam2 || 'Team 2';
            const s1 = ev.homeScore?.current ?? 0;
            const s2 = ev.awayScore?.current ?? 0;
            const statusType = String(ev.status?.type || '').toLowerCase();
            const isUpcoming = statusType === 'notstarted';
            const isFinished = statusType === 'finished';
            return {
              success: true,
              sport: 'football',
              team1: t1,
              team2: t2,
              footballScore1: s1,
              footballScore2: s2,
              footballMinute: isUpcoming ? 'Upcoming' : isFinished ? 'FT' : (ev.status?.description || 'Live'),
              footballPeriod: isUpcoming ? 'Not started' : isFinished ? 'FT' : '2H',
              isUpcoming,
              isFinished,
              statusText: isUpcoming
                ? `Match yet to begin • 0 - 0`
                : `${t1} ${s1} - ${s2} ${t2} • ${ev.status?.description || 'Live'}`,
              lastUpdated: new Date().toLocaleTimeString()
            };
          }
        }
      } catch {}
    }
  }

  // 2. Simulated/Demo match check
  if (url.startsWith('demo://') || url.startsWith('test://')) {
    const t1 = hintTeam1 || 'BAN';
    const t2 = hintTeam2 || 'IND';
    return {
      success: true,
      sport: 'cricket',
      team1: t1,
      team2: t2,
      battingTeam: t1,
      bowlingTeam: t2,
      score: 154,
      wickets: 3,
      overs: 16,
      ballsInOver: 2,
      totalBalls: 98,
      target: 182,
      firstInningsScore: '181/6',
      statusText: `${t1} need 28 runs in 22 balls`,
      recentBalls: ['1', '4', '•', '2', '1', '6'],
      batsmen: [
        { name: 'Batsman 1', runs: 45, balls: 29, fours: 4, sixes: 1 },
        { name: 'Batsman 2', runs: 32, balls: 21, fours: 3, sixes: 1 }
      ],
      bowler: { name: 'Bowler 1', overs: '3.2', runs: 26, wickets: 2 },
      lastUpdated: new Date().toLocaleTimeString()
    };
  }

  // 3. Fetch external Cricket web page (Crex, Cricbuzz, etc.)
  const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
    'Cache-Control': 'no-cache'
  };

  let html = '';
  try {
    const response = await fetch(url, { headers: reqHeaders, redirect: 'follow' });
    html = await response.text();
  } catch (err: any) {
    throw new Error(`Unable to fetch match URL: ${err?.message || 'Network error'}`);
  }

  let team1 = hintTeam1 || '';
  let team2 = hintTeam2 || '';
  let score = 0;
  let wickets = 0;
  let overs = 0;
  let ballsInOver = 0;
  let target: number | undefined;
  let firstInningsScore: string | undefined;
  let statusText = '';
  let battingTeam = '';
  let bowlingTeam = '';
  let recentBalls: string[] = [];
  let batsmen: any[] = [];
  let bowler: any = null;
  let isUpcoming = false;
  let isFinished = false;
  let matchStartTime: string | undefined;
  let matchStartTimeIso: string | undefined;

  // A. Crex Angular SSR (id="app-root-state")
  const rootStateMatch = html.match(/id="app-root-state"[^>]*>([\s\S]*?)<\/script>/i);
  if (rootStateMatch && rootStateMatch[1]) {
    try {
      const decoded = rootStateMatch[1]
        .replace(/&q;/g, '"')
        .replace(/&a;/g, '&')
        .replace(/&s;/g, "'")
        .replace(/&l;/g, '<')
        .replace(/&g;/g, '>');
      const state = JSON.parse(decoded);

      const metaKey = Object.keys(state).find(k => k.includes('getMatchMetaData') || k.startsWith('match-'));
      const sv3Key = Object.keys(state).find(k => k.includes('getSV3'));
      const postKey = Object.keys(state).find(k => k.includes('getPostMatchDataV2'));

      const meta = metaKey ? (Array.isArray(state[metaKey]) ? state[metaKey][0] : state[metaKey]) : null;
      const sv3 = sv3Key ? state[sv3Key] : null;
      const post = postKey ? state[postKey] : null;

      if (meta) {
        team1 = meta.team1 || meta.team1?.name || meta.team1Name || team1;
        team2 = meta.team2 || meta.team2?.name || meta.team2Name || team2;
        if (meta.t) {
          matchStartTimeIso = meta.t;
          const d = new Date(meta.t);
          if (!isNaN(d.getTime())) {
            matchStartTime = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }
      }

      if (sv3) {
        team1 = sv3.team1 || sv3.team1short || sv3.team1_f_n || team1;
        team2 = sv3.team2 || sv3.team2short || sv3.team2_f_n || team2;
        statusText = sv3.B || statusText;

        if (sv3.status === 0) {
          isUpcoming = true;
        } else if (sv3.status === 2) {
          isFinished = true;
        }

        if (sv3.target) {
          target = parseInt(String(sv3.target), 10);
        }

        // Active Inning score
        const activeScoreStr = sv3.score1 || (sv3.secondInning ? sv3.score2 : sv3.score1);
        if (activeScoreStr) {
          const parts = String(activeScoreStr).split('-');
          score = parseInt(parts[0], 10) || 0;
          wickets = parts[1] ? parseInt(parts[1], 10) : 0;
        }

        const activeOverStr = sv3.over1 || (sv3.secondInning ? sv3.over2 : sv3.over1);
        if (activeOverStr) {
          const cleanOv = String(activeOverStr).replace(/[()]/g, '').trim();
          const [o, b] = cleanOv.split('.').map(n => parseInt(n || '0', 10));
          overs = o || 0;
          ballsInOver = b || 0;
        }

        // 1st innings score if in 2nd inning
        if (sv3.secondInning && sv3.score2) {
          const p1 = String(sv3.score2).split('-');
          firstInningsScore = `${p1[0]}${p1[1] ? '/' + p1[1] : ''}`;
        }

        battingTeam = sv3.secondInning ? (team2 || 'Team 2') : (team1 || 'Team 1');
        bowlingTeam = battingTeam === team1 ? (team2 || 'Team 2') : (team1 || 'Team 1');

        if (sv3.pname1) {
          batsmen.push({
            name: sv3.player_full_name1 || sv3.pname1,
            runs: parseInt(sv3.run1 || '0', 10),
            balls: parseInt(String(sv3.ball1 || '0').replace(/\D/g, ''), 10),
            fours: parseInt(sv3.four1 || '0', 10),
            sixes: parseInt(sv3.six1 || '0', 10)
          });
        }
        if (sv3.pname2) {
          batsmen.push({
            name: sv3.player_full_name2 || sv3.pname2,
            runs: parseInt(sv3.run2 || '0', 10),
            balls: parseInt(String(sv3.ball2 || '0').replace(/\D/g, ''), 10),
            fours: parseInt(sv3.four2 || '0', 10),
            sixes: parseInt(sv3.six2 || '0', 10)
          });
        }

        if (sv3.bname) {
          const bwrParts = String(sv3.bwr || '0-0').split('-');
          const bwName = String(sv3.bowler_full_name || sv3.bname).trim();
          bowler = {
            name: bwName,
            overs: sv3.bover || '0.0',
            wickets: parseInt(bwrParts[0] || '0', 10),
            runs: parseInt(bwrParts[1] || '0', 10)
          };
        }

        if (Array.isArray(sv3.lastovers) && sv3.lastovers.length > 0) {
          const overBalls: string[] = [];
          for (const ov of sv3.lastovers.slice(-2)) {
            if (Array.isArray(ov?.overinfo)) {
              for (const tok of ov.overinfo) {
                const str = typeof tok === 'object' ? String(tok?.u || tok?.b || tok?.val || '') : String(tok || '');
                if (str && str !== '[object Object]') overBalls.push(str.trim());
              }
            }
          }
          if (overBalls.length > 0) {
            recentBalls = overBalls;
          }
        } else if (Array.isArray(sv3.rb)) {
          const rawItems = sv3.rb.flatMap((r: any) => {
            if (Array.isArray(r?.b)) return r.b;
            if (r && typeof r === 'object' && r.b !== undefined) return [r.b];
            return [r];
          });
          recentBalls = rawItems
            .map((item: any) => {
              if (item === null || item === undefined) return '';
              if (typeof item === 'string') return item.trim() === '[object Object]' ? '' : item.trim();
              if (typeof item === 'number') return String(item);
              if (typeof item === 'object') {
                const s = item.u || item.b || item.val || item.runs || item.symbol || item.text;
                return s ? String(s).trim() : '';
              }
              return '';
            })
            .filter((tok: string) => tok && tok !== '[object Object]')
            .slice(-24);
        }
      }

      if (post && !statusText && post.r) {
        statusText = post.r;
        isFinished = true;
      }
    } catch {}
  }

  // B. Next.js (__NEXT_DATA__)
  if (!score && !wickets && !overs) {
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        const matchData = pageProps?.matchData || pageProps?.matchDetail || pageProps?.liveScoreData || pageProps?.initialData;

        if (matchData) {
          team1 = team1 || matchData.team1Name || matchData.team1 || '';
          team2 = team2 || matchData.team2Name || matchData.team2 || '';

          const liveScore = matchData.currentScore || matchData.score;
          if (liveScore) {
            const sMatch = String(liveScore).match(/(\d+)(?:\/(\d+))?/);
            if (sMatch) {
              score = parseInt(sMatch[1], 10) || 0;
              wickets = sMatch[2] ? parseInt(sMatch[2], 10) : 0;
            }
          }

          if (matchData.overs) {
            const ovParts = String(matchData.overs).split('.');
            overs = parseInt(ovParts[0], 10) || 0;
            ballsInOver = parseInt(ovParts[1], 10) || 0;
          }

          if (matchData.status) statusText = matchData.status;
          if (matchData.target) target = parseInt(String(matchData.target), 10);
          if (matchData.firstInningsScore) firstInningsScore = String(matchData.firstInningsScore).trim();

          battingTeam = matchData.currentBattingTeam || matchData.battingTeam || team1;
          bowlingTeam = battingTeam === team1 ? team2 : team1;

          isUpcoming = Boolean(matchData.isUpcoming || /not started|upcoming|yet to begin/i.test(statusText));
          isFinished = Boolean(matchData.isFinished || /completed|won by|match ended/i.test(statusText));
        }
      } catch {}
    }
  }

  // C. Fallback to DOM Regular Expression Parsing
  if (!score && !wickets && !overs) {
    const scoreMatches = Array.from(html.matchAll(/([A-Z]{2,15}|\b[A-Z][a-zA-Z\s]{1,15})\s*[:\-]?\s*(\d{1,3})(?:\/(\d{1,2}))?\s*(?:\((\d{1,2}(?:\.\d)?)\s*(?:ov|overs)?\))?/gi));

    if (scoreMatches.length > 0) {
      const activeMatch = scoreMatches[scoreMatches.length - 1];
      const batTeamName = activeMatch[1]?.trim() || team1 || 'Team 1';
      score = parseInt(activeMatch[2] || '0', 10);
      wickets = activeMatch[3] ? parseInt(activeMatch[3], 10) : 0;
      const ovStr = activeMatch[4] || '0.0';
      const [o, b] = ovStr.split('.').map(n => parseInt(n || '0', 10));
      overs = o;
      ballsInOver = b || 0;
      battingTeam = batTeamName;
      bowlingTeam = batTeamName === team1 ? team2 : team1;

      if (scoreMatches.length >= 2) {
        const first = scoreMatches[0];
        firstInningsScore = `${first[2]}${first[3] ? '/' + first[3] : ''}`;
      }
    }
  }

  // Extract Teams from URL slug if still empty
  if (!team1 || !team2) {
    const slugMatch = url.match(/\/cricket-live-score\/([a-z0-9\-]+)/i) || url.match(/\/([a-z0-9\-]+-vs-[a-z0-9\-]+)/i);
    if (slugMatch) {
      const slug = slugMatch[1];
      const parts = slug.split('-vs-');
      if (parts.length >= 2) {
        const cleanName = (s: string) =>
          s
            .replace(/-(?:\d+(?:st|nd|rd|th)|only|final|semi|match|t20|odi|test|live).*$/i, '')
            .split('-')
            .filter(Boolean)
            .map(w => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
            .join(' ');
        if (!team1) team1 = cleanName(parts[0]);
        if (!team2) team2 = cleanName(parts[1]);
      }
    }
  }

  // Extract Status Text
  if (!statusText) {
    const stMatch = html.match(/(?:need\s+\d+\s+runs\s+in\s+\d+\s+balls|opt\s+to\s+(?:bowl|bat)|won\s+by\s+\d+\s+(?:runs|wickets)|match\s+yet\s+to\s+begin|toss\s+delayed|innings\s+break)/i);
    statusText = stMatch ? stMatch[0] : `${team1 || 'Team 1'} vs ${team2 || 'Team 2'}`;
  }

  const totalBalls = overs * 6 + ballsInOver;

  return {
    success: true,
    sport: 'cricket',
    team1: team1 || 'Team 1',
    team2: team2 || 'Team 2',
    battingTeam: battingTeam || team1 || 'Team 1',
    bowlingTeam: bowlingTeam || team2 || 'Team 2',
    score,
    wickets,
    overs,
    ballsInOver,
    totalBalls,
    target,
    firstInningsScore,
    statusText,
    recentBalls,
    batsmen,
    bowler: typeof bowler === 'string' ? bowler : (bowler?.name || undefined),
    liveBowlerStats: bowler && typeof bowler === 'object' ? bowler : (bowler ? { name: String(bowler) } : undefined),
    matchStartTime,
    matchStartTimeIso,
    isUpcoming: isUpcoming || /yet to begin|not started|scheduled/i.test(statusText),
    isFinished: isFinished || /won by|match ended|completed/i.test(statusText),
    lastUpdated: new Date().toLocaleTimeString()
  };
}
