/**
 * Client-Side Live Match Sync & Fallback
 * Designed for static hosting environments like Cloudflare Pages (md-akbor-hosen.pages.dev),
 * GitHub Pages, Netlify, and Vercel where the Express server.ts is not running.
 */

export interface ClientParsedLiveScore {
  success: boolean;
  sport: 'cricket' | 'football';
  team1: string;
  team2: string;
  battingTeam?: string;
  bowlingTeam?: string;
  score?: number;
  wickets?: number;
  overs?: number;
  ballsInOver?: number;
  totalBalls?: number;
  target?: number;
  firstInningsScore?: string;
  firstInningsTotalScore?: number;
  statusText?: string;
  recentBalls?: string[];
  isUpcoming?: boolean;
  isFinished?: boolean;
  matchStartTime?: string;
  matchStartTimeIso?: string;
  footballScore1?: number;
  footballScore2?: number;
  footballMinute?: string;
  footballPeriod?: string;
  lastUpdated: string;
  isClientFallback?: boolean;
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

async function fetchWithCorsProxy(url: string, timeoutMs = 6000): Promise<string | null> {
  for (const getProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = getProxyUrl(url);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { Accept: 'text/html,application/json,*/*' }
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) {
          return text;
        }
      }
    } catch {
      // Try next proxy
    }
  }
  return null;
}

/**
 * Client-side parser for Crex / Cricbuzz / Cricket HTML
 */
