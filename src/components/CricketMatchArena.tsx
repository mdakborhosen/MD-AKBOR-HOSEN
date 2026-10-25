import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Share2,
  Edit3,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Check,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Sparkles,
  UserPlus,
  Award,
  Flame,
  ArrowLeftRight,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { MatchState, PlayerStats, BowlerStats, getShortTeamName } from '../types';
import { formatMatchDateTimeDisplay, MatchCountdownBadge, toBengaliDigits } from './MatchCountdown';

interface CricketMatchArenaProps {
  match: MatchState;
  onUpdateMatch: React.Dispatch<React.SetStateAction<MatchState>>;
  lang: 'bn' | 'en';
  t: any;
  isUpcomingMatch: boolean;
  ballsPerOver: number;
  runRate: string;
  rotatedMilestone: any;
  rotatedMilestoneData: any;
  scoreFlicker?: boolean;
  onOpenEditTeams: () => void;
  onOpenLiveModal: () => void;
  onOpenStartTimeEditor?: () => void;
  onOpenTargetManager: (focus?: 'over' | 'target' | 'multiple') => void;
  onShareResult: (m: MatchState) => void;
  onSwapStrike: () => void;
  onSelectBatter: (slot: 1 | 2, idx: number) => void;
  onEditPlayer: (idx: number) => void;
  onEditTeamScore: () => void;
  onApplyOvers: (overs: number, balls: number) => void;
  onSaveT1TotalScore: (val: string) => void;
  onSaveTeamScoreGeneric: (teamNum: 1 | 2, val: string) => void;
  onSaveTargetRuns: (val: string) => void;
  onOpenRunRateChart: () => void;
  getMatchSourceHref: (m: MatchState) => string;
  areCricketTeamsSame: (a: string, b: string) => boolean;
  isInUpcomingSection?: boolean;
  onToggleSection?: () => void;
  onDeleteMatch?: () => void;
  resolvedBattingInfo: {
    cleanT1: string;
    cleanT2: string;
    isT2Batting: boolean;
    battingTeamName: string;
    bowlingTeamName: string;
    team1DisplayScore: string;
    team2DisplayScore: string;
    isTeam1YetToBat: boolean;
    isTeam2YetToBat: boolean;
  };
}

