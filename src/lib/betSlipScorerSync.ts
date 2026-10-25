import { MatchState, getShortTeamName, getKnownCanonicalTeamCode } from '../types';
import { BetEvent, BetSlipData, EventStatus, SavedSlipCard } from '../types/betslip';

export function formatSlipDateTimeOffset(offsetMinutes: number): string {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm} ${hh}:${min}`;
}

export const DEFAULT_SLIP_1: BetSlipData = {
  id: 'slip-80709130005',
  slipNumber: '80709130005',
  dateTime: formatSlipDateTimeOffset(-300),
  betType: 'Accumulator',
  status: 'Pending',
  stake: '3316920.53',
  overallOdds: '5.82',
  wonOdds: '5.82',
  potentialWinnings: '19304477.48',
  wonPayout: '0.00',
  account: 'User #807091',
  events: [
    {
      id: 'ev-1',
      eventNumber: '1',
      dateTime: formatSlipDateTimeOffset(120),
      sport: 'Football',
      league: 'Premier League',
      match: 'Arsenal - Chelsea',
      team1: 'Arsenal',
      team2: 'Chelsea',
      selection: 'W1',
      odds: '1.75',
      status: 'Pending',
      score1: '',
      score2: '',
      matchPeriodType: 'FT'
    },
    {
      id: 'ev-2',
      eventNumber: '2',
      dateTime: formatSlipDateTimeOffset(-35),
      sport: 'Football',
      league: 'La Liga',
      match: 'Real Madrid - Barcelona',
      team1: 'Real Madrid',
      team2: 'Barcelona',
      selection: 'Total Over 2.5',
      odds: '1.82',
      status: 'Pending',
      score1: '',
      score2: '',
      matchPeriodType: 'FT'
    },
    {
      id: 'ev-3',
      eventNumber: '3',
      dateTime: formatSlipDateTimeOffset(-240),
      sport: 'Football',
      league: 'Serie A',
      match: 'Inter - Juventus',
      team1: 'Inter',
      team2: 'Juventus',
      selection: 'BTTS - Yes',
      odds: '1.83',
      status: 'Win',
      score1: '2',
      score2: '1',
      matchPeriodType: 'FT',
      currentPeriodLabel: 'FT'
    }
  ]
};

export const DEFAULT_SLIP_2: BetSlipData = {
  id: 'slip-000bdt',
  slipNumber: '91823719284',
  dateTime: formatSlipDateTimeOffset(-60),
  betType: 'Accumulator',
  status: 'Pending',
  stake: '0.00',
  overallOdds: '3.98',
  wonOdds: '3.98',
  potentialWinnings: '0.00',
  wonPayout: '0.00',
  account: 'User #000',
  events: [
    {
      id: 'ev-sub-0',
      eventNumber: '1',
      dateTime: formatSlipDateTimeOffset(120),
      sport: 'Football',
      league: 'Premier League',
      match: 'Arsenal - Chelsea',
      team1: 'Arsenal',
      team2: 'Chelsea',
      selection: 'W2',
      odds: '2.15',
      status: 'Pending',
      score1: '',
      score2: '',
      matchPeriodType: 'FT'
    },
    {
      id: 'ev-sub-1',
      eventNumber: '2',
      dateTime: formatSlipDateTimeOffset(180),
      sport: 'Football',
      league: 'Champions League',
      match: 'Bayern Munich - PSG',
      team1: 'Bayern Munich',
      team2: 'PSG',
      selection: 'W1',
      odds: '1.85',
      status: 'Pending',
      score1: '',
      score2: '',
      matchPeriodType: 'FT'
    }
  ]
};

export const INITIAL_SLIP_CARDS: SavedSlipCard[] = [
  {
    id: 'card-1',
    amount: '3316920.53',
    currency: 'BDT',
    countBadge: 29,
    colorScheme: 'white',
    slipData: DEFAULT_SLIP_1
  },
  {
    id: 'card-2',
    amount: '0.00',
    currency: 'BDT',
    colorScheme: 'blue',
    slipData: DEFAULT_SLIP_2
  }
];

function cleanTeamStr(raw?: string, fallback = 'Team'): string {
  if (!raw) return fallback;
  return raw.replace(/^(?:track|watch|live|stream|summary)\s+/i, '').trim() || fallback;
}

export function isGenericTeamPlaceholder(raw?: string): boolean {
  if (!raw) return true;
  return /^(?:team\s*[12ab]|টিম\s*[এবি১২12]|t[12]|match\s*\d*)$/i.test(raw.trim());
}

/**
 * Parses date & time string e.g. "07.10 05:00 PM", "21.04 15:30", "21.04.2026 15:30", "2026-09-18 20:30"
 * Returns millisecond timestamp for chronological sorting
 */
export function parseEventDateTime(dtStr?: string): number {
  if (!dtStr) return 0;
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const str = dtStr
    .replace(/[০-৯]/g, d => bnToEnMap[d] || d)
    .replace(/^[^\dA-Za-z]+/, '')
    .trim();

  const m = str.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\s*(?:[,•|-]\s*)?(\d{1,2})[:.](\d{2})(?:\s*(AM|PM))?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    let hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);
    const ampm = m[6]?.toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(year, month, day, hour, minute).getTime();
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return parsed;

  return 0;
}

/**
 * Sorts Bet Slip events chronologically by Date and Time.
 */
export function sortEventsChronologically(events: BetEvent[]): BetEvent[] {
  return [...events].sort((a, b) => {
    const timeA = parseEventDateTime(a.dateTime);
    const timeB = parseEventDateTime(b.dateTime);

    if (timeA && timeB && timeA !== timeB) {
      return timeA - timeB;
    }
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;

    return (a.dateTime || '').localeCompare(b.dateTime || '');
  });
}

function normalizeTeamForMatch(raw?: string): string {
  if (!raw) return '';
  const base = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(?:track|watch|live|stream|summary)\s+/i, '');
  const stripped = base
    .replace(/\b(?:fc|sc|cf|ac|afc|club|women|woman|men|man|female|male|ladies|girls|boys|u\d{2}|under-?\d{2}|xi)\b/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped) return stripped;
  return base.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() || base.trim();
}

export function extractBetEventTeams(ev: Pick<BetEvent, 'match' | 'team1' | 'team2'>): [string, string] {
  const rawMatch = String(ev.match || '').trim();
  const spacedParts = rawMatch.split(/\s+(?:vs\.?|v\.?|বনাম|[-–—−‐‑‒―/|])\s+/i).filter(Boolean);
  if (spacedParts.length >= 2) {
    return [spacedParts[0].trim(), spacedParts.slice(1).join(' - ').trim()];
  }
  const t1Clean = cleanTeamStr(ev.team1, '');
  const t2Clean = cleanTeamStr(ev.team2, '');
  if (t1Clean && t2Clean && !isGenericTeamPlaceholder(t1Clean) && !isGenericTeamPlaceholder(t2Clean)) {
    return [t1Clean, t2Clean];
  }
  const parts = rawMatch.split(/\s*(?:\bvs\.?\b|\bv\.?\b|\bবনাম\b|[-–—−‐‑‒―/|])\s*/i).filter(Boolean);
  if (parts.length >= 2) {
    const p1 = parts[0].trim();
    const p2 = parts.slice(1).join(' - ').trim();
    if (!isGenericTeamPlaceholder(p1) || !isGenericTeamPlaceholder(p2)) {
      return [p1, p2];
    }
  }
  if (parts.length >= 2) {
    return [parts[0].trim(), parts.slice(1).join(' - ').trim()];
  }
  if (rawMatch && !isGenericTeamPlaceholder(rawMatch)) {
    return [rawMatch, t2Clean && !isGenericTeamPlaceholder(t2Clean) ? t2Clean : rawMatch];
  }
  return [t1Clean || 'Team 1', t2Clean || 'Team 2'];
}

function getTeamAcronyms(raw?: string): string[] {
  if (!raw) return [];
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(?:track|watch|live|stream|summary)\s+/i, '')
    .replace(/\b(?:fc|sc|cf|ac|afc|club|women|men|u19|u20|u21|u23|xi)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) return [];
  const words = cleaned.split(/\s+/).filter(Boolean);
  const codes = new Set<string>();
  const shortDefault = getShortTeamName(raw, '').toLowerCase();
  if (shortDefault && shortDefault !== 'tm') codes.add(shortDefault);
  if (words.length === 1) {
    const w = words[0].toLowerCase();
    codes.add(w.slice(0, 3));
    if (w.length <= 4) codes.add(w);
  } else {
    // 2-word and all-word initials (e.g. CSK for Chennai Super Kings, RCB for Royal Challengers Bengaluru, PSG for Paris Saint Germain)
    codes.add(words.slice(0, 2).map(w => w[0]).join('').toLowerCase());
    codes.add(words.map(w => w[0]).join('').toLowerCase());
    if (words.length >= 3) {
      codes.add(words.slice(0, 3).map(w => w[0]).join('').toLowerCase());
    }
    // First 2 letters of word 1 + first letter of word 2 (e.g. VAC for Vancouver Anchors, RMA for Real Madrid)
    if (words[0].length >= 2) {
      codes.add((words[0].slice(0, 2) + words[1][0]).toLowerCase());
    }
    // First letter of word 1 + first 2 letters of word 2
    if (words[1].length >= 2) {
      codes.add((words[0][0] + words[1].slice(0, 2)).toLowerCase());
    }
  }
  return Array.from(codes).filter(c => c.length >= 2);
}

const GENERIC_TEAM_MODIFIER_WORDS = new Set([
  'united', 'city', 'real', 'atletico', 'athletic', 'dynamo', 'dinamo', 'sporting',
  'south', 'north', 'east', 'west', 'central', 'new', 'union', 'nacional', 'national',
  'independiente', 'universidad', 'deportivo', 'inter', 'internacional', 'olympique',
  'stade', 'royal', 'standard', 'borussia', 'eintracht', 'lokomotiv', 'spartak', 'cska',
  'shakhtar', 'racing', 'alianza', 'defensor', 'san', 'santa', 'saint', 'st', 'al'
]);

export function computeTeamSimilarity(a?: string, b?: string): number {
  if (!a || !b) return 0;
  const na = normalizeTeamForMatch(a);
  const nb = normalizeTeamForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  // Check if both map to the same explicit known canonical code (e.g. "Man Utd" & "Manchester United" -> "MUN")
  const knownA = getKnownCanonicalTeamCode(a);
  const knownB = getKnownCanonicalTeamCode(b);
  if (knownA && knownB) {
    return knownA === knownB ? 96 : 0;
  }

  // Only allow short-code / acronym matching when at least one side is actually a short code (<= 4 chars, single token)
  const isAShortCode = na.length <= 4 && !na.includes(' ');
  const isBShortCode = nb.length <= 4 && !nb.includes(' ');
  if (isAShortCode || isBShortCode) {
    const codesA = getTeamAcronyms(a);
    const codesB = getTeamAcronyms(b);
    if ((isBShortCode && codesA.includes(nb)) || (isAShortCode && codesB.includes(na))) {
      return 95;
    }
    const sa = getShortTeamName(a, '').toLowerCase();
    const sb = getShortTeamName(b, '').toLowerCase();
    if (sa && sb && sa !== 'tm' && sa === sb && (isAShortCode || isBShortCode)) {
      return 94;
    }
  }

  // Whole-word containment when one name is a longer form of the other (e.g. "Al Nassr" vs "Al Nassr Riyadh")
  // Never match if the shorter string is just a generic modifier word like "United", "City", "Real", "South"
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length >= 4 && !GENERIC_TEAM_MODIFIER_WORDS.has(shorter)) {
    const escaped = shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(longer)) {
      // Ensure we don't match "Manchester" in "Manchester United" vs "Manchester City" if both had a second word
      const shortWords = shorter.split(' ').filter(Boolean);
      const longWords = longer.split(' ').filter(Boolean);
      const extraWords = longWords.filter(w => !shortWords.includes(w));
      // If shorter is 1 word and extraWords is ONLY "united" or "city", allow "Manchester" -> "Manchester United" only when one side is just "Manchester"
      if (shortWords.length >= 1 && extraWords.length >= 1) {
        return 88;
      }
    }
  }

  // Multi-word comparison: only match if all non-generic words match
  const wordsA = na.split(' ').filter(w => w.length >= 3 && !GENERIC_TEAM_MODIFIER_WORDS.has(w));
  const wordsB = nb.split(' ').filter(w => w.length >= 3 && !GENERIC_TEAM_MODIFIER_WORDS.has(w));
  if (wordsA.length > 0 && wordsB.length > 0 && wordsA.length === wordsB.length) {
    const allMatch = wordsA.every((wa, idx) => {
      const wb = wordsB[idx];
      return wa === wb || (wa.length >= 5 && wb.length >= 5 && wa.slice(0, 5) === wb.slice(0, 5) && Math.abs(wa.length - wb.length) <= 2);
    });
    if (allMatch) return 84;
  }

  return 0;
}

/**
 * Returns true if the teams in the Link/Scorer match (linkT1, linkT2) are in reverse order
 * compared to the Bet Slip event's teams (betT1, betT2).
 */
export function areLinkTeamsSwapped(
  betT1?: string,
  betT2?: string,
  linkT1?: string,
  linkT2?: string
): boolean {
  const directScore = computeTeamSimilarity(betT1, linkT1) + computeTeamSimilarity(betT2, linkT2);
  const swappedScore = computeTeamSimilarity(betT1, linkT2) + computeTeamSimilarity(betT2, linkT1);
  return swappedScore > directScore;
}

function areTeamsEquivalent(a?: string, b?: string): boolean {
  return computeTeamSimilarity(a, b) >= 70;
}

function parseLeadingRuns(val?: string | number): number | null {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (!val) return null;
  const m = String(val).trim().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function resolveEventPeriodType(ev: BetEvent): 'HT' | 'FT' {
  if (ev.matchPeriodType === 'HT' || ev.matchPeriodType === 'FT') {
    return ev.matchPeriodType;
  }
  if (ev.betTargetOver === 45) return 'HT';
  const combined = `${ev.league || ''} ${ev.selection || ''} ${ev.match || ''}`;
  if (/\b(?:1st\s*half|half\s*time|half-time|1h|ht)\b|১ম\s*অর্ধ|হাফ\s*টাইম/i.test(combined)) {
    return 'HT';
  }
  return 'FT';
}

export function isLiveMatchBreakStatus(
  statusText?: string,
  footballPeriod?: string,
  footballMinute?: string | number
): boolean {
  const st = String(statusText || '').toLowerCase();
  const fbPer = String(footballPeriod || '').toUpperCase().trim();
  const fbMin = String(footballMinute || '').toUpperCase().trim();
  if (fbPer === 'HT' || fbMin === 'HT') return true;
  if (/\b(?:won\s+by|match\s+tied|match\s+drawn|no\s+result|abandoned|match\s+ended)\b/i.test(st) || st.includes('🏆')) {
    return false;
  }
  return (
    /\b(?:innings?\s*break|drinks?\s*break|drinks?\b|strategic\s*time\s*out|time\s*out|lunch\s*break|lunch\b|tea\s*break|tea\b|dinner\s*break|stumps\b|rain\s*delay|rain\s*break|rain\s*stopped|bad\s*light|wet\s*outfield|cooling\s*break|water\s*break|half\s*time|half-time|halftime|interrupted|end\s+of\s+(?:1st|first)\s+innings)\b/i.test(st) ||
    st.includes('ইনিংস ব্রেক') ||
    st.includes('ইনিংস বিরতি') ||
    st.includes('ড্রিংকস ব্রেক') ||
    st.includes('ড্রিংকস') ||
    st.includes('বিরতি') ||
    st.includes('ব্রেক') ||
    st.includes('হাফ টাইম') ||
    st.includes('লাঞ্চ') ||
    st.includes('টি ব্রেক')
  );
}

export function isScorerMatchFinished(m: MatchState): boolean {
  if (m.sectionOverride === 'finished') return true;
  if (m.sectionOverride === 'live' || m.sectionOverride === 'upcoming') return false;

  const onBreak = isLiveMatchBreakStatus(m.liveStatusText, m.footballPeriod, m.footballMinute);

  if (m.sport === 'football') {
    const fbPer = String(m.footballPeriod || '').toUpperCase().trim();
    const fbMin = String(m.footballMinute || '').toUpperCase().trim();
    const fbSt = String(m.liveStatusText || '').toLowerCase();
    if (onBreak || ['1H', 'HT', '2H', 'ET', 'P'].includes(fbPer) || /^\d{1,3}(?:\+\d{1,2})?'?$/.test(fbMin)) {
      return false;
    }
    return (
      m.isFinished === true ||
      fbPer === 'FT' ||
      fbMin === 'FT' ||
      fbSt.includes('finished') ||
      fbSt.includes('full time') ||
      fbSt.includes('সমাপ্ত')
    );
  }

  const st = String(m.liveStatusText || '');
  const hasExplicitResultText =
    /\b(?:won\s+by|match\s+tied|match\s+drawn|no\s+result|abandoned|match\s+ended)\b/i.test(st) ||
    st.includes('🏆') ||
    st.includes('বিজয়ী') ||
    st.includes('জয়ী') ||
    st.includes('সমাপ্ত');

  if (hasExplicitResultText) {
    return true;
  }

  if (onBreak) {
    return false;
  }

  if (m.isFinished === true) return true;

  const hasSecondInningsTarget = Boolean((m.target && m.target > 0) || m.firstInningsScore || m.firstInningsTotalScore);
  if (hasSecondInningsTarget && (m.balls > 0 || m.score > 0)) {
    const bpo = m.format === '100' ? 5 : 6;
    const maxBalls = (m.maxOvers || 20) * bpo;
    const maxWkts = m.maxWickets || 10;
    const firstInnRuns = parseLeadingRuns(m.firstInningsScore ?? m.firstInningsTotalScore);
    const isStillShowingFirstInnings =
      (m.target && m.target === m.score + 1 && (!m.team1Score || !m.team2Score || String(m.team1Score) === String(m.team2Score))) ||
      (firstInnRuns !== null && firstInnRuns === m.score && (!m.team1Score || !m.team2Score));

    if (!isStillShowingFirstInnings) {
      if ((m.target && m.target > 0 && m.score >= m.target) || m.wickets >= maxWkts || (maxBalls > 0 && m.balls >= maxBalls)) {
        return true;
      }
    }
  }

  return false;
}

export function isScorerMatchUpcoming(m: MatchState): boolean {
  if (isScorerMatchFinished(m)) return false;
  if (m.sectionOverride === 'upcoming') return true;
  if (m.sectionOverride === 'live') return false;
  if (isLiveMatchBreakStatus(m.liveStatusText, m.footballPeriod, m.footballMinute)) return false;

  if (m.sport === 'football') {
    if ((m.footballScore1 ?? 0) > 0 || (m.footballScore2 ?? 0) > 0) return false;
    const fbMin = String(m.footballMinute || '').toLowerCase().trim();
    if (fbMin && fbMin !== 'upcoming' && fbMin !== 'not started' && fbMin !== 'pre' && fbMin !== 'scheduled') {
      if (!m.isUpcoming) return false;
    }
    return Boolean(m.isUpcoming);
  }

  if ((m.balls || 0) > 0 || (m.score || 0) > 0 || (m.wickets || 0) > 0) return false;
  if (m.firstInningsScore || m.firstInningsTotalScore || (m.target && m.target > 0)) return false;
  return Boolean(m.isUpcoming);
}

export interface ExtractedMatchScoreState {
  team1Name: string;
  team2Name: string;
  score1Num: number;
  score2Num: number;
  score1Display: string;
  score2Display: string;
  isUpcoming: boolean;
  isLive: boolean;
  isFinished: boolean;
  liveProgressText: string;
  currentInnings: 1 | 2;
  currentOverFloat: number;
  currentBalls: number;
  ballsPerOver: number;
  footballMinuteNum: number;
  footballPeriodCode: '1H' | 'HT' | '2H' | 'FT' | 'PRE';
}

export function extractScorerMatchScoreState(m: MatchState): ExtractedMatchScoreState {
  const team1Name = cleanTeamStr(m.team1, 'Team 1');
  const team2Name = cleanTeamStr(m.team2, 'Team 2');
  const isFinished = isScorerMatchFinished(m);
  const isUpcoming = isScorerMatchUpcoming(m);
  const isLive = !isFinished && !isUpcoming;

  if (m.sport === 'football') {
    const s1 = isUpcoming ? 0 : (m.footballScore1 ?? 0);
    const s2 = isUpcoming ? 0 : (m.footballScore2 ?? 0);
    const rawMin = String(m.footballMinute || '').trim();
    const minMatch = rawMin.match(/^(\d+)/);
    let fbMinNum = minMatch ? parseInt(minMatch[1], 10) : 0;
    const fbPer = String(m.footballPeriod || '').toUpperCase().trim();
    if (fbPer === 'HT' && fbMinNum < 45) fbMinNum = 45;
    if ((fbPer === 'FT' || isFinished) && fbMinNum < 90) fbMinNum = 90;

    let periodCode: '1H' | 'HT' | '2H' | 'FT' | 'PRE' = 'PRE';
    if (isFinished || fbPer === 'FT' || rawMin.toUpperCase() === 'FT') {
      periodCode = 'FT';
    } else if (!isUpcoming) {
      if (fbPer === 'HT' || rawMin.toUpperCase() === 'HT') periodCode = 'HT';
      else if (fbPer === '1H' || (fbMinNum > 0 && fbMinNum <= 45 && fbPer !== '2H')) periodCode = '1H';
      else periodCode = '2H';
    }

    const progress = isUpcoming
      ? `⏳ ${m.matchStartTime || 'Upcoming'}`
      : isFinished
      ? `🏁 FT (${s1} - ${s2})`
      : periodCode === 'HT'
      ? `🔴 HT (${s1} - ${s2})`
      : `🔴 ${periodCode} • ${rawMin || 'Live'} (${s1} - ${s2})`;

    return {
      team1Name,
      team2Name,
      score1Num: s1,
      score2Num: s2,
      score1Display: isUpcoming ? '' : String(s1),
      score2Display: isUpcoming ? '' : String(s2),
      isUpcoming,
      isLive,
      isFinished,
      liveProgressText: progress,
      currentInnings: periodCode === '2H' || periodCode === 'FT' ? 2 : 1,
      currentOverFloat: fbMinNum,
      currentBalls: fbMinNum,
      ballsPerOver: 1,
      footballMinuteNum: fbMinNum,
      footballPeriodCode: periodCode
    };
  }

  // Cricket Match State Extraction
  const bpo = m.format === '100' ? 5 : 6;
  const balls = isUpcoming ? 0 : (m.balls || 0);
  const overs = Math.floor(balls / bpo);
  const remBalls = balls % bpo;
  const oversStr = `${overs}.${remBalls}`;
  const currentOverFloat = overs + remBalls / bpo;

  const t1DirectRuns = parseLeadingRuns(m.team1Score);
  const t2DirectRuns = parseLeadingRuns(m.team2Score);

  const firstInningsRaw =
    m.firstInningsScore !== undefined && String(m.firstInningsScore).trim() !== ''
      ? String(m.firstInningsScore).trim()
      : m.firstInningsTotalScore !== undefined && String(m.firstInningsTotalScore).trim() !== ''
      ? String(m.firstInningsTotalScore).trim()
      : m.target && m.target > 0
      ? String(Math.max(0, m.target - 1))
      : '';

  const has1stInnings =
    !isUpcoming &&
    Boolean(
      (m.target && m.target > 0) ||
      firstInningsRaw ||
      (t1DirectRuns !== null && t2DirectRuns !== null && String(m.team1Score).trim() !== String(m.team2Score).trim())
    );
  const firstInnRuns = parseLeadingRuns(firstInningsRaw) ?? (m.target && m.target > 0 ? Math.max(0, m.target - 1) : 0);
  const activeRuns = isUpcoming ? 0 : (m.score || 0);
  const activeWkts = isUpcoming ? 0 : (m.wickets || 0);
  const activeFormatted = isUpcoming ? '' : `${activeRuns}/${activeWkts} (${oversStr})`;

  const batSim1 = computeTeamSimilarity(m.battingTeam, team1Name);
  const batSim2 = computeTeamSimilarity(m.battingTeam, team2Name);
  let isT2Batting = batSim2 > batSim1 && batSim2 >= 70;
  if (has1stInnings && batSim1 < 70 && batSim2 < 70 && t1DirectRuns !== null && t2DirectRuns !== null && t1DirectRuns !== t2DirectRuns) {
    if (t1DirectRuns === firstInnRuns && t2DirectRuns === activeRuns) {
      isT2Batting = true;
    } else if (t2DirectRuns === firstInnRuns && t1DirectRuns === activeRuns) {
      isT2Batting = false;
    }
  }

  let s1Num = 0;
  let s2Num = 0;
  let s1Disp = '';
  let s2Disp = '';

  if (!isUpcoming) {
    if (!has1stInnings) {
      if (!isT2Batting) {
        s1Num = activeRuns;
        s2Num = 0;
        s1Disp = activeFormatted;
        s2Disp = 'Yet to bat';
      } else {
        s1Num = 0;
        s2Num = activeRuns;
        s1Disp = 'Yet to bat';
        s2Disp = activeFormatted;
      }
    } else if (
      isFinished &&
      t1DirectRuns !== null &&
      t2DirectRuns !== null &&
      String(m.team1Score).trim() !== String(m.team2Score).trim()
    ) {
      s1Num = t1DirectRuns;
      s2Num = t2DirectRuns;
      s1Disp = String(m.team1Score).trim();
      s2Disp = String(m.team2Score).trim();
    } else {
      if (isT2Batting) {
        s1Num = firstInnRuns;
        s2Num = activeRuns;
        s1Disp = (m.team1Score && String(m.team1Score).trim()) || firstInningsRaw || String(firstInnRuns);
        s2Disp = activeFormatted;
      } else {
        s1Num = activeRuns;
        s2Num = firstInnRuns;
        s1Disp = activeFormatted;
        s2Disp = (m.team2Score && String(m.team2Score).trim()) || firstInningsRaw || String(firstInnRuns);
      }
    }

    // Verify winner alignment from liveStatusText ("<Team> won by ...") when match is finished
    if (isFinished && s1Num !== s2Num && /\bwon\s+by\b/i.test(String(m.liveStatusText || ''))) {
      const beforeWon = String(m.liveStatusText || '').split(/won\s+by/i)[0].trim();
      const winSim1 = computeTeamSimilarity(beforeWon, team1Name);
      const winSim2 = computeTeamSimilarity(beforeWon, team2Name);
      if (Math.max(winSim1, winSim2) >= 70 && winSim1 !== winSim2) {
        const winnerIsT2 = winSim2 > winSim1;
        if ((winnerIsT2 && s1Num > s2Num) || (!winnerIsT2 && s2Num > s1Num)) {
          const tmpNum = s1Num;
          s1Num = s2Num;
          s2Num = tmpNum;
          const tmpDisp = s1Disp;
          s1Disp = s2Disp;
          s2Disp = tmpDisp;
        }
      }
    }
  }

  const battingShort = getShortTeamName(isT2Batting ? team2Name : team1Name, 'BAT');
  const progress = isUpcoming
    ? `⏳ ${m.matchStartTime || 'Upcoming'}`
    : isFinished
    ? `🏁 FT • ${m.liveStatusText || 'Match Finished'}`
    : `🔴 ${battingShort} ${activeRuns}/${activeWkts} (${oversStr} Ov)${has1stInnings && m.target ? ` • Target ${m.target}` : ''}`;

  return {
    team1Name,
    team2Name,
    score1Num: s1Num,
    score2Num: s2Num,
    score1Display: s1Disp,
    score2Display: s2Disp,
    isUpcoming,
    isLive,
    isFinished,
    liveProgressText: progress,
    currentInnings: has1stInnings ? 2 : 1,
    currentOverFloat,
    currentBalls: balls,
    ballsPerOver: bpo,
    footballMinuteNum: 0,
    footballPeriodCode: isFinished ? 'FT' : isUpcoming ? 'PRE' : has1stInnings ? '2H' : '1H'
  };
}

function resolveStatusTextWinner(
  statusText: string | undefined,
  betT1: string,
  betT2: string
): 1 | 2 | null {
  if (!statusText || !/\bwon\s+by\b/i.test(statusText)) return null;
  const beforeWon = statusText.split(/won\s+by/i)[0].trim();
  if (!beforeWon) return null;
  const sim1 = computeTeamSimilarity(beforeWon, betT1);
  const sim2 = computeTeamSimilarity(beforeWon, betT2);
  if (Math.max(sim1, sim2) >= 70 && sim1 !== sim2) {
    return sim1 > sim2 ? 1 : 2;
  }
  return null;
}

function evaluateSelectionAndRule(
  ev: BetEvent,
  betT1: string,
  betT2: string,
  s1: number,
  s2: number,
  statusTextWinner: 1 | 2 | null,
  overrideRunsForOverBet?: number | null,
  isCricketSport = false,
  activeCricketScore?: number
): 'Win' | 'Lost' {
  const totalScore = s1 + s2;
  const evT1Lower = cleanTeamStr(betT1, '').toLowerCase();
  const evT2Lower = cleanTeamStr(betT2, '').toLowerCase();
  const t1Short = getShortTeamName(betT1, '').toLowerCase();
  const t2Short = getShortTeamName(betT2, '').toLowerCase();

  const sel = String(ev.selection || '').trim();
  const selLower = sel.toLowerCase();

  // 1. Check explicit selection string first so user's visible choice (e.g. W2, W1, 1X, 2X, Over/Under) is ALWAYS respected!
  if (/\bbtts\b|both\s+teams\s+to\s+score/i.test(selLower)) {
    if (/\bno\b|না/i.test(selLower)) {
      return s1 === 0 || s2 === 0 ? 'Win' : 'Lost';
    }
    return s1 > 0 && s2 > 0 ? 'Win' : 'Lost';
  }

  // Check Over / Under / Milestone patterns in selection
  const overUnderMatch = selLower.match(/(?:total\s*)?(over|under|বেশি|কম|>|>=|<|<=)\s*(\d+(?:\.\d+)?)/i);
  if (overUnderMatch) {
    const dir = overUnderMatch[1].toLowerCase();
    const num = parseFloat(overUnderMatch[2]);
    if (!isNaN(num)) {
      const isOverDir = dir === 'over' || dir === 'বেশি' || dir === '>' || dir === '>=';
      let compareScore = totalScore;
      if (overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null) {
        compareScore = overrideRunsForOverBet;
      } else if (isCricketSport && (ev.betTargetOver || /ov|ওভার|inn|ইনিংস/i.test(selLower)) && activeCricketScore !== undefined) {
        compareScore = activeCricketScore;
      } else if (/team\s*1|\bt1\b|\bw1\b/i.test(selLower) || (evT1Lower && selLower.includes(evT1Lower))) {
        compareScore = s1;
      } else if (/team\s*2|\bt2\b|\bw2\b/i.test(selLower) || (evT2Lower && selLower.includes(evT2Lower))) {
        compareScore = s2;
      }
      if (dir === '>=') return compareScore >= num ? 'Win' : 'Lost';
      if (dir === '<') return compareScore < num ? 'Win' : 'Lost';
      return (isOverDir ? compareScore > num : compareScore <= num) ? 'Win' : 'Lost';
    }
  }

  // Check Double Chance: 1X, 2X, X2, 12
  if (/^1x$/i.test(selLower) || /\b1x\b/i.test(selLower)) {
    if (s1 === s2 && statusTextWinner) return statusTextWinner === 1 ? 'Win' : 'Lost';
    return s1 >= s2 ? 'Win' : 'Lost';
  }
  if (/^(?:2x|x2)$/i.test(selLower) || /\b(?:2x|x2)\b/i.test(selLower)) {
    if (s1 === s2 && statusTextWinner) return statusTextWinner === 2 ? 'Win' : 'Lost';
    return s2 >= s1 ? 'Win' : 'Lost';
  }
  if (/^12$/i.test(selLower) || /\bdouble\s*chance\s*[-:]?\s*12\b/i.test(selLower)) {
    if (s1 === s2 && statusTextWinner) return 'Win';
    return s1 !== s2 ? 'Win' : 'Lost';
  }

  // Check Draw / Tie / X
  if (/^(?:x|draw|tie|ড্র|টাই|1x2\s*[-:]?\s*x)$/i.test(selLower)) {
    if (statusTextWinner) return 'Lost';
    return s1 === s2 ? 'Win' : 'Lost';
  }

  // Check W2 / Team 2 / Away
  const selSimT1 = computeTeamSimilarity(sel, betT1);
  const selSimT2 = computeTeamSimilarity(sel, betT2);
  const isExplicitW2 =
    /^(?:w2|2|team\s*2|away|টিম\s*২|অ্যাওয়ে|p2|player\s*2|২)$/i.test(selLower) ||
    /\b(?:w2|team\s*2|টিম\s*২)\b/i.test(selLower) ||
    /(?:1x2|winner|জয়ী|win|to\s*win)\s*[-:]?\s*(?:w2|2|team\s*2)\b/i.test(selLower) ||
    (!/\bw1\b/i.test(selLower) && (
      (selSimT2 > selSimT1 && selSimT2 >= 70) ||
      (evT2Lower && evT2Lower.length >= 3 && selLower.includes(evT2Lower) && (!evT1Lower || !selLower.includes(evT1Lower))) ||
      (t2Short && selLower === t2Short && t2Short !== t1Short)
    ));

  if (isExplicitW2) {
    if (s1 !== s2) return s2 > s1 ? 'Win' : 'Lost';
    if (statusTextWinner) return statusTextWinner === 2 ? 'Win' : 'Lost';
    return s2 > s1 ? 'Win' : 'Lost';
  }

  // Check W1 / Team 1 / Home
  const isExplicitW1 =
    /^(?:w1|1|team\s*1|home|টিম\s*১|হোম|p1|player\s*1|১)$/i.test(selLower) ||
    /\b(?:w1|team\s*1|টিম\s*১)\b/i.test(selLower) ||
    /(?:1x2|winner|জয়ী|win|to\s*win)\s*[-:]?\s*(?:w1|1|team\s*1)\b/i.test(selLower) ||
    (!/\bw2\b/i.test(selLower) && (
      (selSimT1 > selSimT2 && selSimT1 >= 70) ||
      (evT1Lower && evT1Lower.length >= 3 && selLower.includes(evT1Lower) && (!evT2Lower || !selLower.includes(evT2Lower))) ||
      (t1Short && selLower === t1Short && t1Short !== t2Short)
    ));

  if (isExplicitW1) {
    if (s1 !== s2) return s1 > s2 ? 'Win' : 'Lost';
    if (statusTextWinner) return statusTextWinner === 1 ? 'Win' : 'Lost';
    return s1 > s2 ? 'Win' : 'Lost';
  }

  // 2. Fallback to betRuleType if selection wasn't an explicit W1/W2/Over/Under token
  const rule = ev.betRuleType || 'auto';
  const targetVal = typeof ev.betTargetValue === 'number' && !isNaN(ev.betTargetValue) ? ev.betTargetValue : null;

  if (rule === 'cricket_milestone' && targetVal !== null) {
    const actualRuns = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null
      ? overrideRunsForOverBet
      : (activeCricketScore ?? totalScore);
    const isUnder = /under|কম|<|less/i.test(ev.selection || '');
    return (isUnder ? actualRuns <= targetVal : actualRuns > targetVal) ? 'Win' : 'Lost';
  }
  if (rule === 'w1') {
    if (s1 !== s2) return s1 > s2 ? 'Win' : 'Lost';
    if (statusTextWinner) return statusTextWinner === 1 ? 'Win' : 'Lost';
    return s1 > s2 ? 'Win' : 'Lost';
  }
  if (rule === 'w2') {
    if (s1 !== s2) return s2 > s1 ? 'Win' : 'Lost';
    if (statusTextWinner) return statusTextWinner === 2 ? 'Win' : 'Lost';
    return s2 > s1 ? 'Win' : 'Lost';
  }
  if (rule === 'draw') return s1 === s2 && !statusTextWinner ? 'Win' : 'Lost';
  if (rule === '1x') return s1 >= s2 ? 'Win' : 'Lost';
  if (rule === '2x') return s2 >= s1 ? 'Win' : 'Lost';
  if (rule === 'btts_yes') return s1 > 0 && s2 > 0 ? 'Win' : 'Lost';
  if (rule === 'btts_no') return s1 === 0 || s2 === 0 ? 'Win' : 'Lost';
  if (rule === 'total_over' && targetVal !== null) {
    const scoreToCompare = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : totalScore;
    return scoreToCompare > targetVal ? 'Win' : 'Lost';
  }
  if (rule === 'total_under' && targetVal !== null) {
    const scoreToCompare = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : totalScore;
    return scoreToCompare <= targetVal ? 'Win' : 'Lost';
  }
  if (rule === 'team1_over' && targetVal !== null) {
    const scoreToCompare = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : s1;
    return scoreToCompare > targetVal ? 'Win' : 'Lost';
  }
  if (rule === 'team1_under' && targetVal !== null) {
    const scoreToCompare = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : s1;
    return scoreToCompare <= targetVal ? 'Win' : 'Lost';
  }
  if (rule === 'team2_over' && targetVal !== null) {
    const scoreToCompare = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : s2;
    return scoreToCompare > targetVal ? 'Win' : 'Lost';
  }
  if (rule === 'team2_under' && targetVal !== null) {
    const scoreToCompare = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : s2;
    return scoreToCompare <= targetVal ? 'Win' : 'Lost';
  }

  if (targetVal !== null) {
    const compareScore = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null ? overrideRunsForOverBet : totalScore;
    return compareScore > targetVal ? 'Win' : 'Lost';
  }

  if (s1 !== s2) return s1 > s2 ? 'Win' : 'Lost';
  if (statusTextWinner) return statusTextWinner === 1 ? 'Win' : 'Lost';
  return s1 > s2 ? 'Win' : 'Lost';
}

/**
 * Evaluates a BetEvent's Win/Lost outcome directly from its own score1 and score2 fields
 * (when scores are already populated on the event). Returns null if score1 or score2 is not a valid number.
 */
export function evaluateStandaloneBetEventOutcome(ev: BetEvent): 'Win' | 'Lost' | null {
  const rawS1 = String(ev.score1 ?? '').trim();
  const rawS2 = String(ev.score2 ?? '').trim();
  if (!rawS1 || !rawS2 || /yet\s+to\s+bat/i.test(rawS1) || /yet\s+to\s+bat/i.test(rawS2)) {
    return null;
  }
  const s1 = parseLeadingRuns(rawS1);
  const s2 = parseLeadingRuns(rawS2);
  if (s1 === null || s2 === null) return null;

  const [betT1, betT2] = extractBetEventTeams(ev);
  const statusTextWinner = resolveStatusTextWinner(ev.liveProgressText, betT1, betT2);
  const isCricket = String(ev.sport || '').toLowerCase().includes('cricket');
  return evaluateSelectionAndRule(ev, betT1, betT2, s1, s2, statusTextWinner, null, isCricket);
}

/**
 * Evaluates a BetEvent's Win/Lost outcome once its target time/over/match has ended.
 * Uses the Bet Slip event's team order (automatically swapping scores if Link teams are reversed).
 */
export function evaluateBetEventOutcome(
  ev: BetEvent,
  m: MatchState,
  state: ExtractedMatchScoreState,
  overrideRunsForOverBet?: number | null,
  overridePairScores?: [number, number] | null
): 'Win' | 'Lost' {
  const [betT1, betT2] = extractBetEventTeams(ev);
  const isEventTeamsSwapped = areLinkTeamsSwapped(betT1, betT2, state.team1Name, state.team2Name);

  const s1 = overridePairScores
    ? overridePairScores[0]
    : (isEventTeamsSwapped ? state.score2Num : state.score1Num);
  const s2 = overridePairScores
    ? overridePairScores[1]
    : (isEventTeamsSwapped ? state.score1Num : state.score2Num);

  const statusTextWinner = overridePairScores
    ? null
    : resolveStatusTextWinner(m.liveStatusText, betT1, betT2);

  // 1. Linked Cricket Milestone evaluation
  if (ev.linkedMilestoneId && m.targetMilestones) {
    const ms = m.targetMilestones.find(x => x.id === ev.linkedMilestoneId);
    if (ms) {
      const actualRuns = overrideRunsForOverBet !== undefined && overrideRunsForOverBet !== null
        ? overrideRunsForOverBet
        : m.score;
      const won = ms.condition === 'more' ? actualRuns > ms.runs : actualRuns <= ms.runs;
      return won ? 'Win' : 'Lost';
    }
  }

  return evaluateSelectionAndRule(
    ev,
    betT1,
    betT2,
    s1,
    s2,
    statusTextWinner,
    overrideRunsForOverBet,
    m.sport !== 'football',
    m.score
  );
}

/**
 * Synchronizes a single BetEvent with its linked Scorer MatchState.
 * IMPORTANT: NEVER alters ev.dateTime, ev.match, ev.team1, ev.team2, ev.odds, or ev.selection.
 * Automatically swaps score1/score2 if the Link/Scorer match teams are in reverse order compared to the Bet Slip event.
 * Cleanly indicates HT / FT.
 */
export function syncBetEventWithScorerMatch(ev: BetEvent, m: MatchState): BetEvent {
  if (!ev.linkedMatchId || ev.linkedMatchId !== m.id || ev.autoSyncScore === false) {
    return ev;
  }

  const state = extractScorerMatchScoreState(m);
  const [betT1, betT2] = extractBetEventTeams(ev);
  const isEventTeamsSwapped = areLinkTeamsSwapped(betT1, betT2, state.team1Name, state.team2Name);

  const evS1Num = isEventTeamsSwapped ? state.score2Num : state.score1Num;
  const evS2Num = isEventTeamsSwapped ? state.score1Num : state.score2Num;
  let nextScore1 = isEventTeamsSwapped ? state.score2Display : state.score1Display;
  let nextScore2 = isEventTeamsSwapped ? state.score1Display : state.score2Display;

  const periodType = resolveEventPeriodType(ev);
  let nextPeriodLabel: string = periodType;
  let nextProgress = state.liveProgressText;
  let nextHtScore1 = ev.htScore1;
  let nextHtScore2 = ev.htScore2;

  let isTargetTimeEnded = state.isFinished;
  let overrideRunsForOverBet: number | null = null;
  let overridePairScores: [number, number] | null = null;

  if (m.sport === 'football') {
    const isHTBet = periodType === 'HT' || ev.betTargetOver === 45;
    const fbPer = state.footballPeriodCode;

    // Track 1st Half score while in 1H or HT, or compute from goal minutes if available
    if (fbPer === '1H' || fbPer === 'HT') {
      nextHtScore1 = String(evS1Num);
      nextHtScore2 = String(evS2Num);
    } else if ((fbPer === '2H' || fbPer === 'FT') && (!nextHtScore1 || !nextHtScore2) && Array.isArray(m.footballGoals) && m.footballGoals.length > 0) {
      let g1 = 0;
      let g2 = 0;
      for (const g of m.footballGoals) {
        const minNum = parseInt(String(g.minute || '0'), 10);
        if (!isNaN(minNum) && minNum <= 45) {
          if (g.team === 'team1') g1++;
          else if (g.team === 'team2') g2++;
        }
      }
      nextHtScore1 = String(isEventTeamsSwapped ? g2 : g1);
      nextHtScore2 = String(isEventTeamsSwapped ? g1 : g2);
    }

    if (state.isUpcoming) {
      nextPeriodLabel = isHTBet ? 'HT' : 'FT';
      nextProgress = `⏳ ${ev.dateTime || m.matchStartTime || 'Upcoming'} • ${nextPeriodLabel}`;
    } else if (isHTBet) {
      // HT (Half-Time) Match / Bet
      isTargetTimeEnded = state.isFinished || fbPer === 'HT' || fbPer === '2H' || fbPer === 'FT';
      const ht1 = nextHtScore1 !== undefined ? parseInt(nextHtScore1, 10) : evS1Num;
      const ht2 = nextHtScore2 !== undefined ? parseInt(nextHtScore2, 10) : evS2Num;
      if (!isNaN(ht1) && !isNaN(ht2)) {
        nextScore1 = String(ht1);
        nextScore2 = String(ht2);
        overridePairScores = [ht1, ht2];
      }
      nextPeriodLabel = 'HT';
      nextProgress = isTargetTimeEnded
        ? `🏁 HT (${nextScore1 || '0'} - ${nextScore2 || '0'})`
        : `🔴 1H • ${m.footballMinute || 'Live'} (${nextScore1 || '0'} - ${nextScore2 || '0'}) [HT]`;
    } else if (ev.betTargetOver && ev.betTargetOver > 0 && ev.betTargetOver !== 45 && ev.betTargetOver < 90) {
      isTargetTimeEnded = state.isFinished || state.footballMinuteNum >= ev.betTargetOver;
      nextPeriodLabel = isTargetTimeEnded ? 'FT' : (fbPer === 'HT' ? 'HT' : fbPer);
      nextProgress = `${isTargetTimeEnded ? '🏁' : '🔴'} ${nextPeriodLabel} (${evS1Num} - ${evS2Num})`;
    } else {
      // Full-Time (FT) Match / Bet
      isTargetTimeEnded = state.isFinished;
      nextPeriodLabel = state.isFinished ? 'FT' : (fbPer === 'HT' ? 'HT' : fbPer === '1H' ? '1H' : '2H');
      nextProgress = state.isFinished
        ? `🏁 FT (${evS1Num} - ${evS2Num})`
        : fbPer === 'HT'
        ? `🔴 HT (${evS1Num} - ${evS2Num})`
        : `🔴 ${nextPeriodLabel} • ${m.footballMinute || 'Live'} (${evS1Num} - ${evS2Num})`;
    }
  } else {
    // Cricket: check linked milestone or target over
    const linkedMs = ev.linkedMilestoneId
      ? (m.targetMilestones || []).find(ms => ms.id === ev.linkedMilestoneId)
      : undefined;

    const targetOver = linkedMs ? linkedMs.over : ev.betTargetOver;
    const targetInnings = linkedMs
      ? (linkedMs.innings || 1)
      : (ev.betInnings || (ev.betTargetOver ? 1 : undefined));
    const targetRuns = linkedMs ? linkedMs.runs : ev.betTargetValue;

    if (targetOver && targetOver > 0) {
      const innToUse = targetInnings || 1;
      const overScoresMap = innToUse === 2 ? m.secondInningsOverScores : m.firstInningsOverScores;
      const recordedStr = overScoresMap ? overScoresMap[String(targetOver)] : undefined;
      const recordedRuns = parseLeadingRuns(recordedStr);

      const targetBalls = targetOver * state.ballsPerOver;
      const maxWkts = m.maxWickets || 10;

      if (recordedRuns !== null) {
        isTargetTimeEnded = true;
        overrideRunsForOverBet = recordedRuns;
      } else if (state.currentInnings > innToUse) {
        isTargetTimeEnded = true;
        overrideRunsForOverBet = parseLeadingRuns(m.firstInningsScore ?? m.firstInningsTotalScore) ?? state.score1Num;
      } else if (state.currentInnings === innToUse && !state.isUpcoming) {
        if (m.balls >= targetBalls || m.wickets >= maxWkts || state.isFinished) {
          isTargetTimeEnded = true;
          overrideRunsForOverBet = m.score;
        } else {
          isTargetTimeEnded = false;
          overrideRunsForOverBet = m.score;
        }
      } else {
        isTargetTimeEnded = false;
      }

      nextPeriodLabel = innToUse === 1 ? 'HT' : 'FT';
      if (!state.isUpcoming) {
        const dispRuns = overrideRunsForOverBet !== null ? overrideRunsForOverBet : m.score;
        const oversDoneStr = isTargetTimeEnded
          ? `${targetOver}.0`
          : `${Math.floor(state.currentBalls / state.ballsPerOver)}.${state.currentBalls % state.ballsPerOver}`;
        nextProgress = `${isTargetTimeEnded ? '🏁' : '🔴'} ${innToUse === 2 ? '2nd' : '1st'} Inn: ${dispRuns} runs (${oversDoneStr}/${targetOver} Ov)${targetRuns !== undefined ? ` • Target: ${targetRuns}` : ''}`;
      }
    } else {
      nextPeriodLabel = state.isFinished ? 'FT' : (state.currentInnings === 1 ? 'HT' : 'FT');
    }
  }

  let nextStatus: EventStatus = ev.status;
  if (ev.status !== 'Cancel' && ev.autoSettleResult !== false) {
    if (state.isUpcoming) {
      nextStatus = 'Pending';
    } else if (isTargetTimeEnded) {
      nextStatus = evaluateBetEventOutcome(ev, m, state, overrideRunsForOverBet, overridePairScores);
    } else {
      nextStatus = 'Live';
    }
  }

  if (
    ev.score1 === nextScore1 &&
    ev.score2 === nextScore2 &&
    ev.status === nextStatus &&
    ev.liveProgressText === nextProgress &&
    ev.currentPeriodLabel === nextPeriodLabel &&
    ev.htScore1 === nextHtScore1 &&
    ev.htScore2 === nextHtScore2
  ) {
    return ev;
  }

  // Note: ev.dateTime, ev.match, ev.team1, ev.team2, ev.odds, ev.selection are NEVER modified!
  return {
    ...ev,
    score1: nextScore1,
    score2: nextScore2,
    status: nextStatus,
    liveProgressText: nextProgress,
    currentPeriodLabel: nextPeriodLabel,
    htScore1: nextHtScore1,
    htScore2: nextHtScore2
  };
}

export function recalculateBetSlipSummary(slip: BetSlipData): BetSlipData {
  const visibleEvents = slip.events.filter(e => !e.hidden);
  let computedOdds = 1;
  let anyLost = false;
  let allWon = visibleEvents.length > 0;
  let anyLive = false;

  for (const ev of visibleEvents) {
    if (ev.status !== 'Cancel') {
      computedOdds *= parseFloat(ev.odds) || 1;
    }
    if (ev.status === 'Lost') anyLost = true;
    if (ev.status === 'Live') anyLive = true;
    if (ev.status !== 'Win' && ev.status !== 'Cancel') allWon = false;
  }

  const stakeNum = parseFloat(String(slip.stake).replace(/[^0-9.]/g, '')) || 0;
  let newSlipStatus: EventStatus = slip.status;
  if (anyLost) newSlipStatus = 'Lost';
  else if (allWon && visibleEvents.length > 0) newSlipStatus = 'Win';
  else if (anyLive) newSlipStatus = 'Live';
  else if (visibleEvents.some(e => e.status === 'Pending')) newSlipStatus = 'Pending';

  const nextOverallOdds = computedOdds.toFixed(2);
  const nextPotential = (stakeNum * computedOdds).toFixed(2);
  const nextWonPayout = allWon ? nextPotential : '0.00';
  const nextBetType = visibleEvents.length > 1 ? 'Accumulator' : 'Single';

  if (
    slip.overallOdds === nextOverallOdds &&
    slip.potentialWinnings === nextPotential &&
    slip.wonPayout === nextWonPayout &&
    slip.status === newSlipStatus &&
    slip.betType === nextBetType
  ) {
    return slip;
  }

  return {
    ...slip,
    overallOdds: nextOverallOdds,
    potentialWinnings: nextPotential,
    wonPayout: nextWonPayout,
    status: newSlipStatus,
    betType: nextBetType
  };
}

export function syncAllSlipCardsWithMatches(
  cards: SavedSlipCard[],
  matches: MatchState[]
): {
  updatedCards: SavedSlipCard[];
  hasChanges: boolean;
  newlySettled: Array<{ cardId: string; eventId: string; eventMatch: string; selection: string; outcome: 'Win' | 'Lost' }>;
} {
  let hasChanges = false;
  const newlySettled: Array<{ cardId: string; eventId: string; eventMatch: string; selection: string; outcome: 'Win' | 'Lost' }> = [];

  const matchMap = new Map<string, MatchState>();
  for (const m of matches) {
    matchMap.set(m.id, m);
  }

  const updatedCards = cards.map(card => {
    let cardEventsChanged = false;
    const nextEvents = card.slipData.events.map(ev => {
      if (ev.linkedMatchId) {
        const m = matchMap.get(ev.linkedMatchId);
        if (m && doesBetEventMatchScorerMatch(ev, m)) {
          const syncedEv = syncBetEventWithScorerMatch(ev, m);
          if (syncedEv !== ev) {
            cardEventsChanged = true;
            if (
              (ev.status === 'Pending' || ev.status === 'Live') &&
              (syncedEv.status === 'Win' || syncedEv.status === 'Lost')
            ) {
              newlySettled.push({
                cardId: card.id,
                eventId: syncedEv.id,
                eventMatch: syncedEv.match,
                selection: syncedEv.selection,
                outcome: syncedEv.status
              });
            }
          }
          return syncedEv;
        }
      }

      // Auto-heal settled events with scores where status was mis-evaluated (e.g. W2 won but showed Lost due to stale betRuleType)
      if ((ev.status === 'Win' || ev.status === 'Lost') && ev.autoSettleResult !== false) {
        const expectedOutcome = evaluateStandaloneBetEventOutcome(ev);
        if (expectedOutcome && expectedOutcome !== ev.status) {
          cardEventsChanged = true;
          const updatedEv: BetEvent = {
            ...ev,
            status: expectedOutcome,
            betRuleType: ev.betRuleType === 'w1' || ev.betRuleType === 'w2' ? 'auto' : ev.betRuleType
          };
          return updatedEv;
        }
      } else if (
        (ev.status === 'Win' || ev.status === 'Lost') &&
        ev.betRuleType === 'w1' &&
        /\bw2\b/i.test(String(ev.selection || ''))
      ) {
        const expectedOutcome = evaluateStandaloneBetEventOutcome({ ...ev, betRuleType: 'auto' });
        if (expectedOutcome && expectedOutcome !== ev.status) {
          cardEventsChanged = true;
          const updatedEv: BetEvent = {
            ...ev,
            status: expectedOutcome,
            betRuleType: 'auto'
          };
          return updatedEv;
        }
      }

      return ev;
    });

    const cardHadNewLoss = newlySettled.some(item => item.cardId === card.id && item.outcome === 'Lost');
    const finalEvents = cardHadNewLoss
      ? nextEvents.map(ev => (ev.manuallyLinkedInLostSlip ? { ...ev, manuallyLinkedInLostSlip: undefined } : ev))
      : nextEvents;

    const nextSlip = recalculateBetSlipSummary({
      ...card.slipData,
      events: finalEvents
    });

    if (!cardEventsChanged && nextSlip === card.slipData) return card;
    hasChanges = true;

    return {
      ...card,
      amount: String(nextSlip.stake).replace(/\s*[A-Za-z]+$/, '').trim() || nextSlip.stake,
      slipData: nextSlip
    };
  });

  return { updatedCards, hasChanges, newlySettled };
}

/**
 * Returns true if ANY visible event in the slip card has status === 'Lost'.
 * When a slip card is Lost, all of its other Live/Upcoming matches are eliminated from Live & Upcoming.
 */
export function isSlipCardLost(card?: SavedSlipCard | null): boolean {
  if (!card || !card.slipData || !Array.isArray(card.slipData.events)) return false;
  return card.slipData.events.some(ev => !ev.hidden && ev.status === 'Lost');
}

export function isBetEventSettled(ev?: BetEvent | null): boolean {
  if (!ev) return false;
  return ev.status === 'Win' || ev.status === 'Lost' || ev.status === 'Cancel';
}

export function isSlipCardSettled(card?: SavedSlipCard | null): boolean {
  if (!card || !card.slipData) return false;
  if (isSlipCardLost(card)) return true;
  if (card.slipData.status === 'Win' || card.slipData.status === 'Lost') return true;
  const visibleEvents = (card.slipData.events || []).filter(ev => !ev.hidden);
  if (visibleEvents.length > 0 && visibleEvents.every(ev => ev.status === 'Win' || ev.status === 'Cancel')) {
    return true;
  }
  return false;
}

export function unwrapRedirectUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Unwrap up to 2 levels of redirect URLs (e.g. Google Search /url?q=... or /url?url=..., Facebook l.php?u=...)
  for (let i = 0; i < 2; i++) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();
      const isRedirectEndpoint =
        ((host.includes('google.') || host.includes('bing.') || host.includes('yahoo.')) &&
          (pathname === '/url' || pathname.startsWith('/url/'))) ||
        (host.includes('facebook.com') && pathname === '/l.php');

      if (isRedirectEndpoint) {
        const targetParam =
          parsed.searchParams.get('url') ||
          parsed.searchParams.get('q') ||
          parsed.searchParams.get('u') ||
          parsed.searchParams.get('target');
        if (targetParam && /^https?:\/\//i.test(targetParam.trim())) {
          trimmed = targetParam.trim();
          continue;
        }
        // A bare https://www.google.com/url without a valid target URL parameter is NOT a real match URL!
        return '';
      }
      if ((host.includes('google.') || host.includes('bing.')) && pathname.startsWith('/search')) {
        return '';
      }
    } catch {
      const m = trimmed.match(/^https?:\/\/(?:www\.)?google\.[a-z.]+\/url\b.*[?&](?:url|q)=([^&]+)/i);
      if (m && m[1]) {
        try {
          const decoded = decodeURIComponent(m[1]).trim();
          if (/^https?:\/\//i.test(decoded)) {
            trimmed = decoded;
            continue;
          }
        } catch {}
      }
      if (/^https?:\/\/(?:www\.)?google\.[a-z.]+\/(?:url|search)\b/i.test(trimmed)) {
        return '';
      }
    }
    break;
  }

  return trimmed;
}

export function normalizeMatchUrlKey(url?: string): string {
  const unwrapped = unwrapRedirectUrl(url);
  if (!unwrapped) return '';
  const cleaned = unwrapped
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, '')
    .replace(/\/+(?:live|scorecard|match-scorecard|info|commentary|overs|squads|highlights)\/?$/i, '')
    .replace(/\/+$/, '');
  if (/^https?:\/\/[^/]+$/i.test(cleaned)) return '';
  return cleaned;
}

/**
 * Returns true if two BetEvent items (across different slips) represent the same match.
 * Note: Their odds and winning team selections may be different!
 * IMPORTANT: Never merge two events just because they share the same `id` (e.g. default 'ev-1', 'ev-2', 'ev-3');
 * two events across different slips only merge when their actual teams match!
 */
export function areTwoBetEventsSameMatch(a: BetEvent, b: BetEvent): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const [a1, a2] = extractBetEventTeams(a);
  const [b1, b2] = extractBetEventTeams(b);
  const aHasRealTeams = !isGenericTeamPlaceholder(a1) && !isGenericTeamPlaceholder(a2);
  const bHasRealTeams = !isGenericTeamPlaceholder(b1) && !isGenericTeamPlaceholder(b2);

  if (!aHasRealTeams || !bHasRealTeams) {
    return false;
  }

  const directMatch = computeTeamSimilarity(a1, b1) >= 75 && computeTeamSimilarity(a2, b2) >= 75;
  const swappedMatch = computeTeamSimilarity(a1, b2) >= 75 && computeTeamSimilarity(a2, b1) >= 75;
  return Boolean(directMatch || swappedMatch);
}

/**
 * Checks whether a live match URL path contains team tokens matching the given BetEvent.
 */
export function doesUrlMatchBetEvent(url: string | undefined, ev: BetEvent): boolean {
  const cleanUrl = unwrapRedirectUrl(url).toLowerCase();
  if (!cleanUrl) return false;
  const [t1, t2] = extractBetEventTeams(ev);
  if (isGenericTeamPlaceholder(t1) && isGenericTeamPlaceholder(t2)) return false;

  const extractTokens = (name: string): string[] => {
    if (!name || isGenericTeamPlaceholder(name)) return [];
    const norm = normalizeTeamForMatch(name);
    const words = norm.split(/\s+/).filter(w => w.length >= 3 && !/^(?:spor|club|team|united|city)$/.test(w));
    const knownCode = getKnownCanonicalTeamCode(name)?.toLowerCase();
    if (knownCode && knownCode.length >= 2) words.push(knownCode);
    return words;
  };

  const t1Tokens = extractTokens(t1);
  const t2Tokens = extractTokens(t2);
  const urlPath = cleanUrl.replace(/^https?:\/\/[^/]+/, '');
  const matchT1 = t1Tokens.some(tok => urlPath.includes(tok));
  const matchT2 = t2Tokens.some(tok => urlPath.includes(tok));
  if (t1Tokens.length > 0 && t2Tokens.length > 0) {
    return (matchT1 && matchT2) || (matchT1 && t1Tokens.some(t => t.length >= 5 && urlPath.includes(t))) || (matchT2 && t2Tokens.some(t => t.length >= 5 && urlPath.includes(t)));
  }
  return matchT1 || matchT2;
}

/**
 * Ensures every BetEvent across all saved slip cards has a globally unique `id`,
 * resolves ownership of `linkedMatchId` / `liveMatchUrl` when duplicate IDs ('ev-1', 'ev-2', 'ev-3')
 * caused a link to be attached to the wrong slip's event, and cleans up ghost 'Live' statuses on unlinked events.
 */
export function ensureUniqueSlipEventIds(
  cards: SavedSlipCard[],
  matches: MatchState[] = []
): {
  cards: SavedSlipCard[];
  changed: boolean;
} {
  const safeInputCards = Array.isArray(cards) ? cards : [];
  const safeMatches = Array.isArray(matches) ? matches : [];
  let changed = false;

  // Flatten all events to inspect cross-slip collisions before stripping anything
  const flatEvents: Array<{ cIdx: number; eIdx: number; cardId: string; ev: BetEvent }> = [];
  safeInputCards.forEach((card, cIdx) => {
    (card?.slipData?.events || []).forEach((ev, eIdx) => {
      if (ev) {
        flatEvents.push({ cIdx, eIdx, cardId: card.id || `c${cIdx + 1}`, ev });
      }
    });
  });

  const doesEventOwnLinkOrUrl = (
    candidate: BetEvent,
    linkedMatchId?: string,
    liveMatchUrl?: string
  ): boolean => {
    if (linkedMatchId && safeMatches.length > 0) {
      const m = safeMatches.find(x => x && x.id === linkedMatchId);
      if (m && doesBetEventMatchScorerMatch(candidate, m)) return true;
    }
    if (liveMatchUrl && doesUrlMatchBetEvent(liveMatchUrl, candidate)) {
      return true;
    }
    return false;
  };

  // Pre-pass: If an event has a liveMatchUrl or linkedMatchId that actually matches a DIFFERENT event in another slip
  // (because of the old duplicate ev-1 / ev-2 / ev-3 ID collision), transfer it to the matching event!
  const transferredLinks = new Map<BetEvent, { linkedMatchId?: string; liveMatchUrl?: string }>();
  const stripFromEvents = new Set<BetEvent>();

  for (let i = 0; i < flatEvents.length; i++) {
    const itemA = flatEvents[i];
    const evA = itemA.ev;
    const linkIdA = evA.linkedMatchId;
    const urlA = unwrapRedirectUrl(evA.liveMatchUrl) || undefined;
    if (!linkIdA && !urlA) continue;

    const aOwns = doesEventOwnLinkOrUrl(evA, linkIdA, urlA);
    if (aOwns) continue;

    // Check if another event (with the same raw ID, or sharing linkIdA/urlA, or matching urlA/linkIdA) is the true owner
    const trueOwnerItem = flatEvents.find(
      itemB =>
        itemB !== itemA &&
        !areTwoBetEventsSameMatch(evA, itemB.ev) &&
        doesEventOwnLinkOrUrl(itemB.ev, linkIdA, urlA)
    );

    if (trueOwnerItem) {
      stripFromEvents.add(evA);
      const prevTransfer = transferredLinks.get(trueOwnerItem.ev) || {};
      transferredLinks.set(trueOwnerItem.ev, {
        linkedMatchId: trueOwnerItem.ev.linkedMatchId || prevTransfer.linkedMatchId || linkIdA,
        liveMatchUrl: unwrapRedirectUrl(trueOwnerItem.ev.liveMatchUrl) || prevTransfer.liveMatchUrl || urlA
      });
    }
  }

  const seenEventIds = new Set<string>();
  const firstEventById = new Map<string, BetEvent>();
  const allProcessedEvents: BetEvent[] = [];

  const nextCards = safeInputCards.map((card, cIdx) => {
    if (!card?.slipData?.events) return card;
    let cardChanged = false;
    const nextEvents = card.slipData.events.map((ev, eIdx) => {
      if (!ev) return ev;
      let nextEv: BetEvent = { ...ev };

      // Apply any transferred link/URL from pre-pass
      const transfer = transferredLinks.get(ev);
      if (transfer) {
        if (!nextEv.linkedMatchId && transfer.linkedMatchId) {
          nextEv.linkedMatchId = transfer.linkedMatchId;
          cardChanged = true;
          changed = true;
        }
        if (!nextEv.liveMatchUrl && transfer.liveMatchUrl) {
          nextEv.liveMatchUrl = transfer.liveMatchUrl;
          cardChanged = true;
          changed = true;
        }
      }

      if (stripFromEvents.has(ev)) {
        const wasPollutedZeroLive =
          nextEv.status === 'Live' && (nextEv.score1 === '0' || !nextEv.score1) && (nextEv.score2 === '0' || !nextEv.score2);
        nextEv = {
          ...nextEv,
          linkedMatchId: undefined,
          liveMatchUrl: undefined,
          liveProgressText: undefined,
          status: nextEv.status === 'Live' ? ('Pending' as EventStatus) : nextEv.status,
          score1: wasPollutedZeroLive ? '' : nextEv.score1,
          score2: wasPollutedZeroLive ? '' : nextEv.score2
        };
        cardChanged = true;
        changed = true;
      }

      const rawId = String(nextEv.id || '').trim();
      const isDuplicateId = !rawId || seenEventIds.has(rawId);
      const firstEvWithSameId = rawId ? firstEventById.get(rawId) : undefined;

      if (isDuplicateId) {
        cardChanged = true;
        changed = true;
        let newId = `${rawId || 'ev'}-${card.id || `c${cIdx + 1}`}-${eIdx + 1}`;
        while (seenEventIds.has(newId)) {
          newId = `${newId}-${Math.random().toString(36).slice(2, 5)}`;
        }
        seenEventIds.add(newId);

        const isDiffFromFirst = firstEvWithSameId ? !areTwoBetEventsSameMatch(firstEvWithSameId, nextEv) : false;
        if (isDiffFromFirst && firstEvWithSameId) {
          const sameLinkedMatch = Boolean(
            nextEv.linkedMatchId && nextEv.linkedMatchId === firstEvWithSameId.linkedMatchId
          );
          const sameLiveUrl = Boolean(
            nextEv.liveMatchUrl &&
              firstEvWithSameId.liveMatchUrl &&
              normalizeMatchUrlKey(nextEv.liveMatchUrl) === normalizeMatchUrlKey(firstEvWithSameId.liveMatchUrl)
          );
          // Only strip from nextEv if nextEv does NOT explicitly match the link/URL
          const nextEvOwns = doesEventOwnLinkOrUrl(nextEv, nextEv.linkedMatchId, nextEv.liveMatchUrl);
          if (!nextEvOwns && (sameLinkedMatch || sameLiveUrl)) {
            const samePollutedLiveScore = Boolean(
              nextEv.status === 'Live' &&
                nextEv.score1 === firstEvWithSameId.score1 &&
                nextEv.score2 === firstEvWithSameId.score2
            );
            nextEv = {
              ...nextEv,
              id: newId,
              linkedMatchId: sameLinkedMatch ? undefined : nextEv.linkedMatchId,
              liveMatchUrl: sameLiveUrl ? undefined : nextEv.liveMatchUrl,
              liveProgressText: sameLinkedMatch || sameLiveUrl ? undefined : nextEv.liveProgressText,
              status: samePollutedLiveScore ? ('Pending' as EventStatus) : nextEv.status,
              score1: samePollutedLiveScore ? '' : nextEv.score1,
              score2: samePollutedLiveScore ? '' : nextEv.score2
            };
          } else {
            nextEv = {
              ...nextEv,
              id: newId
            };
          }
        } else {
          nextEv = {
            ...nextEv,
            id: newId
          };
        }
      } else {
        seenEventIds.add(rawId);
        firstEventById.set(rawId, nextEv);
      }

      // Guard against any event sharing the exact same liveMatchUrl or linkedMatchId with an earlier DIFFERENT match
      const conflictingEarlier = allProcessedEvents.find(
        prevEv =>
          !areTwoBetEventsSameMatch(prevEv, nextEv) &&
          ((nextEv.linkedMatchId && prevEv.linkedMatchId && nextEv.linkedMatchId === prevEv.linkedMatchId) ||
            (nextEv.liveMatchUrl &&
              prevEv.liveMatchUrl &&
              normalizeMatchUrlKey(nextEv.liveMatchUrl) !== '' &&
              normalizeMatchUrlKey(nextEv.liveMatchUrl) === normalizeMatchUrlKey(prevEv.liveMatchUrl)))
      );
      if (conflictingEarlier) {
        const nextEvOwns = doesEventOwnLinkOrUrl(nextEv, nextEv.linkedMatchId, nextEv.liveMatchUrl);
        if (!nextEvOwns) {
          cardChanged = true;
          changed = true;
          const clearSameLinkId = Boolean(
            nextEv.linkedMatchId && conflictingEarlier.linkedMatchId && nextEv.linkedMatchId === conflictingEarlier.linkedMatchId
          );
          const clearSameUrl = Boolean(
            nextEv.liveMatchUrl &&
              conflictingEarlier.liveMatchUrl &&
              normalizeMatchUrlKey(nextEv.liveMatchUrl) === normalizeMatchUrlKey(conflictingEarlier.liveMatchUrl)
          );
          nextEv = {
            ...nextEv,
            linkedMatchId: clearSameLinkId ? undefined : nextEv.linkedMatchId,
            liveMatchUrl: clearSameUrl ? undefined : nextEv.liveMatchUrl,
            liveProgressText: clearSameLinkId || clearSameUrl ? undefined : nextEv.liveProgressText
          };
        }
      }

      // Clean up any ghost 'Live' status on an event that has no linkedMatchId
      if (!nextEv.linkedMatchId && nextEv.status === 'Live') {
        const wasZeroPolluted =
          nextEv.autoSyncScore !== false &&
          (nextEv.score1 === '0' || !nextEv.score1) &&
          (nextEv.score2 === '0' || !nextEv.score2);
        nextEv = {
          ...nextEv,
          status: 'Pending',
          liveProgressText: undefined,
          score1: wasZeroPolluted ? '' : nextEv.score1,
          score2: wasZeroPolluted ? '' : nextEv.score2
        };
        cardChanged = true;
        changed = true;
      }

      allProcessedEvents.push(nextEv);
      return nextEv;
    });

    if (!cardChanged) return card;
    const nextSlip = recalculateBetSlipSummary({
      ...card.slipData,
      events: nextEvents
    });
    return {
      ...card,
      slipData: nextSlip
    };
  });

  return { cards: nextCards, changed };
}

/**
 * Returns true if a BetEvent and a Scorer MatchState represent the same match.
 */
export function doesBetEventMatchScorerMatch(ev: BetEvent, m: MatchState): boolean {
  if (!ev || !m) return false;

  const [evT1, evT2] = extractBetEventTeams(ev);
  const evHasRealTeams = !isGenericTeamPlaceholder(evT1) && !isGenericTeamPlaceholder(evT2);
  const mHasRealTeams = !isGenericTeamPlaceholder(m.team1) && !isGenericTeamPlaceholder(m.team2);

  if (evHasRealTeams && mHasRealTeams) {
    const directMatch = computeTeamSimilarity(evT1, m.team1) >= 75 && computeTeamSimilarity(evT2, m.team2) >= 75;
    const swappedMatch = computeTeamSimilarity(evT1, m.team2) >= 75 && computeTeamSimilarity(evT2, m.team1) >= 75;
    return Boolean(directMatch || swappedMatch);
  }

  if (!evHasRealTeams && !mHasRealTeams && ev.linkedMatchId && ev.linkedMatchId === m.id) return true;

  return false;
}

/**
 * Formats an event's selection with the corresponding team name when the selection is a team code (W1, W2, 1X, 2X).
 * Supports both `formatPickSelectionWithTeam(ev)` and `formatPickSelectionWithTeam(selection, team1, team2)`.
 */
export function formatPickSelectionWithTeam(
  evOrSelection: BetEvent | string,
  team1Arg?: string,
  team2Arg?: string
): string {
  let rawSel = '';
  let t1 = team1Arg || '';
  let t2 = team2Arg || '';
  if (typeof evOrSelection === 'string') {
    rawSel = evOrSelection.trim();
  } else if (evOrSelection && typeof evOrSelection === 'object') {
    rawSel = String(evOrSelection.selection || '').trim();
    const [extractedT1, extractedT2] = extractBetEventTeams(evOrSelection);
    t1 = t1 || extractedT1;
    t2 = t2 || extractedT2;
  }
  if (!rawSel) return 'W1';
  const s1Short = t1 && !isGenericTeamPlaceholder(t1) ? getShortTeamName(t1, t1) : '';
  const s2Short = t2 && !isGenericTeamPlaceholder(t2) ? getShortTeamName(t2, t2) : '';
  if (/^(?:w1|1|team\s*1|home|টিম\s*১)$/i.test(rawSel) && s1Short) {
    return `${rawSel} (${s1Short})`;
  }
  if (/^(?:w2|2|team\s*2|away|টিম\s*২)$/i.test(rawSel) && s2Short) {
    return `${rawSel} (${s2Short})`;
  }
  if (/^1x$/i.test(rawSel) && s1Short) {
    return `1X (${s1Short}/X)`;
  }
  if (/^(?:2x|x2)$/i.test(rawSel) && s2Short) {
    return `${rawSel} (${s2Short}/X)`;
  }
  return rawSel;
}

export interface MergedSlipPickItem {
  cardId: string;
  cardIndex: number; // 1-based slip index (#1, #2, #3...)
  slipNumber: string;
  slipAmount: string;
  isSlipLost: boolean;
  isEliminatedBySlipLoss: boolean; // true if slip has a Lost match AND this event was in Live/Upcoming
  isAliveForLiveUpcomingScorer: boolean; // true if slip is NOT Lost AND this event is not Lost/Cancel
  eventId: string;
  event: BetEvent;
  selection: string;
  formattedSelection: string;
  odds: string;
  status: EventStatus;
  periodType: 'HT' | 'FT';
  isTeamsSwappedRelativeToGroup: boolean;
}

export interface MergedSlipMatchGroup {
  groupKey: string;
  matchTitle: string;
  team1: string;
  team2: string;
  sport: string;
  dateTime: string;
  score1: string;
  score2: string;
  linkedMatchId?: string;
  liveMatchUrl?: string;
  scorerMatch?: MatchState;
  primaryEvent: BetEvent;
  picks: MergedSlipPickItem[];
  visiblePicks: MergedSlipPickItem[]; // Picks not eliminated by another match's loss in their slip
  activePicks: MergedSlipPickItem[]; // Alias of visiblePicks for convenience
  activeLiveUpcomingPicks: MergedSlipPickItem[]; // Picks from non-Lost slips
  isEliminatedFromLiveUpcoming: boolean; // true if all picks in this group are eliminated from Live/Upcoming by slip loss
}

/**
 * Merges identical matches across all Bet Slips (`savedSlipCards`) into unified match groups,
 * preserving each slip's distinct odds and winning team selection, and eliminating Live/Upcoming
 * matches belonging to any slip that has a Lost match.
 */
export function buildMergedSlipMatchGroups(
  cards: SavedSlipCard[],
  matchesOrActiveCardId?: MatchState[] | string,
  activeCardIdArg?: string,
  hideSettledArg: boolean = false
): MergedSlipMatchGroup[] {
  const rawSafeCards = Array.isArray(cards) ? cards : [];
  const safeMatches: MatchState[] = Array.isArray(matchesOrActiveCardId) ? matchesOrActiveCardId : [];
  const { cards: safeCards } = ensureUniqueSlipEventIds(rawSafeCards, safeMatches);
  const preferredCardId =
    typeof matchesOrActiveCardId === 'string' ? matchesOrActiveCardId : activeCardIdArg;
  const effectivePreferredCardId =
    preferredCardId && safeCards.some(c => c.id === preferredCardId && (!hideSettledArg || !isSlipCardSettled(c)))
      ? preferredCardId
      : undefined;

  const groups: MergedSlipMatchGroup[] = [];
  const usedGroupKeys = new Set<string>();
  const matchMap = new Map<string, MatchState>();
  for (const m of safeMatches) {
    if (m && m.id) {
      matchMap.set(m.id, m);
    }
  }

  safeCards.forEach((card, cIdx) => {
    const slipLost = isSlipCardLost(card);
    const slipSettled = isSlipCardSettled(card);
    if (hideSettledArg && slipSettled) return;

    const cardNumber = cIdx + 1;
    const events = card?.slipData?.events || [];
    const cleanStake = String(card?.amount || card?.slipData?.stake || '0.00').replace(/\s*[A-Za-z]+$/, '').trim();
    const slipAmountStr = `${cleanStake} ${card?.currency || 'BDT'}`;
    const usedScorerMatchIdsInCard = new Set<string>();

    for (const ev of events) {
      if (!ev || ev.hidden) continue;
      if (hideSettledArg && isBetEventSettled(ev)) continue;
      const [evT1, evT2] = extractBetEventTeams(ev);
      const candidateLinkedM =
        ev.linkedMatchId && !usedScorerMatchIdsInCard.has(ev.linkedMatchId)
          ? matchMap.get(ev.linkedMatchId)
          : undefined;
      const linkedM =
        candidateLinkedM && doesBetEventMatchScorerMatch(ev, candidateLinkedM)
          ? candidateLinkedM
          : ev.linkedMatchId
          ? safeMatches.find(m => !usedScorerMatchIdsInCard.has(m.id) && doesBetEventMatchScorerMatch(ev, m))
          : undefined;

      if (linkedM?.id) {
        usedScorerMatchIdsInCard.add(linkedM.id);
      }

      const isScorerFinished = linkedM ? isScorerMatchFinished(linkedM) : false;
      // An event in a Lost slip is one of the "other matches in Live or Upcoming" if it is NOT the Lost match itself
      // and is either Pending/Live or its Scorer match is in Live/Upcoming (not Finished).
      const isEliminatedBySlipLoss =
        slipLost &&
        ev.status !== 'Lost' &&
        (ev.status === 'Pending' || ev.status === 'Live' || (linkedM ? !isScorerFinished : false));

      const isAliveForLiveUpcomingScorer =
        !slipLost && ev.status !== 'Lost' && ev.status !== 'Cancel';

      let targetGroup = groups.find(g => {
        // NEVER merge two different events that belong to the SAME slip!
        if (g.picks.some(p => p.cardId === card.id)) return false;
        const repEv = g.picks[0]?.event;
        if (!repEv) return false;
        return areTwoBetEventsSameMatch(ev, repEv);
      });

      const cleanLiveUrl = unwrapRedirectUrl(ev.liveMatchUrl) || unwrapRedirectUrl(linkedM?.liveMatchUrl) || undefined;

      if (!targetGroup) {
        const baseGroupKey =
          linkedM?.id ||
          normalizeMatchUrlKey(cleanLiveUrl) ||
          `${evT1.toLowerCase()}__vs__${evT2.toLowerCase()}__${ev.id}`;
        let groupKey = baseGroupKey;
        if (!groupKey || usedGroupKeys.has(groupKey)) {
          groupKey = `${baseGroupKey || 'grp'}__${card.id}__${ev.id}`;
        }
        usedGroupKeys.add(groupKey);

        targetGroup = {
          groupKey,
          matchTitle: `${evT1} vs ${evT2}`,
          team1: evT1,
          team2: evT2,
          sport: ev.sport || (linkedM?.sport === 'cricket' ? 'Cricket' : 'Football'),
          dateTime: ev.dateTime || linkedM?.matchStartTime || '',
          score1: ev.score1 || '',
          score2: ev.score2 || '',
          linkedMatchId: linkedM?.id,
          liveMatchUrl: cleanLiveUrl,
          scorerMatch: linkedM,
          primaryEvent: ev,
          picks: [],
          visiblePicks: [],
          activePicks: [],
          activeLiveUpcomingPicks: [],
          isEliminatedFromLiveUpcoming: false
        };
        groups.push(targetGroup);
      } else {
        if (!targetGroup.linkedMatchId && linkedM?.id) {
          targetGroup.linkedMatchId = linkedM.id;
        }
        if (!targetGroup.liveMatchUrl && cleanLiveUrl) {
          targetGroup.liveMatchUrl = cleanLiveUrl;
        }
        if (!targetGroup.scorerMatch && linkedM) {
          targetGroup.scorerMatch = linkedM;
        }
        if (!targetGroup.score1 && !targetGroup.score2 && (ev.score1 || ev.score2)) {
          const swapped = areLinkTeamsSwapped(targetGroup.team1, targetGroup.team2, evT1, evT2);
          targetGroup.score1 = swapped ? (ev.score2 || '') : (ev.score1 || '');
          targetGroup.score2 = swapped ? (ev.score1 || '') : (ev.score2 || '');
        }
      }

      const swappedRelGroup = areLinkTeamsSwapped(targetGroup.team1, targetGroup.team2, evT1, evT2);
      const pickItem: MergedSlipPickItem = {
        cardId: card.id,
        cardIndex: cardNumber,
        slipNumber: card.slipData.slipNumber || `#${cardNumber}`,
        slipAmount: slipAmountStr,
        isSlipLost: slipLost,
        isEliminatedBySlipLoss,
        isAliveForLiveUpcomingScorer,
        eventId: ev.id,
        event: ev,
        selection: ev.selection,
        formattedSelection: formatPickSelectionWithTeam(ev),
        odds: ev.odds,
        status: ev.status,
        periodType: resolveEventPeriodType(ev),
        isTeamsSwappedRelativeToGroup: swappedRelGroup
      };

      targetGroup.picks.push(pickItem);
    }
  });

  for (const g of groups) {
    const rawVisible = [...g.picks];
    if (effectivePreferredCardId) {
      rawVisible.sort((a, b) => {
        if (a.cardId === effectivePreferredCardId && b.cardId !== effectivePreferredCardId) return -1;
        if (b.cardId === effectivePreferredCardId && a.cardId !== effectivePreferredCardId) return 1;
        return a.cardIndex - b.cardIndex;
      });
    }
    g.visiblePicks = rawVisible;
    g.activePicks = g.visiblePicks;
    g.activeLiveUpcomingPicks = g.picks.filter(p => p.isAliveForLiveUpcomingScorer);
    g.isEliminatedFromLiveUpcoming = g.picks.every(p => p.isEliminatedBySlipLoss);
    const preferredPick =
      (effectivePreferredCardId ? g.visiblePicks.find(p => p.cardId === effectivePreferredCardId) : undefined) ||
      (effectivePreferredCardId ? g.picks.find(p => p.cardId === effectivePreferredCardId) : undefined) ||
      g.visiblePicks[0] ||
      g.picks[0];
    if (preferredPick) {
      g.primaryEvent = preferredPick.event;
      const [prefT1, prefT2] = extractBetEventTeams(preferredPick.event);
      if (!isGenericTeamPlaceholder(prefT1) && !isGenericTeamPlaceholder(prefT2)) {
        g.team1 = prefT1;
        g.team2 = prefT2;
        g.matchTitle = `${prefT1} vs ${prefT2}`;
      }
      if (preferredPick.event.dateTime) {
        g.dateTime = preferredPick.event.dateTime;
      }
      if (preferredPick.event.score1 || preferredPick.event.score2) {
        g.score1 = preferredPick.event.score1 || '';
        g.score2 = preferredPick.event.score2 || '';
      }
    }
  }

  return groups
    .filter(g => {
      if (effectivePreferredCardId) {
        return g.picks.some(p => p.cardId === effectivePreferredCardId);
      }
      return !g.isEliminatedFromLiveUpcoming;
    })
    .sort((a, b) => {
      const aLinked = Boolean(a.linkedMatchId || a.scorerMatch || (a.liveMatchUrl && a.liveMatchUrl.trim()));
      const bLinked = Boolean(b.linkedMatchId || b.scorerMatch || (b.liveMatchUrl && b.liveMatchUrl.trim()));
      if (aLinked !== bLinked) return aLinked ? -1 : 1;
      const tA = parseEventDateTime(a.dateTime);
      const tB = parseEventDateTime(b.dateTime);
      if (tA && tB && tA !== tB) return tA - tB;
      if (tA && !tB) return -1;
      if (!tA && tB) return 1;
      return (a.dateTime || '').localeCompare(b.dateTime || '');
    });
}
