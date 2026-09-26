export type EventStatus = 'Win' | 'Lost' | 'Cancel' | 'Pending' | 'Live';

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
