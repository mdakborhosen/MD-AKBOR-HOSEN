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
  runs: number;
  over: number;
  condition: 'more' | 'lessOrEqual';
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

export type MatchState = {
  id: string;
  name: string;
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
  format?: '20' | '10' | '50' | '100';
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
  isUpcoming?: boolean;
  matchStartTime?: string;
  matchStartTimeIso?: string;
};

export * from './types/betslip';
