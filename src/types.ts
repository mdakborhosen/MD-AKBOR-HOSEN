export type BallEvent = {
  id?: string;
  type: 'dot' | 'run' | 'wicket' | 'wide' | 'noball' | 'retired' | 'bulk_over';
  runs: number;
  isWicket: boolean;
  isExtra: boolean;
  isWide?: boolean;
  isNoBall?: boolean;
  isBye?: boolean;
  isLegBye?: boolean;
  totalBallsAtEvent: number;
  timestamp: number;
  wicketType?: string;
  wasFreeHit?: boolean;
  score: number;
  wickets: number;
  balls: number;
  bulkWickets?: number;
  bulkBalls?: number;
  strikerIdx?: number;
  active1Idx?: number | null;
  active2Idx?: number | null;
  onStrikeIdx?: number;
  runsOnly?: number; // Runs without extra score
};

export type MilestoneEntry = {
  odd: number | string;
  stake: number | string;
};

export type TargetMilestone = {
  id?: string;
  runs: number;
  over: number;
  condition: 'more' | 'lessOrEqual';
  innings?: 1 | 2;
  entries?: MilestoneEntry[];
};

export type PlayerStats = {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  wicketType?: string;
  yetToBat?: boolean;
};

export type BowlerStats = {
  name: string;
  wickets: number;
  runs: number;
  overs: string;
  balls?: number;
  maidens?: number;
  econ?: string;
  economy?: string;
};

export type TournamentFolder = {
  id: string;
  name: string;
  teams: string[];
};

export type ScheduleEvent = {
  id: string;
  date: string;
  time: string;
  group: string;
  team1: string;
  team2: string;
  team1Flag?: string;
  team2Flag?: string;
  venue?: string;
  isCopy?: boolean;
  tournamentId?: string;
};

export type FootballGoalEvent = {
  id?: string;
  minute: number | string; // e.g. 24, "45+2", 89
  player: string;
  team: 'team1' | 'team2';
  isPenalty?: boolean;
  isOwnGoal?: boolean;
};

export type FootballCardEvent = {
  id?: string;
  minute: number | string;
  player: string;
  team: 'team1' | 'team2';
  type: 'yellow' | 'red' | 'second_yellow';
};

export type FootballStats = {
  possession?: [number, number]; // [team1, team2] e.g. [58, 42]
  shots?: [number, number];
  shotsOnTarget?: [number, number];
  corners?: [number, number];
  fouls?: [number, number];
  yellowCards?: [number, number];
  redCards?: [number, number];
  offsides?: [number, number];
};

export type MatchState = {
  id: string;
  name: string;
  sport?: 'cricket' | 'football'; // Distinguish Cricket vs Football
  team1: string; // Keep as string for manual name entry
  team2: string; // Keep as string for manual name entry
  teams?: string[];
  battingTeam: string;
  bowlingTeam?: string;
  target?: number;
  targets?: number[];
  targetMilestones?: TargetMilestone[];
  maxOvers: number;
  maxOversList?: number[];
  format?: '20' | '10' | '50' | '100' | 'test';
  score: number;
  wickets: number;
  balls: number;
  history: BallEvent[];
  winCondition?: 'more' | 'lessOrEqual';
  isSwapped?: boolean;
  playerList1?: string[];
  playerList2?: string[];
  maxWickets?: number;
  battingStats?: PlayerStats[];
  team1BattingStats?: PlayerStats[];
  team2BattingStats?: PlayerStats[];
  team1BowlingStats?: BowlerStats[];
  team2BowlingStats?: BowlerStats[];
  activeBatsman1Idx?: number | null;
  activeBatsman2Idx?: number | null;
  onStrikeIdx?: number;
  liveMatchUrl?: string;
  liveSyncEnabled?: boolean;
  liveSyncInterval?: number; // seconds (default 10)
  lastSyncedAt?: string;
  liveStatusText?: string;
  liveSyncError?: string;
  liveRecentBalls?: string[];
  liveBowler?: string;
  liveBowlerStats?: BowlerStats;
  liveBallEvent?: string;
  isUpcoming?: boolean;
  isFinished?: boolean;
  finishedAt?: number;
  createdAt?: number;
  sectionOverride?: 'live' | 'upcoming' | 'finished';
  matchDate?: string;
  matchStartTime?: string;
  matchStartTimeIso?: string;
  isoStartTime?: string;
  notes?: string;
  firstInningsScore?: number | string;
  firstInningsWickets?: number;
  firstInningsOvers?: string | number;
  firstInningsTotalScore?: number | string;
  firstInningsCurrentScore?: string;
  firstInningsOverScores?: Record<string, string>;
  secondInningsOverScores?: Record<string, string>;
  team1Score?: string | number;
  team2Score?: string | number;
  // Football specific properties:
  footballScore1?: number;
  footballScore2?: number;
  footballMinute?: string | number; // e.g. "74'", "HT", "FT", "45+2'"
  footballPeriod?: '1H' | 'HT' | '2H' | 'ET' | 'P' | 'FT' | 'Not started' | string;
  footballGoals?: FootballGoalEvent[];
  footballCards?: FootballCardEvent[];
  footballStats?: FootballStats;
  footballVenue?: string;
  footballReferee?: string;
};