export function parseClientCricketHtml(
  html: string,
  targetUrl: string,
  hintTeam1?: string,
  hintTeam2?: string
): ClientParsedLiveScore | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Try __NEXT_DATA__ JSON (used by modern Crex and cricket web apps)
    const nextDataEl = doc.getElementById('__NEXT_DATA__');
    if (nextDataEl && nextDataEl.textContent) {
      try {
        const parsed = JSON.parse(nextDataEl.textContent);
        const pageProps = parsed?.props?.pageProps;
        const liveInfo = pageProps?.liveScoreData || pageProps?.matchData || pageProps?.initialData || pageProps?.matchInfo;

        if (liveInfo) {
          const t1 = liveInfo.team1?.name || liveInfo.team1Name || hintTeam1 || 'Team 1';
          const t2 = liveInfo.team2?.name || liveInfo.team2Name || hintTeam2 || 'Team 2';
          const battingTeam = liveInfo.currentBattingTeam || liveInfo.battingTeam || t1;
          const bowlingTeam = battingTeam === t1 ? t2 : t1;
          const score = Number(liveInfo.currentScore ?? liveInfo.score ?? 0);
          const wickets = Number(liveInfo.currentWickets ?? liveInfo.wickets ?? 0);
          const overs = Number(liveInfo.currentOvers ?? liveInfo.overs ?? 0);
          const ballsInOver = Number(liveInfo.ballsInOver ?? 0);
          const totalBalls = Math.round(overs * 6) + ballsInOver;

          return {
            success: true,
            sport: 'cricket',
            team1: t1,
            team2: t2,
            battingTeam,
            bowlingTeam,
            score,
            wickets,
            overs,
            ballsInOver,
            totalBalls,
            target: liveInfo.target,
            firstInningsScore: liveInfo.firstInningsScore,
            statusText: liveInfo.status || liveInfo.matchStatus || `${t1} vs ${t2}`,
            recentBalls: liveInfo.recentBalls || [],
            isUpcoming: Boolean(liveInfo.isUpcoming || liveInfo.status === 'upcoming'),
            isFinished: Boolean(liveInfo.isFinished || liveInfo.status === 'completed'),
            lastUpdated: new Date().toLocaleTimeString(),
            isClientFallback: true
          };
        }
      } catch {}
    }

    // 2. DOM text scraping for Crex scoreboard
    const textContent = doc.body.textContent || '';

    // Extract score pattern: e.g. 183/6 (20.0) or 17/2 (5.0 ov) or 1/0 (0.3)
    const scoreMatches = Array.from(textContent.matchAll(/([A-Z]{2,15}|\b[A-Z][a-zA-Z\s]{1,15})\s*[:\-]?\s*(\d{1,3})(?:\/(\d{1,2}))?\s*(?:\((\d{1,2}(?:\.\d)?)\s*(?:ov|overs)?\))?/gi));
    
    // Team extraction
    let team1 = hintTeam1 || '';
    let team2 = hintTeam2 || '';

    if (!team1 || !team2) {
      const title = doc.querySelector('title')?.textContent || '';
      const vsMatch = title.match(/([a-zA-Z\s]+)\s+vs\s+([a-zA-Z\s]+)/i);
      if (vsMatch) {
        if (!team1) team1 = vsMatch[1].trim();
        if (!team2) team2 = vsMatch[2].trim();
      }
    }

    if (scoreMatches.length > 0) {
      const primary = scoreMatches[scoreMatches.length - 1];
      const batTeam = primary[1]?.trim() || team1 || 'Team 1';
      const runs = parseInt(primary[2] || '0', 10);
      const wkts = primary[3] ? parseInt(primary[3], 10) : 0;
      const ovStr = primary[4] || '0.0';
      const [ovPart, ballPart] = ovStr.split('.').map(n => parseInt(n || '0', 10));
      const totalBalls = (ovPart * 6) + (ballPart || 0);

      let firstInningsScore: string | undefined;
      if (scoreMatches.length >= 2) {
        const first = scoreMatches[0];
        firstInningsScore = `${first[2]}${first[3] ? '/' + first[3] : ''}`;
      }

      // Check status text
      const statusMatch = textContent.match(/(?:need\s+\d+\s+runs\s+in\s+\d+\s+balls|opt\s+to\s+(?:bowl|bat)|won\s+by\s+\d+\s+(?:runs|wickets)|match\s+yet\s+to\s+begin|toss\s+delayed|innings\s+break)/i);
      const statusText = statusMatch ? statusMatch[0] : `${team1 || batTeam} vs ${team2 || 'Team 2'}`;

      return {
        success: true,
        sport: 'cricket',
        team1: team1 || batTeam,
        team2: team2 || (batTeam === team1 ? 'Team 2' : team1),
        battingTeam: batTeam,
        bowlingTeam: batTeam === team1 ? team2 : team1,
        score: runs,
        wickets: wkts,
        overs: ovPart,
        ballsInOver: ballPart || 0,
        totalBalls,
        firstInningsScore,
        statusText,
        recentBalls: [],
        isUpcoming: /yet to begin|not started|scheduled/i.test(statusText),
        isFinished: /won by|match ended|completed/i.test(statusText),
        lastUpdated: new Date().toLocaleTimeString(),
        isClientFallback: true
      };
    }
  } catch {}

  return null;
}

/**
 * Direct SofaScore fetcher from browser client
 */