export const CricketMatchArena: React.FC<CricketMatchArenaProps> = ({
  match,
  onUpdateMatch,
  lang,
  t,
  isUpcomingMatch,
  ballsPerOver,
  runRate,
  rotatedMilestone,
  rotatedMilestoneData,
  scoreFlicker,
  onOpenEditTeams,
  onOpenLiveModal,
  onOpenStartTimeEditor,
  onOpenTargetManager,
  onShareResult,
  onSwapStrike,
  onSelectBatter,
  onEditPlayer,
  onEditTeamScore,
  onApplyOvers,
  onSaveTeamScoreGeneric,
  onSaveTargetRuns,
  onOpenRunRateChart,
  getMatchSourceHref,
  isInUpcomingSection,
  onToggleSection,
  onDeleteMatch,
  resolvedBattingInfo
}) => {
  const dateTimeInfo = formatMatchDateTimeDisplay(match.matchStartTime, match.matchStartTimeIso, lang, match.matchDate);
  const isFinished = Boolean(match.isFinished);
  const {
    cleanT1,
    cleanT2,
    isT2Batting,
    battingTeamName,
    team1DisplayScore,
    team2DisplayScore,
    isTeam1YetToBat,
    isTeam2YetToBat
  } = resolvedBattingInfo;

  // Which team's player scorecard dropdown is open beneath the teams ('team1' | 'team2' | 'both' | null)
  const [expandedTeamDropdown, setExpandedTeamDropdown] = useState<'team1' | 'team2' | 'both' | null>(null);
  // Which individual player row is expanded for detailed view inside the scorecard dropdown
  const [expandedPlayerKey, setExpandedPlayerKey] = useState<string | null>(null);

  // Inline editors state
  const [isEditingOversInline, setIsEditingOversInline] = useState(false);
  const [overInput, setOverInput] = useState('0');
  const [ballInput, setBallInput] = useState('0');

  const [editingTeamScoreSide, setEditingTeamScoreSide] = useState<'team1' | 'team2' | null>(null);
  const [teamScoreInput, setTeamScoreInput] = useState('');

  const [isEditingTargetInline, setIsEditingTargetInline] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const [newPlayerTeam1, setNewPlayerTeam1] = useState('');
  const [newPlayerTeam2, setNewPlayerTeam2] = useState('');
  const [showAddPlayerInput, setShowAddPlayerInput] = useState<'team1' | 'team2' | null>(null);

  const curOversNum = Math.floor(match.balls / ballsPerOver);
  const curBallsInOver = match.balls % ballsPerOver;
  const oversDisplay = curBallsInOver > 0
    ? `${curOversNum}.${curBallsInOver}`
    : `${curOversNum}.0`;

  const maxOversVal = match.maxOvers || (match.format === '10' ? 10 : match.format === '50' ? 50 : 20);
  const formatLabel = match.format === '100'
    ? '100-Ball'
    : match.format === '50'
      ? `ODI • ${maxOversVal} Ov`
      : match.format === '10'
        ? `T10 • ${maxOversVal} Ov`
        : `T20 • ${maxOversVal} Ov`;

  const otherTeamRawScore = isT2Batting ? team1DisplayScore : team2DisplayScore;
  const isOtherTeamYetToBat = isT2Batting ? isTeam1YetToBat : isTeam2YetToBat;
  const isSecondInnings = !isUpcomingMatch && !isOtherTeamYetToBat;

  const parsedFirstInningsRuns = isSecondInnings
    ? parseInt(
        String(match.firstInningsTotalScore || match.firstInningsScore || otherTeamRawScore || ''),
        10
      )
    : NaN;
  const derivedTargetFromFirstInnings = !isNaN(parsedFirstInningsRuns) && parsedFirstInningsRuns > 0 ? parsedFirstInningsRuns + 1 : 0;

  const currentTargetVal = isSecondInnings
    ? (rotatedMilestone
        ? (rotatedMilestone.condition === 'more' ? rotatedMilestone.runs + 1 : rotatedMilestone.runs)
        : (match.target || derivedTargetFromFirstInnings || match.targetMilestones?.[0]?.runs || 0))
    : 0;

  const handleSwitchBattingTeam = (targetTeamNum: 1 | 2) => {
    const isAlreadyBatting = (targetTeamNum === 1 && !isT2Batting) || (targetTeamNum === 2 && isT2Batting);
    if (isAlreadyBatting) return;

    onUpdateMatch((prev) => {
      const bpo = prev.format === '100' ? 5 : 6;
      const prevOvStr = prev.balls > 0 ? ` (${Math.floor(prev.balls / bpo)}.${prev.balls % bpo})` : '';
      const prevFormatted = `${prev.score}/${prev.wickets}${prevOvStr}`;
      const wasT2Batting = ! (targetTeamNum === 2);

      // Save current batting team's score & player stats before switching
      const hasCurrentProgress = prev.score > 0 || prev.wickets > 0 || prev.balls > 0;
      const nextTeam1Score = !wasT2Batting && hasCurrentProgress ? prevFormatted : prev.team1Score;
      const nextTeam2Score = wasT2Batting && hasCurrentProgress ? prevFormatted : prev.team2Score;
      const nextT1Stats = !wasT2Batting && prev.battingStats ? prev.battingStats : prev.team1BattingStats;
      const nextT2Stats = wasT2Batting && prev.battingStats ? prev.battingStats : prev.team2BattingStats;

      // Determine new batting team's existing score (if they already batted) or 0/0 for 2nd innings start
      const targetStoredScore = targetTeamNum === 1 ? nextTeam1Score : nextTeam2Score;
      let nextScore = 0;
      let nextWickets = 0;
      let nextBalls = 0;
      if (targetStoredScore && !/yet\s+to\s+bat/i.test(String(targetStoredScore))) {
        const rw = String(targetStoredScore).match(/(\d{1,3})[\/-](\d{1,2})/);
        if (rw) {
          nextScore = parseInt(rw[1], 10) || 0;
          nextWickets = Math.min(10, parseInt(rw[2], 10) || 0);
        }
        const ovM = String(targetStoredScore).match(/\(\s*(\d{1,2})(?:\.(\d))?/);
        if (ovM) {
          nextBalls = (parseInt(ovM[1], 10) || 0) * bpo + (parseInt(ovM[2] || '0', 10) || 0);
        }
      }

      const newBattingName = targetTeamNum === 1 ? cleanT1 : cleanT2;
      const newBowlingName = targetTeamNum === 1 ? cleanT2 : cleanT1;
      const otherSavedScore = targetTeamNum === 1 ? nextTeam2Score : nextTeam1Score;
      const nextFirstInnings = otherSavedScore || prev.firstInningsScore;
      const firstRunsNum = parseInt(String(nextFirstInnings || ''), 10);

      const fallbackT1Stats = (prev.playerList1 || []).map(name => ({
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false
      }));
      const fallbackT2Stats = (prev.playerList2 || []).map(name => ({
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false
      }));

      return {
        ...prev,
        battingTeam: newBattingName,
        bowlingTeam: newBowlingName,
        score: nextScore,
        wickets: nextWickets,
        balls: nextBalls,
        team1Score: nextTeam1Score,
        team2Score: nextTeam2Score,
        firstInningsScore: nextFirstInnings,
        firstInningsTotalScore: nextFirstInnings,
        target: (!isNaN(firstRunsNum) && firstRunsNum > 0 && (!prev.target || prev.target <= 0)) ? firstRunsNum + 1 : prev.target,
        team1BattingStats: nextT1Stats,
        team2BattingStats: nextT2Stats,
        battingStats: targetTeamNum === 1
          ? (nextT1Stats && nextT1Stats.length > 0 ? nextT1Stats : fallbackT1Stats)
          : (nextT2Stats && nextT2Stats.length > 0 ? nextT2Stats : fallbackT2Stats)
      };
    });

    const switchedTeam = targetTeamNum === 1 ? cleanT1 : cleanT2;
    toast.success(lang === 'bn' ? `${switchedTeam} ব্যাটিংয়ে সেট করা হয়েছে (উভয় দলের স্কোর সংরক্ষিত)` : `${switchedTeam} set as Batting Team (both team scores preserved)`);
  };

  // Build player stats list for Team 1 and Team 2 (strictly separated per team so scores never mix)
  const isUnmappedShortCode = (p: PlayerStats) =>
    Boolean(p.yetToBat && p.runs === 0 && p.balls === 0 && /^[A-Z0-9]{1,4}$/i.test((p.name || '').trim()));

  const getTeamPlayersStats = (teamNum: 1 | 2): { players: PlayerStats[]; isCurrentlyBatting: boolean } => {
    const isTeamBatting = teamNum === 1 ? !isT2Batting : isT2Batting;
    const dedicatedStats = (teamNum === 1 ? match.team1BattingStats : match.team2BattingStats)?.filter(p => !isUnmappedShortCode(p));
    const rawList = (teamNum === 1 ? (match.playerList1 || []) : (match.playerList2 || [])).filter(
      n => n && !/^[A-Z0-9]{1,4}$/i.test(n.trim())
    );
    const teamLabel = teamNum === 1 ? cleanT1 : cleanT2;

    if (Array.isArray(dedicatedStats) && dedicatedStats.length > 0) {
      if (rawList.length > dedicatedStats.length) {
        const extra = rawList
          .filter(n => !dedicatedStats.some(d => d.name.toLowerCase() === n.toLowerCase()))
          .map(name => ({
            name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            isOut: false,
            yetToBat: true
          }));
        return {
          players: [...dedicatedStats, ...extra],
          isCurrentlyBatting: isTeamBatting
        };
      }
      return {
        players: dedicatedStats,
        isCurrentlyBatting: isTeamBatting
      };
    }

    if (isTeamBatting && Array.isArray(match.battingStats) && match.battingStats.length > 0) {
      const cleanedBatting = match.battingStats.filter(p => !isUnmappedShortCode(p));
      if (cleanedBatting.length > 0) {
        return {
          players: cleanedBatting,
          isCurrentlyBatting: true
        };
      }
    }

    if (rawList.length > 0) {
      return {
        players: rawList.map((name) => ({
          name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false,
          yetToBat: true
        })),
        isCurrentlyBatting: isTeamBatting
      };
    }

    // Default placeholder squad if no players added yet
    const defaultPlayers: PlayerStats[] = Array.from({ length: 6 }, (_, i) => ({
      name: lang === 'bn' ? `${teamLabel} প্লেয়ার ${i + 1}` : `${teamLabel} Player ${i + 1}`,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      yetToBat: true
    }));

    return {
      players: defaultPlayers,
      isCurrentlyBatting: isTeamBatting
    };
  };

  const team1Data = getTeamPlayersStats(1);
  const team2Data = getTeamPlayersStats(2);

  const getTeamBowlingStats = (teamNum: 1 | 2): BowlerStats[] => {
    const dedicatedBowlers = (teamNum === 1 ? match.team1BowlingStats : match.team2BowlingStats)?.filter(
      b => b && b.name && !/^[A-Z0-9]{1,4}$/i.test(b.name.trim())
    );
    if (Array.isArray(dedicatedBowlers) && dedicatedBowlers.length > 0) {
      return dedicatedBowlers;
    }

    const isTeamBatting = teamNum === 1 ? !isT2Batting : isT2Batting;
    const inningsBatters = (teamNum === 1 ? team1Data.players : team2Data.players) || [];
    const derivedMap = new Map<string, number>();
    for (const p of inningsBatters) {
      if (p.isOut && p.wicketType) {
        const bm = p.wicketType.match(/\bb\s+([A-Za-z][A-Za-z.'\s-]{2,25})$/i);
        if (bm && bm[1]) {
          const bName = bm[1].trim();
          derivedMap.set(bName, (derivedMap.get(bName) || 0) + 1);
        }
      }
    }
    const derivedList: BowlerStats[] = Array.from(derivedMap.entries()).map(([name, wkts]) => {
      if (isTeamBatting && match.liveBowlerStats && match.liveBowlerStats.name.toLowerCase() === name.toLowerCase()) {
        return match.liveBowlerStats;
      }
      return {
        name,
        wickets: wkts,
        runs: 0,
        overs: '1.0',
        maidens: 0,
        economy: '0.00'
      };
    });

    if (isTeamBatting && match.liveBowlerStats && match.liveBowlerStats.name) {
      if (!derivedList.some(b => b.name.toLowerCase() === match.liveBowlerStats!.name.toLowerCase())) {
        derivedList.push(match.liveBowlerStats);
      }
    }
    if (derivedList.length > 0) return derivedList;

    const oppPlayers = (teamNum === 1 ? team2Data.players : team1Data.players) || [];
    return oppPlayers.slice(-5).map((p, idx) => ({
      name: p.name,
      wickets: idx === 0 && isTeamBatting ? (match.wickets || 0) : 0,
      runs: idx === 0 && isTeamBatting ? (match.score || 0) : 0,
      overs: idx === 0 && isTeamBatting ? oversDisplay : '0.0',
      maidens: 0,
      economy: idx === 0 && isTeamBatting ? runRate : '0.00'
    }));
  };

  const team1Bowlers = getTeamBowlingStats(1);
  const team2Bowlers = getTeamBowlingStats(2);

  const active1Idx = match.activeBatsman1Idx ?? 0;
  const active2Idx = match.activeBatsman2Idx ?? 1;
  const onStrikeIdx = match.onStrikeIdx ?? 0;

  const toggleTeamDropdown = (side: 'team1' | 'team2') => {
    setExpandedTeamDropdown((prev) => {
      if (prev === side) return null;
      if (prev === 'both') return side === 'team1' ? 'team2' : 'team1';
      return side;
    });
  };

  const handleAddPlayerToTeam = (teamNum: 1 | 2) => {
    const rawName = (teamNum === 1 ? newPlayerTeam1 : newPlayerTeam2).trim();
    if (!rawName) return;

    onUpdateMatch((prev) => {
      const listKey = teamNum === 1 ? 'playerList1' : 'playerList2';
      const existingList = [...(prev[listKey] || [])];
      if (existingList.length >= 13) {
        toast.error(lang === 'bn' ? 'সর্বোচ্চ ১৩ জন প্লেয়ার যোগ করা যাবে' : 'Maximum 13 players allowed');
        return prev;
      }
      existingList.push(rawName);

      const isThisTeamBatting = (teamNum === 1 && !isT2Batting) || (teamNum === 2 && isT2Batting);
      const nextBattingStats = [...(prev.battingStats || [])];
      if (isThisTeamBatting) {
        nextBattingStats.push({
          name: rawName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          isOut: false
        });
      }

      return {
        ...prev,
        [listKey]: existingList,
        battingStats: isThisTeamBatting ? nextBattingStats : prev.battingStats
      };
    });

    if (teamNum === 1) setNewPlayerTeam1('');
    else setNewPlayerTeam2('');
    setShowAddPlayerInput(null);
    toast.success(lang === 'bn' ? `${rawName} স্কোরকার্ডে যুক্ত হয়েছে` : `${rawName} added to scorecard`);
  };

  const handleQuickPlayerRun = (teamNum: 1 | 2, playerIdx: number, addRuns: number) => {
    onUpdateMatch((prev) => {
      const isThisTeamBatting = (teamNum === 1 && !isT2Batting) || (teamNum === 2 && isT2Batting);
      const sourceStats = isThisTeamBatting && prev.battingStats && prev.battingStats.length > 0
        ? prev.battingStats
        : (teamNum === 1 ? (prev.team1BattingStats || team1Data.players) : (prev.team2BattingStats || team2Data.players));
      const baseStats = sourceStats.map(p => ({ ...p }));

      const targetPlayer = baseStats[playerIdx];
      if (!targetPlayer) return prev;

      baseStats[playerIdx] = {
        ...targetPlayer,
        runs: Math.max(0, (targetPlayer.runs || 0) + addRuns),
        balls: (targetPlayer.balls || 0) + 1,
        fours: addRuns === 4 ? (targetPlayer.fours || 0) + 1 : (targetPlayer.fours || 0),
        sixes: addRuns === 6 ? (targetPlayer.sixes || 0) + 1 : (targetPlayer.sixes || 0)
      };

      return {
        ...prev,
        battingStats: isThisTeamBatting ? baseStats : prev.battingStats,
        team1BattingStats: teamNum === 1 ? baseStats : prev.team1BattingStats,
        team2BattingStats: teamNum === 2 ? baseStats : prev.team2BattingStats
      };
    });
  };

  const handleTogglePlayerOut = (teamNum: 1 | 2, playerIdx: number) => {
    onUpdateMatch((prev) => {
      const isThisTeamBatting = (teamNum === 1 && !isT2Batting) || (teamNum === 2 && isT2Batting);
      const sourceStats = isThisTeamBatting && prev.battingStats && prev.battingStats.length > 0
        ? prev.battingStats
        : (teamNum === 1 ? (prev.team1BattingStats || team1Data.players) : (prev.team2BattingStats || team2Data.players));
      const baseStats = sourceStats.map(p => ({ ...p }));

      const targetPlayer = baseStats[playerIdx];
      if (!targetPlayer) return prev;

      baseStats[playerIdx] = {
        ...targetPlayer,
        isOut: !targetPlayer.isOut,
        wicketType: !targetPlayer.isOut ? (lang === 'bn' ? 'আউট' : 'Out') : undefined
      };

      return {
        ...prev,
        battingStats: isThisTeamBatting ? baseStats : prev.battingStats,
        team1BattingStats: teamNum === 1 ? baseStats : prev.team1BattingStats,
        team2BattingStats: teamNum === 2 ? baseStats : prev.team2BattingStats
      };
    });
  };

  const renderTeamScorecardPanel = (teamNum: 1 | 2) => {
    const teamName = teamNum === 1 ? cleanT1 : cleanT2;
    const { players, isCurrentlyBatting } = teamNum === 1 ? team1Data : team2Data;
    const teamDisplayScore = teamNum === 1 ? team1DisplayScore : team2DisplayScore;
    const isYetToBat = teamNum === 1 ? isTeam1YetToBat : isTeam2YetToBat;

    const notOutIndices = players
      .map((p, idx) => (!p.isOut && !p.yetToBat && (p.balls > 0 || p.runs > 0 || p.wicketType === 'not out') ? idx : -1))
      .filter(idx => idx !== -1);
    const panelActive1Idx =
      !isFinished &&
      isCurrentlyBatting &&
      typeof active1Idx === 'number' &&
      players[active1Idx] &&
      !players[active1Idx].isOut
        ? active1Idx
        : (!isFinished && isCurrentlyBatting ? (notOutIndices[0] ?? 0) : undefined);
    const panelActive2Idx =
      !isFinished &&
      isCurrentlyBatting &&
      typeof active2Idx === 'number' &&
      active2Idx !== panelActive1Idx &&
      players[active2Idx] &&
      !players[active2Idx].isOut
        ? active2Idx
        : (!isFinished && isCurrentlyBatting ? (notOutIndices.find(i => i !== panelActive1Idx) ?? (panelActive1Idx === 0 ? 1 : 0)) : undefined);

    const b1 = typeof panelActive1Idx === 'number' ? players[panelActive1Idx] : null;
    const b2 = typeof panelActive2Idx === 'number' ? players[panelActive2Idx] : null;
    const panelStrikerBatter = onStrikeIdx === 1 ? b2 : b1;
    const panelNonStrikerBatter = onStrikeIdx === 1 ? b1 : b2;
    const panelStrikerSlot: 1 | 2 = onStrikeIdx === 1 ? 2 : 1;
    const panelNonStrikerSlot: 1 | 2 = onStrikeIdx === 1 ? 1 : 2;
    const panelStrikerIdx = (onStrikeIdx === 1 ? panelActive2Idx : panelActive1Idx) ?? 0;
    const panelNonStrikerIdx = (onStrikeIdx === 1 ? panelActive1Idx : panelActive2Idx) ?? 1;

    return (
      <div
        key={`scorecard-panel-team-${teamNum}`}
        className="rounded-2xl bg-slate-950/90 border border-emerald-500/30 shadow-xl overflow-hidden"
      >
        {/* Dropdown Panel Top Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-[10px] font-black text-emerald-300 shrink-0">
              {getShortTeamName(teamName, teamNum === 1 ? 'T1' : 'T2').slice(0, 3)}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-black text-white text-xs sm:text-sm truncate">
                {teamName} {lang === 'bn' ? 'স্কোরকার্ড' : 'Scorecard'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                isCurrentlyBatting
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                {isYetToBat ? (lang === 'bn' ? 'ব্যাটিং করেনি' : 'Yet to bat') : teamDisplayScore}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowAddPlayerInput(showAddPlayerInput === `team${teamNum}` ? null : `team${teamNum}`)}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <UserPlus size={11} />
              <span>{lang === 'bn' ? '+ প্লেয়ার' : '+ Player'}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTeamDropdown(teamNum === 1 ? 'team1' : 'team2')}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              title={lang === 'bn' ? 'স্কোরকার্ড কলাপ্স করুন' : 'Collapse scorecard'}
            >
              <ChevronUp size={12} />
              <span>{lang === 'bn' ? 'কলাপ্স' : 'Collapse'}</span>
            </button>
          </div>
        </div>

        {/* Add Player Input Row */}
        <AnimatePresence>
          {showAddPlayerInput === `team${teamNum}` && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/10 bg-slate-900/90"
            >
              <div className="p-2.5 flex items-center gap-2">
                <input
                  type="text"
                  value={teamNum === 1 ? newPlayerTeam1 : newPlayerTeam2}
                  onChange={(e) => teamNum === 1 ? setNewPlayerTeam1(e.target.value) : setNewPlayerTeam2(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPlayerToTeam(teamNum);
                  }}
                  placeholder={lang === 'bn' ? `${teamName} প্লেয়ারের নাম লিখুন...` : `Enter ${teamName} player name...`}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleAddPlayerToTeam(teamNum)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  {lang === 'bn' ? 'যোগ করুন' : 'Add'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active On-Crease Striker & Non-Striker Summary (if this team is currently batting) */}
        {isCurrentlyBatting && !isUpcomingMatch && (b1 || b2) && (
          <div className="p-2.5 bg-slate-900/60 border-b border-white/5">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Flame size={11} />
                {lang === 'bn' ? 'বর্তমানে ক্রিজে ব্যাটিংরত' : 'Currently at the Crease'}
              </span>
              <button
                type="button"
                onClick={onSwapStrike}
                className="px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <RefreshCw size={10} />
                <span>{lang === 'bn' ? 'স্ট্রাইক বদল' : 'Swap Strike'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { batter: panelStrikerBatter, slot: panelStrikerSlot, idx: panelStrikerIdx, isStrike: true },
                { batter: panelNonStrikerBatter, slot: panelNonStrikerSlot, idx: panelNonStrikerIdx, isStrike: false }
              ].map(({ batter, slot, idx, isStrike }) => (
                <motion.div
                  layout
                  key={`crease-b-${batter?.name || slot}-${isStrike ? 'striker' : 'nonstriker'}`}
                  onClick={() => onSelectBatter(slot, idx)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isStrike
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-white shadow-sm'
                      : 'bg-slate-900/90 border-white/10 text-slate-200 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black truncate">
                        {batter?.name || (lang === 'bn' ? `ব্যাটার ${slot}` : `Batter ${slot}`)}
                      </span>
                      {isStrike && (
                        <span className="text-emerald-400 font-black text-xs">*</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      4s: {batter?.fours ?? 0} • 6s: {batter?.sixes ?? 0} • SR: {batter && batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(0) : '0'}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-base sm:text-lg font-black text-emerald-300">{batter?.runs ?? 0}</span>
                    <span className="text-[11px] text-slate-400 ml-0.5">({batter?.balls ?? 0})</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Players Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-white/5">
                <th className="py-2 pl-3 pr-2">{lang === 'bn' ? 'প্লেয়ার' : 'Player'}</th>
                <th className="py-2 px-1.5 text-center">{lang === 'bn' ? 'রান' : 'R'}</th>
                <th className="py-2 px-1.5 text-center">{lang === 'bn' ? 'বল' : 'B'}</th>
                <th className="py-2 px-1.5 text-center">4s</th>
                <th className="py-2 px-1.5 text-center">6s</th>
                <th className="py-2 px-1.5 text-center">SR</th>
                <th className="py-2 pl-1.5 pr-3 text-right">{lang === 'bn' ? 'বিস্তারিত' : 'Info'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {players.map((p, idx) => {
                const pKey = `team-${teamNum}-p-${idx}`;
                const isRowExpanded = expandedPlayerKey === pKey;
                const isActiveB1 = isCurrentlyBatting && !isFinished && idx === panelActive1Idx && !p.isOut && !p.yetToBat;
                const isActiveB2 = isCurrentlyBatting && !isFinished && idx === panelActive2Idx && !p.isOut && !p.yetToBat;
                const isOnStrike = (isActiveB1 && onStrikeIdx === 0) || (isActiveB2 && onStrikeIdx === 1);
                const srVal = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
                const boundaryRuns = (p.fours || 0) * 4 + (p.sixes || 0) * 6;
                const boundaryPct = p.runs > 0 ? Math.min(100, Math.round((boundaryRuns / p.runs) * 100)) : 0;

                return (
                  <React.Fragment key={pKey}>
                    <tr
                      onClick={() => setExpandedPlayerKey(isRowExpanded ? null : pKey)}
                      className={`transition-colors cursor-pointer ${
                        isActiveB1 || isActiveB2
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/15 font-bold text-white'
                          : 'hover:bg-white/5 text-slate-200'
                      }`}
                    >
                      <td className="py-2.5 pl-3 pr-2 font-bold">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-slate-500 w-3.5 shrink-0">{idx + 1}.</span>
                            <span className="truncate">{p.name}</span>
                            {isOnStrike && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[9px] font-black shrink-0">
                                *
                              </span>
                            )}
                            {isActiveB1 && !isOnStrike && (
                              <span className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[8px] font-black shrink-0">B1</span>
                            )}
                            {isActiveB2 && !isOnStrike && (
                              <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-black shrink-0">B2</span>
                            )}
                          </div>
                          {p.isOut && p.wicketType && (
                            <span className="text-[10px] font-normal text-rose-300/85 pl-5 truncate max-w-[160px] sm:max-w-[230px]">
                              {p.wicketType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-mono font-black text-white">{p.yetToBat ? '-' : p.runs}</td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-slate-400">{p.yetToBat ? '-' : p.balls}</td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-amber-300">{p.yetToBat ? '-' : p.fours}</td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-purple-300">{p.yetToBat ? '-' : p.sixes}</td>
                      <td className="py-2.5 px-1.5 text-center font-mono text-cyan-300 text-[11px]">{p.yetToBat ? '-' : srVal}</td>
                      <td className="py-2.5 pl-1.5 pr-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {p.isOut ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black uppercase truncate max-w-[95px]">
                              {p.wicketType || (lang === 'bn' ? 'আউট' : 'Out')}
                            </span>
                          ) : (!p.yetToBat && (isActiveB1 || isActiveB2 || p.balls > 0 || p.runs > 0 || p.wicketType === 'not out')) ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                              {lang === 'bn' ? 'নট আউট' : 'Not Out'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 text-[9px] font-bold">
                              {lang === 'bn' ? 'অপেক্ষমাণ' : 'Yet to Bat'}
                            </span>
                          )}
                          {isRowExpanded ? (
                            <ChevronUp size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="text-slate-400 shrink-0" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Per-Player Expandable Details & Quick Edit Dropdown */}
                    <AnimatePresence>
                      {isRowExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-slate-900/95 border-b border-emerald-500/20">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 space-y-2.5">
                                {/* Detailed Stats Badges */}
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center font-mono">
                                  <div className="p-1.5 rounded-xl bg-slate-950/90 border border-white/10">
                                    <div className="text-[9px] text-slate-400 uppercase font-sans">{lang === 'bn' ? 'রান (বল)' : 'Runs (Balls)'}</div>
                                    <div className="text-xs font-black text-white">{p.runs} ({p.balls})</div>
                                  </div>
                                  <div className="p-1.5 rounded-xl bg-slate-950/90 border border-white/10">
                                    <div className="text-[9px] text-slate-400 uppercase font-sans">{lang === 'bn' ? 'স্ট্রাইক রেট' : 'Strike Rate'}</div>
                                    <div className="text-xs font-black text-cyan-300">{srVal}</div>
                                  </div>
                                  <div className="p-1.5 rounded-xl bg-slate-950/90 border border-white/10">
                                    <div className="text-[9px] text-slate-400 uppercase font-sans">{lang === 'bn' ? 'চার / ছয়' : '4s / 6s'}</div>
                                    <div className="text-xs font-black text-amber-300">{p.fours} / {p.sixes}</div>
                                  </div>
                                  <div className="p-1.5 rounded-xl bg-slate-950/90 border border-white/10">
                                    <div className="text-[9px] text-slate-400 uppercase font-sans">{lang === 'bn' ? 'বাউন্ডারি রান' : 'Boundary %'}</div>
                                    <div className="text-xs font-black text-emerald-300">{boundaryRuns} ({boundaryPct}%)</div>
                                  </div>
                                  <div className="p-1.5 rounded-xl bg-slate-950/90 border border-white/10 col-span-3 sm:col-span-1">
                                    <div className="text-[9px] text-slate-400 uppercase font-sans">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</div>
                                    <div className="text-xs font-black text-indigo-300">
                                      {p.isOut ? (p.wicketType || (lang === 'bn' ? 'আউট' : 'Out')) : (lang === 'bn' ? 'নট আউট' : 'Not Out')}
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Player Action Controls */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex flex-wrap items-center gap-1">
                                    {[0, 1, 2, 4, 6].map((rVal) => (
                                      <button
                                        key={rVal}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickPlayerRun(teamNum, idx, rVal);
                                        }}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black border cursor-pointer transition-all active:scale-95 ${
                                          rVal === 4
                                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                            : rVal === 6
                                              ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                                        }`}
                                      >
                                        +{rVal}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePlayerOut(teamNum, idx);
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                                        p.isOut
                                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                          : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                                      }`}
                                    >
                                      {p.isOut ? (lang === 'bn' ? 'নট আউট করুন' : 'Mark Not Out') : (lang === 'bn' ? 'আউট করুন' : 'Mark Out')}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {isCurrentlyBatting && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditPlayer(idx);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Edit3 size={10} />
                                        <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedPlayerKey(null);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <ChevronUp size={11} />
                                      <span>{lang === 'bn' ? 'কলাপ্স' : 'Collapse'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Fall of Wickets (if any) */}
        {isCurrentlyBatting && match.history && match.history.some(e => e.isWicket) && (
          <div className="p-2.5 bg-slate-900/70 border-t border-white/5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown size={12} className="text-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t.fallOfWickets || (lang === 'bn' ? 'উইকেটের পতন' : 'Fall of Wickets')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...match.history]
                .reverse()
                .filter(e => e.isWicket)
                .map((e, wIdx) => (
                  <span
                    key={wIdx}
                    className="px-2 py-0.5 rounded-lg bg-slate-950 border border-rose-500/25 text-[10px] font-mono text-slate-300"
                  >
                    <strong className="text-rose-400">{e.score}/{wIdx + 1}</strong> ({Math.floor(e.totalBallsAtEvent / ballsPerOver)}.{e.totalBallsAtEvent % ballsPerOver} ov)
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Bowling Scorecard Section for this Innings */}
        {(() => {
          const inningsBowlers = teamNum === 1 ? team1Bowlers : team2Bowlers;
          const bowlingTeamLabel = teamNum === 1 ? cleanT2 : cleanT1;
          return (
            <div className="border-t border-white/10 bg-slate-950/95">
              <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 border-b border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🎯</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                    {lang === 'bn'
                      ? `বোলিং স্কোরকার্ড (${bowlingTeamLabel})`
                      : `Bowling Scorecard (${bowlingTeamLabel})`}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {inningsBowlers.length} {lang === 'bn' ? 'বোলার' : 'Bowlers'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <th className="py-2 pl-3 pr-2">{lang === 'bn' ? 'বোলার' : 'Bowler'}</th>
                      <th className="py-2 px-1.5 text-center">O</th>
                      <th className="py-2 px-1.5 text-center">M</th>
                      <th className="py-2 px-1.5 text-center">R</th>
                      <th className="py-2 px-1.5 text-center">W</th>
                      <th className="py-2 pl-1.5 pr-3 text-right">ECON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {inningsBowlers.map((bw, bIdx) => {
                      const isActiveBowler =
                        isCurrentlyBatting &&
                        !isFinished &&
                        match.liveBowlerStats &&
                        match.liveBowlerStats.name.toLowerCase() === bw.name.toLowerCase();
                      return (
                        <tr
                          key={`team-${teamNum}-bw-${bIdx}-${bw.name}`}
                          className={`transition-colors ${
                            isActiveBowler
                              ? 'bg-cyan-500/10 font-bold text-white'
                              : 'hover:bg-white/5 text-slate-200'
                          }`}
                        >
                          <td className="py-2.5 pl-3 pr-2 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono text-slate-500 w-3.5 shrink-0">{bIdx + 1}.</span>
                              <span className="truncate">{bw.name}</span>
                              {isActiveBowler && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 text-[8px] font-black uppercase shrink-0">
                                  BOWL
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-1.5 text-center font-mono text-slate-300">{bw.overs || '0.0'}</td>
                          <td className="py-2.5 px-1.5 text-center font-mono text-slate-400">{bw.maidens ?? 0}</td>
                          <td className="py-2.5 px-1.5 text-center font-mono font-bold text-white">{bw.runs ?? 0}</td>
                          <td className="py-2.5 px-1.5 text-center font-mono font-black">
                            {(bw.wickets ?? 0) > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                                {bw.wickets}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-1.5 pr-3 text-right font-mono text-amber-300 text-[11px]">
                            {bw.economy || '0.00'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Bottom Collapse Bar */}
        <button
          type="button"
          onClick={() => toggleTeamDropdown(teamNum === 1 ? 'team1' : 'team2')}
          className="w-full py-2 bg-slate-900/90 hover:bg-slate-800/90 border-t border-white/10 text-[11px] font-black text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <ChevronUp size={14} />
          <span>{lang === 'bn' ? `${teamName} স্কোরকার্ড কলাপ্স করুন` : `Collapse ${teamName} Scorecard`}</span>
        </button>
      </div>
    );
  };

  const t1ScoreParts = (() => {
    const trimmed = (team1DisplayScore || '').trim();
    const m = trimmed.match(/^(\d+\/\d+)\s*\(([^)]+)\)$/);
    if (m) return { mainScore: m[1], oversPart: `(${m[2].replace(/\s*ov$/i, '')})` };
    if (!isT2Batting && !isUpcomingMatch) {
      return { mainScore: trimmed || `${match.score}/${match.wickets}`, oversPart: `(${oversDisplay})` };
    }
    return { mainScore: trimmed || '0/0', oversPart: '' };
  })();

  const t2ScoreParts = (() => {
    const trimmed = (team2DisplayScore || '').trim();
    const m = trimmed.match(/^(\d+\/\d+)\s*\(([^)]+)\)$/);
    if (m) return { mainScore: m[1], oversPart: `(${m[2].replace(/\s*ov$/i, '')})` };
    if (isT2Batting && !isUpcomingMatch) {
      return { mainScore: trimmed || `${match.score}/${match.wickets}`, oversPart: `(${oversDisplay})` };
    }
    return { mainScore: trimmed || '0/0', oversPart: '' };
  })();

  // Active Batting & Bowling Players for the 3-Column Broadcast Bar (Batter* | Batter | Bowler)
  const activeBattingTeamData = isT2Batting ? team2Data : team1Data;
  const activeBowlingTeamData = isT2Batting ? team1Data : team2Data;
  const activeBattingPlayers = activeBattingTeamData.players;
  const activeNotOutIndices = activeBattingPlayers
    .map((p, idx) => (!p.isOut && !p.yetToBat && (p.balls > 0 || p.runs > 0 || p.wicketType === 'not out') ? idx : -1))
    .filter(idx => idx !== -1);

  const resolvedB1Idx =
    typeof active1Idx === 'number' &&
    activeBattingPlayers[active1Idx] &&
    !activeBattingPlayers[active1Idx].isOut
      ? active1Idx
      : (activeNotOutIndices[0] ?? 0);

  const resolvedB2Idx =
    typeof active2Idx === 'number' &&
    active2Idx !== resolvedB1Idx &&
    activeBattingPlayers[active2Idx] &&
    !activeBattingPlayers[active2Idx].isOut
      ? active2Idx
      : (activeNotOutIndices.find(i => i !== resolvedB1Idx) ?? (resolvedB1Idx === 0 ? 1 : 0));

  const strikerIdx = onStrikeIdx === 1 ? resolvedB2Idx : resolvedB1Idx;
  const nonStrikerIdx = onStrikeIdx === 1 ? resolvedB1Idx : resolvedB2Idx;
  const strikerBatter = activeBattingPlayers[strikerIdx] || {
    name: lang === 'bn' ? 'ব্যাটসম্যান ১' : 'Batter 1',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false
  };
  const nonStrikerBatter = activeBattingPlayers[nonStrikerIdx] || {
    name: lang === 'bn' ? 'ব্যাটসম্যান ২' : 'Batter 2',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false
  };

  const strikerSR = strikerBatter.balls > 0 ? ((strikerBatter.runs / strikerBatter.balls) * 100).toFixed(1) : '0.0';
  const nonStrikerSR = nonStrikerBatter.balls > 0 ? ((nonStrikerBatter.runs / nonStrikerBatter.balls) * 100).toFixed(1) : '0.0';

  const activeBowlerStats = match.liveBowlerStats || {
    name: match.liveBowler || activeBowlingTeamData.players[0]?.name || (lang === 'bn' ? 'বোলার' : 'Bowler'),
    wickets: isUpcomingMatch ? 0 : (match.wickets ?? 0),
    runs: isUpcomingMatch ? 0 : (match.score ?? 0),
    overs: isUpcomingMatch ? '0.0' : oversDisplay,
    maidens: 0,
    economy: isUpcomingMatch ? '0.00' : runRate
  };

  const formatBallSymbolToCallout = (sym?: string): string => {
    const s = (sym || '').trim();
    if (!s) return '';
    if (/^(?:ball|ball\s*start|ball\s*in\s*air|bowling|bowler\s*running|in\s*air)$/i.test(s)) return 'Ball';
    if (/^(?:0|•|\.|dot|dot\s*ball|0\s*runs?|no\s*run)$/i.test(s)) return '.';
    const runM = s.match(/^([1-6])(?:\s*runs?)?$/i);
    if (runM) return runM[1];
    if (/^four$/i.test(s)) return '4';
    if (/^six$/i.test(s)) return '6';

    // Free Hit -> Fire
    if (/^(?:free\s*hit|fh)(?:\s*🔥)?$/i.test(s)) return 'Free Hit 🔥';

    // No Ball: NB, NB+1 .. NB+6 (Fire)
    if (/^(?:nb|no\s*ball|0\s*nb|nb\s*\+?\s*0)(?:\s*🔥)?$/i.test(s)) return 'NB 🔥';
    const nbM = s.match(/^(?:(\d+)\s*(?:nb|no\s*ball)|(?:nb|no\s*ball)\s*\+?\s*(\d+))(?:\s*🔥)?$/i);
    if (nbM) {
      const r = parseInt(nbM[1] || nbM[2] || '0', 10);
      if (r === 7) return 'NB+6 🔥';
      if (r > 0) return `NB+${r} 🔥`;
      return 'NB 🔥';
    }

    // Wide: WD, WD+1 .. WD+4
    if (/^(?:wd|wide|wides|0\s*wd|wd\s*\+?\s*0)$/i.test(s)) return 'WD';
    const wdM = s.match(/^(?:(\d+)\s*(?:wd|wide|wides)|(?:wd|wide|wides)\s*\+?\s*(\d+))$/i);
    if (wdM) {
      const r = parseInt(wdM[1] || wdM[2] || '0', 10);
      if (r === 5) return 'WD+4';
      if (r > 0) return `WD+${r}`;
      return 'WD';
    }

    // Leg Bye Wicket (LBW) -> LBW (Red)
    if (/^(?:lbw|leg\s*bye\s*wicket|এলবিডব্লিউ)\b/i.test(s)) return 'LBW';

    // Leg Bye: 1lb, 2lb, 3lb, 4lb...
    if (/^(?:lb|leg\s*bye|leg\s*byes|1\s*lb|lb\s*\+?\s*1|leg\s*bye\s*1)$/i.test(s)) return '1lb';
    const lbM = s.match(/^(?:(\d+)\s*(?:lb|leg\s*bye|leg\s*byes)|(?:lb|leg\s*bye|leg\s*byes)\s*\+?\s*(\d+))$/i);
    if (lbM) {
      const r = parseInt(lbM[1] || lbM[2] || '1', 10);
      return `${Math.max(1, r)}lb`;
    }

    // Bowled Wicket: exact 'B' or 'Bowled' -> B (Red)
    if (/^(?:B|bowled(?:\s+wicket)?|বোল্ড)$/i.test(s)) {
      return 'B';
    }

    // Bye: 1b, 2b, 3b, 4b...
    if (/^(?:by|bye|byes|1\s*b|1\s*by|by\s*\+?\s*1|b\s*\+?\s*1|bye\s*1)$/i.test(s)) return '1b';
    const byeM = s.match(/^(?:(\d+)\s*(?:b|by|bye|byes)|(?:by|bye|byes)\s*\+?\s*(\d+)|b\s*\+\s*(\d+)|b([1-9]\d*))$/i);
    if (byeM) {
      const r = parseInt(byeM[1] || byeM[2] || byeM[3] || byeM[4] || '1', 10);
      return `${Math.max(1, r)}b`;
    }

    // Caught Wicket -> C (Red)
    if (/^(?:c|caught(?:\s+wicket)?|ক্যাচ|কট)$/i.test(s) || /^(?:caught|ক্যাচ)\b/i.test(s)) return 'C';

    // Run Out -> R, R+1, R+2, R+3... (Red)
    const roM = s.match(/^(?:r|run\s*out|রান\s*আউট)(?:\s*\+\s*(\d+)|\s+(\d+))?$/i);
    if (roM) {
      const r = parseInt(roM[1] || roM[2] || '0', 10);
      return r > 0 ? `R+${r}` : 'R';
    }

    // Other Wickets
    if (/^(?:stumped|স্টাম্পড)\b/i.test(s)) return 'W';
    if (/^(?:hit\s*wicket|হিট\s*উইকেট)\b/i.test(s)) return 'W';
    const wPlusM = s.match(/^(?:w|wkt|wicket|wickets|out|উইকেট)(?:\s*\+\s*(\d+))?$/i);
    if (wPlusM) {
      const r = parseInt(wPlusM[1] || '0', 10);
      return r > 0 ? `W+${r}` : 'W';
    }
    if (/^(?:over|ov)$/i.test(s)) return 'Over';
    return s;
  };

  const lastRecentBallSym =
    match.liveRecentBalls && match.liveRecentBalls.length > 0
      ? match.liveRecentBalls[match.liveRecentBalls.length - 1]
      : undefined;

  // Render an individual ball badge according to color & styling specs
  const renderBallBadge = (b: string, key: string | number) => {
    const formattedB = formatBallSymbolToCallout(b) || b;
    const isWktBadge = /^(?:C|B|LBW|R(?:\+\d+)?|W(?:\+\d+)?|Wickets|Caught|Bowled|Run Out|Stumped|Hit Wicket)$/i.test(formattedB);
    const isFireBadge = formattedB.includes('🔥') || /^(?:NB(?:\+\d+)?|Free\s*Hit)/i.test(formattedB);
    const isBoundaryBadge = formattedB === '4' || formattedB === '6' || formattedB === 'WD+4' || formattedB === '4b' || formattedB === '4lb';
    const isWideBadge = /^WD(?:\+\d+)?$/i.test(formattedB);

    return (
      <span
        key={key}
        className={`min-w-[20px] h-5 px-1.5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] whitespace-nowrap shadow-sm transition-transform hover:scale-105 shrink-0 ${
          isWktBadge
            ? 'bg-red-600 text-white border border-red-400 font-black shadow-red-500/30'
            : isFireBadge
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border border-orange-300 font-black shadow-orange-500/30'
              : isBoundaryBadge
                ? 'bg-amber-400 text-black font-black shadow-amber-400/30'
                : isWideBadge
                  ? 'bg-teal-600/90 text-white border border-teal-400/60 font-black'
                  : 'bg-white/10 text-emerald-100 border border-white/10'
        }`}
      >
        {formattedB}
      </span>
    );
  };

  // Calculate full two overs (including all extra balls)
  const recentTwoOvers = useMemo(() => {
    type BallItem = { symbol: string; isExtra: boolean; isWicket: boolean; runs: number };
    type OverItem = { overNumber: number; balls: BallItem[]; runs: number; wickets: number };

    // Determine the current over number and completed overs of the ONGOING INNINGS (চলমান ইনিংস)
    const { ongoingCompletedOvers, ongoingCurrentOverNum } = (() => {
      const bpo = ballsPerOver || 6;
      // Ongoing batting team's score & overs
      const activeOversStr = isT2Batting
        ? (t2ScoreParts.oversPart || team2DisplayScore || '')
        : (t1ScoreParts.oversPart || team1DisplayScore || '');

      // Try extracting from active overs string, e.g. "(1.5)", "1.5 ov", "1.5", "(20.0)"
      const m = String(activeOversStr).match(/(?:\(|\b)(\d+)(?:\.(\d+))?/);
      if (m) {
        const comp = parseInt(m[1], 10);
        const inOv = parseInt(m[2] || '0', 10);
        const curOv = inOv > 0 ? comp + 1 : Math.max(1, comp);
        return {
          ongoingCompletedOvers: comp,
          ongoingCurrentOverNum: curOv
        };
      }

      // Fallback: use match.balls
      const curBalls = match.balls || 0;
      const comp = Math.floor(curBalls / bpo);
      const inOv = curBalls % bpo;
      const curOv = inOv > 0 ? comp + 1 : Math.max(1, comp);
      return {
        ongoingCompletedOvers: comp,
        ongoingCurrentOverNum: curOv
      };
    })();

    // Helper to format & number overs strictly aligned with the ongoing innings (চলমান ইনিংস)
    const formatOngoingOvers = (oversList: OverItem[]): OverItem[] => {
      if (oversList.length === 0) return [];

      // If the ongoing innings has only completed 0 overs (e.g. 0.4 ov), only show 1 over (Over 1).
      // If 1 or more overs have been completed (e.g. 1.5 ov), show 2 overs (Over 1 and Over 2).
      const oversToTake = ongoingCompletedOvers === 0 ? 1 : 2;
      const sliced = oversList.slice(-oversToTake);

      if (sliced.length === 2) {
        sliced[0].overNumber = Math.max(1, ongoingCurrentOverNum - 1);
        sliced[1].overNumber = ongoingCurrentOverNum;
      } else if (sliced.length === 1) {
        sliced[0].overNumber = ongoingCurrentOverNum;
      }
      return sliced;
    };

    // 1. Try to compute from match.history if available
    if (match.history && match.history.length > 0) {
      const chronological = [...match.history].reverse();
      const allOvers: OverItem[] = [];
      let overNum = 1;
      let legalBalls = 0;
      let curBalls: BallItem[] = [];
      let curRuns = 0;
      let curWkts = 0;

      for (const e of chronological) {
        const isExtra = Boolean(e.isWide || e.isNoBall);
        const sym = (() => {
          if (e.isWicket) {
            const wType = String(e.wicketType || '').toLowerCase();
            let code = 'W';
            if (wType.includes('caught') || wType.includes('ক্যাচ') || wType.includes('কট')) code = 'C';
            else if (wType.includes('bowled') || wType.includes('বোল্ড')) code = 'B';
            else if (wType.includes('lbw') || wType.includes('leg bye wicket') || wType.includes('এলবিডব্লিউ')) code = 'LBW';
            else if (wType.includes('run out') || wType.includes('রান আউট') || wType.includes('run_out')) code = 'R';
            const runsAdded = (e.runsOnly !== undefined ? e.runsOnly : (e.runs || 0));
            return runsAdded > 0 ? `${code}+${runsAdded}` : code;
          }
          if (e.isNoBall) {
            const r = (e.runsOnly !== undefined ? e.runsOnly : Math.max(0, (e.runs || 1) - 1));
            return r > 0 ? `NB+${r} 🔥` : 'NB 🔥';
          }
          if (e.isWide) {
            const r = (e.runsOnly !== undefined ? e.runsOnly : Math.max(0, (e.runs || 1) - 1));
            return r > 0 ? `WD+${r}` : 'WD';
          }
          if (e.isLegBye) {
            return `${e.runs || 1}lb`;
          }
          if (e.isBye) {
            return `${e.runs || 1}b`;
          }
          if (e.wasFreeHit) {
            const r = e.runs || 0;
            return r === 0 ? 'Free Hit 🔥' : `${r} 🔥`;
          }
          const r = e.runs ?? 0;
          return r === 0 ? '.' : String(r);
        })();

        curBalls.push({
          symbol: sym,
          isExtra,
          isWicket: Boolean(e.isWicket),
          runs: e.runs || 0
        });
        curRuns += (e.runs || 0);
        if (e.isWicket) curWkts++;

        if (!isExtra) {
          legalBalls++;
          if (legalBalls >= ballsPerOver) {
            allOvers.push({
              overNumber: overNum,
              balls: curBalls,
              runs: curRuns,
              wickets: curWkts
            });
            overNum++;
            legalBalls = 0;
            curBalls = [];
            curRuns = 0;
            curWkts = 0;
          }
        }
      }

      if (curBalls.length > 0) {
        allOvers.push({
          overNumber: overNum,
          balls: curBalls,
          runs: curRuns,
          wickets: curWkts
        });
      }

      if (allOvers.length > 0) {
        return formatOngoingOvers(allOvers);
      }
    }

    // 2. Fallback to match.liveRecentBalls
    if (match.liveRecentBalls && match.liveRecentBalls.length > 0) {
      const allOvers: OverItem[] = [];
      let overNum = 1;
      let legalBalls = 0;
      let curBalls: BallItem[] = [];

      for (const symRaw of match.liveRecentBalls) {
        const sym = formatBallSymbolToCallout(symRaw) || symRaw;
        const isExtra = /^(?:WD(?:\+\d+)?|NB(?:\+\d+)?|Free\s*Hit)/i.test(sym);
        const isWkt = /^(?:C|B|LBW|R(?:\+\d+)?|W(?:\+\d+)?|Wickets|Caught|Bowled|Run Out|Stumped|Hit Wicket)$/i.test(sym);

        curBalls.push({
          symbol: sym,
          isExtra,
          isWicket: isWkt,
          runs: 0
        });

        if (!isExtra) {
          legalBalls++;
          if (legalBalls >= ballsPerOver) {
            allOvers.push({
              overNumber: overNum,
              balls: curBalls,
              runs: 0,
              wickets: 0
            });
            overNum++;
            legalBalls = 0;
            curBalls = [];
          }
        }
      }

      if (curBalls.length > 0) {
        allOvers.push({
          overNumber: overNum,
          balls: curBalls,
          runs: 0,
          wickets: 0
        });
      }

      if (allOvers.length > 0) {
        return formatOngoingOvers(allOvers);
      }
    }

    return [];
  }, [match.history, match.liveRecentBalls, match.balls, ballsPerOver, isT2Batting, t1ScoreParts, t2ScoreParts, team1DisplayScore, team2DisplayScore]);

  const sanitizeStatusStr = (raw?: string): string => {
    if (!raw) return '';
    return raw
      .replace(/<[^>]*>?/g, '')
      .replace(/^\d+\s+(?=[A-Za-z])/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const rawSanitizedStatus = sanitizeStatusStr(match.liveStatusText);
  // Suppress any stale/invalid "need X runs" status when batting in the 1st innings
  const cleanLiveStatusText = (!isSecondInnings && /\bneed[s]?\s+-?\d+\s+runs?\b/i.test(rawSanitizedStatus))
    ? ''
    : rawSanitizedStatus;
  const cleanLiveBallEvent = sanitizeStatusStr(match.liveBallEvent);

  const isInningsBreak =
    !isUpcomingMatch &&
    !isFinished &&
    (/innings\s*break/i.test(cleanLiveStatusText) ||
      /innings\s*break/i.test(cleanLiveBallEvent) ||
      (!isSecondInnings &&
        match.balls > 0 &&
        ((maxOversVal > 0 && match.balls >= maxOversVal * ballsPerOver) ||
          match.wickets >= (match.maxWickets ?? 10))));

  // Resolve dismissal type subtitle (e.g. "Caught Out", "Bowled Out", "Run Out", "LBW Out", "Stumped Out") when a wicket occurs
  const wicketDismissalSubText = (() => {
    const checkSource = (raw?: string): string | null => {
      if (!raw) return null;
      const s = raw.trim();
      if (/^(?:b|bowled|bowled\s*out|b\s+\S+|বোল্ড)$/i.test(s)) return 'Bowled Out';
      if (/^(?:c|caught|caught\s*out|c\s+\S+|ক্যাচ|কট)$/i.test(s)) return 'Caught Out';
      if (/^(?:lbw|lbw\s*out|leg\s*bye\s*wicket|এলবিডব্লিউ)$/i.test(s)) return 'LBW Out';
      if (/^(?:r|run\s*out|r\+\d+|রান\s*আউট)$/i.test(s)) return 'Run Out';
      if (/^(?:st|stumped|stumped\s*out|st\s+\S+|স্টাম্পড)$/i.test(s)) return 'Stumped Out';
      if (/^(?:hit\s*wicket|হিট\s*উইকেট)$/i.test(s)) return 'Hit Wicket';
      if (/^(?:w|wkt|wicket|wickets|out|উইকেট)(?:\+\d+)?$/i.test(s)) {
        const lastHistWt = match.history?.[0]?.isWicket ? match.history[0].wicketType : undefined;
        if (lastHistWt) {
          if (/caught|^c\b/i.test(lastHistWt)) return 'Caught Out';
          if (/bowled|^b\b/i.test(lastHistWt)) return 'Bowled Out';
          if (/lbw/i.test(lastHistWt)) return 'LBW Out';
          if (/run\s*out/i.test(lastHistWt)) return 'Run Out';
          if (/stump|^st\b/i.test(lastHistWt)) return 'Stumped Out';
        }
        const outBatters = (match.battingStats || []).filter(p => p.isOut && p.wicketType);
        const latestOutWt = outBatters.length > 0 ? outBatters[outBatters.length - 1].wicketType || '' : '';
        if (/caught|^c\s+/i.test(latestOutWt)) return 'Caught Out';
        if (/bowled|^b\s+/i.test(latestOutWt)) return 'Bowled Out';
        if (/lbw/i.test(latestOutWt)) return 'LBW Out';
        if (/run\s*out/i.test(latestOutWt)) return 'Run Out';
        if (/stump|^st\s+/i.test(latestOutWt)) return 'Stumped Out';
        return 'Bowled Out';
      }
      return null;
    };

    const fromEvent = checkSource(cleanLiveBallEvent);
    if (fromEvent) return fromEvent;
    const fromRecent = checkSource(lastRecentBallSym);
    if (fromRecent && (!cleanLiveBallEvent || checkSource(cleanLiveBallEvent) !== null || cleanLiveBallEvent === lastRecentBallSym)) {
      return fromRecent;
    }
    return null;
  })();

  const wicketsRemaining = Math.max(0, (match.maxWickets ?? 10) - (match.wickets ?? 0));

  const needRunsFormattedText = (() => {
    if (isFinished || isInningsBreak || isUpcomingMatch) return '';
    let remRuns = 0;
    let ballsLeft = 0;
    let reqRunsPerOver = '0';

    if (rotatedMilestoneData && rotatedMilestoneData.remaining > 0) {
      remRuns = Math.max(0, rotatedMilestoneData.remaining);
      ballsLeft = rotatedMilestoneData.ballsLeft;
      const num = parseFloat(String(rotatedMilestoneData.requiredRR));
      reqRunsPerOver = isNaN(num) ? '0' : (Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, ''));
    } else if (isSecondInnings && currentTargetVal > 0 && (currentTargetVal - match.score) > 0) {
      remRuns = Math.max(0, currentTargetVal - match.score);
      const totalMaxBalls = maxOversVal * ballsPerOver;
      ballsLeft = Math.max(0, totalMaxBalls - match.balls);
      const rateMult = match.format === '100' ? 1 : ballsPerOver;
      const num = ballsLeft > 0 ? (remRuns / ballsLeft) * rateMult : 0;
      reqRunsPerOver = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, '');
    } else {
      const statusChaseM = cleanLiveStatusText.match(/need[s]?\s+(\d+)\s+runs?\s+in\s+(\d+)\s+balls?/i);
      if (statusChaseM) {
        remRuns = parseInt(statusChaseM[1], 10) || 0;
        ballsLeft = parseInt(statusChaseM[2], 10) || 0;
        const rateMult = match.format === '100' ? 1 : ballsPerOver;
        const num = ballsLeft > 0 ? (remRuns / ballsLeft) * rateMult : 0;
        reqRunsPerOver = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.00$/, '');
      }
    }

    if (remRuns > 0) {
      return lang === 'bn'
        ? `${battingTeamName} এর ${ballsLeft} বলে ${remRuns} রান প্রয়োজন (ওভার প্রতি ${reqRunsPerOver}, ${wicketsRemaining} উইকেট)`
        : `${battingTeamName} need ${remRuns} runs in ${ballsLeft} balls (${reqRunsPerOver} per over, ${wicketsRemaining} ${wicketsRemaining === 1 ? 'wicket' : 'wickets'})`;
    }
    return '';
  })();

  const isWicketCallout = (() => {
    if (isUpcomingMatch || isFinished || isInningsBreak) return false;
    if (wicketDismissalSubText) return true;
    const isWktVal = (s?: string) =>
      Boolean(s && /^(?:c|b|lbw|r(?:\+\d+)?|w(?:\+\d+)?|wkt|wicket|wickets|out|caught|bowled|run\s*out|stumped|hit\s*wicket|ক্যাচ|বোল্ড|এলবিডব্লিউ|উইকেট)$/i.test(s.trim()));
    if (isWktVal(cleanLiveBallEvent)) return true;
    if (isWktVal(lastRecentBallSym)) return true;
    if (cleanLiveBallEvent && cleanLiveBallEvent.includes('WICKET')) return true;
    if (cleanLiveStatusText && /\b(?:wicket|bowled|caught|lbw|run\s*out)\b/i.test(cleanLiveStatusText)) return true;
    return false;
  })();

  const centerCalloutText = isUpcomingMatch
    ? (lang === 'bn' ? 'আপকামিং ম্যাচ' : 'UPCOMING')
    : isFinished
      ? (cleanLiveStatusText || (lang === 'bn' ? 'ম্যাচ সম্পন্ন' : 'Match Completed'))
      : isInningsBreak
        ? 'Innings Break'
        : isWicketCallout
          ? '!!!!!! WICKET !!!!!!'
          : (formatBallSymbolToCallout(cleanLiveBallEvent) ||
             formatBallSymbolToCallout(lastRecentBallSym) ||
             (cleanLiveStatusText && !/\bneed[s]?\s+\d+\s+runs?\b/i.test(cleanLiveStatusText) ? cleanLiveStatusText : 'Ball'));

  const isFireCallout = !isWicketCallout && (centerCalloutText.includes('🔥') || /^(?:NB(?:\+\d+)?|Free\s*Hit)/i.test(centerCalloutText));

  const statusSubText = isUpcomingMatch
    ? ''
    : isInningsBreak
      ? (currentTargetVal > 0 ? (lang === 'bn' ? `টার্গেট: ${currentTargetVal}` : `Target: ${currentTargetVal}`) : '')
      : isWicketCallout
        ? (wicketDismissalSubText || 'Bowled Out')
        : needRunsFormattedText
          ? needRunsFormattedText
          : (cleanLiveStatusText && cleanLiveStatusText !== centerCalloutText ? cleanLiveStatusText : '');

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Main Broadcast Scoreboard Card (Preserving Existing Dark Emerald/Cyan/Slate Colors) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06131E] via-[#0A192F] to-[#071C18] border border-emerald-500/35 shadow-2xl p-3.5 sm:p-5 text-white">
        {/* Ambient Stadium Glows */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />

        {/* Top Bar: Cricket Match Badge, Date/Time, Section Toggle & Quick Actions */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
              <span>🏏</span>
              <span>{formatLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Calendar size={11} className="text-amber-400 shrink-0" />
              <span>{dateTimeInfo.fullDateTimeStr}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {onToggleSection && (
              <button
                type="button"
                onClick={onToggleSection}
                className={`px-2 py-0.5 rounded-xl text-[10px] font-black flex items-center gap-1 border cursor-pointer transition-all ${
                  isInUpcomingSection
                    ? 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border-rose-400/50'
                    : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border-amber-400/40'
                }`}
                title={
                  isInUpcomingSection
                    ? (lang === 'bn' ? 'আপকামিং থেকে লাইভ সেকশনে আনুন' : 'Move from Upcoming to Live section')
                    : (lang === 'bn' ? 'লাইভ সেকশন থেকে আপকামিং সেকশনে পাঠান' : 'Move from Live to Upcoming section')
                }
              >
                <Clock size={10} />
                <span>
                  {isInUpcomingSection
                    ? (lang === 'bn' ? '🔴 লাইভে নিন' : '🔴 Move to Live')
                    : (lang === 'bn' ? '⏰ আপকামিং-এ নিন' : '⏰ To Upcoming')}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenLiveModal}
              className="px-2 py-0.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-bold text-cyan-300 flex items-center gap-1 border border-white/10 cursor-pointer transition-all"
              title={lang === 'bn' ? 'লাইভ লিংক সিঙ্ক' : 'Live Link Sync'}
            >
              <Globe size={11} />
              <span>{lang === 'bn' ? 'সিঙ্ক' : 'Sync'}</span>
            </button>
            <button
              type="button"
              onClick={() => onShareResult(match)}
              className="px-2 py-0.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1 border border-emerald-500/30 cursor-pointer transition-all"
              title={lang === 'bn' ? 'ফলাফল শেয়ার' : 'Share Result'}
            >
              <Share2 size={11} />
              <span>{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
            </button>
            {onDeleteMatch && (
              <button
                type="button"
                onClick={onDeleteMatch}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 active:scale-90 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-all cursor-pointer border border-rose-500/40 shrink-0"
                title={lang === 'bn' ? 'এই ম্যাচটি ডিলিট করুন' : 'Delete this match'}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ====================================================================
            ROW 1: HORIZONTAL BROADCAST TEAMS & SCORES STRIP (Team 1 | VS | Team 2)
            ==================================================================== */}
        <div className="relative z-10 flex items-center justify-between gap-2 pt-3.5 pb-3">
          {/* Team 1 (Left Side: Circular Crest on Far Left + Name & Score/Overs Inline) */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div
              onClick={onOpenEditTeams}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center shadow-lg transition-all cursor-pointer shrink-0 relative ${
                !isT2Batting && !isUpcomingMatch
                  ? 'bg-gradient-to-br from-emerald-500/35 to-teal-700/30 border-2 border-emerald-400/80 shadow-emerald-500/20'
                  : 'bg-gradient-to-br from-blue-500/25 to-indigo-700/25 border-2 border-blue-400/45'
              }`}
              title={lang === 'bn' ? 'দলের নাম পরিবর্তন করতে ক্লিক করুন' : 'Click to edit team name'}
            >
              <span className="text-sm sm:text-base leading-none select-none">{!isT2Batting && !isUpcomingMatch ? '🏏' : '🛡️'}</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-black tracking-tighter text-white/95 mt-0.5">
                {getShortTeamName(cleanT1, 'T1')}
              </span>
            </div>

            <div className="flex flex-col items-start min-w-0 flex-1">
              <div className="flex items-center gap-1.5 max-w-full">
                <span
                  onClick={onOpenEditTeams}
                  className="font-bold text-xs sm:text-base text-slate-100 truncate cursor-pointer hover:text-emerald-300 transition-colors"
                  title={lang === 'bn' ? 'দলের নাম পরিবর্তন' : 'Edit team name'}
                >
                  {cleanT1}
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchBattingTeam(1)}
                  className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border cursor-pointer transition-all shrink-0 ${
                    !isT2Batting && !isUpcomingMatch
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title={lang === 'bn' ? `${cleanT1} ব্যাটিংয়ে আনতে ক্লিক করুন` : `Click to set ${cleanT1} as batting`}
                >
                  {!isT2Batting && !isUpcomingMatch ? '🏏 BAT' : 'BOWL'}
                </button>
              </div>

              {/* Team 1 Score & Overs Inline */}
              {editingTeamScoreSide === 'team1' ? (
                <input
                  type="text"
                  value={teamScoreInput}
                  onChange={(e) => setTeamScoreInput(e.target.value)}
                  onBlur={() => {
                    onSaveTeamScoreGeneric(1, teamScoreInput);
                    setEditingTeamScoreSide(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSaveTeamScoreGeneric(1, teamScoreInput);
                      setEditingTeamScoreSide(null);
                    }
                    if (e.key === 'Escape') setEditingTeamScoreSide(null);
                  }}
                  autoFocus
                  placeholder="172/2 (15.4)"
                  className="w-28 mt-0.5 bg-slate-950 text-emerald-300 font-mono font-black text-xs px-2 py-0.5 rounded-lg border border-emerald-400 outline-none"
                />
              ) : (
                <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                  <span
                    onClick={() => {
                      if (!isT2Batting && !isUpcomingMatch) {
                        onEditTeamScore();
                      } else {
                        setTeamScoreInput(isTeam1YetToBat ? '' : team1DisplayScore);
                        setEditingTeamScoreSide('team1');
                      }
                    }}
                    className={`font-mono font-black tracking-tight cursor-pointer transition-colors ${
                      isTeam1YetToBat
                        ? 'text-xs sm:text-sm text-slate-400 hover:text-emerald-300'
                        : 'text-base sm:text-2xl text-white hover:text-emerald-300'
                    }`}
                    title={lang === 'bn' ? `${cleanT1} এর স্কোর এডিট করতে ক্লিক করুন` : `Click to edit ${cleanT1} score`}
                  >
                    {isTeam1YetToBat ? (lang === 'bn' ? 'Yet to bat' : 'Yet to bat') : t1ScoreParts.mainScore}
                  </span>
                  {!isTeam1YetToBat && t1ScoreParts.oversPart && (
                    <span
                      onClick={() => {
                        if (!isT2Batting && !isUpcomingMatch) {
                          setOverInput(curOversNum.toString());
                          setBallInput(curBallsInOver.toString());
                          setIsEditingOversInline(true);
                        } else {
                          setTeamScoreInput(team1DisplayScore);
                          setEditingTeamScoreSide('team1');
                        }
                      }}
                      className="font-mono text-xs sm:text-sm font-bold text-emerald-300/90 hover:text-emerald-200 cursor-pointer"
                      title={lang === 'bn' ? 'ওভার পরিবর্তন করতে ক্লিক করুন' : 'Click to edit overs'}
                    >
                      {t1ScoreParts.oversPart}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center VS Badge (With Inline Overs Editor Popover When Active) */}
          <div className="flex flex-col items-center justify-center shrink-0 px-1">
            {isEditingOversInline ? (
              <div className="flex items-center gap-1 bg-slate-950 border border-emerald-500/80 px-2 py-1 rounded-xl shadow-lg">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overInput}
                  onChange={(e) => setOverInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onApplyOvers(parseInt(overInput) || 0, parseInt(ballInput) || 0);
                      setIsEditingOversInline(false);
                    }
                    if (e.key === 'Escape') setIsEditingOversInline(false);
                  }}
                  autoFocus
                  className="w-8 bg-slate-900 text-emerald-300 font-mono font-black text-xs text-center border border-emerald-500/50 rounded px-1 outline-none"
                />
                <span className="text-emerald-400 font-bold">.</span>
                <input
                  type="number"
                  min="0"
                  max={ballsPerOver - 1}
                  value={ballInput}
                  onChange={(e) => setBallInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onApplyOvers(parseInt(overInput) || 0, parseInt(ballInput) || 0);
                      setIsEditingOversInline(false);
                    }
                    if (e.key === 'Escape') setIsEditingOversInline(false);
                  }}
                  className="w-7 bg-slate-900 text-emerald-300 font-mono font-black text-xs text-center border border-emerald-500/50 rounded px-1 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onApplyOvers(parseInt(overInput) || 0, parseInt(ballInput) || 0);
                    setIsEditingOversInline(false);
                  }}
                  className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                >
                  <Check size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOversInline(false)}
                  className="p-1 rounded bg-slate-800 text-slate-300 cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setOverInput(curOversNum.toString());
                  setBallInput(curBallsInOver.toString());
                  setIsEditingOversInline(true);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/95 border border-emerald-500/35 hover:border-emerald-400/70 flex items-center justify-center shadow-inner cursor-pointer transition-all"
                title={lang === 'bn' ? 'ওভার পরিবর্তন করতে ক্লিক করুন' : 'Click to edit overs'}
              >
                <span className="text-[10px] sm:text-xs font-black tracking-wider text-slate-300">VS</span>
              </div>
            )}
          </div>

          {/* Team 2 (Right Side: Name & Score/Overs Inline + Circular Crest on Far Right) */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="flex flex-col items-end min-w-0 flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5 max-w-full">
                <button
                  type="button"
                  onClick={() => handleSwitchBattingTeam(2)}
                  className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border cursor-pointer transition-all shrink-0 ${
                    isT2Batting && !isUpcomingMatch
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                  title={lang === 'bn' ? `${cleanT2} ব্যাটিংয়ে আনতে ক্লিক করুন` : `Click to set ${cleanT2} as batting`}
                >
                  {isT2Batting && !isUpcomingMatch ? '🏏 BAT' : 'BOWL'}
                </button>
                <span
                  onClick={onOpenEditTeams}
                  className="font-bold text-xs sm:text-base text-slate-100 truncate cursor-pointer hover:text-cyan-300 transition-colors"
                  title={lang === 'bn' ? 'দলের নাম পরিবর্তন' : 'Edit team name'}
                >
                  {cleanT2}
                </span>
              </div>

              {/* Team 2 Score & Overs Inline */}
              {editingTeamScoreSide === 'team2' ? (
                <input
                  type="text"
                  value={teamScoreInput}
                  onChange={(e) => setTeamScoreInput(e.target.value)}
                  onBlur={() => {
                    onSaveTeamScoreGeneric(2, teamScoreInput);
                    setEditingTeamScoreSide(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSaveTeamScoreGeneric(2, teamScoreInput);
                      setEditingTeamScoreSide(null);
                    }
                    if (e.key === 'Escape') setEditingTeamScoreSide(null);
                  }}
                  autoFocus
                  placeholder="162/3 (18.2)"
                  className="w-28 mt-0.5 bg-slate-950 text-cyan-300 font-mono font-black text-xs px-2 py-0.5 rounded-lg border border-cyan-400 outline-none text-right"
                />
              ) : (
                <div className="flex items-baseline justify-end gap-1.5 mt-0.5 flex-wrap">
                  <span
                    onClick={() => {
                      if (isT2Batting && !isUpcomingMatch) {
                        onEditTeamScore();
                      } else {
                        setTeamScoreInput(isTeam2YetToBat ? '' : team2DisplayScore);
                        setEditingTeamScoreSide('team2');
                      }
                    }}
                    className={`font-mono font-black tracking-tight cursor-pointer transition-colors ${
                      isTeam2YetToBat
                        ? 'text-xs sm:text-sm text-slate-400 hover:text-cyan-300'
                        : 'text-base sm:text-2xl text-white hover:text-cyan-300'
                    }`}
                    title={lang === 'bn' ? `${cleanT2} এর স্কোর এডিট করতে ক্লিক করুন` : `Click to edit ${cleanT2} score`}
                  >
                    {isTeam2YetToBat ? (lang === 'bn' ? 'Yet to bat' : 'Yet to bat') : t2ScoreParts.mainScore}
                  </span>
                  {!isTeam2YetToBat && t2ScoreParts.oversPart && (
                    <span
                      onClick={() => {
                        if (isT2Batting && !isUpcomingMatch) {
                          setOverInput(curOversNum.toString());
                          setBallInput(curBallsInOver.toString());
                          setIsEditingOversInline(true);
                        } else {
                          setTeamScoreInput(team2DisplayScore);
                          setEditingTeamScoreSide('team2');
                        }
                      }}
                      className="font-mono text-xs sm:text-sm font-bold text-cyan-300/90 hover:text-cyan-200 cursor-pointer"
                      title={lang === 'bn' ? 'ওভার পরিবর্তন করতে ক্লিক করুন' : 'Click to edit overs'}
                    >
                      {t2ScoreParts.oversPart}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div
              onClick={onOpenEditTeams}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center shadow-lg transition-all cursor-pointer shrink-0 relative ${
                isT2Batting && !isUpcomingMatch
                  ? 'bg-gradient-to-br from-emerald-500/35 to-teal-700/30 border-2 border-emerald-400/80 shadow-emerald-500/20'
                  : 'bg-gradient-to-br from-cyan-500/25 to-teal-700/25 border-2 border-cyan-400/45'
              }`}
              title={lang === 'bn' ? 'দলের নাম পরিবর্তন করতে ক্লিক করুন' : 'Click to edit team name'}
            >
              <span className="text-sm sm:text-base leading-none select-none">{isT2Batting && !isUpcomingMatch ? '🏏' : '⚔️'}</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-black tracking-tighter text-white/95 mt-0.5">
                {getShortTeamName(cleanT2, 'T2')}
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            ROW 2: CENTER DARK EVENT PILL BANNER (Matches Reference "Wide" / Event Box)
            ==================================================================== */}
        <motion.div
          animate={scoreFlicker ? {
            scale: [1, 1.03, 0.99, 1],
            filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)']
          } : {}}
          onClick={isUpcomingMatch ? undefined : onEditTeamScore}
          className={`relative z-10 rounded-2xl bg-slate-950/90 hover:bg-slate-950 border py-2.5 sm:py-3 px-4 mb-2.5 shadow-inner cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
            isWicketCallout
              ? 'border-red-500/35 hover:border-red-400/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : 'border-emerald-500/25 hover:border-emerald-400/45'
          }`}
          title={lang === 'bn' ? 'স্কোর ও উইকেট পরিবর্তন করতে ক্লিক করুন' : 'Click to edit score & wickets'}
        >
          <div
            className={`font-black tracking-wide leading-tight ${
              isWicketCallout
                ? 'text-xl sm:text-2xl text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                : isFireCallout
                  ? 'text-xl sm:text-2xl text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                  : 'text-xl sm:text-2xl text-amber-300'
            }`}
          >
            {centerCalloutText}
          </div>

          {isUpcomingMatch ? (
            <div className="mt-1">
              <MatchCountdownBadge startTime={match.matchStartTime} isoTime={match.matchStartTimeIso} lang={lang} />
            </div>
          ) : statusSubText ? (
            <div className={`mt-0.5 ${
              isWicketCallout
                ? 'text-xs sm:text-sm font-bold text-emerald-400'
                : 'text-[11px] sm:text-xs font-bold text-emerald-300/95'
            }`}>
              {statusSubText}
            </div>
          ) : null}
        </motion.div>

        {/* ====================================================================
            ROW 3: 3-COLUMN ACTIVE PLAYERS BROADCAST BAR (Batter* | Batter | Bowler)
            ==================================================================== */}
        <div className="relative z-10 rounded-2xl bg-slate-950/80 border border-white/10 overflow-hidden mb-3">
          {/* 3-Column Header Row */}
          <div className="grid grid-cols-3 divide-x divide-white/10 bg-white/[0.04] border-b border-white/10 text-[11px] sm:text-xs font-bold">
            <div className="px-2.5 sm:px-3.5 py-1.5 flex items-center justify-between">
              <span className="text-emerald-400">Batter*</span>
              <button
                type="button"
                onClick={onSwapStrike}
                className="text-slate-400 hover:text-emerald-300 flex items-center cursor-pointer transition-colors"
                title={lang === 'bn' ? 'স্ট্রাইক পরিবর্তন করুন' : 'Swap Strike'}
              >
                <ArrowLeftRight size={11} />
              </button>
            </div>
            <div className="px-2.5 sm:px-3.5 py-1.5 text-slate-200">Batter</div>
            <div className="px-2.5 sm:px-3.5 py-1.5 text-cyan-400">Bowler</div>
          </div>

          {/* 3-Column Stats Body (Stacked player details matching reference design) */}
          <div className="grid grid-cols-3 divide-x divide-white/10">
            {/* Column 1: Striker (Batter*) */}
            <motion.div
              key={`striker-col-${strikerIdx}-${strikerBatter.name}`}
              initial={{ opacity: 0.65, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => onEditPlayer(strikerIdx)}
              className="px-2.5 sm:px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer min-w-0"
              title={lang === 'bn' ? 'ব্যাটসম্যান এডিট করতে ক্লিক করুন' : 'Click to edit batter'}
            >
              <div className="font-bold text-xs sm:text-sm text-white break-words leading-tight">
                {strikerBatter.name}*
              </div>
              <div className="flex items-baseline gap-1 mt-1 font-mono">
                <span className="text-sm sm:text-base font-black text-emerald-400">{strikerBatter.runs}</span>
                <span className="text-[11px] sm:text-xs text-slate-400">({strikerBatter.balls})</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs font-mono text-slate-400">
                <span>4s: <strong className="text-white font-bold">{strikerBatter.fours || 0}</strong></span>
                <span>6s: <strong className="text-white font-bold">{strikerBatter.sixes || 0}</strong></span>
              </div>
              <div className="text-[10px] sm:text-xs font-mono text-slate-400 mt-0.5">
                <span>SR: <strong className="text-emerald-400 font-bold">{strikerSR}</strong></span>
              </div>
            </motion.div>

            {/* Column 2: Non-Striker (Batter) */}
            <motion.div
              key={`nonstriker-col-${nonStrikerIdx}-${nonStrikerBatter.name}`}
              initial={{ opacity: 0.65, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => onEditPlayer(nonStrikerIdx)}
              className="px-2.5 sm:px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer min-w-0"
              title={lang === 'bn' ? 'ব্যাটসম্যান এডিট করতে ক্লিক করুন' : 'Click to edit batter'}
            >
              <div className="font-bold text-xs sm:text-sm text-white break-words leading-tight">
                {nonStrikerBatter.name}
              </div>
              <div className="flex items-baseline gap-1 mt-1 font-mono">
                <span className="text-sm sm:text-base font-black text-white">{nonStrikerBatter.runs}</span>
                <span className="text-[11px] sm:text-xs text-slate-400">({nonStrikerBatter.balls})</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] sm:text-xs font-mono text-slate-400">
                <span>4s: <strong className="text-white font-bold">{nonStrikerBatter.fours || 0}</strong></span>
                <span>6s: <strong className="text-white font-bold">{nonStrikerBatter.sixes || 0}</strong></span>
              </div>
              <div className="text-[10px] sm:text-xs font-mono text-slate-400 mt-0.5">
                <span>SR: <strong className="text-cyan-400 font-bold">{nonStrikerSR}</strong></span>
              </div>
            </motion.div>

            {/* Column 3: Active Bowler */}
            <div
              onClick={() => toggleTeamDropdown(isT2Batting ? 'team1' : 'team2')}
              className="px-2.5 sm:px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer min-w-0"
              title={lang === 'bn' ? 'বোলিং দলের স্কোরকার্ড দেখতে ক্লিক করুন' : 'Click to view bowling team scorecard'}
            >
              <div className="font-bold text-xs sm:text-sm text-white break-words leading-tight">
                {activeBowlerStats.name}
              </div>
              <div className="flex items-baseline gap-1 mt-1 font-mono">
                <span className="text-sm sm:text-base font-black text-cyan-400">
                  {activeBowlerStats.wickets}-{activeBowlerStats.runs}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400">({activeBowlerStats.overs})</span>
              </div>
              <div className="text-[10px] sm:text-xs font-mono text-slate-400 mt-1">
                <span>M: <strong className="text-white font-bold">{activeBowlerStats.maidens ?? 0}</strong></span>
              </div>
              <div className="text-[10px] sm:text-xs font-mono text-slate-400 mt-0.5">
                <span>ECON: <strong className="text-amber-400 font-bold">{activeBowlerStats.economy || '0.00'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            PLAYER SCORECARD DROPDOWNS BENEATH THE TEAMS
            (প্লেয়ারদের স্কোরকার্ড দলের নিচে ড্রপডাউন আকারে থাকবে। তা থেকে ড্রপ ডাউন করে বিস্তারিত দেখা যাবে আবার কলাপ্স করা যাবে)
            ==================================================================== */}
        <div className="relative z-10 pt-2 border-t border-white/10 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {/* Dropdown Button Beneath Team 1 */}
            <button
              type="button"
              onClick={() => toggleTeamDropdown('team1')}
              className={`w-full px-2.5 sm:px-3 py-2 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                expandedTeamDropdown === 'team1' || expandedTeamDropdown === 'both'
                  ? 'bg-emerald-500/20 border-emerald-400/70 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/85 hover:bg-slate-900 border-white/10 text-slate-200 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <Users size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-black truncate text-white">
                    {cleanT1} {lang === 'bn' ? 'স্কোরকার্ড' : 'Scorecard'}
                  </div>
                  <div className="text-[10px] text-emerald-300/90 font-mono truncate">
                    {isTeam1YetToBat ? (lang === 'bn' ? 'প্লেয়ার তালিকা' : 'Players & Stats') : team1DisplayScore}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {expandedTeamDropdown === 'team1' || expandedTeamDropdown === 'both' ? (
                  <ChevronUp size={15} className="text-emerald-300" />
                ) : (
                  <ChevronDown size={15} className="text-slate-400" />
                )}
              </div>
            </button>

            {/* Dropdown Button Beneath Team 2 */}
            <button
              type="button"
              onClick={() => toggleTeamDropdown('team2')}
              className={`w-full px-2.5 sm:px-3 py-2 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                expandedTeamDropdown === 'team2' || expandedTeamDropdown === 'both'
                  ? 'bg-cyan-500/20 border-cyan-400/70 text-white shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900/85 hover:bg-slate-900 border-white/10 text-slate-200 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Users size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-black truncate text-white">
                    {cleanT2} {lang === 'bn' ? 'স্কোরকার্ড' : 'Scorecard'}
                  </div>
                  <div className="text-[10px] text-cyan-300/90 font-mono truncate">
                    {isTeam2YetToBat ? (lang === 'bn' ? 'প্লেয়ার তালিকা' : 'Players & Stats') : team2DisplayScore}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {expandedTeamDropdown === 'team2' || expandedTeamDropdown === 'both' ? (
                  <ChevronUp size={15} className="text-cyan-300" />
                ) : (
                  <ChevronDown size={15} className="text-slate-400" />
                )}
              </div>
            </button>
          </div>

          {/* ====================================================================
              RECENT TWO OVERS BAR (অতিরিক্ত বল সহ পুরো দুই ওভার)
              ==================================================================== */}
          {!isUpcomingMatch && recentTwoOvers.length > 0 && (
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-950/85 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono shadow-inner">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] sm:text-xs font-black uppercase text-emerald-300 tracking-wider">
                  {lang === 'bn' ? 'সাম্প্রতিক দুই ওভার (অতিরিক্ত বল সহ)' : 'Recent 2 Overs (With Extras)'}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {recentTwoOvers.map((ov, ovIdx) => (
                  <div key={ov.overNumber} className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/15 text-[9px] sm:text-[10px] font-black text-slate-300">
                      {lang === 'bn' ? `ওভার ${toBengaliDigits(ov.overNumber)}` : `Ov ${ov.overNumber}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {ov.balls.map((b, bIdx) => renderBallBadge(b.symbol, `${ov.overNumber}-${bIdx}`))}
                    </div>
                    {ovIdx === 0 && recentTwoOvers.length > 1 && (
                      <div className="h-4 w-[1.5px] bg-white/20 mx-1 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Both Scorecards Button */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setExpandedTeamDropdown(expandedTeamDropdown === 'both' ? null : 'both')}
              className="text-[11px] font-bold text-slate-300 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Award size={12} className="text-emerald-400" />
              <span>
                {expandedTeamDropdown === 'both'
                  ? (lang === 'bn' ? 'উভয় দলের স্কোরকার্ড কলাপ্স করুন ▲' : 'Collapse Both Team Scorecards ▲')
                  : (lang === 'bn' ? 'উভয় দলের পূর্ণাঙ্গ স্কোরকার্ড একসাথে দেখুন ▾' : 'Expand Both Team Scorecards Together ▾')}
              </span>
            </button>

            {/* Fallback compact pill display if recentTwoOvers is empty but liveRecentBalls exists */}
            {recentTwoOvers.length === 0 && match.liveRecentBalls && match.liveRecentBalls.length > 0 && (
              <div className="flex items-center gap-1 font-mono overflow-x-auto no-scrollbar">
                <span className="text-[9px] text-slate-400 uppercase font-bold">Recent:</span>
                {match.liveRecentBalls.slice(-14).map((b, i) => renderBallBadge(b, i))}
              </div>
            )}
          </div>

          {/* Expanded Dropdown Content Area */}
          <AnimatePresence>
            {expandedTeamDropdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden space-y-3 pt-1"
              >
                {(expandedTeamDropdown === 'team1' || expandedTeamDropdown === 'both') && renderTeamScorecardPanel(1)}
                {(expandedTeamDropdown === 'team2' || expandedTeamDropdown === 'both') && renderTeamScorecardPanel(2)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