export type Match = MatchState;

export * from './types/betslip';

const KNOWN_SHORT_TEAM_NAMES: Record<string, string> = {
  // International Cricket & Football
  'india': 'IND',
  'ভারত': 'IND',
  'bangladesh': 'BAN',
  'বাংলাদেশ': 'BAN',
  'pakistan': 'PAK',
  'পাকিস্তান': 'PAK',
  'australia': 'AUS',
  'অস্ট্রেলিয়া': 'AUS',
  'অস্ট্রেলিয়া': 'AUS',
  'england': 'ENG',
  'ইংল্যান্ড': 'ENG',
  'south africa': 'SA',
  'দক্ষিণ আফ্রিকা': 'SA',
  'new zealand': 'NZ',
  'নিউজিল্যান্ড': 'NZ',
  'west indies': 'WI',
  'windies': 'WI',
  'ওয়েস্ট ইন্ডিজ': 'WI',
  'ওয়েস্ট ইন্ডিজ': 'WI',
  'sri lanka': 'SL',
  'শ্রীলঙ্কা': 'SL',
  'afghanistan': 'AFG',
  'আফগানিস্তান': 'AFG',
  'zimbabwe': 'ZIM',
  'জিম্বাবুয়ে': 'ZIM',
  'জিম্বাবুয়ে': 'ZIM',
  'ireland': 'IRE',
  'আয়ারল্যান্ড': 'IRE',
  'আয়ারল্যান্ড': 'IRE',
  'scotland': 'SCO',
  'স্কটল্যান্ড': 'SCO',
  'netherlands': 'NED',
  'নেদারল্যান্ডস': 'NED',
  'nepal': 'NEP',
  'নেপাল': 'NEP',
  'oman': 'OMA',
  'ওমান': 'OMA',
  'namibia': 'NAM',
  'নামিবিয়া': 'NAM',
  'united states': 'USA',
  'usa': 'USA',
  'united arab emirates': 'UAE',
  'uae': 'UAE',
  'canada': 'CAN',
  'কানাডা': 'CAN',
  'uganda': 'UGA',
  'papua new guinea': 'PNG',
  'hong kong': 'HK',
  // IPL
  'chennai super kings': 'CSK',
  'mumbai indians': 'MI',
  'royal challengers bengaluru': 'RCB',
  'royal challengers bangalore': 'RCB',
  'kolkata knight riders': 'KKR',
  'delhi capitals': 'DC',
  'sunrisers hyderabad': 'SRH',
  'rajasthan royals': 'RR',
  'punjab kings': 'PBKS',
  'lucknow super giants': 'LSG',
  'gujarat titans': 'GT',
  // BPL
  'fortune barishal': 'FBA',
  'ফরচুন বরিশাল': 'FBA',
  'বরিশাল': 'FBA',
  'comilla victorians': 'COV',
  'কুমিল্লা ভিক্টোরিয়ান্স': 'COV',
  'কুমিল্লা': 'COV',
  'rangpur riders': 'RAN',
  'রংপুর রাইডার্স': 'RAN',
  'রংপুর': 'RAN',
  'dhaka capitals': 'DHK',
  'dhaka dominators': 'DHK',
  'dhaka': 'DHK',
  'ঢাকা': 'DHK',
  'chittagong kings': 'CTG',
  'chattogram challengers': 'CTG',
  'চট্টগ্রাম': 'CTG',
  'khulna tigers': 'KHT',
  'খুলনা টাইগার্স': 'KHT',
  'খুলনা': 'KHT',
  'sylhet strikers': 'SYL',
  'সিলেট স্ট্রাইকার্স': 'SYL',
  'সিলেট': 'SYL',
  'durbar rajshahi': 'RAJ',
  'রাজশাহী': 'RAJ',
  // PSL / BBL / LPL
  'lahore qalandars': 'LQ',
  'karachi kings': 'KK',
  'islamabad united': 'IU',
  'peshawar zalmi': 'PZ',
  'quetta gladiators': 'QG',
  'multan sultans': 'MS',
  'sydney sixers': 'SIX',
  'sydney thunder': 'THU',
  'melbourne stars': 'STA',
  'melbourne renegades': 'REN',
  'perth scorchers': 'SCO',
  'adelaide strikers': 'STR',
  'brisbane heat': 'HEA',
  'hobart hurricanes': 'HUR',
  'jaffna kings': 'JK',
  'galle marvels': 'GM',
  'galle titans': 'GM',
  'colombo strikers': 'CS',
  'dambulla sixers': 'DS',
  'dambulla aura': 'DS',
  'kandy falcons': 'BLK',
  'b-love kandy': 'BLK',
  // Football Clubs & Nations
  'real madrid': 'RMA',
  'রিয়াল মাদ্রিদ': 'RMA',
  'রিয়াল মাদ্রিদ': 'RMA',
  'barcelona': 'BAR',
  'fc barcelona': 'BAR',
  'বার্সেলোনা': 'BAR',
  'manchester city': 'MCI',
  'man city': 'MCI',
  'ম্যানচেস্টার সিটি': 'MCI',
  'manchester united': 'MUN',
  'man utd': 'MUN',
  'man united': 'MUN',
  'ম্যানচেস্টার ইউনাইটেড': 'MUN',
  'liverpool': 'LIV',
  'লিভারপুল': 'LIV',
  'arsenal': 'ARS',
  'আর্সেনাল': 'ARS',
  'chelsea': 'CHE',
  'চেলসি': 'CHE',
  'tottenham': 'TOT',
  'tottenham hotspur': 'TOT',
  'টটেনহ্যাম': 'TOT',
  'newcastle united': 'NEW',
  'newcastle': 'NEW',
  'aston villa': 'AVL',
  'west ham': 'WHU',
  'west ham united': 'WHU',
  'brighton': 'BHA',
  'everton': 'EVE',
  'fulham': 'FUL',
  'brentford': 'BRE',
  'crystal palace': 'CRY',
  'wolves': 'WOL',
  'wolverhampton': 'WOL',
  'nottingham forest': 'NFO',
  'leicester city': 'LEI',
  'leicester': 'LEI',
  'bayern munich': 'BAY',
  'bayern': 'BAY',
  'বায়ার্ন মিউনিখ': 'BAY',
  'বায়ার্ন মিউনিখ': 'BAY',
  'borussia dortmund': 'BVB',
  'dortmund': 'BVB',
  'ডর্টমুন্ড': 'BVB',
  'bayer leverkusen': 'LEV',
  'leverkusen': 'LEV',
  'rb leipzig': 'RBL',
  'leipzig': 'RBL',
  'paris saint-germain': 'PSG',
  'paris saint germain': 'PSG',
  'psg': 'PSG',
  'পিএসজি': 'PSG',
  'marseille': 'OM',
  'lyon': 'OL',
  'monaco': 'ASM',
  'juventus': 'JUV',
  'জুভেন্টাস': 'JUV',
  'inter milan': 'INT',
  'inter': 'INT',
  'ইন্টার মিলান': 'INT',
  'ac milan': 'MIL',
  'milan': 'MIL',
  'এসি মিলান': 'MIL',
  'napoli': 'NAP',
  'roma': 'ROM',
  'as roma': 'ROM',
  'lazio': 'LAZ',
  'atalanta': 'ATA',
  'atletico madrid': 'ATM',
  'অ্যাটলেটিকো মাদ্রিদ': 'ATM',
  'sevilla': 'SEV',
  'valencia': 'VAL',
  'villarreal': 'VIL',
  'real betis': 'BET',
  'real sociedad': 'RSO',
  'athletic club': 'ATH',
  'athletic bilbao': 'ATH',
  'girona': 'GIR',
  'celta vigo': 'CEL',
  'osasuna': 'OSA',
  'getafe': 'GET',
  'mallorca': 'MLL',
  'las palmas': 'LPA',
  'rayo vallecano': 'RAY',
  'alaves': 'ALA',
  'leganes': 'LEG',
  'leganés': 'LEG',
  'cadiz': 'CAD',
  'cádiz': 'CAD',
  'espanyol': 'ESP',
  'valladolid': 'VLL',
  'argentina': 'ARG',
  'আর্জেন্টিনা': 'ARG',
  'brazil': 'BRA',
  'ব্রাজিল': 'BRA',
  'france': 'FRA',
  'ফ্রান্স': 'FRA',
  'spain': 'ESP',
  'স্পেন': 'ESP',
  'germany': 'GER',
  'জার্মানি': 'GER',
  'portugal': 'POR',
  'পর্তুগাল': 'POR',
  'italy': 'ITA',
  'ইতালি': 'ITA',
  'croatia': 'CRO',
  'ক্রোয়েশিয়া': 'CRO',
  'ক্রোয়েশিয়া': 'CRO',
  'belgium': 'BEL',
  'বেলজিয়াম': 'BEL',
  'uruguay': 'URU',
  'উরুগুয়ে': 'URU',
  'colombia': 'COL',
  'কলম্বিয়া': 'COL',
  'morocco': 'MAR',
  'মরক্কো': 'MAR',
  'japan': 'JPN',
  'জাপান': 'JPN',
  'south korea': 'KOR',
  'দক্ষিণ কোরিয়া': 'KOR',
  'saudi arabia': 'KSA',
  'সৌদি আরব': 'KSA',
  'qatar': 'QAT',
  'কাতার': 'QAT',
  'al nassr': 'NAS',
  'আল নাসর': 'NAS',
  'al hilal': 'HIL',
  'আল হিলাল': 'HIL',
  'al ittihad': 'ITT',
  'al ahli': 'AHL',
  'inter miami': 'MIA',
  'ইন্টার মায়ামি': 'MIA',
  'ইন্টার মায়ামি': 'MIA',
  'bashundhara kings': 'BKG',
  'বসুন্ধরা কিংস': 'BKG',
  'mohammedan': 'MSC',
  'মোহামেডান': 'MSC',
  'dhaka abahani': 'ABA',
  'আবাহনী': 'ABA',
  'east bengal': 'EBG',
  'mohun bagan': 'MBG',
  // Emerging, Champions & Provincial Teams
  'south africa emerging': 'SA-E',
  'sa emerging': 'SA-E',
  'sa-e': 'SA-E',
  'sae': 'SA-E',
  'western province': 'WP',
  'wp': 'WP',
  'england champions': 'ENG-C',
  'eng champions': 'ENG-C',
  'eng-c': 'ENG-C',
  'engc': 'ENG-C',
  'engch': 'ENG-C',
  'india champions': 'IND-C',
  'ind champions': 'IND-C',
  'ind-c': 'IND-C',
  'indc': 'IND-C',
  'indch': 'IND-C',
  'australia champions': 'AUS-C',
  'aus-c': 'AUS-C',
  'ausch': 'AUS-C',
  'pakistan champions': 'PAK-C',
  'pak-c': 'PAK-C',
  'pakch': 'PAK-C',
  'south africa champions': 'SA-C',
  'sa-c': 'SA-C',
  'sach': 'SA-C',
  'west indies champions': 'WI-C',
  'wi-c': 'WI-C',
  'wich': 'WI-C',
  'bangladesh champions': 'BAN-C',
  'ban-c': 'BAN-C',
  'banch': 'BAN-C',
  'vancouver anchors': 'VAC',
  'anchors': 'VAC',
  'vac': 'VAC',
  'brampton blitz': 'BBZ',
  'bbz': 'BBZ',
  'toronto sixers': 'TTS',
  'tts': 'TTS',
  'mississauga masters': 'MGM',
  'mgm': 'MGM',
  'white rock warriors': 'WRW',
  'wrw': 'WRW',
  'montreal royal tigers': 'MRT',
  'mrt': 'MRT',
  // Generic Defaults
  'টিম এ': 'TMA',
  'দল এ': 'TMA',
  'team a': 'TMA',
  'টিম বি': 'TMB',
  'দল বি': 'TMB',
  'team b': 'TMB',
  'team 1': 'TM1',
  'টিম ১': 'TM1',
  'team 2': 'TM2',
  'টিম ২': 'TM2'
};