export async function fetchClientSofaScoreEvent(
  targetUrl: string,
  hintTeam1?: string,
  hintTeam2?: string
): Promise<ClientParsedLiveScore | null> {
  try {
    const idMatch = targetUrl.match(/(?:#id:|\/event\/|[?&]id=|\/)(\d{7,10})\b/i);
    let sfEvent: any = null;

    if (idMatch && idMatch[1]) {
      const res = await fetch(`https://api.sofascore.com/api/v1/event/${idMatch[1]}`, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        sfEvent = json?.event;
      }
    }

    if (!sfEvent && hintTeam1 && hintTeam2) {
      const q = encodeURIComponent(`${hintTeam1} ${hintTeam2}`);
      const res = await fetch(`https://api.sofascore.com/api/v1/search/all?q=${q}`, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        const results = Array.isArray(json?.results) ? json.results : [];
        const evHit = results.find((item: any) => item?.type === 'event' && item?.entity);
        if (evHit?.entity) sfEvent = evHit.entity;
      }
    }

    if (sfEvent) {
      const fTeam1 = sfEvent.homeTeam?.name || sfEvent.homeTeam?.shortName || hintTeam1 || 'Team 1';
      const fTeam2 = sfEvent.awayTeam?.name || sfEvent.awayTeam?.shortName || hintTeam2 || 'Team 2';
      const fScore1 = sfEvent.homeScore?.current ?? sfEvent.homeScore?.display ?? 0;
      const fScore2 = sfEvent.awayScore?.current ?? sfEvent.awayScore?.display ?? 0;
      const statusType = String(sfEvent.status?.type || '').toLowerCase();
      const isUpcoming = statusType === 'notstarted';
      const isFinished = statusType === 'finished';

      let matchStartTime: string | undefined;
      let matchStartTimeIso: string | undefined;
      if (sfEvent.startTimestamp) {
        const d = new Date(sfEvent.startTimestamp * 1000);
        if (!isNaN(d.getTime())) {
          matchStartTimeIso = d.toISOString();
          matchStartTime =
            d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' +
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }

      return {
        success: true,
        sport: 'football',
        team1: fTeam1,
        team2: fTeam2,
        footballScore1: fScore1,
        footballScore2: fScore2,
        footballMinute: isUpcoming ? 'Upcoming' : isFinished ? 'FT' : (sfEvent.status?.description || 'Live'),
        footballPeriod: isUpcoming ? 'Not started' : isFinished ? 'FT' : '2H',
        isUpcoming,
        isFinished,
        matchStartTime,
        matchStartTimeIso,
        statusText: isUpcoming
          ? `Match yet to begin${matchStartTime ? ` • Starts at ${matchStartTime}` : ''}`
          : isFinished
          ? `Finished • Full Time (${fTeam1} ${fScore1} - ${fScore2} ${fTeam2})`
          : `${fTeam1} ${fScore1} - ${fScore2} ${fTeam2} • ${sfEvent.status?.description || 'Live'}`,
        lastUpdated: new Date().toLocaleTimeString(),
        isClientFallback: true
      };
    }
  } catch {}

  return null;
}

/**
 * Universal client fallback resolver for live matches when Express server is unreachable
 */
export async function fetchLiveMatchDirectClient(
  targetUrl: string,
  hintTeam1?: string,
  hintTeam2?: string,
  sport: 'cricket' | 'football' = 'cricket'
): Promise<ClientParsedLiveScore | null> {
  const isFb = sport === 'football' || targetUrl.toLowerCase().includes('sofascore') || targetUrl.toLowerCase().includes('football');

  if (isFb) {
    const fbRes = await fetchClientSofaScoreEvent(targetUrl, hintTeam1, hintTeam2);
    if (fbRes) return fbRes;
  }

  // Fetch via CORS proxy
  const html = await fetchWithCorsProxy(targetUrl, 7000);
  if (html) {
    if (isFb) {
      // Parse basic football HTML
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '';
      const scoreMatch = title.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (scoreMatch) {
        return {
          success: true,
          sport: 'football',
          team1: hintTeam1 || 'Team 1',
          team2: hintTeam2 || 'Team 2',
          footballScore1: parseInt(scoreMatch[1], 10),
          footballScore2: parseInt(scoreMatch[2], 10),
          footballMinute: 'Live',
          footballPeriod: 'Live',
          statusText: `${hintTeam1 || 'Team 1'} ${scoreMatch[1]} - ${scoreMatch[2]} ${hintTeam2 || 'Team 2'}`,
          lastUpdated: new Date().toLocaleTimeString(),
          isClientFallback: true
        };
      }
    } else {
      const crkRes = parseClientCricketHtml(html, targetUrl, hintTeam1, hintTeam2);
      if (crkRes) return crkRes;
    }
  }

  return null;
}
