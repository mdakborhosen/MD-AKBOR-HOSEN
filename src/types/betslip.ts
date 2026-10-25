export type EventStatus = 'Win' | 'Lost' | 'Cancel' | 'Pending' | 'Live';

export type BetRuleType =
  | 'auto'
  | 'w1'
  | 'w2'
  | 'draw'
  | '1x'
  | '2x'
  | 'total_over'
  | 'total_under'
  | 'team1_over'
  | 'team1_under'
  | 'team2_over'
  | 'team2_under'
  | 'btts_yes'
  | 'btts_no'
  | 'cricket_milestone';

export interface BetEvent {
  id: string;
  dateTime: string;
  eventNumber: string;
  sport: string;
  league: string;
  match: string;
  team1: string;
  team2: string;
  selection: string;
  odds: string;
  status: EventStatus;
  score1?: string;
  score2?: string;
  hidden?: boolean;
  // Scorer Match Link-Up & Auto Settlement Fields
  linkedMatchId?: string;
  linkedMilestoneId?: string;
  liveMatchUrl?: string;
  autoSyncScore?: boolean;
  autoSettleResult?: boolean;
  betRuleType?: BetRuleType;
  betTargetValue?: number;
  betTargetOver?: number; // Target over for Cricket (e.g. 6, 10, 20) or Target minute for Football (e.g. 45, 90)
  betInnings?: 1 | 2;
  matchPeriodType?: 'HT' | 'FT'; // Indicates whether the bet/match in Bet Slip is HT (1st Half) or FT (Full Time)
  currentPeriodLabel?: string;   // Current match period label e.g. 'HT', 'FT', '1H', '2H'
  htScore1?: string;
  htScore2?: string;
  liveProgressText?: string;
  autoUnlinkedOnSlipLost?: boolean;
  manuallyUnlinked?: boolean;
  manuallyLinkedInLostSlip?: boolean;
}

export interface SavedSlipCard {
  id: string;
  amount: string;
  currency: string;
  countBadge?: number;
  colorScheme?: 'white' | 'blue';
  slipData: BetSlipData;
}

export interface BetSlipData {
  id: string;
  slipNumber: string;
  dateTime: string;
  betType: string;
  events: BetEvent[];
  overallOdds: string;
  wonOdds: string;
  stake: string;
  potentialWinnings: string;
  wonPayout: string;
  status: EventStatus;
  account?: string;
  possibleOdds?: string;
  possiblePayout?: string;
  overallPayout?: string;
  pendingCount?: number;
}