const NON_ACRONYM_PAREN_WORDS = /^(?:women|woman|men|man|female|male|ladies|girls|boys|youth|junior|res|reserve|reserves|amateur|u\d{2}|under-?\d{2}|w|m|a|b|c|ii|iii|xi|fc|sc|cf|ac|afc|home|away)$/i;

export function getKnownCanonicalTeamCode(rawName?: string): string | null {
  if (!rawName || typeof rawName !== 'string') return null;
  const cleaned = rawName.replace(/^(?:track|watch|live|stream|summary)\s+/i, '').trim();
  if (!cleaned) return null;
  const lowerCleaned = cleaned.toLowerCase();
  if (KNOWN_SHORT_TEAM_NAMES[lowerCleaned]) {
    return KNOWN_SHORT_TEAM_NAMES[lowerCleaned];
  }
  const baseName = cleaned
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+(?:women|woman|men|man|w|m|xi|cc|fc|sc|cf|u\d{2}|under-?\d{2})$/i, '')
    .trim()
    .toLowerCase();
  if (baseName && KNOWN_SHORT_TEAM_NAMES[baseName]) {
    return KNOWN_SHORT_TEAM_NAMES[baseName];
  }
  return null;
}

export function getShortTeamName(rawName?: string, fallback = 'TM'): string {
  if (!rawName || typeof rawName !== 'string') return fallback;
  const cleaned = rawName
    .replace(/^(?:track|watch|live|stream|summary)\s+/i, '')
    .trim();
  if (!cleaned) return fallback;

  // Preserve explicit hyphenated short codes e.g. "SA-E", "ENG-C", "IND-C", "IND-A", "SA-W"
  if (/^[A-Za-z]{2,4}-[A-Za-z0-9]{1,3}$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  // Check if short code exists in parentheses e.g. "Royal Challengers (RCB)", ignoring category tags like "(Women)"
  const parenMatch = cleaned.match(/\(([A-Za-z0-9-]{2,6})\)$/);
  if (parenMatch && parenMatch[1] && !NON_ACRONYM_PAREN_WORDS.test(parenMatch[1].trim())) {
    return parenMatch[1].toUpperCase();
  }

  const lowerCleaned = cleaned.toLowerCase();
  if (KNOWN_SHORT_TEAM_NAMES[lowerCleaned]) {
    return KNOWN_SHORT_TEAM_NAMES[lowerCleaned];
  }

  // Handle "<Nation> Emerging" or "<Nation> Champions" before stripping suffixes
  const emergingOrChampMatch = lowerCleaned.match(/^(.+?)\s+(emerging|champions)$/i);
  if (emergingOrChampMatch) {
    const baseKey = emergingOrChampMatch[1].trim().toLowerCase();
    const suffixChar = emergingOrChampMatch[2].toLowerCase().startsWith('e') ? 'E' : 'C';
    const baseCode = KNOWN_SHORT_TEAM_NAMES[baseKey] || baseKey.slice(0, 3).toUpperCase();
    return `${baseCode}-${suffixChar}`;
  }

  const baseName = cleaned
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+(?:women|woman|men|man|w|m|xi|cc|fc|sc|cf|u\d{2}|under-?\d{2})$/i, '')
    .trim();

  const lower = baseName.toLowerCase();
  if (KNOWN_SHORT_TEAM_NAMES[lower]) {
    return KNOWN_SHORT_TEAM_NAMES[lower];
  }

  // Partial match for known franchises/nations (longest keys first)
  const sortedEntries = Object.entries(KNOWN_SHORT_TEAM_NAMES).sort((a, b) => b[0].length - a[0].length);
  for (const [k, code] of sortedEntries) {
    if (k.length >= 5 && lower.includes(k)) {
      return code;
    }
  }

  // If already short (<= 5 chars), return uppercase
  if (baseName.length <= 5) {
    return baseName.toUpperCase();
  }

  const words = baseName.split(/[\s\-_]+/).filter(Boolean);
  const isAscii = /^[A-Za-z0-9\s\-_.]+$/.test(baseName);

  if (words.length >= 3) {
    if (isAscii) {
      return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    }
    return words[0].slice(0, 3);
  }

  if (words.length === 2) {
    const [w1, w2] = words;
    if (/^[0-9A-Za-z]$/.test(w2) && isAscii) {
      return `${w1.slice(0, 2)}${w2}`.toUpperCase();
    }
    if (isAscii) {
      // e.g. "Northern Warriors" -> "NW", "Hobart Hurricanes" -> "HH"
      return `${w1[0]}${w2[0]}`.toUpperCase();
    }
    return w1.length <= 4 ? w1 : w1.slice(0, 3);
  }

  if (isAscii) {
    return baseName.slice(0, 3).toUpperCase();
  }
  return baseName.slice(0, 3);
}

export function formatShortMatchTitle(name?: string, team1?: string, team2?: string): string {
  const s1 = team1 ? getShortTeamName(team1, 'T1') : '';
  const s2 = team2 ? getShortTeamName(team2, 'T2') : '';
  if (s1 && s2) {
    if (!name || /\bvs?\b/i.test(name)) {
      return `${s1} vs ${s2}`;
    }
  }
  return name || (s1 && s2 ? `${s1} vs ${s2}` : 'Match');
}

