/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback, useRef, ReactNode, TouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Undo2, 
  History, 
  Settings2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Users,
  Target,
  Flame,
  Zap,
  Hand,
  Calculator,
  MoveRight,
  UserMinus,
  Activity,
  Languages,
  WifiOff,
  Sun,
  Moon,
  Play,
  Pause,
  Settings,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  Pin,
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  TrendingUp,
  Coins,
  Percent,
  Hash,
  Footprints,
  Swords,
  Hammer,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Edit3,
  Copy,
  RefreshCw,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  Bell,
  Layers,
  Flag,
  EyeOff,
  Crown,
  VolumeX,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  Ticket,
  Link2,
  ExternalLink,
  Radio,
  Globe,
  Sparkles,
  Download,
  Upload,
  Search,
  CircleDot
} from 'lucide-react';
import { toast } from 'sonner';
import { BetSlipStudio } from './components/BetSlipStudio';
import { BallNumberWordLogo } from './components/BallNumberWordLogo';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { BallEvent, MatchState, TargetMilestone, ScheduleEvent, TournamentFolder } from './types';
import { 
  MatchCountdownHero, 
  MatchCountdownBadge, 
  MatchStartTimeEditorModal,
  toBengaliDigits
} from './components/MatchCountdown';
import { TargetManagerModal } from './components/TargetManagerModal';
import { RunRateAnalysis } from './components/RunRateAnalysis';

const STORAGE_KEY = 'cricket-score-master-state';

const TRANSLATIONS = {
  en: {
    title: "Cricket Score Master",
    subtitle: "Ball-by-ball scoring assistant",
    totalScore: "Total Score",
    overs: "Overs",
    runRate: "Run Rate",
    currentOver: "Current Over",
    updateScore: "Update Score",
    selectOutcome: "Select the outcome of the current delivery",
    extras: "Extras",
    wide: "Wide",
    noBall: "No Ball",
    wicket: "Wicket",
    dot: "Dot",
    history: "Ball History",
    awaiting: "Awaiting first ball",
    undo: "Undo",
    reset: "Reset",
    editTeams: "Edit Teams",
    addTeam: "Add Team",
    selectBattingTeam: "Select Batting Team",
    selectBowlingTeam: "Select Bowling Team",
    teamList: "Team List",
    tournamentFolders: "Tournament Folders",
    addTournamentFolder: "Add Tournament Folder",
    newTournamentName: "Tournament Name",
    teamsInTournament: "Teams in Tournament",
    addToActiveMatch: "Add to Active Match",
    setBatting: "Set Batting",
    setBowling: "Set Bowling",
    team1: "Team 1 Name",
    team2: "Team 2 Name",
    score: "Score",
    runsWicket: "Runs/Wicket",
    over: "Over",
    target: "Target Score",
    targets: "Multiple Targets",
    currentScore: "Current Runs",
    currentWickets: "Current Wickets",
    currentOvers: "Current Overs",
    currentBalls: "Current Balls",
    totalOvers: "Total Overs",
    multipleOvers: "Multiple Overs (comma separated)",
    need: "Need",
    runsNeeded: "runs from",
    ballsRemaining: "balls",
    win: "WON!",
    loss: "LOST",
    out: "WICKETS",
    runs: "RUNS",
    dotBall: "DOT BALL",
    matches: "Matches",
    newMatch: "New Match",
    matchName: "Match Name",
    deleteMatch: "Delete Match",
    switchMatch: "Switch Match",
    replay: "Replay",
    winCondition: "Win Condition",
    editMilestone: "Edit Milestone",
    deleteMilestone: "Delete Milestone",
    moreToWin: "More to Win",
    lessOrEqualWin: "Equal or Less to Win",
    addTarget: "Add Target",
    addOver: "Add Over",
    batting: "Batting",
    balls: "BALL",
    perOver: "per over",
    overCompleted: "Over Completed",
    maidenOver: "Maiden Over",
    thisOver: "This over",
    undone: "undone",
    total: "Total",
    net: "Net",
    requiredRR: "RRR",
    runRateShort: "RR",
    diff: "Diff",
    newTarget: "New Target",
    targetMilestones: "Target Milestones",
    confirmTarget: "Confirm Target",
    oddShort: "O",
    stakeShort: "S",
    returnShort: "R",
    back: "Back",
    entries: "Entries",
    ballsUndone: "balls undone",
    prevMatch: "Previous Match",
    nextMatch: "Next Match",
    close: "Close",
    cancel: "Cancel",
    selectRuns: "Select Runs",
    admin: "Admin",
    milestoneWon: "MILESTONE WON",
    celebrationFour: "FOUR!",
    celebrationSix: "SIX!",
    celebrationWicket: "WICKET!",
    milestoneLost: "MILESTONE LOST",
    allMilestonesCompleted: "All Milestones Completed",
    finishedMilestones: "Finished Milestones",
    otherMilestones: "Other Milestones",
    dotBallsNeeded: "balls need to be dot",
    byes: "Byes",
    legByes: "Leg Byes",
    retire: "Retire",
    swapBatsman: "Swap Batsman",
    partnerships: "Partnerships",
    resetSuccess: "Match and milestones reset",
    undoFromHere: "Undo from here",
    freeHit: "FREE HIT",
    inningsCompleted: "Innings Completed",
    start2ndInnings: "Start 2nd Innings",
    targetSet: "Target set for 2nd innings",
    finalScore: "Final Score",
    finalWickets: "Final Wickets",
    finalRunRate: "Final Run Rate",
    fallOfWickets: "Fall of Wickets",
    strikeRate: "SR",
    fours: "4s",
    sixes: "6s",
    howOut: "Status",
    notOut: "Not Out",
    yetToBat: "Yet to Bat",
    onStrike: "Strike",
    scorecard: "Scorecard",
    batter: "Batter",
    editPlayer: "Edit Player Stats",
    editTeamScore: "Edit Team Score",
    dls: "DLS",
    save: "Save",
    playerName: "Player Name",
    wickets: "Wickets",
    runsWickets: "Runs/Wickets",
    odd: "Odd",
    stake: "Stake",
    potentialReturn: "Return",
    profit: "Profit",
    loss_label: "Loss",
    joy: "Joy",
    har: "Har",
    chorman: "Active",
    extra: "Extra",
    lock: "Lock",
    unlock: "Unlock",
    plus1Run: "+1 Run",
    plus1Ball: "+1 Ball",
    shortcut: "Shortcut",
    penaltyRun: "Penalty Run",
    bulkOverInput: "Bulk Over Input",
    displaySettings: "Display Settings",
    showMilestones: "Show Milestones",
    showHistory: "Show History",
    showChart: "Show Chart",
    showRecentBalls: "Show Recent Balls",
    showDashboard: "Show Scoreboard",
    showAnimations: "Show Animations",
    showPlayerList: "Show Player List",
    showTeamList: "Show Team List",
    showByeLegBye: "Show Bye & Leg Bye",
    showPlayerStats: "Show Player Stats",
    battingDemo: "Batting Demo",
    bowlingDemo: "Bowling Demo",
    matchSchedule: "Tournament & Match Schedule",
    addEvent: "Add Event",
    editEvent: "Edit Event",
    copyEvent: "Copy Event",
    eventDate: "Date",
    eventTime: "Time",
    group: "Group",
    venue: "Venue",
    saveEvent: "Save Event",
    deleteEvent: "Delete Event",
    wicketTypes: {
      bowled: "Bowled",
      caught: "Caught",
      runOut: "Run Out",
      lbw: "LBW",
      stumped: "Stumped",
      caughtAndBowled: "Caught & Bowled",
      hitWicket: "Hit Wicket",
      retiredOut: "Retired Out",
      others: "Others"
    }
  },
  bn: {
    title: "ক্রিকেট স্কোর মাস্টার",
    subtitle: "বল-বাই-বল স্কোরিং অ্যাসিস্ট্যান্ট",
    totalScore: "মোট স্কোর",
    overs: "ওভার",
    runRate: "রান রেট",
    currentOver: "বর্তমান ওভার",
    updateScore: "স্কোর আপডেট করুন",
    selectOutcome: "বর্তমান বলের ফলাফল নির্বাচন করুন",
    extras: "অতিরিক্ত",
    wide: "ওয়াইড",
    noBall: "নো বল",
    wicket: "উইকেট",
    dot: "ডট",
    history: "বলের ইতিহাস",
    awaiting: "প্রথম বলের অপেক্ষায়",
    undo: "পূর্বাবস্থায়",
    reset: "রিসেট",
    editTeams: "টিম পরিবর্তন",
    addTeam: "নতুন টিম যোগ করুন",
    selectBattingTeam: "ব্যাটিং টিম নির্বাচন করুন",
    selectBowlingTeam: "বোলিং টিম নির্বাচন করুন",
    teamList: "টিম তালিকা",
    tournamentFolders: "টুর্নামেন্ট ফোল্ডারসমূহ",
    addTournamentFolder: "নতুন টুর্নামেন্ট যোগ করুন",
    newTournamentName: "টুর্নামেন্টের নাম",
    teamsInTournament: "টুর্নামেন্টের দলসমূহ",
    addToActiveMatch: "চলতি ম্যাচে যোগ করুন",
    setBatting: "ব্যাটিং সেট করুন",
    setBowling: "বোলিং সেট করুন",
    team1: "টিম ১ এর নাম",
    team2: "টিম ২ এর নাম",
    score: "রান",
    runsWicket: "রান/উইকেট",
    over: "ওভার",
    target: "লক্ষ্য",
    targets: "একাধিক লক্ষ্য",
    currentScore: "বর্তমান রান",
    currentWickets: "বর্তমান উইকেট",
    currentOvers: "বর্তমান ওভার",
    currentBalls: "বর্তমান বল",
    totalOvers: "মোট ওভার",
    multipleOvers: "একাধিক ওভার (কমা দিয়ে লিখুন)",
    need: "জয়ের জন্য",
    runsNeeded: "রান প্রয়োজন",
    ballsRemaining: "বলে",
    win: "জয়ী!",
    loss: "পরাজিত",
    from: "থেকে",
    out: "উইকেট",
    runs: "রান",
    dotBall: "ডট বল",
    matches: "ম্যাচ তালিকা",
    newMatch: "নতুন ম্যাচ",
    matchName: "ম্যাচের নাম",
    deleteMatch: "ম্যাচ মুছুন",
    switchMatch: "ম্যাচ পরিবর্তন",
    replay: "রিপ্লে",
    winCondition: "জয়ের শর্ত",
    editMilestone: "মাইলস্টোন এডিট করুন",
    deleteMilestone: "মাইলস্টোন ডিলিট করুন",
    moreToWin: "বেশি হলে জয়",
    lessOrEqualWin: "সমান বা কম হলে জয়",
    addTarget: "টার্গেট যোগ করুন",
    addOver: "ওভার যোগ করুন",
    batting: "ব্যাটিং",
    balls: "বল",
    perOver: "প্রতি ওভার",
    overCompleted: "ওভার শেষ",
    maidenOver: "মেইডেন ওভার",
    thisOver: "এই ওভারে",
    undone: "মুছে ফেলা হয়েছে",
    total: "মোট",
    net: "নিট",
    requiredRR: "RRR",
    runRateShort: "RR",
    diff: "পার্থক্য",
    newTarget: "নতুন টার্গেট",
    targetMilestones: "টার্গেট মাইলস্টোন",
    confirmTarget: "টার্গেট নিশ্চিত করুন",
    oddShort: "অ",
    stakeShort: "স",
    returnShort: "রি",
    back: "পিছনে",
    entries: "এন্ট্রি",
    ballsUndone: "টি বল মুছে ফেলা হয়েছে",
    prevMatch: "আগের ম্যাচ",
    nextMatch: "পরের ম্যাচ",
    close: "বন্ধ করুন",
    cancel: "বাতিল",
    selectRuns: "রান সংখ্যা নির্বাচন করুন",
    admin: "এডমিন",
    milestoneWon: "মাইলস্টোন জয়",
    celebrationFour: "চার (৪)!",
    celebrationSix: "ছয় (৬)!",
    celebrationWicket: "উইকেট!",
    milestoneLost: "মাইলস্টোন হার",
    allMilestonesCompleted: "সবগুলো মাইলস্টোন সম্পন্ন",
    finishedMilestones: "শেষ হওয়া মাইলস্টোন",
    otherMilestones: "অন্যান্য মাইলস্টোন",
    dotBallsNeeded: "বল ডট দিতে হবে",
    byes: "বাই",
    legByes: "লেগ বাই",
    battingDemo: "ব্যাটিং ডেমো",
    bowlingDemo: "বোলিং ডেমো",
    retire: "রিটায়ার",
    swapBatsman: "ব্যাটসম্যান পরিবর্তন",
    partnerships: "পার্টনারশিপ",
    resetSuccess: "ম্যাচ এবং মাইলস্টোন সব রিসেট করা হয়েছে",
    undoFromHere: "এখান থেকে মুছে ফেলুন",
    freeHit: "ফ্রি হিট",
    inningsCompleted: "ইনিংস সম্পন্ন",
    start2ndInnings: "২য় ইনিংস শুরু করুন",
    targetSet: "২য় ইনিংসের লক্ষ্যমাত্রা নির্ধারিত করা হয়েছে",
    finalScore: "মোট রান",
    finalWickets: "মোট উইকেট",
    finalRunRate: "ফাইনাল রান রেট",
    fallOfWickets: "উইকেটের পতন",
    strikeRate: "এসআর",
    fours: "৪",
    sixes: "৬",
    howOut: "আউট",
    notOut: "নট আউট",
    yetToBat: "ব্যাটিং করেনি",
    onStrike: "স্ট্রাইকার",
    scorecard: "স্কোরকার্ড",
    batter: "ব্যাটার",
    editPlayer: "প্লেয়ার স্ট্যাটস পরিবর্তন",
    editTeamScore: "টিম স্কোর পরিবর্তন",
    dls: "ডিএলএস (DLS)",
    save: "সংরক্ষণ করুন",
    playerName: "প্লেয়ারের নাম",
    wickets: "উইকেট",
    runsWickets: "রান/উইকেট",
    odd: "অড",
    stake: "স্টেক",
    potentialReturn: "রিটার্ন",
    profit: "লাভ",
    loss_label: "ক্ষতি",
    joy: "জয়",
    har: "হার",
    chorman: "চলমান",
    extra: "অতিরিক্ত",
    lock: "লক",
    unlock: "আনলক",
    plus1Run: "+১ রান",
    plus1Ball: "+১ বল",
    shortcut: "শর্টকাট",
    penaltyRun: "পেনাল্টি রান",
    bulkOverInput: "ওভার ইনপুট",
    displaySettings: "ডিসপ্লে সেটিংস",
    showMilestones: "মাইলস্টোন দেখান",
    showHistory: "ইতিহাস দেখান",
    showChart: "চার্ট দেখান",
    showRecentBalls: "রিসেন্ট বল দেখান",
    showDashboard: "স্কোরবোর্ড দেখান",
    showAnimations: "এনিমেশন দেখান",
    showPlayerList: "প্লেয়ার লিস্ট দেখান",
    showTeamList: "দল লিস্ট দেখান",
    showByeLegBye: "বাই ও লেগ বাই দেখান",
    showPlayerStats: "প্লেয়ার স্ট্যাটাস দেখান",
    matchSchedule: "টুর্নামেন্ট ফোল্ডার ও সিডিউল",
    addEvent: "নতুন ইভেন্ট",
    editEvent: "ইভেন্ট এডিট",
    copyEvent: "কপি ইভেন্ট",
    eventDate: "তারিখ",
    eventTime: "সময়",
    group: "গ্রুপ",
    venue: "ভেন্যু",
    saveEvent: "সেভ করুন",
    deleteEvent: "ডিলিট করুন",
    wicketTypes: {
      bowled: "বোল্ড",
      caught: "ক্যাচ",
      runOut: "রান আউট",
      lbw: "এলবিডব্লিউ",
      stumped: "স্টাম্পড",
      caughtAndBowled: "ক্যাচ ও বোল্ড",
      hitWicket: "হিট উইকেট",
      retiredOut: "রিটায়ার্ড আউট",
      others: "অন্যান্য"
    }
  }
};

const Scorecard = ({ match, t, lang, onStrikeIdx, onSwapStrike, onSelectBatter, onEditPlayer, onEditTeamScore }: { 
  match: MatchState; 
  t: any; 
  lang: string;
  onStrikeIdx: number;
  onSwapStrike: () => void;
  onSelectBatter: (slot: 1 | 2, idx: number) => void;
  onEditPlayer: (idx: number) => void;
  onEditTeamScore: () => void;
}) => {
  const battingStats = match.battingStats || [];
  const active1Idx = match.activeBatsman1Idx;
  const active2Idx = match.activeBatsman2Idx;
  
  const b1 = typeof active1Idx === 'number' ? battingStats[active1Idx] : null;
  const b2 = typeof active2Idx === 'number' ? battingStats[active2Idx] : null;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      {/* Team Score Display that is clickable */}
      <div 
        onClick={onEditTeamScore}
        className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors"
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2 group/team" onClick={(e) => { e.stopPropagation(); onEditTeamScore(); }}>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{match.battingTeam}</span>
            <ArrowDownUp size={10} className="text-indigo-300 opacity-0 group-hover/team:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{match.score}/{match.wickets}</span>
            <span className="text-sm font-bold text-slate-500 leading-none">
              {match.format === '100' ? (
                lang === 'bn' ? `${match.balls} বল` : `${match.balls} balls`
              ) : (
                `${Math.floor(match.balls / 6)}.${match.balls % 6} ${t.overs}`
              )}
            </span>
          </div>
        </div>
        <Edit3 size={18} className="text-indigo-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Batsman 1 Box */}
        <div 
          onClick={() => onSelectBatter(1, active1Idx ?? 0)}
          className={cn(
            "relative p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group",
            onStrikeIdx === 0 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]" 
              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
          )}
        >
          {onStrikeIdx === 0 && (
            <motion.div 
              layoutId="strike-indicator"
              className="absolute top-2 right-2"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            </motion.div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest opacity-60",
                onStrikeIdx === 0 ? "text-indigo-100" : "text-slate-400"
              )}>{t.batter} 1</span>
              <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-lg font-black truncate leading-tight">{b1?.name || (lang === 'bn' ? 'ব্যাটার ১' : 'Batter 1')}</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-black leading-none">{b1?.runs || 0}</span>
              <span className="text-sm font-bold opacity-60 leading-none mb-0.5">({b1?.balls || 0})</span>
            </div>
          </div>
        </div>

        {/* Batsman 2 Box */}
        <div 
          onClick={() => onSelectBatter(2, active2Idx ?? 1)}
          className={cn(
            "relative p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group",
            onStrikeIdx === 1 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]" 
              : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
          )}
        >
          {onStrikeIdx === 1 && (
            <motion.div 
              layoutId="strike-indicator"
              className="absolute top-2 right-2"
            >
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            </motion.div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest opacity-60",
                onStrikeIdx === 1 ? "text-indigo-100" : "text-slate-400"
              )}>{t.batter} 2</span>
              <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-lg font-black truncate leading-tight">{b2?.name || (lang === 'bn' ? 'ব্যাটার ২' : 'Batter 2')}</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-black leading-none">{b2?.runs || 0}</span>
              <span className="text-sm font-bold opacity-60 leading-none mb-0.5">({b2?.balls || 0})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Quick Strike Swap */}
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-10 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
          onClick={onSwapStrike}
        >
          <RefreshCw size={14} />
          {t.swapBatsman}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-10 h-10 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center"
          onClick={onEditTeamScore}
        >
          <Edit3 size={14} />
        </Button>
      </div>

      {/* Scorecard Table View (Expandable/Scrollable) */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader 
          className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">{t.scorecard}</CardTitle>
            </div>
            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </CardHeader>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="p-0 border-t border-slate-100 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] uppercase font-black tracking-wider text-slate-400">
                        <th className="px-4 py-3">{t.batter}</th>
                        <th className="px-2 py-3 text-center">{t.runs}</th>
                        <th className="px-2 py-3 text-center">{t.balls}</th>
                        <th className="px-2 py-3 text-center">{t.fours}</th>
                        <th className="px-2 py-3 text-center">{t.sixes}</th>
                        <th className="px-2 py-3 text-center">{t.strikeRate}</th>
                        <th className="px-4 py-3 text-right">{t.howOut}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {battingStats.map((p, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => onEditPlayer(idx)}
                          className={cn(
                            "text-sm transition-colors cursor-pointer",
                            (idx === active1Idx || idx === active2Idx) ? "bg-indigo-50/30 dark:bg-indigo-900/10 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <td className="px-4 py-3 font-black text-slate-700 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              {p.name}
                              {idx === active1Idx && <Badge className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900 font-bold text-[8px] h-4">B1</Badge>}
                              {idx === active2Idx && <Badge className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 font-bold text-[8px] h-4">B2</Badge>}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center font-black">{p.runs}</td>
                          <td className="px-2 py-3 text-center text-slate-500 dark:text-slate-400 font-bold">{p.balls}</td>
                          <td className="px-2 py-3 text-center text-slate-500 dark:text-slate-400 font-bold">{p.fours}</td>
                          <td className="px-2 py-3 text-center text-slate-500 dark:text-slate-400 font-bold">{p.sixes}</td>
                          <td className="px-2 py-3 text-center text-slate-500 dark:text-slate-400 font-bold">
                            {p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : "0.0"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.isOut ? (
                              <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                {p.wicketType || t.wicket}
                              </span>
                            ) : (idx === active1Idx || idx === active2Idx || p.balls > 0) ? (
                              <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                {t.notOut}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
                                {t.yetToBat}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fall of Wickets Section */}
                {match.history.some(e => e.isWicket) && (
                  <div className="mx-4 mt-6 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown size={14} className="text-red-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.fallOfWickets}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...match.history]
                        .reverse()
                        .filter(e => e.isWicket)
                        .map((e, idx) => (
                          <div 
                            key={idx} 
                            className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800 flex flex-col gap-0.5"
                          >
                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{idx + 1}{lang === 'bn' ? 'ম' : (idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th')}</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{e.score}/{idx + 1}</span>
                              <span className="text-[10px] font-bold text-slate-400">({Math.floor(e.totalBallsAtEvent / (match.format === '100' ? 5 : 6))}.{e.totalBallsAtEvent % (match.format === '100' ? 5 : 6)})</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

const STORAGE_KEY_MATCHES = 'cricket-score-master-matches';
const STORAGE_KEY_CURRENT_ID = 'cricket-score-master-current-id';
const STORAGE_KEY_DISPLAY_CONFIGS = 'cricket-score-master-display-configs';

const createNewMatch = (name: string): MatchState => ({
  id: Date.now().toString(),
  name,
  team1: "টিম এ",
  team2: "টিম বি",
  teams: ["টিম এ", "টিম বি"],
  battingTeam: "টিম এ",
  bowlingTeam: "টিম বি",
  score: 0,
  wickets: 0,
  balls: 0,
  maxOvers: 20,
  format: '20',
  maxWickets: 10,
  targetMilestones: [{ runs: 100, over: 20, condition: 'more', entries: [{ odd: 1.8, stake: 100 }] }],
  history: [],
  playerList1: [],
  playerList2: [],
  battingStats: [],
  activeBatsman1Idx: 0,
  activeBatsman2Idx: 1,
  onStrikeIdx: 0,
  liveMatchUrl: "",
  liveSyncEnabled: false,
  liveSyncInterval: 0.00000001,
});

interface CapsuleBadgeProps {
  value: string | number;
  label: string;
  type: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'red';
  size?: 'sm' | 'md' | 'lg';
  trend?: 'up' | 'down' | 'none';
}

const CapsuleBadge = ({ value, label, type, size = 'md', trend }: CapsuleBadgeProps) => {
  const configs = {
    indigo: {
      leftBg: 'bg-indigo-600 dark:bg-indigo-600',
      rightBg: 'bg-[#F2F4FF] dark:bg-indigo-950/40',
      textColor: 'text-indigo-700 dark:text-indigo-400',
      borderColor: 'border-indigo-500/20 shadow-indigo-500/5'
    },
    emerald: {
      leftBg: 'bg-emerald-600 dark:bg-emerald-600',
      rightBg: 'bg-[#EBFDF5] dark:bg-emerald-950/40',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      borderColor: 'border-emerald-500/20 shadow-emerald-500/5'
    },
    amber: {
      leftBg: 'bg-amber-500 dark:bg-amber-500',
      rightBg: 'bg-[#FFF9EB] dark:bg-amber-950/20',
      textColor: 'text-amber-700 dark:text-amber-400',
      borderColor: 'border-amber-500/20 shadow-amber-500/5'
    },
    blue: {
      leftBg: 'bg-blue-600 dark:bg-blue-600',
      rightBg: 'bg-[#EFF6FF] dark:bg-blue-950/40',
      textColor: 'text-blue-700 dark:text-blue-200',
      borderColor: 'border-blue-500/20 shadow-blue-500/5'
    },
    purple: {
      leftBg: 'bg-purple-600 dark:bg-purple-600',
      rightBg: 'bg-[#FAF5FF] dark:bg-purple-950/40',
      textColor: 'text-purple-700 dark:text-purple-400',
      borderColor: 'border-purple-500/20 shadow-purple-500/5'
    },
    red: {
      leftBg: 'bg-red-500 dark:bg-red-650',
      rightBg: 'bg-[#FEF2F2] dark:bg-red-950/40',
      textColor: 'text-red-700 dark:text-red-400',
      borderColor: 'border-red-500/20 shadow-red-500/5'
    },
    rose: {
      leftBg: 'bg-rose-600 dark:bg-rose-600',
      rightBg: 'bg-[#FFF1F2] dark:bg-rose-950/40',
      textColor: 'text-rose-700 dark:text-rose-400',
      borderColor: 'border-rose-500/20 shadow-rose-500/5'
    }
  };

  const config = configs[type] || configs.indigo;
  const valStr = String(value);
  const resolvedTrend = trend !== undefined ? trend : (
    valStr.startsWith('+') ? 'up' : (valStr.startsWith('-') ? 'down' : 'none')
  );

  if (size === 'sm') {
    return (
      <div className={cn(
        "flex items-center h-[26px] w-full rounded-full overflow-hidden border bg-white dark:bg-slate-950 p-[0.5px] shadow-sm transition-all flex-row flex-nowrap",
        config.borderColor
      )}>
        <div className={cn(
          "flex-[1.4] h-full flex items-center justify-center text-white font-mono font-black text-[10.5px] px-1 rounded-l-full leading-none whitespace-nowrap truncate",
          config.leftBg
        )}>
          {resolvedTrend === 'up' && (
            <ArrowUp size={10} className="mr-0.5 inline-block shrink-0 stroke-[3px]" />
          )}
          {resolvedTrend === 'down' && (
            <ArrowDown size={10} className="mr-0.5 inline-block shrink-0 stroke-[3px]" />
          )}
          {value}
        </div>
        <div className={cn(
          "flex-1 h-full flex items-center justify-center font-sans font-black text-[7.5px] uppercase tracking-tighter rounded-r-full leading-none whitespace-nowrap truncate px-1",
          config.rightBg,
          config.textColor
        )}>
          {label}
        </div>
      </div>
    );
  }

  const heightClass = size === 'lg' ? 'h-12' : 'h-[38px]';
  const valTextSize = size === 'lg' ? 'text-lg font-black' : 'text-[13px] font-black';
  const lblTextSize = size === 'lg' ? 'text-[10px]' : 'text-[8.5px]';

  return (
    <div className={cn(
      "flex items-center w-full rounded-full overflow-hidden border p-[1.5px] bg-[#E2E8F0]/20 dark:bg-slate-950/50 shadow-md transition-all flex-row flex-nowrap",
      heightClass,
      config.borderColor
    )}>
      <div className={cn(
        "flex-[1.45] h-full flex items-center justify-center text-white font-mono font-black px-2 rounded-l-full leading-none whitespace-nowrap truncate",
        valTextSize,
        config.leftBg
      )}>
        {resolvedTrend === 'up' && (
          <ArrowUp size={size === 'lg' ? 15 : 12} className="mr-0.5 inline-block shrink-0 stroke-[3px]" />
        )}
        {resolvedTrend === 'down' && (
          <ArrowDown size={size === 'lg' ? 15 : 12} className="mr-0.5 inline-block shrink-0 stroke-[3px]" />
        )}
        {value}
      </div>
      <div className={cn(
        "flex-1 h-full flex items-center justify-center font-sans font-black uppercase tracking-wider rounded-r-full leading-none whitespace-nowrap truncate px-1",
        lblTextSize,
        config.rightBg,
        config.textColor
      )}>
        {label}
      </div>
    </div>
  );
};

const MiniStepper = ({ onUp, onDown, size = 'md' }: { onUp: () => void; onDown: () => void; size?: 'sm' | 'md' }) => {
  const isSm = size === 'sm';
  return (
    <div className={cn(
      "flex flex-col items-center justify-between bg-black/55 hover:bg-black/75 rounded-full border border-white/20 shrink-0 select-none transition-colors shadow-sm",
      isSm ? "h-[31px] w-[17px] py-0.5" : "h-[35px] w-[19px] py-1"
    )}>
      <button 
        onClick={(e) => { e.stopPropagation(); onUp(); }} 
        className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer active:scale-125 flex items-center justify-center w-full h-[45%]"
      >
        <ChevronUp size={isSm ? 10 : 12} className="stroke-[3.5px]" />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onDown(); }} 
        className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer active:scale-125 flex items-center justify-center w-full h-[45%]"
      >
        <ChevronDown size={isSm ? 10 : 12} className="stroke-[3.5px]" />
      </button>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    const saved = localStorage.getItem('cricket-lang');
    return (saved as 'en' | 'bn') || 'bn';
  });

  const [activeMainTab, setActiveMainTab] = useState<'scorer' | 'betslip' | 'runrate'>(() => {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'betslip' || hash === 'scorer' || hash === 'runrate') return hash as any;
      const saved = localStorage.getItem('cricket-active-main-tab');
      if (saved === 'betslip' || saved === 'scorer' || saved === 'runrate') return saved as any;
    } catch {}
    return 'scorer';
  });

  useEffect(() => {
    try {
      localStorage.setItem('cricket-active-main-tab', activeMainTab);
      window.location.hash = activeMainTab;
    } catch {}
  }, [activeMainTab]);

  useEffect(() => {
    localStorage.setItem('cricket-lang', lang);
  }, [lang]);

  const [newPlayerName1, setNewPlayerName1] = useState("");
  const [newPlayerName2, setNewPlayerName2] = useState("");
  const [newTeamName, setNewTeamName] = useState("");

  const addSinglePlayer = (team: 1 | 2) => {
    const name = team === 1 ? newPlayerName1 : newPlayerName2;
    if (!name.trim()) return;

    if (team === 1) {
      const newList = [...(match.playerList1 || []), name.trim()];
      updatePlayerList(1, newList.join(', '));
      setNewPlayerName1("");
    } else {
      const newList = [...(match.playerList2 || []), name.trim()];
      updatePlayerList(2, newList.join(', '));
      setNewPlayerName2("");
    }
    toast.success(lang === 'bn' ? `${name} কে যোগ করা হয়েছে` : `Added ${name}`);
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cricket-theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('cricket-theme', theme);
  }, [theme]);

  const [matches, setMatches] = useState<MatchState[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MATCHES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.map((m: any) => {
            const targets = m.targets || (m.target ? [m.target] : []);
            const overs = m.maxOversList || (m.maxOvers ? [m.maxOvers] : [20]);
            
            const milestones = m.targetMilestones || targets.map((t: number, i: number) => ({ 
              runs: t, 
              over: overs[i] || overs[overs.length - 1] || 20,
              condition: m.winCondition || 'more' 
            }));
            
            const rawInt = m.liveSyncInterval;
            const safeInterval = (rawInt === 0.00000001 || !rawInt || rawInt < 0.0001) ? 0.00000001 : rawInt;
            return {
              ...m,
              liveSyncInterval: safeInterval,
              targetMilestones: milestones,
              id: m.id || Date.now().toString() + Math.random(),
              name: m.name || `${m.team1} vs ${m.team2}`
            };
          });

          // If only 1 match exists, add 2 demo matches so 10-second auto-swipe can cycle
          if (list.length === 1) {
            const m2 = createNewMatch("Match 2: IND vs PAK");
            m2.id = "match-ind-pak-2";
            m2.team1 = "IND";
            m2.team2 = "PAK";
            m2.teams = ["IND", "PAK"];
            m2.battingTeam = "IND";
            m2.bowlingTeam = "PAK";
            m2.score = 172;
            m2.wickets = 4;
            m2.balls = 110;
            m2.maxOvers = 20;
            m2.target = 168;
            m2.liveMatchUrl = "demo://ind-vs-pak";
            m2.liveSyncEnabled = true;
            m2.liveSyncInterval = 0.00000001;
            m2.liveRecentBalls = ["4", "1", "W", "2", "6", "1"];

            const m3 = createNewMatch("Match 3: AUS vs ENG");
            m3.id = "match-aus-eng-3";
            m3.team1 = "AUS";
            m3.team2 = "ENG";
            m3.teams = ["AUS", "ENG"];
            m3.battingTeam = "AUS";
            m3.bowlingTeam = "ENG";
            m3.score = 92;
            m3.wickets = 2;
            m3.balls = 58;
            m3.maxOvers = 20;
            m3.target = 195;
            m3.liveMatchUrl = "demo://aus-vs-eng";
            m3.liveSyncEnabled = true;
            m3.liveSyncInterval = 0.00000001;
            m3.liveRecentBalls = ["•", "1", "4", "1", "•", "2"];
            return [list[0], m2, m3];
          }

          return list;
        }
      } catch (e) {
        console.error("Failed to parse saved matches", e);
      }
    }

    const m1 = createNewMatch("Match 1: BAN vs IND");
    m1.id = "match-ban-ind-1";
    m1.team1 = "BAN";
    m1.team2 = "IND";
    m1.teams = ["BAN", "IND"];
    m1.battingTeam = "BAN";
    m1.bowlingTeam = "IND";
    m1.score = 148;
    m1.wickets = 3;
    m1.balls = 98;
    m1.maxOvers = 20;
    m1.target = 182;
    m1.liveMatchUrl = "demo://t20-live";
    m1.liveSyncEnabled = true;
    m1.liveSyncInterval = 0.00000001;
    m1.liveRecentBalls = ["1", "4", "•", "2", "1", "6"];
    m1.targetMilestones = [
      { runs: 27, over: 1, condition: 'more' },
      { runs: 75, over: 8, condition: 'more' }
    ];

    const m2 = createNewMatch("Match 2: IND vs PAK");
    m2.id = "match-ind-pak-2";
    m2.team1 = "IND";
    m2.team2 = "PAK";
    m2.teams = ["IND", "PAK"];
    m2.battingTeam = "IND";
    m2.bowlingTeam = "PAK";
    m2.score = 172;
    m2.wickets = 4;
    m2.balls = 110;
    m2.maxOvers = 20;
    m2.target = 168;
    m2.liveMatchUrl = "demo://ind-vs-pak";
    m2.liveSyncEnabled = true;
    m2.liveSyncInterval = 0.00000001;
    m2.liveRecentBalls = ["4", "1", "W", "2", "6", "1"];

    const m3 = createNewMatch("Match 3: AUS vs ENG");
    m3.id = "match-aus-eng-3";
    m3.team1 = "AUS";
    m3.team2 = "ENG";
    m3.teams = ["AUS", "ENG"];
    m3.battingTeam = "AUS";
    m3.bowlingTeam = "ENG";
    m3.score = 92;
    m3.wickets = 2;
    m3.balls = 58;
    m3.maxOvers = 20;
    m3.target = 195;
    m3.liveMatchUrl = "demo://aus-vs-eng";
    m3.liveSyncEnabled = true;
    m3.liveSyncInterval = 0.00000001;
    m3.liveRecentBalls = ["•", "1", "4", "1", "•", "2"];

    return [m1, m2, m3];
  });

  const [currentMatchId, setCurrentMatchId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CURRENT_ID);
    return saved || matches[0].id;
  });

  // Auto-swipe match every 10 seconds state
  const [isAutoSwipeEnabled, setIsAutoSwipeEnabled] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right'>('right');
  const [autoSwipeProgress, setAutoSwipeProgress] = useState(0);

  const handleNextMatch = useCallback(() => {
    setSwipeDirection('right');
    setAutoSwipeProgress(0);
    setCurrentMatchId(prevId => {
      if (matches.length <= 1) return prevId;
      const curIdx = matches.findIndex(m => m.id === prevId);
      const nextIdx = (curIdx + 1) % matches.length;
      return matches[nextIdx].id;
    });
  }, [matches]);

  const handlePrevMatch = useCallback(() => {
    setSwipeDirection('left');
    setAutoSwipeProgress(0);
    setCurrentMatchId(prevId => {
      if (matches.length <= 1) return prevId;
      const curIdx = matches.findIndex(m => m.id === prevId);
      const prevIdx = (curIdx - 1 + matches.length) % matches.length;
      return matches[prevIdx].id;
    });
  }, [matches]);

  const [editingPlayerIdx, setEditingPlayerIdx] = useState<number | null>(null);
  const [isEditingTeamScore, setIsEditingTeamScore] = useState(false);
  const [tempEditPlayer, setTempEditPlayer] = useState({
    name: "", runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false
  });
  const [tempEditScore, setTempEditScore] = useState({ runs: 0, wickets: 0, battingTeam: "", overs: 0, balls: 0 });

  const match = useMemo(() => {
    return matches.find(m => m.id === currentMatchId) || matches[0];
  }, [matches, currentMatchId]);

  const matchRef = useRef(match);
  matchRef.current = match;

  const setMatch = (updater: (prev: MatchState) => MatchState) => {
    setMatches(prev => prev.map(m => m.id === currentMatchId ? updater(m) : m));
  };

  const [rawPlayerInput1, setRawPlayerInput1] = useState("");
  const [rawPlayerInput2, setRawPlayerInput2] = useState("");

  // Sync raw input when match changes
  useEffect(() => {
    setRawPlayerInput1((match.playerList1 || []).join(', '));
    setRawPlayerInput2((match.playerList2 || []).join(', '));
  }, [match.id, match.playerList1, match.playerList2]);

  const updatePlayerList = (team: 1 | 2, input: string) => {
    const list = input.split(',').map(s => s.trim()).filter(s => s !== '');
    if (team === 1) {
      setRawPlayerInput1(input);
      setMatch(prev => {
        const next = { ...prev, playerList1: list };
        // If match hasn't started and we're editing current batting team list, init stats
        if (prev.balls === 0 && prev.battingTeam === prev.team1) {
          next.battingStats = list.map(name => ({
            name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false
          }));
        }
        return next;
      });
    } else {
      setRawPlayerInput2(input);
      setMatch(prev => {
        const next = { ...prev, playerList2: list };
        if (prev.balls === 0 && prev.battingTeam === prev.team2) {
          next.battingStats = list.map(name => ({
            name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false
          }));
        }
        return next;
      });
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_ID, currentMatchId);
  }, [currentMatchId]);

  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isBulkInputOpen, setIsBulkInputOpen] = useState(false);
  const [bulkRuns, setBulkRuns] = useState('');
  const [bulkWickets, setBulkWickets] = useState('');
  const [bulkBalls, setBulkBalls] = useState('6');
  const [ballByBallInput, setBallByBallInput] = useState('');
  const [interactiveOverBalls, setInteractiveOverBalls] = useState<(string | number)[]>(Array(6).fill(''));
  const [activeBallIndex, setActiveBallIndex] = useState(0);
  const [ballDetailMenu, setBallDetailMenu] = useState<null | 'W' | 'WD' | 'NB'>(null);
  const [ballSubDetail, setBallSubDetail] = useState<null | string>(null);
  const [isBallByBallMode, setIsBallByBallMode] = useState(false);
  const [isShowingMatches, setIsShowingMatches] = useState(false);
  const [isShowingSchedule, setIsShowingSchedule] = useState(false);
  const [isShowingTournaments, setIsShowingTournaments] = useState(false);
  const [isGoogleCalendarModalOpen, setIsGoogleCalendarModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [isGoogleSearchModalOpen, setIsGoogleSearchModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState("");
  const [isLiveMatchModalOpen, setIsLiveMatchModalOpen] = useState(false);
  const [isStartTimeEditorOpen, setIsStartTimeEditorOpen] = useState(false);
  const [isTargetManagerOpen, setIsTargetManagerOpen] = useState(false);
  const [targetManagerInitialFocus, setTargetManagerInitialFocus] = useState<'over' | 'target' | 'multiple'>('over');
  const [liveUrlInput, setLiveUrlInput] = useState("");
  const [isFetchingLiveUrl, setIsFetchingLiveUrl] = useState(false);
  const isPollingFetchInFlightRef = useRef(false);
  const [scoreFlicker, setScoreFlicker] = useState(false);
  const [selectedOverId, setSelectedOverId] = useState<string>(() => {
    if (match.format === '100') return '100 Ball';
    if (match.format === '10') return 'T10';
    return String(match.maxOvers || 20);
  });
  const [customTargetInput, setCustomTargetInput] = useState<string>(match.target ? String(match.target) : "");
  const [keepCustomTargetOnSync, setKeepCustomTargetOnSync] = useState(true);

  // Sync selectedOverId and customTargetInput with active match
  useEffect(() => {
    if (match.format === '100') {
      setSelectedOverId('100 Ball');
    } else if (match.format === '10') {
      setSelectedOverId('T10');
    } else {
      setSelectedOverId(String(match.maxOvers || 20));
    }
  }, [match.id, match.maxOvers, match.format]);

  useEffect(() => {
    setCustomTargetInput(match.target ? String(match.target) : "");
  }, [match.id, match.target]);

  // Sync liveUrlInput with active match's URL
  useEffect(() => {
    setLiveUrlInput(match.liveMatchUrl || "");
  }, [match.id, match.liveMatchUrl]);

  // Touch Swipe Gesture handler for smooth manual swipe between matches
  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (diff < -45) {
      handleNextMatch(); // swipe left -> next match
    } else if (diff > 45) {
      handlePrevMatch(); // swipe right -> prev match
    }
  }, [handleNextMatch, handlePrevMatch]);

  const handleNextMatchRef = useRef(handleNextMatch);
  handleNextMatchRef.current = handleNextMatch;

  // 10-second Auto Swipe through all added matches (smooth 100ms progress tracker)
  useEffect(() => {
    if (!isAutoSwipeEnabled || matches.length <= 1) {
      setAutoSwipeProgress(0);
      return;
    }
    // Pause only when user is actively editing direct score inputs or modals
    if (isLiveMatchModalOpen || isStartTimeEditorOpen || isTargetManagerOpen || isBulkInputOpen || isEditingTeams) {
      return;
    }

    const intervalMs = 100;
    const totalMs = 10000;
    const increment = (intervalMs / totalMs) * 100;

    const timer = setInterval(() => {
      setAutoSwipeProgress(prev => {
        if (prev >= 100) {
          handleNextMatchRef.current();
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isAutoSwipeEnabled,
    matches.length,
    isLiveMatchModalOpen,
    isStartTimeEditorOpen,
    isTargetManagerOpen,
    isBulkInputOpen,
    isEditingTeams
  ]);

  // Fetch live cricket score from URL
  const fetchLiveMatchData = useCallback(async (urlToFetch?: string, isManual = false) => {
    const targetUrl = (urlToFetch !== undefined ? urlToFetch : (liveUrlInput || match.liveMatchUrl || "")).trim();
    if (!targetUrl) {
      if (isManual) {
        toast.error(lang === 'bn' ? "দয়া করে একটি বৈধ ক্রিকেট ম্যাচ লিংক লিখুন বা পেস্ট করুন" : "Please enter or paste a valid cricket match URL");
      }
      return;
    }

    if (!isManual && isPollingFetchInFlightRef.current) {
      return;
    }

    if (isManual) setIsFetchingLiveUrl(true);
    isPollingFetchInFlightRef.current = true;

    try {
      let live: any = null;

      // Handle simulated/demo matches entirely client-side (Zero server load, instant responsiveness)
      if (targetUrl.startsWith("demo://") || targetUrl.includes("ban-vs-ind") || targetUrl.includes("ind-vs-pak") || targetUrl.includes("aus-vs-eng")) {
        const curMatch = matchRef.current;
        const isUpcoming = targetUrl.includes("upcoming") || targetUrl.includes("not-started");
        const team1 = targetUrl.includes("ind-vs-pak") ? "IND" : (targetUrl.includes("aus-vs-eng") ? "AUS" : "BAN");
        const team2 = targetUrl.includes("ind-vs-pak") ? "PAK" : (targetUrl.includes("aus-vs-eng") ? "ENG" : "IND");
        const outcomes = [0, 1, 2, 4, 6];
        const runBall = outcomes[Math.floor(Math.random() * outcomes.length)];
        const newScore = isUpcoming ? 0 : Math.min(240, (curMatch.score || 145) + runBall);
        const newBalls = isUpcoming ? 0 : (curMatch.balls || 90) + 1;
        const overs = Math.floor(newBalls / 6);
        const ballsInOver = newBalls % 6;
        live = {
          success: true,
          isDemo: true,
          team1,
          team2,
          battingTeam: team1,
          bowlingTeam: team2,
          score: newScore,
          wickets: isUpcoming ? 0 : Math.min(9, curMatch.wickets || 3),
          overs,
          ballsInOver,
          totalBalls: newBalls,
          target: curMatch.target || 182,
          statusText: isUpcoming ? "ম্যাচ এখনও শুরু হয়নি • শুরু হবে সন্ধ্যা ৭:৩০ মি." : `${team1} need ${Math.max(1, (curMatch.target || 182) - newScore)} runs`,
          recentBalls: [...(curMatch.liveRecentBalls || []).slice(-5), runBall === 0 ? "•" : String(runBall)],
          lastUpdated: new Date().toLocaleTimeString(),
          isUpcoming,
          matchStartTime: isUpcoming ? "আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)" : undefined,
          matchStartTimeIso: isUpcoming ? new Date(Date.now() + 3600000 * 2.5).toISOString() : undefined
        };
      } else {
        // Real external URL: fetch through server proxy
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch("/api/cricket/fetch-live-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.data) {
            live = data.data;
          } else {
            throw new Error(data?.error || "Failed to fetch live match score");
          }
        } else {
          throw new Error("HTTP error " + res.status);
        }
      }

      if (!live) {
        throw new Error("No live match data available");
      }

      // Determine if score, wickets or balls changed to trigger highlight flicker animation
      const curMatch = matchRef.current;
      const scoreChanged = (live.score !== undefined && live.score !== curMatch.score) ||
                            (live.wickets !== undefined && live.wickets !== curMatch.wickets) ||
                            (live.totalBalls !== undefined && live.totalBalls !== curMatch.balls);

      if (scoreChanged) {
        setScoreFlicker(true);
        setTimeout(() => setScoreFlicker(false), 950);
        
        if (isManual) {
          if (live.isUpcoming || (Number(live.score || 0) === 0 && Number(live.totalBalls || 0) === 0 && Boolean(live.matchStartTime))) {
            toast.info(
              lang === 'bn'
                ? `⏰ ম্যাচ এখনও শুরু হয়নি। শুরু হওয়ার সময়: ${live.matchStartTime || 'শীঘ্রই'}`
                : `⏰ Match not started yet. Starts at: ${live.matchStartTime || 'Scheduled Soon'}`
            );
          } else {
            toast.success(
              lang === 'bn'
                ? `🏏 লাইভ স্কোর: ${live.battingTeam} ${live.score}/${live.wickets} (${live.overs}.${live.ballsInOver} ওভ)`
                : `🏏 Live Update: ${live.battingTeam} ${live.score}/${live.wickets} (${live.overs}.${live.ballsInOver} ov)`
            );
          }
        }
      }

      setMatch(prev => {
        const next = { ...prev };
        next.liveMatchUrl = targetUrl;
        next.lastSyncedAt = live.lastUpdated || new Date().toLocaleTimeString();
        next.liveStatusText = live.statusText || next.liveStatusText;
        next.liveRecentBalls = live.recentBalls || next.liveRecentBalls;
        next.liveSyncError = undefined;
        next.isUpcoming = Boolean(live.isUpcoming || (Number(live.score || 0) === 0 && Number(live.totalBalls || 0) === 0 && Boolean(live.matchStartTime)));
        next.matchStartTime = live.matchStartTime || next.matchStartTime;
        next.matchStartTimeIso = live.matchStartTimeIso || next.matchStartTimeIso;

        if (live.team1 && live.team2) {
          next.team1 = live.team1;
          next.team2 = live.team2;
          const currentTeams = prev.teams || [prev.team1, prev.team2];
          next.teams = Array.from(new Set([live.team1, live.team2, ...currentTeams]));
        }
        if (live.battingTeam) next.battingTeam = live.battingTeam;
        if (live.bowlingTeam) next.bowlingTeam = live.bowlingTeam;
        if (live.score !== undefined) next.score = live.score;
        if (live.wickets !== undefined) next.wickets = live.wickets;
        if (live.totalBalls !== undefined) next.balls = live.totalBalls;
        if (live.target !== undefined && live.target > 0) {
          if (!keepCustomTargetOnSync || !prev.target) {
            next.target = live.target;
          }
        }
        if (live.maxOvers !== undefined && live.maxOvers > 0) {
          if (!keepCustomTargetOnSync || !prev.maxOvers) {
            next.maxOvers = live.maxOvers;
          }
        }

        // Detect latest ball symbol from live feed (0, 1, 2, 3, 4, 5, 6, W, WD, NB, LEG BYE, BYE)
        const scoreDelta = (typeof live.score === 'number' && typeof prev.score === 'number') ? (live.score - prev.score) : 0;
        const wicketDelta = (typeof live.wickets === 'number' && typeof prev.wickets === 'number') ? (live.wickets - prev.wickets) : 0;

        let latestBallSymbol: string | null = live.lastBallSymbol || null;

        // If not explicitly provided, deduce from score change or recent balls
        if (!latestBallSymbol) {
          if (scoreDelta === 6) {
            latestBallSymbol = '6';
          } else if (scoreDelta === 4) {
            latestBallSymbol = '4';
          } else if (wicketDelta > 0) {
            latestBallSymbol = 'W';
          } else if (Array.isArray(live.recentBalls) && live.recentBalls.length > 0) {
            const firstBall = live.recentBalls[0];
            const lastBall = live.recentBalls[live.recentBalls.length - 1];
            if (scoreDelta === 6 && (firstBall === '6' || lastBall === '6')) {
              latestBallSymbol = '6';
            } else if (scoreDelta === 4 && (firstBall === '4' || lastBall === '4')) {
              latestBallSymbol = '4';
            } else {
              latestBallSymbol = lastBall;
            }
          }
        }

        const prevBallSymbol = prev.liveRecentBalls && prev.liveRecentBalls.length > 0 ? prev.liveRecentBalls[prev.liveRecentBalls.length - 1] : null;

        if (latestBallSymbol && (latestBallSymbol !== prevBallSymbol || live.score !== prev.score || live.wickets !== prev.wickets || live.totalBalls !== prev.balls)) {
          const isWkt = latestBallSymbol === 'W';
          const isWd = latestBallSymbol === 'WD';
          const isNb = latestBallSymbol === 'NB';
          const isLb = latestBallSymbol === 'LEG BYE';
          const isB = latestBallSymbol === 'BYE';
          let runs = (isWd || isNb || isLb || isB) ? 1 : (isWkt ? 0 : (parseInt(latestBallSymbol, 10) || 0));
          if (scoreDelta > 0 && !isWd && !isNb && !isWkt && runs === 0) {
            runs = scoreDelta;
          }

          const event: BallEvent = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            runs: (isWd || isNb) ? 0 : runs,
            isWicket: isWkt,
            wicketType: isWkt ? 'bowled' : undefined,
            isWide: isWd,
            isNoBall: isNb,
            isBye: isB,
            isLegBye: isLb,
            isExtra: isWd || isNb || isLb || isB,
            score: next.score,
            wickets: next.wickets,
            balls: next.balls,
            timestamp: Date.now(),
            totalBallsAtEvent: next.balls,
            type: isWkt ? 'wicket' : (isWd ? 'wide' : (isNb ? 'noball' : (runs === 0 ? 'dot' : 'run'))),
          };

          next.history = [event, ...(prev.history || []).slice(0, 49)];
          next.liveRecentBalls = [...(next.liveRecentBalls || []).slice(-7), latestBallSymbol];
          setShowLastBallRun(true);
          setLastBallPhase('digit_or_wicket');
        }

        // Sync player stats if available from live feed
        if (Array.isArray(live.batsmen) && live.batsmen.length > 0) {
          next.battingStats = live.batsmen.map((b: any) => ({
            name: b.name || "Batsman",
            runs: b.runs || 0,
            balls: b.balls || 0,
            fours: b.fours || 0,
            sixes: b.sixes || 0,
            isOut: false
          }));
        }

        return next;
      });

      if (isManual) {
        toast.success(lang === 'bn' ? "লাইভ ডাটা সফলভাবে সিঙ্ক হয়েছে!" : "Live score updated successfully!");
      }
    } catch (err: any) {
      const isNetworkErr = err?.message === "Failed to fetch" || err?.name === "TypeError" || err?.name === "AbortError";
      const msg = isNetworkErr
        ? (lang === 'bn' ? "নেটওয়ার্ক বা সার্ভার সংযোগ বিচ্ছিন্ন" : "Network connection lost")
        : (err?.message || "Sync failed");

      if (isManual) {
        console.warn("Live sync manual fetch error:", err?.message || err);
        setMatch(prev => ({ ...prev, liveSyncError: msg }));
        toast.error(lang === 'bn' ? `সিঙ্ক ব্যর্থ: ${msg}` : `Sync failed: ${msg}`);
      } else {
        // Silent background retry without logging fatal console.error
        console.warn("Live sync background polling retry:", err?.message || "connection pending");
      }
    } finally {
      isPollingFetchInFlightRef.current = false;
      if (isManual) setIsFetchingLiveUrl(false);
    }
  }, [liveUrlInput, lang]);

  const fetchLiveMatchDataRef = useRef(fetchLiveMatchData);
  useEffect(() => {
    fetchLiveMatchDataRef.current = fetchLiveMatchData;
  }, [fetchLiveMatchData]);

  // Live Match Sync Polling Effect (Safe, responsive polling: default 3s, minimum 2s)
  useEffect(() => {
    if (!match.liveSyncEnabled || !match.liveMatchUrl) return;

    let isMounted = true;
    let timerId: any = null;

    const isDemo = Boolean(match.liveMatchUrl?.startsWith('demo://') || match.liveMatchUrl?.includes('ban-vs-ind') || match.liveMatchUrl?.includes('ind-vs-pak'));
    const rawInterval = typeof match.liveSyncInterval === 'number' ? match.liveSyncInterval : (isDemo ? 4 : 8);
    const minSec = isDemo ? 3 : 6;
    const intervalSec = Math.max(minSec, rawInterval);
    const intervalMs = Math.round(intervalSec * 1000);

    const poll = async () => {
      if (!isMounted) return;
      // If tab is in background, slow down polling to save resources
      if (typeof document !== 'undefined' && document.hidden) {
        timerId = setTimeout(poll, Math.max(intervalMs * 2, 10000));
        return;
      }
      try {
        await fetchLiveMatchDataRef.current(match.liveMatchUrl, false);
      } catch {
        // Silently continue polling loop
      }
      if (isMounted) {
        timerId = setTimeout(poll, intervalMs);
      }
    };

    timerId = setTimeout(poll, intervalMs);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [match.id, match.liveSyncEnabled, match.liveMatchUrl, match.liveSyncInterval]);

  const [schedule, setSchedule] = useState<ScheduleEvent[]>(() => {
    const saved = localStorage.getItem('cricket-schedule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse schedule", e);
      }
    }
    return [];
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [tempEvent, setTempEvent] = useState<Partial<ScheduleEvent>>({});
  const [scheduleSortBy, setScheduleSortBy] = useState<'date' | 'group' | 'team'>('date');
  const [scheduleSortOrder, setScheduleSortOrder] = useState<'asc' | 'desc'>('asc');

  const goHome = useCallback(() => {
    setIsShowingTournaments(false);
    setIsShowingMatches(false);
    setIsShowingSchedule(false);
    setIsGoogleCalendarModalOpen(false);
    setIsEditingTeams(false);
    setIsMoreMenuOpen(false);
    setIsBulkInputOpen(false);
    setIsDisplaySettingsOpen(false);
    setControllerView('main');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    localStorage.setItem('cricket-schedule', JSON.stringify(schedule));
  }, [schedule]);

  const [tournaments, setTournaments] = useState<TournamentFolder[]>(() => {
    const saved = localStorage.getItem('cricket-tournaments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse tournaments", e);
      }
    }
    return [
      {
        id: 't-1',
        name: 'এশিয়া কাপ (Asia Cup)',
        teams: ['বাংলাদেশ', 'ভারত', 'পাকিস্তান', 'শ্রীলঙ্কা', 'আফগানিস্তান']
      },
      {
        id: 't-2',
        name: 'আইপিএল (IPL)',
        teams: ['সিএসকে', 'এমআই', 'আরসিবি', 'কেকেআর', 'জিটি']
      },
      {
        id: 't-3',
        name: 'দ্বিপাক্ষিক সিরিজ (Bilateral Series)',
        teams: ['টিম এ', 'টিম বি', 'অস্ট্রেলিয়া', 'ইংল্যান্ড']
      }
    ];
  });

  const [newTournamentFolderInput, setNewTournamentFolderInput] = useState('');
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({'t-1': true, 't-2': true, 't-3': true});
  const [tournamentTeamInput, setTournamentTeamInput] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('cricket-tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  // Cloud Auto-Backup (Guards against cache deletion or browser crash - throttled to 60s)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        fetch("/api/backup/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matches,
            currentMatchId,
            schedule,
            tournaments,
            timestamp: Date.now()
          })
        }).catch(() => {});
      } catch {}
    }, 60000);
    return () => clearTimeout(timer);
  }, [matches.length, schedule.length, tournaments.length]);

  // Auto-restore from Cloud Backup if localStorage has default/empty matches
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MATCHES);
    if (!saved) {
      fetch("/api/backup/load")
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data && Array.isArray(res.data.matches) && res.data.matches.length > 0) {
            setMatches(res.data.matches);
            if (res.data.currentMatchId) setCurrentMatchId(res.data.currentMatchId);
            if (Array.isArray(res.data.schedule)) setSchedule(res.data.schedule);
            if (Array.isArray(res.data.tournaments)) setTournaments(res.data.tournaments);
            toast.info(lang === 'bn' ? "ক্লাউড ব্যাকআপ থেকে পূর্বের ডাটা রিস্টোর করা হয়েছে!" : "Data restored from Cloud Backup!");
          }
        })
        .catch(() => {});
    }
  }, []);

  const addTournamentFolder = () => {
    if (!newTournamentFolderInput.trim()) return;
    const name = newTournamentFolderInput.trim();
    if (tournaments.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error(lang === 'bn' ? "টুর্নামেন্ট ফোল্ডারটি ইতিমধ্যে আছে" : "Tournament folder already exists");
      return;
    }
    const newFolder: TournamentFolder = {
      id: `tourn-${Date.now()}`,
      name,
      teams: []
    };
    setTournaments(prev => [...prev, newFolder]);
    setExpandedFolderIds(prev => ({ ...prev, [newFolder.id]: true }));
    setNewTournamentFolderInput('');
    toast.success(lang === 'bn' ? "নতুন টুর্নামেন্ট ফোল্ডার তৈরি হয়েছে" : "New tournament folder created");
  };

  const deleteTournamentFolder = (id: string) => {
    setTournaments(prev => prev.filter(t => t.id !== id));
    toast.success(lang === 'bn' ? "টুর্নামেন্ট ফোল্ডার মুছে ফেলা হয়েছে" : "Tournament folder deleted");
  };

  const addTeamToTournamentFolder = (tournamentId: string) => {
    const teamName = (tournamentTeamInput[tournamentId] || '').trim();
    if (!teamName) return;

    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        if (t.teams.includes(teamName)) {
          toast.error(lang === 'bn' ? "টিমটি এই ফোল্ডারে ইতিমধ্যে আছে" : "Team already in this folder");
          return t;
        }
        toast.success(lang === 'bn' ? "টিম যোগ করা হয়েছে" : "Team added to tournament");
        return { ...t, teams: [...t.teams, teamName] };
      }
      return t;
    }));

    setTournamentTeamInput(prev => ({ ...prev, [tournamentId]: '' }));
  };

  const removeTeamFromTournamentFolder = (tournamentId: string, teamName: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        return { ...t, teams: t.teams.filter(item => item !== teamName) };
      }
      return t;
    }));
    toast.success(lang === 'bn' ? "টিম সরানো হয়েছে" : "Team removed");
  };

  const toggleFolderExpand = (id: string) => {
    setExpandedFolderIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveScheduleEvent = () => {
    if (!tempEvent.team1?.trim() || !tempEvent.team2?.trim() || !tempEvent.date || !tempEvent.time) {
      toast.error(lang === 'bn' ? "সবগুলো তথ্য পূরণ করুন" : "Please fill all fields");
      return;
    }

    if (editingEventId) {
      setSchedule(prev => prev.map(e => e.id === editingEventId ? { ...e, ...tempEvent as ScheduleEvent } : e));
      toast.success(lang === 'bn' ? "ইভেন্ট আপডেট করা হয়েছে" : "Event updated");
    } else {
      const newEvent: ScheduleEvent = {
        team1: "",
        team2: "",
        date: "",
        time: "",
        group: "",
        venue: "",
        ...tempEvent,
        id: Date.now().toString()
      };
      const wasCopy = !!newEvent.isCopy;
      delete newEvent.isCopy;
      setSchedule(prev => [...prev, newEvent]);
      if (wasCopy) {
        toast.success(lang === 'bn' ? "কপি করা ইভেন্টটি নতুন দলে যুক্ত করা হয়েছে!" : "Copied event has been saved with new teams!");
      } else {
        toast.success(lang === 'bn' ? "নতুন ইভেন্ট যোগ করা হয়েছে" : "New event added");
      }
    }
    setEditingEventId(null);
    setTempEvent({});
  };

  const deleteScheduleEvent = (id: string) => {
    setSchedule(prev => prev.filter(e => e.id !== id));
    toast.success(lang === 'bn' ? "ইভেন্ট ডিলিট করা হয়েছে" : "Event deleted");
  };

  const getScheduleTimeStatus = useCallback((event: ScheduleEvent) => {
    if (!event.date || !event.time) {
      return { isReady: false, minutesDiff: 99999, isLive: false, isUpcoming30Min: false, label: '' };
    }
    try {
      const eventDateTime = new Date(`${event.date}T${event.time}:00`);
      if (isNaN(eventDateTime.getTime())) {
        return { isReady: false, minutesDiff: 99999, isLive: false, isUpcoming30Min: false, label: '' };
      }
      const now = new Date();
      const diffMs = eventDateTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(diffMs / (1000 * 60));

      // 30 mins before scheduled start time up to 240 mins (4 hours) after start
      const isUpcoming30Min = minutesDiff > 0 && minutesDiff <= 30;
      const isLive = minutesDiff <= 0 && minutesDiff >= -240;
      const isReady = isUpcoming30Min || isLive;

      let label = '';
      if (isLive) {
        label = lang === 'bn' ? '🔴 লাইভ ম্যাচ (৩০ মি. সেশন সক্রিয়)' : '🔴 Live Match (30m Active)';
      } else if (isUpcoming30Min) {
        label = lang === 'bn' ? `⏰ শুরু হতে ${minutesDiff} মি. বাকি (অটো ইনপুট প্রস্তুত)` : `⏰ Starts in ${minutesDiff}m (Auto-Input Ready)`;
      } else if (minutesDiff > 30) {
        const hours = Math.floor(minutesDiff / 60);
        const mins = minutesDiff % 60;
        label = lang === 'bn' ? `⏳ ${hours > 0 ? `${hours}ঘণ্টা ` : ''}${mins}মি. পর ৩০মি. সেশন খুলবে` : `⏳ 30m window opens in ${hours > 0 ? `${hours}h ` : ''}${mins}m`;
      } else {
        label = lang === 'bn' ? 'সেশন শেষ' : 'Session Ended';
      }

      return { isReady, minutesDiff, isLive, isUpcoming30Min, label, eventDateTime };
    } catch {
      return { isReady: false, minutesDiff: 99999, isLive: false, isUpcoming30Min: false, label: '' };
    }
  }, [lang]);

  const loadScheduleEventToMatch = useCallback((event: ScheduleEvent) => {
    const status = getScheduleTimeStatus(event);
    const isFutureMatch = status.minutesDiff > 0;
    const startIso = status.eventDateTime ? status.eventDateTime.toISOString() : undefined;
    const startTimeStr = event.time ? `${event.date} ${event.time}` : undefined;

    setMatches(prev => prev.map(m => {
      if (m.id === currentMatchId) {
        return {
          ...m,
          team1: event.team1,
          team2: event.team2,
          teams: [event.team1, event.team2],
          battingTeam: event.team1,
          bowlingTeam: event.team2,
          name: event.group ? `${event.group}: ${event.team1} vs ${event.team2}` : `${event.team1} vs ${event.team2}`,
          matchStartTime: startTimeStr,
          matchStartTimeIso: startIso,
          isUpcoming: isFutureMatch,
          liveStatusText: isFutureMatch
            ? (lang === 'bn' ? `ম্যাচ শুরু হতে বাকি (সময়: ${event.time})` : `Match starts at ${event.time}`)
            : undefined
        };
      }
      return m;
    }));

    if (status.isReady) {
      toast.success(
        lang === 'bn'
          ? `সময়সূচি অনুযায়ী "${event.team1} vs ${event.team2}" স্কোর ইনপুট সম্পন্ন হয়েছে! (৩০ মি. সেশন সক্রিয়)`
          : `Schedule auto-input complete for "${event.team1} vs ${event.team2}"! (30m session active)`
      );
    } else {
      toast.info(
        lang === 'bn'
          ? `"${event.team1} vs ${event.team2}" টিম দুটি স্কোরে সেট হয়েছে। ম্যাচ শুরুর ৩০ মিনিট পূর্বে অটো ইনপুট সেশন সক্রিয় হবে।`
          : `Teams set for "${event.team1} vs ${event.team2}". Auto-input session unlocks 30m prior.`
      );
    }

    setIsShowingSchedule(false);
    goHome();
  }, [currentMatchId, getScheduleTimeStatus, goHome, lang]);

  const activeAutoInputEvent = useMemo(() => {
    return schedule.find(e => getScheduleTimeStatus(e).isReady);
  }, [schedule, getScheduleTimeStatus]);

  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [displayConfigs, setDisplayConfigs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DISPLAY_CONFIGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse display configs", e);
      }
    }
    return {
      showMilestones: true,
      showHistory: true,
      showRecentBalls: true,
      showLiveStatus: true,
      showAnimations: true,
      showPlayerList: true,
      showTeamList: true,
      showByeLegBye: true,
      showPlayerStats: true,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DISPLAY_CONFIGS, JSON.stringify(displayConfigs));
  }, [displayConfigs]);

  const [targetsInput, setTargetsInput] = useState(match.targets?.join(', ') || '');
  const [oversInput, setOversInput] = useState(match.maxOversList?.join(', ') || '');

  // Update local inputs when match changes (e.g. switching matches)
  useEffect(() => {
    setTargetsInput(match.targets?.join(', ') || '');
    setOversInput(match.maxOversList?.join(', ') || '');
  }, [match.id]);

  const [selectedExtras, setSelectedExtras] = useState<{
    wide: boolean;
    noBall: boolean;
    wicket: boolean;
    byes: boolean;
    legByes: boolean;
  }>({
    wide: false,
    noBall: false,
    wicket: false,
    byes: false,
    legByes: false
  });

  const handleBulkOver = useCallback(() => {
    let runs = 0;
    let wickets = 0;
    let ballsToAdd = 6;

    const maxWkts = match.maxWickets || 10;
    const maxOversVal = match.maxOvers || 20;
    const maxBallsVal = maxOversVal * ballsPerOver;

    if (match.wickets >= maxWkts || match.balls >= maxBallsVal) {
      toast.error(lang === 'bn' ? "সীমা শেষ! আর কোনো ইনপুট নেওয়া যাবে না।" : "Limit reached! No more inputs allowed.");
      return;
    }

    if (isBallByBallMode) {
      const parts = interactiveOverBalls.filter(p => p !== '');
      if (parts.length === 0) {
        toast.error(lang === 'bn' ? 'কমপক্ষে একটি বলের তথ্য দিন' : 'Enter at least one ball');
        return;
      }
      
      let legalBalls = 0;
      parts.forEach(p => {
        const part = p.toString().toUpperCase();
        if (part.startsWith('W:')) {
          wickets++;
          // W:RunOut:R:2 pattern
          if (part.includes(':R:')) {
            const runVal = parseInt(part.split(':R:')[1]) || 0;
            runs += runVal;
          }
          legalBalls++;
        } else if (part === 'W') {
          wickets++;
          legalBalls++;
        } else if (part.startsWith('WD')) {
          let pVal = part.replace('WD', '');
          if (pVal.includes('W')) {
            wickets++;
            pVal = pVal.replace('W', '');
          }
          const extraRuns = (parseInt(pVal) || 0) + 1;
          runs += extraRuns;
        } else if (part.startsWith('NB')) {
          let pVal = part.replace('NB', '');
          if (pVal.includes('W')) {
            wickets++;
            pVal = pVal.replace('W', '');
          }
          const extraRuns = (parseInt(pVal) || 0) + 1;
          runs += extraRuns;
        } else if (/^\d+$/.test(part)) {
          runs += parseInt(part);
          legalBalls++;
        }
      });
      
      ballsToAdd = legalBalls || 0;
    } else {
      runs = parseInt(bulkRuns) || 0;
      wickets = parseInt(bulkWickets) || 0;
      ballsToAdd = parseInt(bulkBalls) || 6;
    }
    
    if (match.wickets + wickets > maxWkts) {
      toast.error(lang === 'bn' ? `${maxWkts} উইকেটের বেশি হতে পারে না` : `Cannot exceed ${maxWkts} wickets`);
      return;
    }

    const currentBalls = match.balls;
    const nextBalls = currentBalls + ballsToAdd;
    const nextScore = match.score + runs;
    const nextWickets = match.wickets + wickets;

    const bulkEvent: BallEvent = {
        type: 'bulk_over',
        runs: runs,
        isWicket: wickets > 0,
        isExtra: false,
        totalBallsAtEvent: nextBalls,
        timestamp: Date.now(),
        wicketType: wickets > 0 ? (lang === 'bn' ? `${wickets} উইকেট` : `${wickets} Wickets`) : undefined,
        score: nextScore,
        wickets: nextWickets,
        balls: nextBalls,
        bulkWickets: wickets,
        bulkBalls: ballsToAdd,
    };

    setMatch(prev => ({
        ...prev,
        score: nextScore,
        wickets: nextWickets,
        balls: nextBalls,
        history: [bulkEvent, ...prev.history]
    }));

    setBulkRuns('');
    setBulkWickets('');
    setBulkBalls('6');
    setBallByBallInput('');
    setInteractiveOverBalls(Array(6).fill(''));
    setActiveBallIndex(0);
    setBallDetailMenu(null);
    setBallSubDetail(null);
    setIsBallByBallMode(false);
    setIsBulkInputOpen(false);
    setIsMoreMenuOpen(false);
    setControllerView('main');
    toast.success(lang === 'bn' ? 'যোগ করা হয়েছে' : 'Over added successfully');
  }, [bulkRuns, bulkWickets, bulkBalls, interactiveOverBalls, isBallByBallMode, match, lang]);

  const toggleExtra = (key: keyof typeof selectedExtras) => {
    const maxWkts = match.maxWickets || 10;
    const maxOversVal = match.maxOvers || 20;
    const maxBallsVal = maxOversVal * ballsPerOver;
    if ((match.wickets >= maxWkts || match.balls >= maxBallsVal) && key !== 'wicket') {
      toast.error(lang === 'bn' ? "সীমা শেষ!" : "Limit reached!");
      return;
    }
    setSelectedExtras(prev => {
      const newState = { ...prev };
      
      // Mutual exclusion logic (simplified)
      if (key === 'wide') {
        newState.wide = !prev.wide;
        if (newState.wide) {
          newState.noBall = false;
          newState.byes = false;
          newState.legByes = false;
        }
      } else if (key === 'noBall') {
        newState.noBall = !prev.noBall;
        if (newState.noBall) newState.wide = false;
      } else if (key === 'byes') {
        newState.byes = !prev.byes;
        if (newState.byes) {
          newState.legByes = false;
          newState.wide = false;
        }
      } else if (key === 'legByes') {
        newState.legByes = !prev.legByes;
        if (newState.legByes) {
          newState.byes = false;
          newState.wide = false;
        }
      } else if (key === 'wicket') {
        newState.wicket = !prev.wicket;
      }
      
      return newState;
    });
  };

  const [isMilestonesExpanded, setIsMilestonesExpanded] = useState(false);
  const [liveCountdown, setLiveCountdown] = useState<string>("");

  const swapBattingTeams = () => {
    setMatch(prev => {
      const newBatting = prev.team1 === prev.battingTeam ? prev.team2 : prev.team1;
      const newBowling = newBatting === prev.team1 ? prev.team2 : prev.team1;
      return {
        ...prev,
        team1: prev.team2,
        team2: prev.team1,
        battingTeam: newBatting,
        bowlingTeam: newBowling
      };
    });
    toast.success(lang === 'bn' ? "দল অদলবদল করা হয়েছে" : "Teams swapped successfully");
  };

  const handleAdjustScore = (amount: number) => {
    setMatch(prev => ({
      ...prev,
      score: Math.max(0, prev.score + amount)
    }));
  };

  const handleAdjustWickets = (amount: number) => {
    const maxWkts = match.maxWickets || 10;
    setMatch(prev => ({
      ...prev,
      wickets: Math.max(0, Math.min(maxWkts, prev.wickets + amount))
    }));
  };

  const handleAdjustOvers = (amount: number) => {
    setMatch(prev => {
      const bpo = prev.format === '100' ? 5 : 6;
      const maxOversVal = prev.maxOvers || 20;
      const maxBallsVal = maxOversVal * bpo;
      const currentOvers = Math.floor(prev.balls / bpo);
      const currentBalls = prev.balls % bpo;
      const newOvers = Math.max(0, currentOvers + amount);
      const newTotalBalls = Math.min(maxBallsVal, (newOvers * bpo) + currentBalls);
      return {
        ...prev,
        balls: newTotalBalls
      };
    });
  };

  const handleAdjustBalls = (amount: number) => {
    setMatch(prev => {
      const bpo = prev.format === '100' ? 5 : 6;
      const maxOversVal = prev.maxOvers || 20;
      const maxBallsVal = maxOversVal * bpo;
      return {
        ...prev,
        balls: Math.max(0, Math.min(maxBallsVal, prev.balls + amount))
      };
    });
  };

  const handleAdjustTargetRuns = (amount: number) => {
    if (!rotatedMilestone) return;
    const newRuns = Math.max(0, rotatedMilestone.runs + amount);
    const newMilestones = (match.targetMilestones || []).map(m => 
      (m.over === rotatedMilestone.over && m.runs === rotatedMilestone.runs) ? { ...m, runs: newRuns } : m
    );
    setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
  };

  const handleAdjustTargetOvers = (amount: number) => {
    if (!rotatedMilestone) return;
    const newOver = Math.max(0, rotatedMilestone.over + amount);
    const newMilestones = (match.targetMilestones || []).map(m => 
      (m.over === rotatedMilestone.over && m.runs === rotatedMilestone.runs) ? { ...m, over: newOver } : m
    );
    setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
  };

  const handleSelectFormat = (fmt: '20' | '10' | '50' | '100') => {
    const oversMap = { '20': 20, '10': 10, '50': 50, '100': 20 };
    const targetOversMap = { '20': 20, '10': 10, '50': 50, '100': 20 };
    const newTargetOver = targetOversMap[fmt];

    setMatch(prev => {
      const updatedMilestones: TargetMilestone[] = (prev.targetMilestones && prev.targetMilestones.length > 0)
        ? prev.targetMilestones.map(m => ({ ...m, over: newTargetOver }))
        : [{ runs: 100, over: newTargetOver, condition: 'more', entries: [{ odd: 1.8, stake: 100 }] }];

      return {
        ...prev,
        format: fmt,
        maxOvers: oversMap[fmt],
        targetMilestones: updatedMilestones
      };
    });

    const label = fmt === '100' ? (lang === 'bn' ? '১০০ বল' : '100 Balls') : (lang === 'bn' ? `${fmt} ওভার` : `${fmt} Overs`);
    toast.success(lang === 'bn' ? `${label} ফরম্যাট নির্বাচন করা হয়েছে` : `Selected ${label}`);
  };

  // Live Countdown Timer logic
  useEffect(() => {
    if (!match.isoStartTime) {
      setLiveCountdown("");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(match.isoStartTime!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setLiveCountdown("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timerStr = "";
      if (days > 0) timerStr += `${days}d `;
      if (hours > 0 || days > 0) timerStr += `${hours}h `;
      timerStr += `${minutes}m ${seconds}s`;
      
      setLiveCountdown(timerStr);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [match.isoStartTime, currentMatchId]);

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isWicketSubMenuOpen, setIsWicketSubMenuOpen] = useState(false);
  const [isRunOutRunsStep, setIsRunOutRunsStep] = useState(false);
  const [celebration, setCelebration] = useState<{ 
    type: 'four' | 'six' | 'wicket' | 'run' | 'dot' | 'extra' | 'over' | null, 
    visible: boolean, 
    showAnimation?: boolean,
    wicketType?: string,
    value?: number,
    extraType?: string,
    overData?: { runs: number, wickets: number, num: number },
    totalScore?: string
  }>({ type: null, visible: false, showAnimation: false });

  const [isEditingScore, setIsEditingScore] = useState(false);
  const [isEditingWickets, setIsEditingWickets] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBattingTeam, setIsEditingBattingTeam] = useState(false);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneRuns, setNewMilestoneRuns] = useState("");
  const [newMilestoneOver, setNewMilestoneOver] = useState("");
  const [newMilestoneOdd, setNewMilestoneOdd] = useState("");
  const [newMilestoneStake, setNewMilestoneStake] = useState("");
  const [newMilestoneCondition, setNewMilestoneCondition] = useState<'more' | 'lessOrEqual'>('more');
  const [matchInput, setMatchInput] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneField, setEditingMilestoneField] = useState<'runs' | 'over' | 'condition' | 'odd' | 'stake' | null>(null);
  const [editingEntryIdx, setEditingEntryIdx] = useState<number | null>(null);
  const [milestoneInput, setMilestoneInput] = useState("");
  const [lockedSections, setLockedSections] = useState<{ [key: string]: boolean }>({
    scoreboard: false,
    stats: false,
    history: false,
    milestones: false,
    controls: false,
  });

  const toggleLock = (section: string) => {
    setLockedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const [isMilestoneRotationPaused, setIsMilestoneRotationPaused] = useState(false);
  const [controllerView, setControllerView] = useState<'main' | 'wicket' | 'more' | 'bulk' | 'runOutRuns'>('main');
  const [editingOversLocation, setEditingOversLocation] = useState<'top' | 'dashboard' | 'controller' | null>(null);
  const isEditingOversDirect = editingOversLocation !== null;
  const [isEditingScoreWicketDirect, setIsEditingScoreWicketDirect] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [isEditingTargetOver, setIsEditingTargetOver] = useState(false);
  const [isEditingTopTarget, setIsEditingTopTarget] = useState(false);
  const [isEditingTopOver, setIsEditingTopOver] = useState(false);
  const [topTargetInput, setTopTargetInput] = useState('');
  const [topOverInput, setTopOverInput] = useState('');

  const handleSaveTargetRuns = (val: string) => {
    const newRuns = parseInt(val, 10);
    if (!isNaN(newRuns) && newRuns >= 0) {
      const maxOversVal = match.maxOvers || 20;
      if (match.targetMilestones && match.targetMilestones.length > 0) {
        const updated = match.targetMilestones.map((m, idx) => 
          idx === 0 ? { ...m, runs: newRuns } : m
        );
        setMatch(prev => ({ ...prev, targetMilestones: updated }));
      } else {
        setMatch(prev => ({
          ...prev,
          targetMilestones: [{ over: maxOversVal, runs: newRuns, condition: 'more' }]
        }));
      }
    }
    setIsEditingTopTarget(false);
  };

  const handleSaveTargetOver = (val: string) => {
    const newOver = parseFloat(val);
    if (!isNaN(newOver) && newOver > 0) {
      if (match.targetMilestones && match.targetMilestones.length > 0) {
        const updated = match.targetMilestones.map((m, idx) => 
          idx === 0 ? { ...m, over: newOver } : m
        );
        setMatch(prev => ({ ...prev, targetMilestones: updated, maxOvers: Math.ceil(newOver) }));
      } else {
        setMatch(prev => ({
          ...prev,
          maxOvers: Math.ceil(newOver),
          targetMilestones: [{ over: newOver, runs: 0, condition: 'more' }]
        }));
      }
    }
    setIsEditingTopOver(false);
  };
  const [showLastBallRun, setShowLastBallRun] = useState(false);
  const [lastBallPhase, setLastBallPhase] = useState<'digit_or_wicket' | 'word_or_type'>('digit_or_wicket');
  const [showOverText, setShowOverText] = useState(false);

  // Milestone edit/delete modal state
  const [editingMilestoneObj, setEditingMilestoneObj] = useState<{ milestone: TargetMilestone, index: number } | null>(null);
  const [tempEditMilestone, setTempEditMilestone] = useState<{ runs: number, over: number, condition: 'more' | 'lessOrEqual', entries: Array<{ odd: any, stake: any }> }>({ runs: 0, over: 0, condition: 'more', entries: [{ odd: 1.8, stake: 100 }] });

  const [scoreInput, setScoreInput] = useState(match.score.toString());
  const [wicketsInput, setWicketsInput] = useState(match.wickets.toString());
  const ballsPerOver = match.format === '100' ? 5 : 6;
  const [overInput, setOverInput] = useState(Math.floor(match.balls / ballsPerOver).toString());
  const [ballInput, setBallInput] = useState((match.balls % ballsPerOver).toString());

  // Auto Ball Simulation (0, 1, 2, 3, 4, 5, 6, W, WD, NB, LEG BYE, BYE) state
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [autoSimInterval, setAutoSimInterval] = useState<number>(0.001);

  const latestInputtedScore = useMemo(() => {
    // 1. match.history[0] is the definitive record of the last ball delivered
    if (match.history && match.history.length > 0) {
      const lastEvent = match.history[0];
      if (lastEvent.type === 'bulk_over') return `${lastEvent.runs}`;
      if (lastEvent.isWicket) {
        return lastEvent.runs > 0 ? `W+${lastEvent.runs}` : 'W';
      }
      if (lastEvent.isWide) return lastEvent.runs > 1 ? `${lastEvent.runs}WD` : 'WD';
      if (lastEvent.isNoBall) return lastEvent.runs > 1 ? `${lastEvent.runs}NB` : 'NB';
      if (lastEvent.isBye) return 'BYE';
      if (lastEvent.isLegBye) return 'LEG BYE';
      return `${lastEvent.runs}`;
    }
    // 2. If no history yet, fallback to live.lastBallSymbol or liveRecentBalls
    if (match.liveRecentBalls && match.liveRecentBalls.length > 0) {
      const b = match.liveRecentBalls[match.liveRecentBalls.length - 1];
      if (b === '•') return '0';
      return b;
    }
    return match.balls > 0 ? `${match.score}` : '0';
  }, [match.history, match.liveRecentBalls, match.balls, match.score]);

  useEffect(() => {
    if (match.history && match.history.length > 0) {
      setShowLastBallRun(true);
      setLastBallPhase('digit_or_wicket');
      setShowOverText(false);

      const lastEvent = match.history[0];
      const isWkt = !!lastEvent?.isWicket;
      const isFastMode = match.liveSyncEnabled || isAutoSimulating;
      const duration = isFastMode 
        ? Math.min(1000, Math.max(30, Math.round((match.liveSyncInterval || 0.001) * 1000)))
        : (isWkt ? 40000 : 10000);

      let phaseInterval: NodeJS.Timeout | null = null;
      let phaseTimer: NodeJS.Timeout | null = null;
      let overTimer: NodeJS.Timeout | null = null;

      if (isWkt) {
        const intervalStep = isFastMode ? Math.max(15, Math.round(duration / 2)) : 2000;
        phaseInterval = setInterval(() => {
          setLastBallPhase(prev => (prev === 'digit_or_wicket' ? 'word_or_type' : 'digit_or_wicket'));
        }, intervalStep);
      } else {
        phaseTimer = setTimeout(() => {
          setLastBallPhase('word_or_type');
        }, duration / 2);
      }

      // Check if last ball finished an over
      const isOverEnd = lastEvent?.type === 'bulk_over' || (
        !lastEvent?.isWide && !lastEvent?.isNoBall &&
        lastEvent?.totalBallsAtEvent > 0 &&
        lastEvent?.totalBallsAtEvent % ballsPerOver === 0
      );

      const timer = setTimeout(() => {
        setShowLastBallRun(false);
        if (phaseInterval) clearInterval(phaseInterval);
        if (isOverEnd && !isFastMode) {
          setShowOverText(true);
          overTimer = setTimeout(() => {
            setShowOverText(false);
          }, 3000);
        }
      }, duration);

      return () => {
        if (phaseInterval) clearInterval(phaseInterval);
        if (phaseTimer) clearTimeout(phaseTimer);
        clearTimeout(timer);
        if (overTimer) clearTimeout(overTimer);
      };
    } else {
      setShowLastBallRun(false);
      setLastBallPhase('digit_or_wicket');
      setShowOverText(false);
    }
  }, [match.history, ballsPerOver, match.liveSyncEnabled, isAutoSimulating, match.liveSyncInterval]);

  const isHatTrickBall = (() => {
    if (!match.history || match.history.length < 2) return false;
    const e1 = match.history[0];
    const e2 = match.history[1];
    if (!e1 || !e2) return false;
    if (!e1.isWicket || !e2.isWicket) return false;

    const isRunOut = (event: BallEvent) => {
      if (!event.wicketType) return false;
      const wt = event.wicketType.toLowerCase();
      return wt.includes('run out') || wt.includes('রান আউট') || wt.includes('runout') || wt.includes('run_out');
    };

    return !isRunOut(e1) && !isRunOut(e2);
  })();

  useEffect(() => {
    if (!isEditingScoreWicketDirect && !isEditingScore && !isEditingWickets) {
      setScoreInput(match.score.toString());
      setWicketsInput(match.wickets.toString());
    }
    if (!isEditingOversDirect) {
      const bpo = match.format === '100' ? 5 : 6;
      setOverInput(Math.floor(match.balls / bpo).toString());
      setBallInput((match.balls % bpo).toString());
    }
  }, [match.id, match.score, match.wickets, match.balls, match.format, isEditingScoreWicketDirect, isEditingScore, isEditingWickets, isEditingOversDirect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoLast();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [match.history, lang]); // Dependencies for undoLast

  const overs = Math.floor(match.balls / ballsPerOver);
  const ballsInOver = match.balls % ballsPerOver;
  
  const runRate = useMemo(() => {
    const totalOvers = match.balls / ballsPerOver;
    return totalOvers > 0 ? (match.score / totalOvers).toFixed(2) : "0.00";
  }, [match.score, match.balls, ballsPerOver]);

  const totalDotsBowled = useMemo(() => {
    return match.history.filter(b => !b.isExtra && b.runs === 0).length;
  }, [match.history]);

  const currentMatchBalls = useMemo(() => match.balls, [match.balls]);
  const currentMatchRuns = useMemo(() => match.score, [match.score]);

  const currentOverEvents = useMemo(() => {
    const ballsInCurrentOver = match.balls % ballsPerOver;
    let currentOverStartBallCount = Math.floor(match.balls / ballsPerOver) * ballsPerOver;
    if (ballsInCurrentOver === 0 && match.balls > 0) {
      currentOverStartBallCount = match.balls - ballsPerOver;
    }
    const events: BallEvent[] = [];
    
    for (const event of match.history) {
      if (event.totalBallsAtEvent > currentOverStartBallCount && event.totalBallsAtEvent <= currentOverStartBallCount + ballsPerOver) {
        events.push(event);
      } else if (event.totalBallsAtEvent === currentOverStartBallCount && event.isExtra) {
        events.push(event);
      } else {
        break;
      }
    }
    return events.reverse();
  }, [match.history, match.balls, ballsPerOver]);

  const currentOverRuns = useMemo(() => {
    return currentOverEvents.reduce((sum, event) => sum + event.runs, 0);
  }, [currentOverEvents]);

  const previousOverRuns = useMemo(() => {
    const currentOverStartBallCount = Math.floor(match.balls / ballsPerOver) * ballsPerOver;
    const previousOverStartBallCount = currentOverStartBallCount - ballsPerOver;
    
    if (previousOverStartBallCount < 0) return 0;
    
    let runs = 0;
    let ballsCounted = 0;
    
    for (const event of match.history) {
      const isReBowledExtra = event.type === 'wide' || event.type === 'noball';
      if (!isReBowledExtra) {
        ballsCounted++;
      }
      
      // If we've reached a ball before the previous over, stop
      if (event.totalBallsAtEvent <= previousOverStartBallCount && !isReBowledExtra) {
        break;
      }
      
      // If the event happened within the previous over's ball range
      if (event.totalBallsAtEvent > previousOverStartBallCount && event.totalBallsAtEvent <= currentOverStartBallCount) {
         runs += event.runs;
      }
    }
    return runs;
  }, [match.history, match.balls, ballsPerOver]);

  const getScoreAtBall = useCallback((ballCount: number) => {
    if (ballCount >= match.balls) return match.score;
    // Calculate runs scored AFTER ballCount to derive score at ballCount relative to current
    const runsAfterLimit = match.history
      .filter(event => event.totalBallsAtEvent > ballCount)
      .reduce((sum, event) => sum + event.runs, 0);
    return Math.max(0, match.score - runsAfterLimit);
  }, [match.history, match.score, match.balls]);

  const getWicketsAtBall = useCallback((ballCount: number) => {
    if (ballCount >= match.balls) return match.wickets;
    const wicketsAfterLimit = match.history
      .filter(event => event.totalBallsAtEvent > ballCount && event.isWicket)
      .length;
    return Math.max(0, match.wickets - wicketsAfterLimit);
  }, [match.history, match.wickets, match.balls]);

  const getMilestoneCompletion = useCallback((milestone: TargetMilestone) => {
    const isOverReached = match.balls >= (milestone.over * ballsPerOver);
    const isAllOut = match.wickets >= (match.maxWickets || 10);
    
    let completionBall = -1;
    let status: 'pending' | 'win' | 'loss' = 'pending';

    if (milestone.condition === 'more') {
      const effectiveRuns = milestone.runs + 1;
      // 1. Check current state first (handles manual score adjustments)
      if (match.score >= effectiveRuns && match.balls <= (milestone.over * ballsPerOver)) {
        status = 'win';
        completionBall = match.balls;
      }

      // 2. Prefer history to find the EARLIEST win
      for (let i = match.history.length - 1; i >= 0; i--) {
        const h = match.history[i];
        if (h.score >= effectiveRuns && h.balls <= (milestone.over * ballsPerOver)) {
          completionBall = h.balls;
          status = 'win';
          break; // Found earliest win
        }
      }
      
      if (status === 'pending') {
        if (isAllOut || isOverReached) {
          const limitBall = Math.round(milestone.over * ballsPerOver);
          const scoreAtLimit = getScoreAtBall(limitBall);
          status = scoreAtLimit >= effectiveRuns ? 'win' : 'loss';
          completionBall = isAllOut ? match.balls : Math.min(match.balls, limitBall);
        }
      }
    } else {
      // Less or Equal logic
      if (match.score > milestone.runs && match.balls <= (milestone.over * ballsPerOver)) {
        status = 'loss';
        completionBall = match.balls;
      }

      for (let i = match.history.length - 1; i >= 0; i--) {
        const h = match.history[i];
        if (h.score > milestone.runs && h.balls <= (milestone.over * ballsPerOver)) {
          completionBall = h.balls;
          status = 'loss';
          break;
        }
      }

      if (status === 'pending') {
        if (isAllOut || isOverReached) {
          const limitBall = Math.round(milestone.over * ballsPerOver);
          const scoreAtLimit = getScoreAtBall(limitBall);
          status = scoreAtLimit <= milestone.runs ? 'win' : 'loss';
          completionBall = isAllOut ? match.balls : Math.min(match.balls, limitBall);
        }
      }
    }

    return { status, completionBall };
  }, [match.history, match.balls, match.score, match.wickets, getScoreAtBall, ballsPerOver]);

  const updateCurrentMilestone = useCallback((milestone: TargetMilestone, field: 'runs' | 'over' | 'condition', value: any) => {
    const originalIdx = (match.targetMilestones || []).findIndex(m => Number(m.runs) === Number(milestone.runs) && Number(m.over) === Number(milestone.over));
    if (originalIdx !== -1) {
      const newMilestones = [...(match.targetMilestones || [])];
      newMilestones[originalIdx] = { ...newMilestones[originalIdx], [field]: value };
      setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
    }
  }, [match.targetMilestones]);

  const updateMilestoneEntry = useCallback((milestone: TargetMilestone, entryIdx: number, field: 'odd' | 'stake', value: any) => {
    const originalIdx = (match.targetMilestones || []).findIndex(m => Number(m.runs) === Number(milestone.runs) && Number(m.over) === Number(milestone.over));
    if (originalIdx !== -1) {
      const newMilestones = [...(match.targetMilestones || [])];
      const entries = [...(newMilestones[originalIdx].entries || [])];
      entries[entryIdx] = { ...entries[entryIdx], [field]: value };
      newMilestones[originalIdx] = { ...newMilestones[originalIdx], entries };
      setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
    }
  }, [match.targetMilestones]);

  const handleOpenEditMilestone = useCallback((milestoneToEdit: TargetMilestone) => {
    const list = match.targetMilestones || [];
    const idx = list.findIndex(m => Number(m.runs) === Number(milestoneToEdit.runs) && Number(m.over) === Number(milestoneToEdit.over) && m.condition === milestoneToEdit.condition);
    if (idx !== -1) {
      setEditingMilestoneObj({ milestone: milestoneToEdit, index: idx });
      setTempEditMilestone({
        runs: milestoneToEdit.runs,
        over: milestoneToEdit.over,
        condition: milestoneToEdit.condition || 'more',
        entries: (milestoneToEdit.entries && milestoneToEdit.entries.length > 0)
          ? milestoneToEdit.entries.map(e => ({ odd: e.odd, stake: e.stake }))
          : [{ odd: 1.8, stake: 100 }]
      });
    }
  }, [match.targetMilestones]);

  const handleDeleteMilestone = useCallback((milestoneToDelete: TargetMilestone) => {
    setMatch(prev => {
      const list = prev.targetMilestones || [];
      const idx = list.findIndex(m => Number(m.runs) === Number(milestoneToDelete.runs) && Number(m.over) === Number(milestoneToDelete.over) && m.condition === milestoneToDelete.condition);
      if (idx !== -1) {
        const updated = list.filter((_, i) => i !== idx);
        return { ...prev, targetMilestones: updated };
      }
      return prev;
    });
    toast.success(lang === 'bn' ? "মাইলস্টোন ডিলিট করা হয়েছে" : "Milestone deleted");
  }, [lang]);

  const handleSaveEditMilestone = useCallback(() => {
    if (!editingMilestoneObj) return;
    setMatch(prev => {
      const list = [...(prev.targetMilestones || [])];
      if (list[editingMilestoneObj.index]) {
        list[editingMilestoneObj.index] = {
          ...list[editingMilestoneObj.index],
          runs: Number(tempEditMilestone.runs) || 0,
          over: Number(tempEditMilestone.over) || 0,
          condition: tempEditMilestone.condition,
          entries: tempEditMilestone.entries.map(e => ({
            odd: e.odd,
            stake: Number(e.stake) || 0
          }))
        };
        return { ...prev, targetMilestones: list };
      }
      return prev;
    });
    setEditingMilestoneObj(null);
    toast.success(lang === 'bn' ? "মাইলস্টোন সফলভাবে আপডেট হয়েছে" : "Milestone updated successfully");
  }, [editingMilestoneObj, tempEditMilestone, lang]);

  const renderMilestone = useCallback((milestone: TargetMilestone, isMain: boolean = false) => {
    const { status, completionBall } = getMilestoneCompletion(milestone);
    const isFinishedUI = status !== 'pending';
    
    let mRemaining, mBallsLeft, mDiff, mDotBalls, mSixes, displayOver;
    const effectiveRuns = milestone.condition === 'more' ? milestone.runs + 1 : milestone.runs;
    const rateMultiplier = match.format === '100' ? 1 : ballsPerOver;

    if (isFinishedUI) {
      const completionScore = getScoreAtBall(completionBall);
      mRemaining = effectiveRuns - completionScore;
      mBallsLeft = Math.max(0, (milestone.over * ballsPerOver) - completionBall);
      mDiff = mRemaining - mBallsLeft;
      mSixes = Math.floor(Math.max(0, mRemaining) / 6);
      mDotBalls = Math.max(0, mBallsLeft - mSixes);
      const overInt = Math.floor(completionBall / ballsPerOver);
      const overBalls = completionBall % ballsPerOver;
      displayOver = overBalls === 0 ? `${overInt}` : `${overInt}.${overBalls}`;
    } else {
      mRemaining = effectiveRuns - match.score;
      mBallsLeft = Math.max(0, (milestone.over * ballsPerOver) - match.balls);
      mDiff = mRemaining - mBallsLeft;
      mSixes = Math.floor(Math.max(0, mRemaining) / 6);
      mDotBalls = Math.max(0, mBallsLeft - mSixes);
      displayOver = milestone.over.toString();
    }
    
    const mDiffStr = mDiff > 0 ? `+${mDiff}` : `${mDiff}`;
    const milestoneKey = `${milestone.runs}-${milestone.over}`;
    
    const totalStake = (milestone.entries || []).reduce((sum: number, entry: any) => sum + (Number(entry.stake) || 0), 0);
    const totalReturn = (milestone.entries || []).reduce((sum: number, entry: any) => {
      const entryReturn = status === 'loss' ? 0 : ((Number(entry.odd) || 0) * (Number(entry.stake) || 0));
      return sum + entryReturn;
    }, 0);

    return (
      <div 
        key={`target-milestone-${milestone.runs}-${milestone.over}-${milestone.condition}`} 
        className={`flex flex-row items-stretch gap-0.5 p-3 rounded-2xl border-2 shadow-md relative transition-all group/card ${
          status === 'win' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
          status === 'loss' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
          'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700'
        } ${isMain ? 'w-full' : 'scale-95 opacity-80'}`}
      >
        {/* Top Right Quick Edit & Delete Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditMilestone(milestone);
            }}
            className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200/50 dark:border-slate-700/50"
            title={lang === 'bn' ? 'মাইলস্টোন এডিট করুন' : 'Edit Milestone'}
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteMilestone(milestone);
            }}
            className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200/50 dark:border-slate-700/50"
            title={lang === 'bn' ? 'মাইলস্টোন ডিলিট করুন' : 'Delete Milestone'}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="flex flex-row w-full gap-2 items-stretch">
          {/* Left Badges: Status, Milestone Runs, and Over */}
          <div className="flex flex-col shrink-0 justify-center">
            <div className={`px-2 py-1 rounded-t-xl text-[10px] font-black uppercase shadow-sm whitespace-nowrap flex items-center justify-center gap-2 opacity-90 ${
              status === 'win' ? 'bg-green-600 text-white' : 
              status === 'loss' ? 'bg-red-600 text-white' : 
              'bg-indigo-600 text-white'
            }`}>
              <span className="text-[12px] leading-none">{status === 'win' ? '✅' : status === 'loss' ? '❌' : '🔄'}</span>
              <button 
                disabled={isFinishedUI}
                className={!isFinishedUI ? "cursor-pointer hover:scale-110 transition-transform flex items-center p-0.5" : "flex items-center opacity-90"}
                onClick={() => {
                  if (!isFinishedUI) {
                    const nextCondition = milestone.condition === 'more' ? 'lessOrEqual' : 'more';
                    updateCurrentMilestone(milestone, 'condition', nextCondition);
                  }
                }}
              >
                {milestone.condition === 'more' ? <TrendingUp size={14} className="text-white" /> : <TrendingDown size={14} className="text-white" />}
              </button>
            </div>
            <div className="bg-slate-900 dark:bg-black rounded-b-xl px-2 py-2 flex flex-col items-center">
              <div 
                className="cursor-pointer hover:bg-white/10 rounded px-1 transition-colors flex flex-col items-center w-full"
                onClick={() => {
                  setEditingMilestoneId(milestoneKey);
                  setEditingMilestoneField('runs');
                  setMilestoneInput(milestone.runs.toString());
                }}
              >
                {editingMilestoneId === milestoneKey && editingMilestoneField === 'runs' ? (
                  <input 
                    type="number"
                    value={milestoneInput}
                    autoFocus
                    onChange={e => setMilestoneInput(e.target.value)}
                    onBlur={() => {
                      updateCurrentMilestone(milestone, 'runs', parseInt(milestoneInput) || 0);
                      setEditingMilestoneId(null);
                      setEditingMilestoneField(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-full bg-white text-slate-900 text-[24px] font-black text-center border-none outline-none p-0 h-8 rounded"
                  />
                ) : (
                  <span className="text-[28px] md:text-[32px] font-black text-white leading-none tracking-tighter">{milestone.runs}</span>
                )}
              </div>
              <div className="h-px w-full bg-white/20 my-1"></div>
              <div 
                className="cursor-pointer hover:bg-white/10 rounded px-1 transition-colors flex flex-col items-center w-full"
                onClick={() => {
                  setEditingMilestoneId(milestoneKey);
                  setEditingMilestoneField('over');
                  setMilestoneInput(milestone.over.toString());
                }}
              >
                {editingMilestoneId === milestoneKey && editingMilestoneField === 'over' ? (
                  <input 
                    type="number"
                    step="0.1"
                    value={milestoneInput}
                    autoFocus
                    onChange={e => setMilestoneInput(e.target.value)}
                    onBlur={() => {
                      updateCurrentMilestone(milestone, 'over', parseFloat(milestoneInput) || 0);
                      setEditingMilestoneId(null);
                      setEditingMilestoneField(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-full bg-white text-slate-900 text-[14px] font-black text-center border-none outline-none p-0 h-6 rounded"
                  />
                ) : (
                  <span className="text-[14px] md:text-[16px] font-black text-slate-400 leading-none">{displayOver}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stack Odds/Stakes and Badge Stats vertically to prevent overlap */}
          <div className="flex-1 flex flex-col gap-2.5 min-w-0">
            {/* Top Row: Odds & Stakes */}
            <div className={`flex flex-col gap-1 w-full ${totalStake === 0 ? 'justify-center' : ''}`}>
              {(milestone.entries || []).map((entry: any, i: number) => (
                <div key={i} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1 border border-slate-100/50 dark:border-slate-700/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 transition-colors"
                         onClick={() => {
                           setEditingMilestoneId(milestoneKey);
                           setEditingMilestoneField('odd');
                           setEditingEntryIdx(i);
                           setMilestoneInput(entry.odd.toString());
                         }}>
                      {editingMilestoneId === milestoneKey && editingMilestoneField === 'odd' && editingEntryIdx === i ? (
                        <input 
                          type="text"
                          value={milestoneInput}
                          autoFocus
                          onChange={e => setMilestoneInput(e.target.value)}
                          onBlur={() => {
                            updateMilestoneEntry(milestone, i, 'odd', milestoneInput);
                            setEditingMilestoneId(null);
                            setEditingMilestoneField(null);
                            setEditingEntryIdx(null);
                          }}
                          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-full bg-white text-slate-900 text-[14px] font-black border-none outline-none p-0 rounded shadow-sm"
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 uppercase flex items-center tracking-tighter">
                          <Percent size={12} className="mr-1 text-indigo-500" />
                          <span className="text-slate-900 dark:text-white text-[14px]">{Number(Number(entry.odd || 0).toFixed(3))}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1 transition-colors text-right"
                         onClick={() => {
                           setEditingMilestoneId(milestoneKey);
                           setEditingMilestoneField('stake');
                           setEditingEntryIdx(i);
                           setMilestoneInput(entry.stake.toString());
                         }}>
                      {editingMilestoneId === milestoneKey && editingMilestoneField === 'stake' && editingEntryIdx === i ? (
                        <input 
                          type="text"
                          value={milestoneInput}
                          autoFocus
                          onChange={e => setMilestoneInput(e.target.value)}
                          onBlur={() => {
                            updateMilestoneEntry(milestone, i, 'stake', milestoneInput);
                            setEditingMilestoneId(null);
                            setEditingMilestoneField(null);
                            setEditingEntryIdx(null);
                          }}
                          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                          className="w-full bg-white text-slate-900 text-[14px] font-black border-none outline-none p-0 text-right rounded shadow-sm"
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 uppercase flex items-center justify-end tracking-tighter">
                          <Coins size={12} className="mr-1 text-emerald-500" />
                          <span className="text-slate-900 dark:text-white text-[14px]">{Number(Number(entry.stake || 0).toFixed(3))}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-right w-full mt-0.5 pt-0.5 border-t border-slate-100 dark:border-slate-800/50 ${status === 'loss' ? 'line-through opacity-50' : 'text-green-600 dark:text-green-400 font-black'}`}>
                    <span className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold mr-1">{t.returnShort}:</span>
                    <span className="text-xs">{Number((status === 'loss' ? 0 : Number(entry.odd) * Number(entry.stake)).toFixed(3))}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: Milestone Info - Horizontal Row / Responsive Grid to prevent overlap */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl p-2 border border-slate-100/50 dark:border-slate-800/50 w-full animate-fade-in">
              {/* Runs & Balls Statistics */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 leading-none">R / B</span>
                <div className="flex flex-col gap-1 w-full max-w-[75px]">
                  <CapsuleBadge value={Math.max(0, mRemaining)} label="RUN" type="indigo" size="sm" />
                  <CapsuleBadge value={mBallsLeft} label="BAL" type="emerald" size="sm" />
                </div>
              </div>

              {/* RR & RRR */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 leading-none">RR/R</span>
                <div className="flex flex-col gap-1 w-full max-w-[75px]">
                  <CapsuleBadge 
                    value={match.balls > 0 ? (match.format === '100' ? (match.score / match.balls).toFixed(2) : (match.score / (match.balls / ballsPerOver)).toFixed(1)) : '0.0'} 
                    label={match.format === '100' ? "R/B" : "CRR"} 
                    type="blue" 
                    size="sm" 
                  />
                  <CapsuleBadge 
                    value={mBallsLeft > 0 ? ((Math.max(0, mRemaining) / mBallsLeft) * (match.format === '100' ? 1 : ballsPerOver)).toFixed(1) : '0.0'} 
                    label="RRR" 
                    type="purple" 
                    size="sm" 
                  />
                </div>
              </div>
              
              {/* Diff */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 leading-none">{t.diff}</span>
                <div className="w-full max-w-[75px] flex flex-col justify-center h-full gap-1">
                  <div className="h-[26px] w-full">
                    <CapsuleBadge 
                      value={isFinishedUI ? "—" : mDiffStr} 
                      label="DIF" 
                      type={(milestone.condition === 'lessOrEqual' ? mDiff >= 0 : mDiff <= 0) ? "emerald" : "red"} 
                      size="sm" 
                    />
                  </div>
                  {/* Spacer to align with other 2-element columns */}
                  <div className="h-[26px] w-full" />
                </div>
              </div>

              {/* Dot Ball */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 leading-none">{t.dotBall}</span>
                <div className="flex flex-col gap-1 w-full max-w-[75px]">
                  <CapsuleBadge value={mDotBalls} label="DOT" type="amber" size="sm" />
                  <CapsuleBadge value={mSixes} label="SIX" type="indigo" size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [match.history, match.balls, match.score, match.wickets, match.format, getMilestoneCompletion, getScoreAtBall, editingMilestoneId, editingMilestoneField, editingEntryIdx, milestoneInput, t, ballsPerOver, handleOpenEditMilestone, handleDeleteMilestone, lang]);

  const allTargetMilestones = useMemo(() => {
    return [...(match.targetMilestones || [])]
      .filter(m => m.runs > 0 || (m.entries || []).some(e => (e.stake || 0) > 0))
      .sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs));
  }, [match.targetMilestones]);

  const [milestoneRotationIndex, setMilestoneRotationIndex] = useState(0);
  
  const pendingMilestones = useMemo(() => {
    return allTargetMilestones.filter(m => {
      const { status } = getMilestoneCompletion(m);
      return status === 'pending';
    });
  }, [allTargetMilestones, getMilestoneCompletion]);

  useEffect(() => {
    if (pendingMilestones.length <= 1 || isMilestoneRotationPaused) return;
    
    const interval = setInterval(() => {
      setMilestoneRotationIndex(prev => (prev + 1) % pendingMilestones.length);
    }, 4000); // Rotate every 4 seconds
    
    return () => clearInterval(interval);
  }, [pendingMilestones.length, isMilestoneRotationPaused]);

  const rotatedMilestone = useMemo(() => {
    if (pendingMilestones.length === 0) {
      if (allTargetMilestones.length === 0) return null;
      return allTargetMilestones[allTargetMilestones.length - 1];
    }
    return pendingMilestones[milestoneRotationIndex] || pendingMilestones[0];
  }, [pendingMilestones, milestoneRotationIndex, allTargetMilestones]);

  const activeTargetMilestone = useMemo(() => {
    if (isMilestoneRotationPaused && rotatedMilestone) return rotatedMilestone;
    const milestones = [...(match.targetMilestones || [])];
    if (milestones.length === 0) return null;
    
    // Find the first milestone where balls haven't finished OR score hasn't reached target
    const nextMilestone = milestones
      .filter(m => m.runs > 0)
      .sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs))
      .find(m => match.balls < (Number(m.over) * ballsPerOver));
    
    // If all milestones reached, return the last one (highest over)
    return nextMilestone || milestones.sort((a, b) => Number(b.over) - Number(a.over))[0];
  }, [match.targetMilestones, match.score, match.balls, isMilestoneRotationPaused, rotatedMilestone, ballsPerOver]);

  const activeMilestone = useMemo(() => {
    if (pendingMilestones.length > 0) {
      return pendingMilestones[milestoneRotationIndex] || pendingMilestones[0];
    }
    return allTargetMilestones[allTargetMilestones.length - 1];
  }, [pendingMilestones, allTargetMilestones, milestoneRotationIndex]);

  const activeMaxOvers = useMemo(() => {
    return activeTargetMilestone?.over || match.maxOvers || 20;
  }, [activeTargetMilestone, match.maxOvers]);

  const activeTarget = useMemo(() => {
    return activeTargetMilestone?.runs || null;
  }, [activeTargetMilestone]);

  const rotatedMilestoneData = useMemo(() => {
    const target = rotatedMilestone;
    if (!target) return null;
    
    const effectiveTargetRuns = target.condition === 'more' ? target.runs + 1 : target.runs;
    const remaining = effectiveTargetRuns - match.score;
    const ballsLeft = Math.max(0, (target.over * ballsPerOver) - match.balls);
    const rateMultiplier = match.format === '100' ? 1 : ballsPerOver;
    const requiredRR = ballsLeft > 0 ? ((remaining / ballsLeft) * rateMultiplier).toFixed(2) : "0.00";
    const diff = remaining - ballsLeft;
    const sixes = Math.floor(Math.max(0, remaining) / 6);
    const dotBalls = Math.max(0, ballsLeft - sixes);
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

    const entries = target.entries || [];
    const firstEntry = entries[0] || { odd: 0, stake: 0 };
    const odd = Number(firstEntry.odd) || 0;
    const stake = Number(firstEntry.stake) || 0;
    const returnVal = entries.reduce((sum: number, entry: any) => sum + ((Number(entry.odd) || 0) * (Number(entry.stake) || 0)), 0);

    const { status } = getMilestoneCompletion(target);
    const isPending = status === 'pending';

    return { 
      remaining, 
      ballsLeft, 
      requiredRR, 
      diff, 
      diffStr,
      dotBalls, 
      sixes,
      over: target.over,
      condition: target.condition,
      isPending,
      odd,
      stake,
      returnVal
    };
  }, [rotatedMilestone, match.score, match.balls, getMilestoneCompletion, ballsPerOver, match.format]);

  const activeMilestoneData = useMemo(() => {
    if (!activeMilestone) return null;
    
    // If 'more' condition, the user needs to exceed the target by 1 (e.g. target 182 means 183 needed)
    const effectiveTargetRuns = activeMilestone.condition === 'more' ? activeMilestone.runs + 1 : activeMilestone.runs;
    const remaining = effectiveTargetRuns - match.score;
    const ballsLeft = Math.max(0, (activeMilestone.over * ballsPerOver) - match.balls);
    const rateMultiplier = match.format === '100' ? 1 : ballsPerOver;
    const requiredRR = ballsLeft > 0 ? ((remaining / ballsLeft) * rateMultiplier).toFixed(2) : "0.00";
    const diff = remaining - ballsLeft;
    const sixes = Math.floor(Math.max(0, remaining) / 6);
    const dotBalls = Math.max(0, ballsLeft - sixes);
    
    // Difference display: for 'more' we show the diff relative to (Target+1)
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

    return { 
      remaining, 
      ballsLeft, 
      requiredRR, 
      diff, 
      diffStr,
      dotBalls, 
      sixes,
      condition: activeMilestone.condition,
      isPending: match.balls < (activeMilestone.over * ballsPerOver) && match.score < effectiveTargetRuns 
    };
  }, [activeMilestone, match.score, match.balls, ballsPerOver]);

  const upcomingOvers = useMemo(() => {
    const milestones = [...(match.targetMilestones || [])];
    return milestones
      .filter(m => (Number(m.over) * ballsPerOver) > match.balls && (m.runs > 0 || (m.entries || []).some(e => (e.stake || 0) > 0)))
      .sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs))
      .slice(0, 3);
  }, [match.targetMilestones, match.balls, ballsPerOver]);

  const targetRemaining = useMemo(() => {
    if (!activeTarget) return null;
    return activeTarget - match.score;
  }, [activeTarget, match.score]);

  const isUpcomingMatch = useMemo(() => {
    if (match.score > 0 || match.balls > 0 || match.wickets > 0) return false;
    if (match.isUpcoming) return true;
    if (match.matchStartTime || match.matchStartTimeIso) return true;
    const st = (match.liveStatusText || '').toLowerCase();
    if (st.includes('start') || st.includes('yet to begin') || st.includes('preview') || st.includes('scheduled') || st.includes('শুরু') || st.includes('upcoming')) {
      return true;
    }
    return false;
  }, [match.isUpcoming, match.score, match.balls, match.wickets, match.matchStartTime, match.matchStartTimeIso, match.liveStatusText]);

  const [dashboardTargetInput, setDashboardTargetInput] = useState('');
  const [dashboardTargetOverInput, setDashboardTargetOverInput] = useState('');
  
  useEffect(() => {
    if (!isEditingTarget && activeTarget !== null) {
      setDashboardTargetInput(activeTarget.toString());
    }
    if (!isEditingTargetOver && activeTargetMilestone) {
      setDashboardTargetOverInput(activeTargetMilestone.over.toString());
    }
  }, [activeTarget, activeTargetMilestone, isEditingTarget, isEditingTargetOver]);

  useEffect(() => {
    const maxWkts = match.maxWickets || 10;
    const maxOversVal = match.maxOvers || 20;
    const maxBallsVal = maxOversVal * ballsPerOver;
    if (match.wickets >= maxWkts || match.balls >= maxBallsVal) {
      if (controllerView !== 'main') {
        setControllerView('main');
      }
    }
  }, [match.wickets, match.balls, match.maxWickets, match.maxOvers, ballsPerOver, controllerView]);

  const ballsRemaining = useMemo(() => {
    return (activeMaxOvers * ballsPerOver) - match.balls;
  }, [activeMaxOvers, match.balls, ballsPerOver]);

  const runBallDiff = useMemo(() => {
    if (targetRemaining === null) return null;
    const diff = targetRemaining - ballsRemaining;
    return diff > 0 ? `+${diff}` : `${diff}`;
  }, [targetRemaining, ballsRemaining]);

  const isFreeHit = useMemo(() => {
    if (match.history.length === 0) return false;
    // Walk back through history to determine if current ball is a free hit
    // Any noball makes the NEXT delivery a free hit.
    // Wides carry over the existing free hit status.
    for (const event of match.history) {
      if (event.type === 'noball') return true;
      if (event.type === 'wide') continue;
      return false; // Legal ball (dot, run, wicket) ends free hit
    }
    return false;
  }, [match.history]);

  const matchResult = useMemo(() => {
    if (!activeTargetMilestone) return null;
    
    const milestones = match.targetMilestones || [];
    const highestMilestone = milestones.length > 0 
      ? [...milestones].sort((a, b) => Number(b.over) - Number(a.over))[0] 
      : activeTargetMilestone;

    const winCond = highestMilestone.condition;
    const limitBalls = highestMilestone.over * ballsPerOver;

    // Victory reached BEFORE or AT the limit
    if (winCond === 'more') {
      const effectiveRuns = highestMilestone.runs + 1;
      if (match.score >= effectiveRuns && match.balls <= limitBalls) return 'win';
    } else {
      // For 'lessOrEqual', reaching score > target BEFORE limit means immediate loss
      if (match.score > highestMilestone.runs && match.balls <= limitBalls) return 'loss';
    }
    
    const maxWkts = match.maxWickets || 10;
    const isAllOut = match.wickets >= maxWkts;
    const isOversFinished = match.balls >= limitBalls;
    
    if (isAllOut || isOversFinished) {
      // Once limit is reached, result is LOCKED based on the score AT the limit
      const scoreAtLimit = getScoreAtBall(limitBalls);
      if (winCond === 'more') {
        const effectiveRuns = highestMilestone.runs + 1;
        return scoreAtLimit >= effectiveRuns ? 'win' : 'loss';
      } else {
        return scoreAtLimit <= highestMilestone.runs ? 'win' : 'loss';
      }
    }
    
    return null;
  }, [match.score, activeTargetMilestone, match.targetMilestones, match.wickets, match.balls, getScoreAtBall]);

  const addNewMatch = () => {
    const name = `${t.matches} ${matches.length + 1}`;
    const newMatch = createNewMatch(name);
    setMatches(prev => [...prev, newMatch]);
    setCurrentMatchId(newMatch.id);
    setIsShowingMatches(false);
    toast.success(t.newMatch + "!");
  };

  const deleteMatch = (id: string) => {
    if (matches.length <= 1) {
      toast.error(t.deleteMatch + " Error");
      return;
    }
    const newMatches = matches.filter(m => m.id !== id);
    setMatches(newMatches);
    if (currentMatchId === id) {
      setCurrentMatchId(newMatches[0].id);
    }
    toast.info(t.deleteMatch);
  };

  const currentIndex = matches.findIndex(m => m.id === currentMatchId);
  const prevMatch = currentIndex > 0 ? matches[currentIndex - 1] : null;
  const nextMatch = currentIndex < matches.length - 1 ? matches[currentIndex + 1] : null;

  const handleWicketBtnClick = () => {
    const maxWkts = match.maxWickets || 10;
    const maxOversVal = match.maxOvers || 20;
    const maxBallsVal = maxOversVal * ballsPerOver;
    if (match.wickets >= maxWkts || match.balls >= maxBallsVal) return;
    setControllerView('wicket');
  };

  const handleBall = (runs: number = 0, wicketTypeInput?: string) => {
    const maxWkts = match.maxWickets || 10;
    const maxOversVal = match.maxOvers || 20;
    const maxBallsVal = maxOversVal * ballsPerOver;

    if (match.wickets >= maxWkts) {
      toast.error(lang === 'bn' ? "দলটি অল-আউট! আর কোনো ইনপুট নেওয়া যাবে না।" : "Team is All Out! No more inputs allowed.");
      return;
    }

    if (match.balls >= maxBallsVal) {
      toast.error(lang === 'bn' ? "ওভারের সীমা শেষ! আর কোনো ইনপুট নেওয়া যাবে না।" : "Overs limit reached! No more inputs allowed.");
      return;
    }

    const isWicket = selectedExtras.wicket || !!wicketTypeInput;
    const isWide = selectedExtras.wide;
    const isNoBall = selectedExtras.noBall;
    const isBye = selectedExtras.byes;
    const isLegBye = selectedExtras.legByes;
    
    const isExtraBallValue = isWide || isNoBall;
    const isAnyExtra = isWide || isNoBall || isBye || isLegBye;
    
    let ballType: BallEvent['type'] = 'run';
    if (isWicket) ballType = 'wicket';
    else if (isWide) ballType = 'wide';
    else if (isNoBall) ballType = 'noball';
    else if (isBye || isLegBye) ballType = 'run'; // Byes/LegByes recorded as runs but flagged as extra
    else if (runs === 0) ballType = 'dot';

    const runsToAdd = runs;
    const extraScore = (isWide || isNoBall) ? 1 : 0;
    const totalRuns = runsToAdd + extraScore;
    
    // Preparation for overlay score info
    const nextScore = match.score + totalRuns;
    const nextWickets = match.wickets + (isWicket ? 1 : 0);
    const nextBalls = match.balls + (isExtraBallValue ? 0 : 1);
    
    // RR Calculation
    const nextTotalOvers = nextBalls / ballsPerOver;
    const nextRR = nextTotalOvers > 0 ? (nextScore / nextTotalOvers).toFixed(2) : "0.00";
    
    // RRR Calculation (based on active milestone)
    let nextRRR = "0.00";
    const effectiveMilestone = activeTargetMilestone || match.targetMilestones?.[0];
    if (effectiveMilestone) {
      const remainingRuns = effectiveMilestone.runs - nextScore;
      const remainingBalls = (effectiveMilestone.over * ballsPerOver) - nextBalls;
      if (remainingBalls > 0 && remainingRuns > 0) {
        nextRRR = ((remainingRuns / remainingBalls) * (match.format === '100' ? 1 : ballsPerOver)).toFixed(2);
      } else if (remainingRuns <= 0) {
        nextRRR = "0.00";
      } else {
        nextRRR = "∞";
      }
    }

    const currentTarget = effectiveMilestone ? effectiveMilestone.runs : 0;
    const nextOverStr = `${Math.floor(nextBalls / ballsPerOver)}.${nextBalls % ballsPerOver}`;
    const scoreInfo = `|${currentTarget}|${nextScore}/${nextWickets}|${nextOverStr}|${nextRR}|${nextRRR}|`;
    
    // Celebration logic
    if (displayConfigs.showAnimations) {
      if (runs === 4) {
        setCelebration({ type: 'four', visible: true, showAnimation: true, totalScore: scoreInfo });
      } else if (runs === 6) {
        setCelebration({ type: 'six', visible: true, showAnimation: true, totalScore: scoreInfo });
      } else if (isWicket) {
        const type = wicketTypeInput || (selectedExtras.wicket ? t.wicketTypes.bowled : t.wicket);
        setCelebration({ type: 'wicket', visible: true, showAnimation: true, wicketType: type, totalScore: scoreInfo });
      } else if (isWide || isNoBall || isBye || isLegBye) {
        setCelebration({ 
          type: 'extra', 
          visible: true, 
          showAnimation: true, 
          extraType: isWide ? t.wide : (isNoBall ? t.noBall : (isBye ? t.byes : t.legByes)), 
          value: runs, 
          totalScore: scoreInfo 
        });
      } else if (runs === 0) {
        setCelebration({ type: 'dot', visible: true, showAnimation: true, totalScore: scoreInfo });
      } else {
        setCelebration({ type: 'run', visible: true, showAnimation: true, value: runs, totalScore: scoreInfo });
      }
      
      // Hide full animation after 3 seconds, keep banner visible
      setTimeout(() => {
        setCelebration(prev => ({ ...prev, showAnimation: false }));
      }, 3000);
    } else {
      // If animations off, show the summary banner immediately
      setCelebration({ 
        type: runs === 4 ? 'four' : runs === 6 ? 'six' : isWicket ? 'wicket' : (isWide || isNoBall || isBye || isLegBye) ? 'extra' : runs === 0 ? 'dot' : 'run', 
        visible: true, 
        showAnimation: false, 
        totalScore: scoreInfo,
        wicketType: isWicket ? (wicketTypeInput || (selectedExtras.wicket ? t.wicketTypes.bowled : t.wicket)) : undefined,
        extraType: isWide ? t.wide : (isNoBall ? t.noBall : (isBye ? t.byes : (isLegBye ? t.legByes : undefined))),
        value: runs
      });
    }
    
    // Notice: We NO LONGER hide the banner (visible: false) after 6s.
    // It will stay until the next setCelebration call on next ball input.

    const newEvent: BallEvent = {
      type: ballType,
      runs: totalRuns,
      isWicket,
      isExtra: isAnyExtra,
      isWide,
      isNoBall,
      isBye,
      isLegBye,
      totalBallsAtEvent: match.balls + (isExtraBallValue ? 0 : 1),
      timestamp: Date.now(),
      wicketType: wicketTypeInput || (isWicket ? t.wicketTypes.bowled : undefined),
      wasFreeHit: isFreeHit,
      score: match.score + totalRuns,
      wickets: match.wickets + (isWicket ? 1 : 0),
      balls: match.balls + (isExtraBallValue ? 0 : 1),
      strikerIdx: match.onStrikeIdx === 0 ? match.activeBatsman1Idx : match.activeBatsman2Idx,
      active1Idx: match.activeBatsman1Idx,
      active2Idx: match.activeBatsman2Idx,
      onStrikeIdx: match.onStrikeIdx,
      runsOnly: runs,
    };

    setMatch(prev => {
      const newBalls = prev.balls + (isExtraBallValue ? 0 : 1);
      const newHistory = [newEvent, ...prev.history];

      let nextBattingStats = prev.battingStats && prev.battingStats.length > 0 ? [...prev.battingStats] : [];
      let nextStrikeIdx = prev.onStrikeIdx ?? 0;
      let nextActive1 = prev.activeBatsman1Idx ?? 0;
      let nextActive2 = prev.activeBatsman2Idx ?? 1;

      // Ensure battingStats are initialized if a player list exists
      const currentList = prev.battingTeam === prev.team1 ? (prev.playerList1 || []) : (prev.playerList2 || []);
      if (nextBattingStats.length === 0 && currentList.length > 0) {
        nextBattingStats = currentList.map(name => ({
          name: name || `Batter ${nextBattingStats.length + 1}`, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false
        }));
      }

      // Update active batsman stats
      const currentStrikerIdx = nextStrikeIdx === 0 ? nextActive1 : nextActive2;
      if (typeof currentStrikerIdx === 'number' && nextBattingStats[currentStrikerIdx]) {
        const striker = { ...nextBattingStats[currentStrikerIdx] };
        if (!isWide) {
          striker.balls += 1;
        }
        
        // Rules: Wide, Byes, and Leg Byes runs are NOT added to batter's score
        if (!isWide && !isBye && !isLegBye) {
          striker.runs += runs;
          if (runs === 4) striker.fours += 1;
          if (runs === 6) striker.sixes += 1;
        }
        
        if (isWicket) {
          striker.isOut = true;
          striker.wicketType = wicketTypeInput || (selectedExtras.wicket ? t.wicketTypes.bowled : t.wicket);
          
          // Find next available batsman
          const nextAvailableIdx = nextBattingStats.findIndex((p, idx) => 
            !p.isOut && idx !== nextActive1 && idx !== nextActive2
          );
          if (nextStrikeIdx === 0) nextActive1 = nextAvailableIdx !== -1 ? nextAvailableIdx : null;
          else nextActive2 = nextAvailableIdx !== -1 ? nextAvailableIdx : null;
        }
        
        nextBattingStats[currentStrikerIdx] = striker;
      }

      // Strike rotation
      if (!isWide && runs % 2 !== 0 && !isWicket) {
        nextStrikeIdx = nextStrikeIdx === 0 ? 1 : 0;
      }
      
      // End of over strike rotation
      if (!isExtraBallValue && newBalls > 0 && newBalls % ballsPerOver === 0) {
        nextStrikeIdx = nextStrikeIdx === 0 ? 1 : 0;
      }

      // End of over logic - show full screen summary for 2.5 seconds
      if (!isExtraBallValue && newBalls > 0 && newBalls % ballsPerOver === 0) {
        const overNum = newBalls / ballsPerOver;
        const currentOverStartBall = (overNum - 1) * ballsPerOver;
        
        // Calculate runs and wickets in this over (including extras at the boundary)
        const overEvents = newHistory.filter(e => 
          (e.totalBallsAtEvent > currentOverStartBall && e.totalBallsAtEvent <= newBalls) ||
          (e.totalBallsAtEvent === currentOverStartBall && e.isExtra)
        );
        const runsInOver = overEvents.reduce((s, e) => s + e.runs, 0);
        const wicketsInOver = overEvents.filter(e => e.isWicket).length;

        // Delay show over summary after ball celebration finishes
        setTimeout(() => {
          if (displayConfigs.showAnimations || runsInOver === 0) {
            setCelebration({
              type: 'over',
              visible: true,
              showAnimation: displayConfigs.showAnimations,
              overData: { runs: runsInOver, wickets: wicketsInOver, num: overNum },
              totalScore: scoreInfo
            });
            
            if (displayConfigs.showAnimations) {
              const animDuration = 4000;
              setTimeout(() => setCelebration(prev => ({ ...prev, showAnimation: false })), animDuration);
              // Hide for 6s (during over celebration) then restore the persistent banner
              setTimeout(() => setCelebration(prev => ({ ...prev, type: null, visible: true })), 6000);
            } else {
              // If only banner (maiden over usually), hide for 3s then restore
              setTimeout(() => setCelebration(prev => ({ ...prev, type: null, visible: true })), 3000);
            }
          }
        }, 3100);
      }

      // End of innings logic - show popup for 10 seconds
      if (!isExtraBallValue && newBalls === activeMaxOvers * ballsPerOver) {
        const finalScore = prev.score + totalRuns;
        const finalWickets = prev.wickets + (isWicket ? 1 : 0);
        const finalRR = newBalls > 0 ? ((finalScore / newBalls) * ballsPerOver).toFixed(2) : "0.00";
        
        // Calculate Fall of Wickets (FOW)
        const fowEvents = [...newHistory]
          .filter(e => e.isWicket)
          .sort((a, b) => a.timestamp - b.timestamp);
        const fowString = fowEvents.length > 0 
          ? `\n${t.fallOfWickets}: ${fowEvents.map((e, idx) => `${idx+1}-${e.score}`).join(', ')}` 
          : '';

        toast.success(t.inningsCompleted, {
          description: `${t.finalScore}: ${finalScore}/${finalWickets} (${finalRR} ${t.runRate})${fowString}`,
          duration: 10000,
          action: (prev.targetMilestones || []).some(m => m.runs > 0) ? undefined : {
            label: t.start2ndInnings,
            onClick: () => {
              const currentScore = finalScore;
              setMatch(m => ({
                ...m,
                score: 0,
                wickets: 0,
                balls: 0,
                history: [],
                targetMilestones: [{ runs: currentScore, over: m.maxOvers, condition: 'more', entries: [{ odd: 1.8, stake: 0 }] }]
              }));
              toast.success(t.targetSet, { description: `${t.target}: ${currentScore}` });
            }
          }
        });
      }

      const ballSymbol = isWicket ? 'W' : (isWide ? 'WD' : (isNoBall ? 'NB' : (isBye ? 'BYE' : (isLegBye ? 'LEG BYE' : runs.toString()))));
      return {
        ...prev,
        score: prev.score + totalRuns,
        wickets: prev.wickets + (isWicket ? 1 : 0),
        balls: newBalls,
        history: newHistory,
        liveRecentBalls: [...(prev.liveRecentBalls || []).slice(-7), ballSymbol],
        battingStats: nextBattingStats,
        activeBatsman1Idx: nextActive1,
        activeBatsman2Idx: nextActive2,
        onStrikeIdx: nextStrikeIdx,
      };
    });

    setShowLastBallRun(true);
    setLastBallPhase('digit_or_wicket');
    setShowOverText(false);

    setSelectedExtras({
      wide: false,
      noBall: false,
      byes: false,
      legByes: false,
      wicket: false
    });
    setControllerView('main');
  };

  const onSwapStrike = () => {
    setMatch(prev => ({
      ...prev,
      onStrikeIdx: prev.onStrikeIdx === 0 ? 1 : 0
    }));
  };

  const simulateBallOutcome = useCallback((outcome: string) => {
    const maxWkts = match.maxWickets || 10;
    const maxOversVal = match.maxOvers || 20;
    const maxBallsVal = maxOversVal * ballsPerOver;

    const isWkt = outcome === 'W';
    const isWd = outcome === 'WD';
    const isNb = outcome === 'NB';
    const isLb = outcome === 'LEG BYE';
    const isB = outcome === 'BYE';
    const isLegal = !isWd && !isNb;

    let runs = 0;
    if (isWd || isNb || isLb || isB) {
      runs = 1;
    } else if (isWkt) {
      runs = 0;
    } else {
      runs = parseInt(outcome, 10) || 0;
    }

    setMatch(prev => {
      // Loop over if all out or overs reached
      if (prev.wickets >= maxWkts || prev.balls >= maxBallsVal) {
        return {
          ...prev,
          score: runs,
          wickets: isWkt ? 1 : 0,
          balls: isLegal ? 1 : 0,
          history: [],
          liveRecentBalls: [outcome],
        };
      }

      const nextBalls = prev.balls + (isLegal ? 1 : 0);
      const nextScore = prev.score + runs;
      const nextWickets = prev.wickets + (isWkt ? 1 : 0);

      const event: BallEvent = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        runs: (isWd || isNb) ? 0 : runs,
        isWicket: isWkt,
        wicketType: isWkt ? 'bowled' : undefined,
        isWide: isWd,
        isNoBall: isNb,
        isBye: isB,
        isLegBye: isLb,
        isExtra: isWd || isNb || isLb || isB,
        score: nextScore,
        wickets: nextWickets,
        balls: nextBalls,
        timestamp: Date.now(),
        totalBallsAtEvent: nextBalls,
        type: isWkt ? 'wicket' : (isWd ? 'wide' : (isNb ? 'noball' : (runs === 0 ? 'dot' : 'run'))),
      };

      return {
        ...prev,
        score: nextScore,
        wickets: nextWickets,
        balls: nextBalls,
        history: [event, ...(prev.history || []).slice(0, 49)],
        liveRecentBalls: [...(prev.liveRecentBalls || []).slice(-5), outcome],
      };
    });

    setShowLastBallRun(true);
    setLastBallPhase('digit_or_wicket');
  }, [match.maxWickets, match.maxOvers, ballsPerOver]);

  useEffect(() => {
    if (!isAutoSimulating) return;

    let isMounted = true;
    let timerId: any = null;

    const intervalMs = Math.max(1, Math.round(autoSimInterval * 1000));
    const pool = ['0', '1', '2', '3', '4', '5', '6', 'W', 'WD', 'NB', 'LEG BYE', 'BYE'];

    const step = () => {
      if (!isMounted) return;
      const outcome = pool[Math.floor(Math.random() * pool.length)];
      simulateBallOutcome(outcome);
      if (isMounted) {
        timerId = setTimeout(step, intervalMs);
      }
    };

    timerId = setTimeout(step, intervalMs);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isAutoSimulating, autoSimInterval, simulateBallOutcome]);

  const dlsUrl = useMemo(() => {
    try {
      const url = new URL("https://play.cricket.com.au/dls-calculator");
      // Use first milestone as target if it represents the first innings score
      const firstInningsScore = (match.targetMilestones && match.targetMilestones.length > 0 && match.targetMilestones[0].runs > 0)
        ? match.targetMilestones[0].runs
        : match.score;
      
      const targetOvers = (match.targetMilestones && match.targetMilestones.length > 0)
        ? match.targetMilestones[0].over
        : match.maxOvers;

      url.searchParams.set("i1s", firstInningsScore.toString());
      url.searchParams.set("i1o", targetOvers.toString());
      
      // If it's the second innings (target is set), prefill 2nd innings progress
      if (match.targetMilestones && match.targetMilestones.length > 0 && match.targetMilestones[0].runs > 0) {
        url.searchParams.set("i2s", match.score.toString());
        const overs = Math.floor(match.balls / ballsPerOver);
        const balls = match.balls % ballsPerOver;
        url.searchParams.set("i2o", `${overs}.${balls}`);
        url.searchParams.set("i2w", match.wickets.toString());
      }
      
      return url.toString();
    } catch (e) {
      return "https://play.cricket.com.au/dls-calculator";
    }
  }, [match.score, match.maxOvers, match.targetMilestones, match.balls, match.wickets]);

  const onSelectBatter = (slot: 1 | 2, currentIdx: number) => {
    const battingStats = match.battingStats || [];
    if (battingStats.length === 0) {
      toast.error(lang === 'bn' ? "দয়া করে প্রথমে প্লেয়ার লিস্ট যোগ করুন।" : "Please add player list first.");
      return;
    }
    
    setMatch(prev => {
        const stats = prev.battingStats || [];
        const nextAvailableIdx = stats.findIndex((p, idx) => 
            !p.isOut && idx !== prev.activeBatsman1Idx && idx !== prev.activeBatsman2Idx
        );
        
        if (nextAvailableIdx === -1) {
            toast.error(lang === 'bn' ? "আর কোনো ব্যাটসম্যান উপলব্ধ নেই!" : "No more batsmen available!");
            return prev;
        }
        
        if (slot === 1) return { ...prev, activeBatsman1Idx: nextAvailableIdx };
        return { ...prev, activeBatsman2Idx: nextAvailableIdx };
    });
  };

  const onEditTeamScore = () => {
    const bpo = match.format === '100' ? 5 : 6;
    setTempEditScore({
      runs: match.score,
      wickets: match.wickets,
      battingTeam: match.battingTeam,
      overs: Math.floor(match.balls / bpo),
      balls: match.balls % bpo
    });
    setIsEditingTeamScore(true);
  };

  const saveTeamScoreEdit = () => {
    const bpo = match.format === '100' ? 5 : 6;
    setMatch(prev => {
      const teamChanged = prev.battingTeam !== tempEditScore.battingTeam;
      const next = {
        ...prev,
        score: tempEditScore.runs,
        wickets: tempEditScore.wickets,
        balls: (tempEditScore.overs * bpo) + (tempEditScore.balls % bpo),
        battingTeam: tempEditScore.battingTeam
      };
      
      if (teamChanged) {
        const newList = tempEditScore.battingTeam === prev.team1 ? (prev.playerList1 || []) : (prev.playerList2 || []);
        if (newList.length > 0) {
          next.battingStats = newList.map(name => ({
            name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false
          }));
          next.activeBatsman1Idx = 0;
          next.activeBatsman2Idx = 1;
          next.onStrikeIdx = 0;
        }
      }
      return next;
    });
    setIsEditingTeamScore(false);
    toast.success(lang === 'bn' ? "স্কোর আপডেট করা হয়েছে" : "Score updated");
  };

  const onEditPlayer = (idx: number) => {
    const player = match.battingStats?.[idx];
    if (player) {
      setTempEditPlayer({ ...player });
      setEditingPlayerIdx(idx);
    }
  };

  const savePlayerEdit = () => {
    if (editingPlayerIdx === null) return;
    
    setMatch(prev => {
      const stats = [...(prev.battingStats || [])];
      stats[editingPlayerIdx] = { ...tempEditPlayer };
      return { ...prev, battingStats: stats };
    });
    
    setEditingPlayerIdx(null);
    toast.success(lang === 'bn' ? "প্লেয়ার স্ট্যাটাস আপডেট করা হয়েছে" : "Player stats updated");
  };

  const handlePenalty = () => {
    const penaltyAmount = 5;
    const newEvent: BallEvent = {
      type: 'run', // Using 'run' as base, but it's an extra
      runs: penaltyAmount,
      isWicket: false,
      isExtra: true,
      totalBallsAtEvent: match.balls,
      timestamp: Date.now(),
      score: match.score + penaltyAmount,
      wickets: match.wickets,
      balls: match.balls,
    };

    setMatch(prev => ({
      ...prev,
      score: prev.score + penaltyAmount,
      history: [newEvent, ...prev.history]
    }));
    
    toast.success(`${t.penaltyRun}: +${penaltyAmount}`);
    setIsMoreMenuOpen(false);
    setControllerView('main');
  };

  const undoLast = (countParam: any = 1) => {
    if (match.history.length === 0) return;
    
    // If countParam is an event (from onClick={undoLast}), default to 1
    const count = typeof countParam === 'number' ? countParam : 1;
    const actualCount = Math.min(count, match.history.length);
    
    setMatch(prev => {
      let currentScore = prev.score;
      let currentWickets = prev.wickets;
      let currentBalls = prev.balls;
      let currentHistory = [...prev.history];
      let nextBattingStats = prev.battingStats ? [...prev.battingStats] : [];
      let nextActive1 = prev.activeBatsman1Idx;
      let nextActive2 = prev.activeBatsman2Idx;
      let nextOnStrikeIdx = prev.onStrikeIdx;
      
      for (let i = 0; i < actualCount; i++) {
        const event = currentHistory[0];
        if (!event) continue;

        currentScore -= event.runs;
        currentWickets -= (event.type === 'bulk_over' ? (event.bulkWickets || 0) : (event.isWicket ? 1 : 0));
        const eventBalls = event.type === 'bulk_over' ? (event.bulkBalls || 6) : (event.type === 'wide' || event.type === 'noball' ? 0 : 1);
        currentBalls -= eventBalls;
        
        // Restore batting stats
        if (typeof event.strikerIdx === 'number' && nextBattingStats[event.strikerIdx]) {
          const striker = { ...nextBattingStats[event.strikerIdx] };
          
          // Decrease runs and balls
          striker.runs -= (event.runsOnly || 0);
          if (!event.type.includes('wide')) {
             striker.balls -= 1;
          }
          if (event.runsOnly === 4) striker.fours -= 1;
          if (event.runsOnly === 6) striker.sixes -= 1;

          // If was wicket, restore out status
          if (event.isWicket) {
             striker.isOut = false;
             striker.wicketType = undefined;
          }
          
          nextBattingStats[event.strikerIdx] = striker;
        }

        // Restore active indices and strike
        if (i === 0) { // Usually for single undo, or the very last one we are undoing
           // We actually want the state BEFORE the first event we are undoing.
           // However, if we undo multiple, we should probably restore the indices from the LAST event in the sequence we are undoing
           // but events are [newest, ..., oldest]. currentHistory[0] is most recent ball.
           // If we undo 1 ball, we want to restore active1/active2 from BEFORE that ball was played.
           // The event only stores state AFTER/DURING it was created. 
           // Wait, handleBall stores: strikerIdx: match.onStrikeIdx === 0 ? match.activeBatsman1Idx : match.activeBatsman2Idx
           // This match.activeBatsman1Idx is the state BEFORE the update.
        }

        // If event has indices, use them to restore
        if (typeof event.active1Idx !== 'undefined') nextActive1 = event.active1Idx;
        if (typeof event.active2Idx !== 'undefined') nextActive2 = event.active2Idx;
        if (typeof event.onStrikeIdx !== 'undefined') nextOnStrikeIdx = event.onStrikeIdx;

        currentHistory.shift();
      }
      
      return {
        ...prev,
        score: Math.max(0, currentScore),
        wickets: Math.max(0, currentWickets),
        balls: Math.max(0, currentBalls),
        history: currentHistory,
        battingStats: nextBattingStats,
        activeBatsman1Idx: nextActive1,
        activeBatsman2Idx: nextActive2,
        onStrikeIdx: nextOnStrikeIdx ?? 0,
      };
    });
    
    const msg = actualCount === 1 
      ? `1 ${t.ballsUndone}`
      : `${actualCount}${t.ballsUndone}`;
    toast.info(msg);
  };

  const resetMatch = () => {
    setMatch(prev => ({
      ...prev,
      score: 0,
      wickets: 0,
      balls: 0,
      history: [],
      targetMilestones: [],
      targets: [],
      maxOversList: [],
    }));
    setCelebration({ type: null, visible: false, showAnimation: false });
    setTargetsInput("");
    setOversInput("");
    toast.info(t.resetSuccess);
  };

  const swapTeams = useCallback(() => {
    setMatch(prev => ({
      ...prev,
      team1: prev.team2,
      team2: prev.team1,
      isSwapped: !prev.isSwapped
    }));
    toast.info(lang === 'bn' ? 'টিম পরিবর্তন করা হয়েছে' : 'Teams swapped');
  }, [setMatch, lang]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0A0B10] font-sans text-slate-900 dark:text-white flex flex-col md:items-center md:justify-center md:py-8">
      {/* Mobile Frame Wrapper for Desktop */}
      <div className={cn(
        "flex flex-col w-full bg-white dark:bg-slate-900 relative overflow-hidden transition-all duration-300",
        activeMainTab === 'betslip'
          ? "md:max-w-6xl md:min-h-[850px] md:my-4 md:rounded-3xl md:border-4 md:border-slate-800 md:shadow-2xl"
          : "md:max-w-[450px] md:h-[900px] md:max-h-[90vh] md:rounded-[3rem] md:border-[10px] md:border-slate-800 md:shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_40px_100px_-20px_rgba(0,0,0,0.5)]"
      )}>
        
        {/* Navigation Tabs Bar: Scorer vs Bet Slip */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-30 shrink-0">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveMainTab('scorer')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                activeMainTab === 'scorer'
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Activity size={13} />
              <span>{lang === 'bn' ? 'স্কোরার' : 'Scorer'}</span>
            </button>
            <button
              onClick={() => setActiveMainTab('runrate')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                activeMainTab === 'runrate'
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <TrendingUp size={13} />
              <span>{lang === 'bn' ? 'রান রেট' : 'Run Rate'}</span>
            </button>
            <button
              onClick={() => setActiveMainTab('betslip')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                activeMainTab === 'betslip'
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Ticket size={13} />
              <span>{lang === 'bn' ? 'বেট স্লিপ' : 'Bet Slip'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Live Match Sync Status / Launcher Button */}
            <button
              onClick={() => setIsLiveMatchModalOpen(true)}
              title={lang === 'bn' ? 'লাইভ ম্যাচ লিংক সিঙ্ক' : 'Live Match Link Sync'}
              className={cn(
                "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold shadow-sm",
                match.liveMatchUrl && match.liveSyncEnabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20"
                  : match.liveMatchUrl
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/20"
                  : "bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100"
              )}
            >
              <Radio size={13} className={cn(match.liveMatchUrl && match.liveSyncEnabled ? "text-emerald-500 animate-pulse" : "text-indigo-600 dark:text-indigo-400")} />
              <span className="hidden sm:inline">
                {match.liveMatchUrl && match.liveSyncEnabled 
                  ? `${lang === 'bn' ? 'লাইভ' : 'LIVE'} ${(match.liveSyncInterval === 0.00000001 || !match.liveSyncInterval || match.liveSyncInterval < 0.1 ? '0.00000001s ⚡' : `${match.liveSyncInterval}s`)}`
                  : (lang === 'bn' ? 'লাইভ লিংক' : 'Live Link')}
              </span>
            </button>

            {/* Match Start Time Countdown Quick Button */}
            <button
              onClick={() => setIsStartTimeEditorOpen(true)}
              title={lang === 'bn' ? 'ম্যাচ শুরুর সময় ও কাউন্টডাউন' : 'Match Start Time & Countdown'}
              className={cn(
                "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[10px] font-bold shadow-sm cursor-pointer",
                isUpcomingMatch
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/50 hover:bg-amber-500/25"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              )}
            >
              <Clock size={13} className={isUpcomingMatch ? "text-amber-500 animate-pulse" : "text-slate-400"} />
              {isUpcomingMatch && (match.matchStartTime || match.matchStartTimeIso) ? (
                <MatchCountdownBadge 
                  startTime={match.matchStartTime}
                  isoTime={match.matchStartTimeIso}
                  lang={lang}
                  showIcon={false}
                  className="bg-transparent border-0 p-0 text-[10px]"
                />
              ) : (
                <span className="hidden sm:inline">
                  {lang === 'bn' ? 'কাউন্টডাউন' : 'Countdown'}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsLinksModalOpen(true)}
              title={lang === 'bn' ? 'ইউজার ও এডমিন লিংক' : 'User & Admin Links'}
              className="p-1.5 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all flex items-center gap-1 text-[10px] font-bold"
            >
              <Link2 size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'লিংক' : 'Links'}</span>
            </button>
            <button
              onClick={async () => {
                toast.info(lang === 'bn' ? 'ক্যাশ পরিষ্কার ও রিফ্রেশ হচ্ছে...' : 'Clearing cache & reloading...');
                if ('serviceWorker' in navigator) {
                  try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) {
                      await reg.unregister();
                    }
                  } catch {}
                }
                if ('caches' in window) {
                  try {
                    const keys = await caches.keys();
                    for (const k of keys) {
                      await caches.delete(k);
                    }
                  } catch {}
                }
                window.location.reload();
              }}
              title={lang === 'bn' ? 'নতুন আপডেট লোড করতে ক্লিক করুন' : 'Click to force reload latest update'}
              className="p-1.5 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 transition-all flex items-center gap-1 text-[10px] font-bold"
            >
              <RefreshCw size={13} className="text-emerald-500" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'আপডেট' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => setLang(prev => prev === 'en' ? 'bn' : 'en')}
              className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              {lang === 'bn' ? 'EN' : 'বাংলা'}
            </button>
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-1.5 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50"
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>
        </div>

        {/* Mock Status Bar (Time, Battery, etc) for App Feel */}
        <div className="hidden md:flex items-center justify-between px-10 py-3 shrink-0 bg-[#F8F9FA] dark:bg-[#0A0B10]">
          <span className="text-[10px] font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 rounded-[2px] border border-slate-400 dark:border-slate-600 relative">
              <div className="absolute left-0 top-0 bottom-0 bg-green-500 w-3/4 rounded-[1px]" />
            </div>
            <div className="flex gap-[1px]">
               <div className="w-[1.5px] h-1.5 bg-slate-400" />
               <div className="w-[1.5px] h-2 bg-slate-400" />
               <div className="w-[1.5px] h-2.5 bg-slate-400" />
               <div className="w-[1.5px] h-3 bg-slate-600" />
            </div>
          </div>
        </div>

        {/* Status Bar Notch Area */}
        {activeMainTab !== 'betslip' && activeMainTab !== 'runrate' && (
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-slate-800 rounded-b-3xl z-[200]" />
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-0 flex flex-col bg-[#F8F9FA] dark:bg-[#0A0B10] scroll-smooth">
          {activeMainTab === 'betslip' ? (
            <BetSlipStudio lang={lang} />
          ) : activeMainTab === 'runrate' ? (
            <RunRateAnalysis
              match={match}
              matches={matches}
              onSelectMatch={(id) => setCurrentMatchId(id)}
              onUpdateTarget={(newTarget) => {
                setMatch(prev => ({ ...prev, target: newTarget }));
                setMatches(prev => prev.map(m => m.id === match.id ? { ...m, target: newTarget } : m));
              }}
              lang={lang}
            />
          ) : (
            <div className="max-w-full space-y-0 flex flex-col flex-1 pb-20 md:pb-0">
        <AnimatePresence>
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-[110] w-full mb-1"
          >
              <div 
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="bg-[#0b101b] text-white px-3 py-2 rounded-b-2xl border-b border-slate-800 shadow-2xl flex flex-col gap-1.5 overflow-hidden relative select-none"
              >
                <motion.div
                  key={`match-content-${match.id}`}
                  initial={{ x: swipeDirection === 'right' ? 25 : -25, opacity: 0.3 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="w-full flex flex-col gap-1.5"
                >
                {isFocusMode && (
                  <div className="flex items-center justify-between gap-1 w-full mb-0.5">
                    <span className="text-[8px] font-black uppercase text-indigo-200 tracking-[0.2em]">{match.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 bg-white/10 text-white hover:bg-white/20 rounded-lg"
                      onClick={() => setIsFocusMode(false)}
                    >
                      <Minimize2 size={12} />
                    </Button>
                  </div>
                )}

                {/* Top Row: ⬅️ Logo + Team Name + Score + Overs ➡️ */}
                <div className="flex items-center justify-between gap-1 sm:gap-2 w-full">
                  {/* ⬅️ Previous Match at the start of the line */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevMatch();
                    }}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shrink-0 shadow-xs text-xs sm:text-sm"
                    title={lang === 'bn' ? "পূর্ববর্তী ম্যাচ (⬅️)" : "Previous Match (⬅️)"}
                  >
                    <span className="select-none leading-none">⬅️</span>
                  </button>

                  {/* Left Side: Logo + Team Name + Score + Overs */}
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    {match.liveMatchUrl && (match.liveMatchUrl.startsWith('http://') || match.liveMatchUrl.startsWith('https://')) ? (
                      <a
                        href={match.liveMatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info(
                            lang === 'bn' 
                              ? `ম্যাচ লিংকে নিয়ে যাওয়া হচ্ছে: ${match.liveMatchUrl?.replace(/^https?:\/\/(?:www\.)?/, '').slice(0, 30)}...`
                              : `Opening match link: ${match.liveMatchUrl?.replace(/^https?:\/\/(?:www\.)?/, '').slice(0, 30)}...`
                          );
                        }}
                        className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/25 to-yellow-600/20 hover:from-amber-500/40 hover:to-yellow-500/30 border border-amber-500/40 hover:border-amber-400 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90 shadow-sm shadow-amber-500/20 group/crown"
                        title={lang === 'bn' ? `সরাসরি ম্যাচ লিংকে যান: ${match.liveMatchUrl}` : `Open live match URL: ${match.liveMatchUrl}`}
                      >
                        <Crown size={15} className="text-amber-400 group-hover/crown:text-amber-300 group-hover/crown:scale-110 transition-transform" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLiveMatchModalOpen(true);
                          if (!match.liveMatchUrl) {
                            toast.info(lang === 'bn' ? "ম্যাচ লিংক সিঙ্ক করতে লিংক দিন" : "Connect live match link here");
                          }
                        }}
                        className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-600/10 hover:from-amber-500/30 hover:to-yellow-600/20 border border-amber-500/30 hover:border-amber-500/60 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90 group/crown"
                        title={match.liveMatchUrl ? (lang === 'bn' ? 'ম্যাচ লাইভ সিঙ্ক তথ্য' : 'Live Match Info') : (lang === 'bn' ? 'ম্যাচ লিংক সিঙ্ক করতে ক্লিক করুন' : 'Click to connect match link')}
                      >
                        <Crown size={15} className="text-amber-400/90 group-hover/crown:text-amber-300 transition-colors" />
                      </button>
                    )}

                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-black text-white text-sm sm:text-base tracking-wider uppercase truncate max-w-[70px] sm:max-w-[110px]">
                        {match.battingTeam || match.team1 || 'JK'}
                      </span>

                      {/* Live Link Badge */}
                      {match.liveMatchUrl && (
                        <button
                          onClick={() => setIsLiveMatchModalOpen(true)}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 transition-all",
                            isUpcomingMatch
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                              : match.liveSyncEnabled
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          )}
                          title={match.liveStatusText || (lang === 'bn' ? 'ম্যাচ লাইভ সংযুক্ত' : 'Live Match Connected')}
                        >
                          {isUpcomingMatch ? (
                            <Clock size={10} className="text-amber-400 shrink-0 animate-spin" />
                          ) : (
                            <span className={cn("w-1.5 h-1.5 rounded-full", match.liveSyncEnabled ? "bg-emerald-400" : "bg-amber-400")} />
                          )}
                          <span className="hidden sm:inline">
                            {isUpcomingMatch 
                              ? (lang === 'bn' ? 'শুরু হয়নি' : 'UPCOMING') 
                              : (match.liveSyncEnabled ? 'LIVE' : 'PAUSED')}
                          </span>
                        </button>
                      )}

                      {/* Score & Wickets / Upcoming Start Time & Live Countdown */}
                      {isUpcomingMatch ? (
                        <div 
                          onClick={() => setIsStartTimeEditorOpen(true)}
                          className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-2 py-1 rounded-xl cursor-pointer transition-all group"
                          title={lang === 'bn' ? 'ম্যাচ শুরুর কাউন্টডাউন ও সময় পরিবর্তন' : 'Match start countdown - click to view/edit'}
                        >
                          <MatchCountdownBadge 
                            startTime={match.matchStartTime}
                            isoTime={match.matchStartTimeIso}
                            lang={lang}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Current Score & Wickets in Cyan/Teal with Flicker / Glow Animation */}
                            <motion.div 
                              animate={scoreFlicker ? {
                                scale: [1, 1.18, 0.95, 1.05, 1],
                                filter: [
                                  "brightness(1)",
                                  "brightness(2) drop-shadow(0 0 16px rgba(34, 211, 238, 0.9))",
                                  "brightness(1.4)",
                                  "brightness(1)"
                                ]
                              } : {}}
                              transition={{ duration: 0.65, ease: "easeInOut" }}
                              onClick={() => {
                                if (!isEditingScoreWicketDirect) {
                                  setIsEditingScoreWicketDirect(true);
                                  setIsMilestoneRotationPaused(true);
                                  setScoreInput(match.score.toString());
                                  setWicketsInput(match.wickets.toString());
                                }
                              }}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              title={lang === 'bn' ? 'স্কোর ও উইকেট পরিবর্তন করতে ক্লিক করুন' : 'Click to edit score'}
                            >
                              <span className={cn(
                                "font-mono font-black text-xl sm:text-2xl tracking-tight transition-colors duration-300",
                                scoreFlicker ? "text-cyan-200" : "text-cyan-400"
                              )}>
                                {match.score}-{match.wickets}
                              </span>
                            </motion.div>

                            {/* ওভার ও বল: উপরে রানের পাশে */}
                            <div className="flex items-center gap-1 sm:gap-2">
                              {/* ওভার */}
                              <div 
                                onClick={() => {
                                  setIsMilestoneRotationPaused(true);
                                  setEditingOversLocation('dashboard');
                                  setOverInput(Math.floor(match.balls / ballsPerOver).toString());
                                  setBallInput((match.balls % ballsPerOver).toString());
                                }}
                                className="flex items-baseline gap-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400/60 px-2 py-0.5 rounded-lg cursor-pointer transition-all active:scale-95 group/ov"
                                title={lang === 'bn' ? 'ওভার (ক্লিক করে এডিট করুন)' : 'Overs (click to edit)'}
                              >
                                <Clock size={12} className="text-emerald-400 shrink-0 self-center" />
                                <span className="text-[10px] sm:text-xs font-black font-sans text-emerald-400/90">
                                  {lang === 'bn' ? 'ওভার' : 'Ov'}
                                </span>
                                <span className="font-mono font-black text-xl sm:text-2xl tracking-tight text-emerald-300">
                                  {lang === 'bn' ? toBengaliDigits(overs) : overs}
                                </span>
                              </div>

                              {/* বল */}
                              <div 
                                onClick={() => {
                                  setIsMilestoneRotationPaused(true);
                                  setEditingOversLocation('dashboard');
                                  setOverInput(Math.floor(match.balls / ballsPerOver).toString());
                                  setBallInput((match.balls % ballsPerOver).toString());
                                }}
                                className="flex items-baseline gap-1 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400/60 px-2 py-0.5 rounded-lg cursor-pointer transition-all active:scale-95 group/bl"
                                title={lang === 'bn' ? 'বল (ক্লিক করে এডিট করুন)' : 'Balls (click to edit)'}
                              >
                                <CircleDot size={12} className="text-cyan-400 shrink-0 self-center" />
                                <span className="text-[10px] sm:text-xs font-black font-sans text-cyan-400/90">
                                  {lang === 'bn' ? 'বল' : 'Ball'}
                                </span>
                                <span className="font-mono font-black text-xl sm:text-2xl tracking-tight text-cyan-300">
                                  {lang === 'bn' ? `${toBengaliDigits(ballsInOver)}/${toBengaliDigits(ballsPerOver)}` : `${ballsInOver}/${ballsPerOver}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ➡️ Next Match at the end of the line */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextMatch();
                    }}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shrink-0 shadow-xs text-xs sm:text-sm"
                    title={lang === 'bn' ? "পরবর্তী ম্যাচ (➡️)" : "Next Match (➡️)"}
                  >
                    <span className="select-none leading-none">➡️</span>
                  </button>
                </div>

                {/* Middle Row: CRR / R/B | RRR | Target Stats Row OR Scheduled Match Info */}
                {isUpcomingMatch ? (
                  <div className="flex items-center justify-between px-1.5 py-1 text-xs font-mono font-bold text-slate-300 border-t border-slate-800/80 pt-1.5">
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <Clock size={12} className="text-amber-400 shrink-0" />
                      <span className="text-[11px] font-sans font-bold">
                        {lang === 'bn' ? 'ম্যাচ শুরুর নির্ধারিত সময়:' : 'Scheduled Start Time:'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-200 font-mono font-black text-xs sm:text-sm">
                        {match.matchStartTime || match.liveStatusText || (lang === 'bn' ? 'শীঘ্রই শুরু হবে' : 'Starting Soon')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsStartTimeEditorOpen(true);
                        }}
                        className="p-1 rounded text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        title={lang === 'bn' ? 'সময় পরিবর্তন করুন' : 'Change Start Time'}
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-1.5 py-1 text-xs font-mono font-bold text-slate-300 border-t border-slate-800/80 pt-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMainTab('runrate');
                      }}
                      className="flex items-center gap-1 hover:text-emerald-300 transition-colors cursor-pointer group/crr"
                      title={lang === 'bn' ? 'রান রেট অ্যানালাইসিস চার্ট দেখুন' : 'View Run Rate Analysis Chart'}
                    >
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider group-hover/crr:text-emerald-400">
                        {match.format === '100' ? 'R/B:' : 'CRR:-'}
                      </span>
                      <span className="text-white font-black group-hover/crr:text-emerald-300">
                        {match.format === '100' 
                          ? (match.balls > 0 ? (match.score / match.balls).toFixed(2) : "0.00") 
                          : (() => {
                              const topMaxOvers = match.maxOvers || (match.format === '10' ? 10 : match.format === '50' ? 50 : 20);
                              const topProjectedScore = match.balls > 0 ? Math.round(parseFloat(runRate) * topMaxOvers) : 0;
                              return topProjectedScore > 0 ? `${runRate}=${topProjectedScore}` : runRate;
                            })()}
                      </span>
                      <TrendingUp size={10} className="text-emerald-400 opacity-60 group-hover/crr:opacity-100" />
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider">RRR:</span>
                      <span className="text-white font-black">
                        {rotatedMilestoneData ? parseFloat(rotatedMilestoneData.requiredRR).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 uppercase text-[10px] tracking-wider">Target :</span>
                      {isEditingTopTarget ? (
                        <input
                          type="number"
                          value={topTargetInput}
                          onChange={(e) => setTopTargetInput(e.target.value)}
                          onBlur={() => handleSaveTargetRuns(topTargetInput)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTargetRuns(topTargetInput);
                            if (e.key === 'Escape') setIsEditingTopTarget(false);
                          }}
                          autoFocus
                          className="w-12 bg-slate-800 text-amber-300 font-mono font-black text-xs px-1 rounded border border-amber-400 outline-none text-center"
                        />
                      ) : (
                        <span 
                          onClick={() => {
                            const currentTargetVal = rotatedMilestone 
                              ? (rotatedMilestone.condition === 'more' ? rotatedMilestone.runs + 1 : rotatedMilestone.runs) 
                              : (match.targetMilestones?.[0]?.runs || 0);
                            setTopTargetInput(currentTargetVal.toString());
                            setIsEditingTopTarget(true);
                          }}
                          className="text-white font-black cursor-pointer hover:text-amber-400 underline decoration-dotted decoration-amber-400/70 underline-offset-2 transition-colors"
                          title={lang === 'bn' ? 'টার্গেট এডিট করতে ক্লিক করুন' : 'Click to edit target'}
                        >
                          {rotatedMilestone ? (rotatedMilestone.condition === 'more' ? rotatedMilestone.runs + 1 : rotatedMilestone.runs) : (match.targetMilestones?.[0]?.runs || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Row Banner: Dark bar with Gold/Yellow text OR Upcoming Banner */}
                {isUpcomingMatch ? (
                  <div 
                    onClick={() => setIsStartTimeEditorOpen(true)}
                    className="bg-[#140E04] py-1.5 px-3 rounded-xl border border-amber-500/40 text-center shadow-inner mt-0.5 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-amber-950/40 transition-colors"
                    title={lang === 'bn' ? 'কাউন্টডাউন দেখতে বা সময় পরিবর্তন করতে ক্লিক করুন' : 'Click to view / edit start time countdown'}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock size={13} className="text-amber-400 animate-pulse shrink-0" />
                      <p className="text-amber-300 font-bold text-xs sm:text-sm tracking-wide truncate">
                        {lang === 'bn' ? 'ম্যাচ শুরু হতে বাকি:' : 'Match Starts In:'}{' '}
                        <span className="text-amber-200 font-mono font-black">
                          {match.matchStartTime || match.liveStatusText || 'শীঘ্রই'}
                        </span>
                      </p>
                    </div>
                    <MatchCountdownBadge 
                      startTime={match.matchStartTime}
                      isoTime={match.matchStartTimeIso}
                      lang={lang}
                    />
                  </div>
                ) : rotatedMilestoneData ? (
                  <div className="bg-[#050810] py-1.5 px-3 rounded-xl border border-slate-800/90 text-center shadow-inner mt-0.5">
                    <p className="text-amber-400 font-bold text-xs sm:text-sm tracking-wide">
                      {lang === 'bn' ? (
                        `${match.battingTeam || match.team1 || 'JK'} এর ${rotatedMilestoneData.ballsLeft} বলে ${Math.max(0, rotatedMilestoneData.remaining)} রান প্রয়োজন`
                      ) : (
                        `${match.battingTeam || match.team1 || 'JK'} need ${Math.max(0, rotatedMilestoneData.remaining)} runs in ${rotatedMilestoneData.ballsLeft} balls`
                      )}
                    </p>
                  </div>
                ) : null}

                {/* Live Match Sync Status Strip */}
                {match.liveMatchUrl && (
                  <div 
                    onClick={() => setIsLiveMatchModalOpen(true)}
                    className={cn(
                      "cursor-pointer border py-1.5 px-3 rounded-xl shadow-inner mt-1 transition-all flex items-center justify-between gap-2",
                      isUpcomingMatch 
                        ? "bg-amber-950/70 hover:bg-amber-900/80 border-amber-500/40"
                        : "bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/40"
                    )}
                    title={lang === 'bn' ? 'লাইভ ম্যাচ সেটিংস ও বিবরণ' : 'Live match settings & details'}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isUpcomingMatch 
                          ? "bg-amber-400 animate-pulse" 
                          : (match.liveSyncEnabled ? "bg-emerald-400 animate-ping" : "bg-amber-400")
                      )} />
                      <p className={cn(
                        "font-bold text-xs truncate text-left",
                        isUpcomingMatch ? "text-amber-300" : "text-emerald-300"
                      )}>
                        {isUpcomingMatch
                          ? `${lang === 'bn' ? 'ম্যাচ শুরু হতে বাকি' : 'Match Starts In'} • ${match.matchStartTime || match.liveStatusText || (lang === 'bn' ? 'শীঘ্রই' : 'Soon')}`
                          : (match.liveStatusText || (lang === 'bn' ? 'লাইভ ম্যাচ সংযুক্ত' : 'Live Match Connected'))
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      {isUpcomingMatch ? (
                        <div 
                          onClick={() => setIsStartTimeEditorOpen(true)}
                          className="cursor-pointer"
                          title={lang === 'bn' ? 'কাউন্টডাউন এডিট করতে ক্লিক করুন' : 'Click to edit countdown'}
                        >
                          <MatchCountdownBadge 
                            startTime={match.matchStartTime}
                            isoTime={match.matchStartTimeIso}
                            lang={lang}
                            className="bg-amber-950/80 text-amber-300 border-amber-600/70 text-[10px] px-2 py-0.5"
                          />
                        </div>
                      ) : (
                        <>
                          {match.liveRecentBalls && match.liveRecentBalls.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              <span className="text-emerald-500/70 text-[9px] uppercase font-bold">Recent:</span>
                              {match.liveRecentBalls.slice(-6).map((b, i) => (
                                <span key={i} className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center font-bold text-[9px]",
                                  b === 'W' ? "bg-red-500 text-white" :
                                  (b === '4' || b === '6') ? "bg-amber-400 text-black font-black" :
                                  "bg-white/10 text-emerald-100"
                                )}>
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="text-emerald-400 text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700/60">
                            {match.lastSyncedAt ? `${match.lastSyncedAt}` : (match.liveSyncEnabled ? 'Live' : 'Paused')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                </motion.div>

                {/* Overlays for Direct Editing */}
                {/* Score & Wicket Direct Editor Overlay */}
                {isEditingScoreWicketDirect && (
                  <div className="flex flex-col items-center gap-1 w-full bg-slate-900 absolute inset-0 p-2 justify-center z-20 rounded-b-2xl border-b border-white/20" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-center w-full max-w-[280px]">
                      <input
                        type="number"
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        autoFocus
                        onBlur={(e) => {
                          const nextTarget = e.relatedTarget as HTMLElement;
                          setTimeout(() => {
                            if (document.activeElement?.getAttribute('data-sw-input') !== 'true' && nextTarget?.getAttribute('data-sw-input') !== 'true') {
                              setMatch(prev => ({
                                ...prev,
                                score: parseInt(scoreInput) || 0,
                                wickets: parseInt(wicketsInput) || 0
                              }));
                              setIsEditingScoreWicketDirect(false);
                              setIsMilestoneRotationPaused(false);
                            }
                          }, 300);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') {
                            setIsEditingScoreWicketDirect(false);
                            setIsMilestoneRotationPaused(false);
                          }
                        }}
                        data-sw-input="true"
                        className="bg-white/10 text-white font-black border border-white/20 rounded-l-xl px-2 outline-none text-center w-1/2 text-xs h-8"
                        placeholder="Runs"
                      />
                      <input
                        type="number"
                        value={wicketsInput}
                        onChange={(e) => setWicketsInput(e.target.value)}
                        onBlur={(e) => {
                          const nextTarget = e.relatedTarget as HTMLElement;
                          setTimeout(() => {
                            if (document.activeElement?.getAttribute('data-sw-input') !== 'true' && nextTarget?.getAttribute('data-sw-input') !== 'true') {
                              setMatch(prev => ({
                                ...prev,
                                score: parseInt(scoreInput) || 0,
                                wickets: parseInt(wicketsInput) || 0
                              }));
                              setIsEditingScoreWicketDirect(false);
                              setIsMilestoneRotationPaused(false);
                            }
                          }, 300);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') {
                            setIsEditingScoreWicketDirect(false);
                            setIsMilestoneRotationPaused(false);
                          }
                        }}
                        data-sw-input="true"
                        className="bg-white/10 text-white font-black border border-white/20 rounded-r-xl px-2 outline-none text-center w-1/2 text-xs h-8"
                        placeholder="Wkts"
                      />
                    </div>
                  </div>
                )}

                {/* Target Direct Editor Overlay */}
                {(isEditingTarget || isEditingTargetOver) && (
                  <div className="flex flex-col items-center gap-1 w-full bg-slate-900 absolute inset-0 p-2 justify-center z-20 rounded-b-2xl border-b border-white/20" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-center w-full max-w-[280px]">
                      <input
                        type="number"
                        value={dashboardTargetInput}
                        onChange={(e) => setDashboardTargetInput(e.target.value)}
                        autoFocus={isEditingTarget}
                        onBlur={(e) => {
                          const nextTarget = e.relatedTarget as HTMLElement;
                          setTimeout(() => {
                            if (document.activeElement?.getAttribute('data-target-input') !== 'true' && nextTarget?.getAttribute('data-target-input') !== 'true') {
                              const newRuns = parseInt(dashboardTargetInput) || 0;
                              const newOver = parseFloat(dashboardTargetOverInput) || 0;
                              if (rotatedMilestone) {
                                const newMilestones = (match.targetMilestones || []).map(m => 
                                  (m.over === rotatedMilestone.over && m.runs === rotatedMilestone.runs) ? { ...m, runs: newRuns, over: newOver } : m
                                );
                                setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                              }
                              setIsEditingTarget(false);
                              setIsEditingTargetOver(false);
                              setIsMilestoneRotationPaused(false);
                            }
                          }, 300);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') {
                            setIsEditingTarget(false);
                            setIsEditingTargetOver(false);
                            setIsMilestoneRotationPaused(false);
                          }
                        }}
                        data-target-input="true"
                        className="bg-white/10 text-white font-black border border-white/20 rounded-l-xl px-2 outline-none text-center w-1/2 text-xs h-8"
                        placeholder="Runs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={dashboardTargetOverInput}
                        onChange={(e) => setDashboardTargetOverInput(e.target.value)}
                        autoFocus={isEditingTargetOver}
                        onBlur={(e) => {
                          const nextTarget = e.relatedTarget as HTMLElement;
                          setTimeout(() => {
                            if (document.activeElement?.getAttribute('data-target-input') !== 'true' && nextTarget?.getAttribute('data-target-input') !== 'true') {
                              const newRuns = parseInt(dashboardTargetInput) || 0;
                              const newOver = parseFloat(dashboardTargetOverInput) || 0;
                              if (rotatedMilestone) {
                                const newMilestones = (match.targetMilestones || []).map(m => 
                                  (m.over === rotatedMilestone.over && m.runs === rotatedMilestone.runs) ? { ...m, runs: newRuns, over: newOver } : m
                                );
                                setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                              }
                              setIsEditingTarget(false);
                              setIsEditingTargetOver(false);
                              setIsMilestoneRotationPaused(false);
                            }
                          }, 300);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                          if (e.key === 'Escape') {
                            setIsEditingTarget(false);
                            setIsEditingTargetOver(false);
                            setIsMilestoneRotationPaused(false);
                          }
                        }}
                        data-target-input="true"
                        className="bg-white/10 text-white font-black border border-white/20 rounded-r-xl px-2 outline-none text-center w-1/2 text-xs h-8"
                        placeholder="Over"
                      />
                    </div>
                  </div>
                )}

                {/* Badge 2: Capsule Badges (RUN, BAL, DIF, DOT, SIX) */}
                {rotatedMilestoneData && (
                  <div className="grid grid-cols-3 gap-1.5 w-full mt-0.5 animate-fade-in">
                    {/* Column 1: Run & Bal Stacked */}
                    <div className="flex flex-col gap-1 bg-white/5 p-1 rounded-xl border border-white/10 justify-center">
                      <CapsuleBadge value={Math.max(0, rotatedMilestoneData.remaining)} label="RUN" type="indigo" />
                      <CapsuleBadge value={rotatedMilestoneData.ballsLeft} label="BAL" type="emerald" />
                    </div>

                    {/* Column 2: Difference Single Capsule */}
                    <div className={cn(
                      "flex flex-col bg-white/5 p-1 rounded-xl border transition-all h-full justify-center",
                      (rotatedMilestoneData.condition === 'lessOrEqual' ? rotatedMilestoneData.diff >= 0 : rotatedMilestoneData.diff <= 0) ? "border-emerald-500/30" : "border-red-500/30"
                    )}>
                      <CapsuleBadge 
                        value={rotatedMilestoneData.diffStr} 
                        label="DIF" 
                        type={(rotatedMilestoneData.condition === 'lessOrEqual' ? rotatedMilestoneData.diff >= 0 : rotatedMilestoneData.diff <= 0) ? "emerald" : "red"} 
                        size="lg"
                      />
                    </div>

                    {/* Column 3: Dot & Six Stacked */}
                    <div className="flex flex-col gap-1 bg-white/5 p-1 rounded-xl border border-white/10 justify-center">
                      <CapsuleBadge value={rotatedMilestoneData.dotBalls} label="DOT" type="amber" />
                      <CapsuleBadge value={rotatedMilestoneData.sixes} label="SIX" type="indigo" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
        </AnimatePresence>

        {/* Milestones Sections */}
        {displayConfigs.showMilestones && !isFocusMode && (
          <div className={cn(
            "transition-all duration-300 flex flex-col gap-0",
            lockedSections.milestones && "sticky top-[60px] md:top-[80px] z-30 shadow-xl"
          )}>
            {(match.targetMilestones || []).length > 0 && (
              <div className={cn(
                "bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 rounded-none relative overflow-hidden",
                lockedSections.milestones && "rounded-none"
              )}>
                {/* Section Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{t.targetMilestones}</span>
                  </div>
                  <div className="flex items-center gap-1.5 z-50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        lockedSections.milestones ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800 shadow-sm"
                      )}
                      onClick={() => toggleLock('milestones')}
                    >
                      <Pin size={12} className={lockedSections.milestones ? "rotate-45" : ""} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 shadow-sm hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => {
                        setDisplayConfigs(prev => ({ ...prev, showMilestones: false }));
                        toast.info(lang === 'bn' ? "টার্গেট মাইলস্টোন হাইড করা হয়েছে। পুনরায় দেখতে সেটিংস (Settings) থেকে অন করুন।" : "Target Milestones hidden. Re-enable from Settings.");
                      }}
                      title={lang === 'bn' ? "লুকিয়ে রাখুন" : "Hide section"}
                    >
                      <EyeOff size={12} />
                    </Button>
                  </div>
                </div>

                <div className="p-3 md:p-4 flex flex-col items-stretch gap-3">
                  {/* Active Milestone Display */}
                  <div className="w-full relative">
                    <div className="flex justify-start mb-1">
                      <button 
                        onClick={() => setIsAddingMilestone(true)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 text-white rounded-t-lg hover:bg-indigo-700 transition-colors shadow-sm active:scale-95"
                      >
                        <Plus size={10} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{t.newTarget}</span>
                      </button>
                    </div>
                    <AnimatePresence mode="wait">
                      {activeMilestone && (
                        <motion.div
                          key={`active-milestone-${activeMilestone.runs}-${activeMilestone.over}-${activeMilestone.condition}-${activeMilestone.entries?.[0]?.stake}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          {renderMilestone(activeMilestone, true)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {isAddingMilestone && (
                    <div className="w-full bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 mb-2 animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">{t.addTarget}</span>
                        <button onClick={(e) => { e.preventDefault(); setIsAddingMilestone(false); }}><X className="w-4 h-4 text-slate-400 hover:text-red-500 transition-colors" /></button>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              <Trophy size={14} />
                            </span>
                            <input 
                              type="number"
                              value={newMilestoneRuns}
                              onChange={e => setNewMilestoneRuns(e.target.value)}
                              placeholder="0"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              <Activity size={14} />
                            </span>
                            <input 
                              type="number"
                              step="0.1"
                              value={newMilestoneOver}
                              onChange={e => setNewMilestoneOver(e.target.value)}
                              placeholder="0"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              <ArrowDownUp size={14} />
                            </span>
                            <button 
                              onClick={() => setNewMilestoneCondition(prev => prev === 'more' ? 'lessOrEqual' : 'more')}
                              className="w-full h-[34px] flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              {newMilestoneCondition === 'more' ? <TrendingUp size={18} className="text-indigo-600" /> : <TrendingDown size={18} className="text-red-500" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              <Percent size={14} />
                            </span>
                            <input 
                              type="number"
                              step="0.001"
                              value={newMilestoneOdd}
                              onChange={e => setNewMilestoneOdd(e.target.value)}
                              placeholder="0.000"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              <Coins size={14} />
                            </span>
                            <input 
                              type="number"
                              step="0.001"
                              value={newMilestoneStake}
                              onChange={e => setNewMilestoneStake(e.target.value)}
                              placeholder="0.000"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (newMilestoneRuns && newMilestoneOver) {
                              const newM = {
                                runs: parseInt(newMilestoneRuns),
                                over: parseFloat(newMilestoneOver),
                                condition: newMilestoneCondition,
                                entries: (newMilestoneOdd && newMilestoneStake) ? [{ odd: parseFloat(newMilestoneOdd), stake: parseInt(newMilestoneStake) }] : []
                              };
                              setMatch(prev => ({
                                ...prev,
                                targetMilestones: [...(prev.targetMilestones || []), newM]
                              }));
                              setIsAddingMilestone(false);
                              setNewMilestoneRuns("");
                              setNewMilestoneOver("");
                              setNewMilestoneOdd("");
                              setNewMilestoneStake("");
                            }
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                          <Check size={18} />
                          <span className="uppercase text-xs tracking-widest">{t.confirmTarget}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const totalStakesAll = (match.targetMilestones || []).reduce((acc, m) => acc + (m.entries || []).reduce((s, e) => s + (Number(e.stake) || 0), 0), 0);
                    const totalReturnsAll = (match.targetMilestones || []).reduce((acc, m) => {
                      const { status } = getMilestoneCompletion(m);
                      const mReturn = status === 'win' ? (m.entries || []).reduce((s, e) => s + ((Number(e.odd) || 0) * (Number(e.stake) || 0)), 0) : 0;
                      return acc + mReturn;
                    }, 0);

                    return totalStakesAll > 0 ? (
                      <div className="w-full flex flex-col gap-4">
                        {/* Summary Header */}
                        <div className="w-full flex items-center justify-between px-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl py-2.5 border border-slate-100 dark:border-slate-800 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase text-slate-400 leading-none mb-1">{t.total} {t.stake}</span>
                            <span className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">{Number(totalStakesAll.toFixed(3))}</span>
                          </div>
                          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800/60 mx-1"></div>
                          
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-black uppercase text-slate-400 leading-none mb-1">{t.total} {t.potentialReturn}</span>
                            <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{Number(totalReturnsAll.toFixed(3))}</span>
                          </div>
                        </div>

                        {/* Categorized Milestones Dropdown Toggle */}
                        <div className="w-full bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                          <button 
                            onClick={() => setIsMilestonesExpanded(!isMilestonesExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-indigo-100 dark:bg-indigo-900/40 p-1.5 rounded-lg">
                                <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{t.milestones} ({(match.targetMilestones || []).length})</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isMilestonesExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {isMilestonesExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                              >
                                <div className="px-3 pb-4 pt-1 flex flex-col gap-5 border-t border-slate-100 dark:border-slate-800/50">
                                  {(() => {
                                    const allTargetMilestones = match.targetMilestones || [];
                                    const chormanMilestones = allTargetMilestones.filter(m => getMilestoneCompletion(m).status === 'pending');
                                    const joyMilestones = allTargetMilestones.filter(m => getMilestoneCompletion(m).status === 'win');
                                    const harMilestones = allTargetMilestones.filter(m => getMilestoneCompletion(m).status === 'loss');

                                    return (
                                      <>
                                        {chormanMilestones.length > 0 && (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 px-1">
                                              <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none font-black text-[10px] uppercase px-2 py-0.5 rounded-md">
                                                {t.chorman}
                                              </Badge>
                                              <div className="h-px flex-1 bg-indigo-100/50 dark:bg-indigo-900/20"></div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                              {chormanMilestones.map(m => renderMilestone(m, false))}
                                            </div>
                                          </div>
                                        )}

                                        {joyMilestones.length > 0 && (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 px-1">
                                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-none font-black text-[10px] uppercase px-2 py-0.5 rounded-md">
                                                {t.joy}
                                              </Badge>
                                              <div className="h-px flex-1 bg-green-100/50 dark:bg-green-900/20"></div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                              {joyMilestones.map(m => renderMilestone(m, false))}
                                            </div>
                                          </div>
                                        )}

                                        {harMilestones.length > 0 && (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 px-1">
                                              <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-none font-black text-[10px] uppercase px-2 py-0.5 rounded-md">
                                                {t.har}
                                              </Badge>
                                              <div className="h-px flex-1 bg-red-100/50 dark:bg-red-900/20"></div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                              {harMilestones.map(m => renderMilestone(m, false))}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => { e.preventDefault(); setIsAddingMilestone(true); }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Plus size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">{t.addTarget}</span>
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Header */}
        {!isFocusMode && (
          <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <Trophy size={20} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">{t.title}</h1>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-[10px] md:text-sm">
                  <Users size={12} />
                  <div className="flex items-center gap-1">
                    {prevMatch && (
                      <button 
                        onClick={() => setCurrentMatchId(prevMatch.id)}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={lang === 'bn' ? "আগের ম্যাচ" : "Previous Match"}
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    <span>{match.name} • {match.team1} vs {match.team2}</span>
                    {nextMatch && (
                      <button 
                        onClick={() => setCurrentMatchId(nextMatch.id)}
                        className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={t.nextMatch}
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className={cn(
                  "h-9 w-9 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 transition-all",
                  isFocusMode && "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                )}
                onClick={() => setIsFocusMode(!isFocusMode)}
                title={lang === 'bn' ? 'ফোকাস মোড' : 'Focus Mode'}
              >
                <Maximize2 size={16} className={isFocusMode ? "rotate-45" : ""} />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700"
                onClick={() => setIsShowingMatches(!isShowingMatches)}
              >
                <History size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700"
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700"
                onClick={() => setLang(prev => prev === 'en' ? 'bn' : 'en')}
              >
                <Languages size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-9 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase px-2.5",
                  isDisplaySettingsOpen && "bg-indigo-50 border-indigo-200"
                )} 
                onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
              >
                <Settings size={15} className="mr-1" /> {t.displaySettings}
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400" onClick={resetMatch} title={t.reset}>
                <RotateCcw size={16} />
              </Button>
            </div>
          </div>
        </header>
      )}

        {/* Match List (Conditional) */}
        <AnimatePresence>
          {isShowingMatches && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold">{t.matches}</CardTitle>
                  <Button onClick={addNewMatch} size="sm" className="rounded-xl">
                    {t.newMatch}
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {matches.map((m) => (
                      <div 
                        key={m.id}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                          currentMatchId === m.id 
                            ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-md' 
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-indigo-200'
                        }`}
                        onClick={() => setCurrentMatchId(m.id)}
                      >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm truncate pr-2">{m.name}</span>
                        <div className="flex gap-1">
                          {matches.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMatch(m.id);
                              }}
                            >
                              <RotateCcw size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                        <div className="text-xs text-slate-500 flex justify-between">
                          <span>{m.team1} vs {m.team2}</span>
                          <span className="font-mono">{m.score}/{m.wickets}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Settings (Conditional) */}
        <AnimatePresence>
          {isDisplaySettingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-800 mb-4">
                <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-dashboard"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showLiveStatus}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showLiveStatus: e.target.checked }))}
                    />
                    <label htmlFor="toggle-dashboard" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showDashboard}</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-animations"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showAnimations}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showAnimations: e.target.checked }))}
                    />
                    <label htmlFor="toggle-animations" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showAnimations}</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-milestones"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showMilestones}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showMilestones: e.target.checked }))}
                    />
                    <label htmlFor="toggle-milestones" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showMilestones}</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-balls"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showRecentBalls}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showRecentBalls: e.target.checked }))}
                    />
                    <label htmlFor="toggle-balls" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showRecentBalls}</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-player-list"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showPlayerList}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showPlayerList: e.target.checked }))}
                    />
                    <label htmlFor="toggle-player-list" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showPlayerList}</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-team-list"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showTeamList}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showTeamList: e.target.checked }))}
                    />
                    <label htmlFor="toggle-team-list" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showTeamList}</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="toggle-byes"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showByeLegBye}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showByeLegBye: e.target.checked }))}
                    />
                    <label htmlFor="toggle-byes" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showByeLegBye}</label>
                  </div>
                  {displayConfigs.showRecentBalls && (
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="toggle-history"
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={displayConfigs.showHistory}
                        onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showHistory: e.target.checked }))}
                      />
                      <label htmlFor="toggle-history" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showHistory}</label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="show-player-stats"
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      checked={displayConfigs.showPlayerStats}
                      onChange={(e) => setDisplayConfigs(prev => ({ ...prev, showPlayerStats: e.target.checked }))}
                    />
                    <label htmlFor="show-player-stats" className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">{t.showPlayerStats}</label>
                  </div>
                  <div className="w-full flex justify-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <a 
                      href={dlsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-xl no-underline flex items-center gap-2"
                    >
                      <Calculator size={14} />
                      {t.dls} Calculator
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team Settings (Conditional) */}
        <AnimatePresence>
          {isEditingTeams && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-900/10">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Active Match Teams */}
                  <div className="space-y-4 col-span-full border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Users size={14} className="text-indigo-500" />
                        {lang === 'bn' ? 'চলতি ম্যাচের টিম তালিকা' : 'Active Match Teams'}
                      </label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder={t.addTeam}
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="h-8 text-xs w-32 md:w-48 bg-white dark:bg-slate-800"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-2"
                          onClick={() => {
                            if (!newTeamName.trim()) return;
                            const currentTeams = match.teams || [match.team1, match.team2];
                            if (currentTeams.includes(newTeamName.trim())) {
                              toast.error(lang === 'bn' ? "টিমটি ইতিমধ্যে আছে" : "Team already exists");
                              return;
                            }
                            setMatch(prev => ({ 
                              ...prev, 
                              teams: [...(prev.teams || [prev.team1, prev.team2]), newTeamName.trim()] 
                            }));
                            setNewTeamName("");
                            toast.success(lang === 'bn' ? "টিম সফলভাবে যোগ করা হয়েছে" : "Team added successfully");
                          }}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(match.teams || [match.team1, match.team2]).map((teamName, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-sm">
                          <span className="text-xs font-bold">{teamName}</span>
                          <button 
                            className="text-red-400 hover:text-red-600 transition-colors ml-1"
                            onClick={() => {
                              const currentTeams = match.teams || [match.team1, match.team2];
                              if (currentTeams.length <= 2) {
                                toast.error(lang === 'bn' ? "কমপক্ষে ২ টি টিম থাকতে হবে" : "Minimum 2 teams required");
                                return;
                              }
                              
                              const newTeams = currentTeams.filter(t => t !== teamName);
                              let newBatting = match.battingTeam;
                              let newBowling = match.bowlingTeam || (match.team1 === match.battingTeam ? match.team2 : match.team1);

                              if (teamName === newBatting) {
                                newBatting = newTeams[0];
                              }
                              if (teamName === newBowling) {
                                newBowling = newTeams.find(t => t !== newBatting) || newTeams[0];
                              }

                              setMatch(prev => ({ 
                                ...prev, 
                                teams: newTeams,
                                battingTeam: newBatting,
                                bowlingTeam: newBowling,
                                team1: newBatting,
                                team2: newBowling
                              }));
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tournament Folders Section */}
                  <div className="space-y-4 col-span-full border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Folder className="text-amber-500 fill-amber-500/20" size={18} />
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wide">
                            {t.tournamentFolders}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            {lang === 'bn' ? 'টুর্নামেন্ট অনুযায়ী ক্যাটাগরি ফোল্ডারে দল সংরক্ষণ করুন' : 'Organize teams inside tournament category folders'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder={t.newTournamentName}
                          value={newTournamentFolderInput}
                          onChange={(e) => setNewTournamentFolderInput(e.target.value)}
                          className="h-8 text-xs w-40 md:w-56 bg-white dark:bg-slate-800"
                        />
                        <Button 
                          size="sm" 
                          className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                          onClick={addTournamentFolder}
                        >
                          <FolderPlus size={14} />
                          <span>{lang === 'bn' ? 'ফোল্ডার তৈরি' : 'Add Folder'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Folders List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {tournaments.map((tourn) => {
                        const isExpanded = expandedFolderIds[tourn.id];
                        return (
                          <div key={tourn.id} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all">
                            {/* Folder Header */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
                              <button 
                                onClick={() => toggleFolderExpand(tourn.id)}
                                className="flex items-center gap-2 text-left font-bold text-xs text-slate-800 dark:text-slate-100 flex-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                {isExpanded ? (
                                  <FolderOpen size={16} className="text-amber-500 shrink-0" />
                                ) : (
                                  <Folder size={16} className="text-amber-500 shrink-0" />
                                )}
                                <span className="truncate">{tourn.name}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold shrink-0">
                                  {tourn.teams.length} {lang === 'bn' ? 'টি দল' : 'teams'}
                                </Badge>
                              </button>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                                  onClick={() => toggleFolderExpand(tourn.id)}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => deleteTournamentFolder(tourn.id)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>

                            {/* Folder Body */}
                            {isExpanded && (
                              <div className="p-3 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {/* Add Team to this Folder */}
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder={lang === 'bn' ? 'ফোল্ডারে টিম যোগ করুন...' : 'Add team to folder...'}
                                    value={tournamentTeamInput[tourn.id] || ''}
                                    onChange={(e) => setTournamentTeamInput(prev => ({ ...prev, [tourn.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') addTeamToTournamentFolder(tourn.id);
                                    }}
                                    className="h-7 text-xs bg-slate-50 dark:bg-slate-800"
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 px-2 text-xs"
                                    onClick={() => addTeamToTournamentFolder(tourn.id)}
                                  >
                                    <Plus size={12} />
                                  </Button>
                                </div>

                                {/* Teams List in Folder */}
                                {tourn.teams.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic py-1">
                                    {lang === 'bn' ? 'এই টুর্নামেন্টে কোনো টিম নেই' : 'No teams in this folder yet'}
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {tourn.teams.map((teamName, tIdx) => {
                                      const isInActiveMatch = (match.teams || [match.team1, match.team2]).includes(teamName);
                                      return (
                                        <div 
                                          key={tIdx} 
                                          className="group flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md text-xs font-semibold"
                                        >
                                          <span>{teamName}</span>
                                          <div className="flex items-center gap-0.5 opacity-90">
                                            {/* Set Batting */}
                                            <button 
                                              title={lang === 'bn' ? 'ব্যাটিং টিম হিসাবে সেট করুন' : 'Set as Batting Team'}
                                              className="px-1 py-0.5 rounded text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold hover:bg-green-200"
                                              onClick={() => {
                                                const currentTeams = match.teams || [match.team1, match.team2];
                                                const updatedTeams = currentTeams.includes(teamName) ? currentTeams : [...currentTeams, teamName];
                                                setMatch(prev => ({
                                                  ...prev,
                                                  teams: updatedTeams,
                                                  battingTeam: teamName,
                                                  team1: teamName
                                                }));
                                                toast.success(lang === 'bn' ? `${teamName} ব্যাটিং টিম হিসেবে সেট করা হয়েছে` : `${teamName} set as Batting Team`);
                                              }}
                                            >
                                              ⚡
                                            </button>

                                            {/* Set Bowling */}
                                            <button 
                                              title={lang === 'bn' ? 'বোলিং টিম হিসাবে সেট করুন' : 'Set as Bowling Team'}
                                              className="px-1 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold hover:bg-red-200"
                                              onClick={() => {
                                                const currentTeams = match.teams || [match.team1, match.team2];
                                                const updatedTeams = currentTeams.includes(teamName) ? currentTeams : [...currentTeams, teamName];
                                                setMatch(prev => ({
                                                  ...prev,
                                                  teams: updatedTeams,
                                                  bowlingTeam: teamName,
                                                  team2: teamName
                                                }));
                                                toast.success(lang === 'bn' ? `${teamName} বোলিং টিম হিসেবে সেট করা হয়েছে` : `${teamName} set as Bowling Team`);
                                              }}
                                            >
                                              🎯
                                            </button>

                                            {/* Add to Active Match List */}
                                            {!isInActiveMatch && (
                                              <button 
                                                title={lang === 'bn' ? 'চলতি ম্যাচে যোগ করুন' : 'Add to Active Match'}
                                                className="px-1 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-200"
                                                onClick={() => {
                                                  setMatch(prev => ({
                                                    ...prev,
                                                    teams: [...(prev.teams || [prev.team1, prev.team2]), teamName]
                                                  }));
                                                  toast.success(lang === 'bn' ? `${teamName} চলতি ম্যাচে যোগ করা হয়েছে` : `${teamName} added to match`);
                                                }}
                                              >
                                                +
                                              </button>
                                            )}

                                            {/* Remove from folder */}
                                            <button 
                                              title={lang === 'bn' ? 'ফোল্ডার থেকে মুছুন' : 'Remove from folder'}
                                              className="text-slate-400 hover:text-red-500 ml-0.5"
                                              onClick={() => removeTeamFromTournamentFolder(tourn.id, teamName)}
                                            >
                                              <X size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Zap size={14} className="text-green-500" />
                      {t.selectBattingTeam}
                    </label>
                    <select 
                      className="w-full h-10 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={match.battingTeam}
                      onChange={(e) => {
                        const newBatting = e.target.value;
                        const currentTeams = match.teams || [match.team1, match.team2];
                        const updatedTeams = currentTeams.includes(newBatting) ? currentTeams : [...currentTeams, newBatting];
                        setMatch(prev => ({ 
                          ...prev, 
                          teams: updatedTeams,
                          battingTeam: newBatting,
                          team1: newBatting
                        }));
                      }}
                    >
                      <optgroup label={lang === 'bn' ? 'চলতি ম্যাচের দলসমূহ' : 'Active Match Teams'}>
                        {(match.teams || [match.team1, match.team2]).map((team, idx) => (
                          <option key={`active-${idx}`} value={team}>{team}</option>
                        ))}
                      </optgroup>
                      {tournaments.map((tourn) => (
                        <optgroup key={tourn.id} label={`📂 ${tourn.name}`}>
                          {tourn.teams.map((tName, tIdx) => (
                            <option key={`t-${tourn.id}-${tIdx}`} value={tName}>{tName}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Target size={14} className="text-red-500" />
                      {t.selectBowlingTeam}
                    </label>
                    <select 
                      className="w-full h-10 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={match.bowlingTeam || (match.team1 === match.battingTeam ? match.team2 : match.team1)}
                      onChange={(e) => {
                        const newBowling = e.target.value;
                        const currentTeams = match.teams || [match.team1, match.team2];
                        const updatedTeams = currentTeams.includes(newBowling) ? currentTeams : [...currentTeams, newBowling];
                        setMatch(prev => ({ 
                          ...prev, 
                          teams: updatedTeams,
                          bowlingTeam: newBowling,
                          team2: newBowling
                        }));
                      }}
                    >
                      <optgroup label={lang === 'bn' ? 'চলতি ম্যাচের দলসমূহ' : 'Active Match Teams'}>
                        {(match.teams || [match.team1, match.team2]).map((team, idx) => (
                          <option key={`active-${idx}`} value={team}>{team}</option>
                        ))}
                      </optgroup>
                      {tournaments.map((tourn) => (
                        <optgroup key={tourn.id} label={`📂 ${tourn.name}`}>
                          {tourn.teams.map((tName, tIdx) => (
                            <option key={`t-${tourn.id}-${tIdx}`} value={tName}>{tName}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Settings2 size={14} className="text-indigo-500" />
                    </label>
                    <Input 
                      value={match.name} 
                      onChange={(e) => setMatch(prev => ({ ...prev, name: e.target.value }))}
                      className="h-10 bg-white dark:bg-slate-800 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Trophy size={14} className="text-indigo-500" />
                    </label>
                    <Input 
                      type="number"
                      value={match.score} 
                      onChange={(e) => setMatch(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                      className="bg-white dark:bg-slate-800 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <UserMinus size={14} className="text-indigo-500" />
                    </label>
                    <Input 
                      type="number"
                      value={match.wickets} 
                      onChange={(e) => setMatch(prev => ({ ...prev, wickets: Math.min(10, parseInt(e.target.value) || 0) }))}
                      className="bg-white dark:bg-slate-800 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div className="space-y-2 col-span-full bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 my-1">
                    <label className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Layers size={14} className="text-indigo-500" />
                      {lang === 'bn' ? 'ম্যাচ ফরম্যাট' : 'Match Format'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { id: '20', label: lang === 'bn' ? '২০ ওভার' : '20 Overs', sub: lang === 'bn' ? '৬ বল/ওভার' : '6 balls/over', overs: 20 },
                        { id: '10', label: lang === 'bn' ? '১০ ওভার' : '10 Overs', sub: lang === 'bn' ? '৬ বল/ওভার' : '6 balls/over', overs: 10 },
                        { id: '50', label: lang === 'bn' ? '৫০ ওভার' : '50 Overs', sub: lang === 'bn' ? '৬ বল/ওভার' : '6 balls/over', overs: 50 },
                        { id: '100', label: lang === 'bn' ? '১০০ বল' : '100 Balls', sub: lang === 'bn' ? '৫ বল/ওভার' : '5 balls/over', overs: 20 }
                      ].map((fmt) => {
                        const isSelected = (match.format || (match.maxOvers === 10 ? '10' : match.maxOvers === 50 ? '50' : '20')) === fmt.id;
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => handleSelectFormat(fmt.id as '20' | '10' | '50' | '100')}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer text-center",
                              isSelected 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]" 
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300"
                            )}
                          >
                            <span className="text-xs font-black">{fmt.label}</span>
                            <span className={cn("text-[9px] font-bold mt-0.5", isSelected ? "text-indigo-100" : "text-slate-400")}>
                              {fmt.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Activity size={14} className="text-indigo-500" />
                      {lang === 'bn' ? 'ওভার' : 'Overs'}
                    </label>
                    <Input 
                      type="number"
                      value={Math.floor(match.balls / ballsPerOver)} 
                      onChange={(e) => {
                        const ov = parseInt(e.target.value) || 0;
                        const b = match.balls % ballsPerOver;
                        setMatch(prev => ({ ...prev, balls: (ov * ballsPerOver) + b }));
                      }}
                      className="bg-white dark:bg-slate-800 dark:border-slate-700 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Zap size={14} className="text-indigo-500" />
                      {lang === 'bn' ? 'বল' : 'Balls'}
                    </label>
                    <Input 
                      type="number"
                      max={ballsPerOver - 1}
                      value={match.balls % ballsPerOver} 
                      onChange={(e) => {
                        const ov = Math.floor(match.balls / ballsPerOver);
                        const b = Math.min(ballsPerOver - 1, parseInt(e.target.value) || 0);
                        setMatch(prev => ({ ...prev, balls: (ov * ballsPerOver) + b }));
                      }}
                      className="bg-white dark:bg-slate-800 dark:border-slate-700 font-bold"
                    />
                  </div>

                  <div className="col-span-full h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                  {/* Live Cricket Match Link Connection Section */}
                  <div className="col-span-full p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/30 space-y-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                          <Radio size={16} className={match.liveSyncEnabled ? "animate-pulse" : ""} />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                            {lang === 'bn' ? 'লাইভ ম্যাচ লিংক কানেক্ট' : 'Live Match Link Connect'}
                            {match.liveMatchUrl && (
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                                match.liveSyncEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              )}>
                                {match.liveSyncEnabled ? (lang === 'bn' ? 'স্বয়ংক্রিয় সিঙ্ক সক্রিয়' : 'Live Polling ON') : (lang === 'bn' ? 'পজড' : 'Paused')}
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {lang === 'bn' 
                              ? 'ম্যাচ লিংক দিন (Cricinfo, Cricbuzz, Crex বা ডেমো) — স্কোর, উইকেট, বল ও ওভার নিজে নিজেই আপডেট হবে।' 
                              : 'Paste any cricket link (Cricinfo, Cricbuzz, CREX, Demo) to auto-update score, wickets, and overs.'}
                          </p>
                        </div>
                      </div>

                      {match.liveMatchUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            setMatch(prev => ({
                              ...prev,
                              liveMatchUrl: "",
                              liveSyncEnabled: false,
                              liveStatusText: undefined,
                              liveRecentBalls: undefined,
                              liveSyncError: undefined
                            }));
                            setLiveUrlInput("");
                            toast.info(lang === 'bn' ? 'লাইভ লিংক বিচ্ছিন্ন করা হয়েছে' : 'Live link disconnected');
                          }}
                        >
                          <X size={12} className="mr-1" />
                          {lang === 'bn' ? 'লিংক মুছুন' : 'Remove Link'}
                        </Button>
                      )}
                    </div>

                    {/* Quick Demo Match Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-500" />
                        {lang === 'bn' ? 'এক ক্লিকে ডেমো টেস্ট:' : 'Quick Demo Test:'}
                      </span>
                      {[
                        { label: '🇧🇩 BAN vs IND', url: 'demo://ban-vs-ind' },
                        { label: '⚡ IND vs PAK', url: 'demo://ind-vs-pak' },
                        { label: '🏆 BPL Final', url: 'demo://bpl-final' },
                        { label: '⏰ Upcoming', url: 'demo://upcoming' },
                      ].map((item) => (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => {
                            setLiveUrlInput(item.url);
                            setMatch(prev => ({ ...prev, liveMatchUrl: item.url, liveSyncEnabled: true }));
                            fetchLiveMatchData(item.url, true);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shadow-xs cursor-pointer",
                            match.liveMatchUrl === item.url
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* URL Input and Fetch Action */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={liveUrlInput}
                          onChange={(e) => setLiveUrlInput(e.target.value)}
                          placeholder={lang === 'bn' ? "ম্যাচের লাইভ লিংক পেস্ট করুন (যেমন Cricbuzz, Cricinfo, বা demo://...)" : "Paste match live URL (e.g. Cricbuzz, Cricinfo, or demo://...)"}
                          className="w-full text-xs py-2 pl-8 pr-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono outline-none focus:border-indigo-500"
                        />
                        <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        {liveUrlInput && (
                          <button
                            type="button"
                            onClick={() => setLiveUrlInput("")}
                            className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            title="Clear"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setLiveUrlInput(text);
                                toast.success(lang === 'bn' ? "ক্লিপবোর্ড থেকে লিংক পেস্ট করা হয়েছে" : "Link pasted from clipboard");
                              }
                            } catch {
                              toast.info(lang === 'bn' ? "ক্লিপবোর্ড এক্সেস করা যায়নি, নিজে পেস্ট করুন" : "Unable to access clipboard");
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1 py-0.5 cursor-pointer"
                          title="Paste"
                        >
                          {lang === 'bn' ? 'পেস্ট' : 'Paste'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isFetchingLiveUrl || !liveUrlInput.trim()}
                          onClick={() => {
                            const clean = liveUrlInput.trim();
                            setMatch(prev => ({ ...prev, liveMatchUrl: clean }));
                            fetchLiveMatchData(clean, true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-3 h-9 flex items-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw size={13} className={isFetchingLiveUrl ? "animate-spin" : ""} />
                          {isFetchingLiveUrl ? (lang === 'bn' ? 'ফেচ হচ্ছে...' : 'Fetching...') : (lang === 'bn' ? 'লাইভ আনুন' : 'Fetch Live')}
                        </Button>
                      </div>
                    </div>

                    {/* Auto Sync Settings & Interval */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="auto-sync-toggle"
                          checked={match.liveSyncEnabled || false}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            if (enabled && !match.liveMatchUrl && liveUrlInput.trim()) {
                              setMatch(prev => ({ ...prev, liveMatchUrl: liveUrlInput.trim(), liveSyncEnabled: true }));
                              fetchLiveMatchData(liveUrlInput.trim(), true);
                            } else {
                              setMatch(prev => ({ ...prev, liveSyncEnabled: enabled }));
                            }
                            toast.info(enabled ? (lang === 'bn' ? 'স্বয়ংক্রিয় সিঙ্ক চালু হয়েছে' : 'Auto sync enabled') : (lang === 'bn' ? 'স্বয়ংক্রিয় সিঙ্ক বন্ধ' : 'Auto sync paused'));
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="auto-sync-toggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          {lang === 'bn' ? 'স্বয়ংক্রিয় লাইভ সিঙ্ক (Auto Polling)' : 'Auto Live Polling'}
                        </label>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">{lang === 'bn' ? 'আপডেট সময়:' : 'Interval:'}</span>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-[280px] sm:max-w-none">
                          {[0.00000001, 1, 2, 3, 5, 10, 30].map((sec) => {
                            const isSelected = sec === 0.00000001
                              ? (match.liveSyncInterval === 0.00000001 || !match.liveSyncInterval || match.liveSyncInterval < 0.1)
                              : match.liveSyncInterval === sec;
                            return (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => {
                                  setMatch(prev => ({ ...prev, liveSyncInterval: sec }));
                                  toast.success(
                                    sec === 0.00000001
                                      ? (lang === 'bn' ? 'প্রতি 0.00000001 সেকেন্ড পর পর রিপ্রেস সেট হয়েছে (ডিফল্ট)' : 'Auto refresh set to 0.00000001s (Default)')
                                      : (lang === 'bn' ? `প্রতি ${sec} সেকেন্ড পর পর সিঙ্ক হবে` : `Sync every ${sec}s`)
                                  );
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap",
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-xs font-black ring-1 ring-indigo-400"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                                )}
                              >
                                {sec === 0.00000001 ? (lang === 'bn' ? '0.00000001s ⚡ (ডিফল্ট)' : '0.00000001s ⚡ (Def)') : `${sec}s`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Live Match Summary Box if Active */}
                    {match.liveMatchUrl && (
                      <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="font-sans font-black text-emerald-400 text-xs uppercase tracking-wider">
                              {match.battingTeam || match.team1} vs {match.bowlingTeam || match.team2}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {match.lastSyncedAt ? `${lang === 'bn' ? 'আপডেট:' : 'Synced:'} ${match.lastSyncedAt}` : ''}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-sans">
                          <div>
                            <span className="text-2xl font-black font-mono text-cyan-400 tracking-tight">
                              {match.score}-{match.wickets}
                            </span>
                            <span className="text-slate-400 text-sm ml-2 font-mono">
                              ({Math.floor(match.balls / ballsPerOver)}.{match.balls % ballsPerOver} ov)
                            </span>
                          </div>

                          {match.liveStatusText && (
                            <div className="text-amber-400 font-bold text-xs bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                              {match.liveStatusText}
                            </div>
                          )}
                        </div>

                        {match.liveRecentBalls && match.liveRecentBalls.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 uppercase font-sans">Recent:</span>
                            {match.liveRecentBalls.slice(-8).map((ball, idx) => (
                              <span
                                key={idx}
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono",
                                  ball === 'W' ? "bg-red-600 text-white" :
                                  (ball === '4' || ball === '6') ? "bg-amber-400 text-black font-black" :
                                  "bg-slate-800 text-slate-200 border border-slate-700"
                                )}
                              >
                                {ball}
                              </span>
                            ))}
                          </div>
                        )}

                        {match.liveSyncError && (
                          <div className="text-red-400 text-[11px] pt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            <span>{match.liveSyncError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Match Start Time & Countdown Control in Team Settings */}
                  <div className="col-span-full p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Clock size={18} className="animate-pulse" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
                            {lang === 'bn' ? 'ম্যাচ শুরুর সময় ও কাউন্টডাউন' : 'Match Start Time & Countdown'}
                          </h4>
                          {match.matchStartTime && (
                            <MatchCountdownBadge 
                              startTime={match.matchStartTime}
                              isoTime={match.matchStartTimeIso}
                              lang={lang}
                            />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {match.matchStartTime 
                            ? (lang === 'bn' ? `নির্ধারিত সময়: ${match.matchStartTime}` : `Scheduled: ${match.matchStartTime}`)
                            : (lang === 'bn' ? 'ম্যাচ শুরুর নির্ধারিত সময় ও রিয়েল-টাইম কাউন্টডাউন সেট করুন' : 'Schedule match start time and display live ticking countdown timer')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {isUpcomingMatch && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setMatch(prev => ({
                              ...prev,
                              isUpcoming: false,
                              liveStatusText: lang === 'bn' ? 'ম্যাচ শুরু হয়েছে' : 'Match Started'
                            }));
                            toast.success(lang === 'bn' ? 'ম্যাচ শুরু হয়েছে!' : 'Match started!');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-8 px-3 cursor-pointer"
                        >
                          <Play size={11} className="mr-1" />
                          {lang === 'bn' ? 'এখনই শুরু' : 'Start Now'}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsStartTimeEditorOpen(true)}
                        className="border-amber-400/50 bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 text-xs font-bold h-8 rounded-xl cursor-pointer"
                      >
                        <Edit3 size={11} className="mr-1" />
                        {match.matchStartTime ? (lang === 'bn' ? 'সময় পরিবর্তন' : 'Edit Time') : (lang === 'bn' ? 'সময় নির্ধারণ' : 'Set Time')}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 col-span-full">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Target size={14} className="text-indigo-500" />
                        <span className="text-slate-300">/</span>
                        <Activity size={14} className="text-indigo-500" />
                      </label>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase border-indigo-200 text-indigo-600"
                        onClick={() => {
                          const milestones = [...(match.targetMilestones || [])].sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs));
                          const lastRuns = milestones[milestones.length - 1]?.runs || 100;
                          const lastOver = milestones[milestones.length - 1]?.over || 20;
                          const newMilestone: TargetMilestone = { runs: lastRuns + 50, over: lastOver + 10, condition: 'more', entries: [{ odd: 1.8, stake: 100 }] };
                          const updatedMilestones = [...milestones, newMilestone].sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs));
                          setMatch(prev => ({ ...prev, targetMilestones: updatedMilestones }));
                        }}
                      >
                        <Plus size={14} className="mr-1" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[...(match.targetMilestones || [])].sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs)).map((milestone, sortedIdx) => {
                        // Find original index for state updates
                        const originalIdx = (match.targetMilestones || []).findIndex(m => m === milestone);
                        
                        return (
                          <div key={`target-edit-${sortedIdx}`} className="flex flex-col sm:flex-row items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex items-center w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-700">
                              <div className="flex flex-col px-3 py-1">
                                <span className="text-[10px] font-bold text-slate-400">
                                  <Trophy size={12} />
                                </span>
                                <Input 
                                  type="number"
                                  value={milestone.runs === 0 ? '' : milestone.runs}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const newMilestones = [...(match.targetMilestones || [])];
                                    newMilestones[originalIdx] = { ...newMilestones[originalIdx], runs: val };
                                    setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                  }}
                                  className="w-20 h-8 border-none focus-visible:ring-0 font-bold text-sm p-0"
                                />
                              </div>
                              <div className="flex flex-col px-3 py-1 border-l border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400">
                                  <Activity size={12} />
                                </span>
                                <Input 
                                  type="number"
                                  value={milestone.over === 0 ? '' : milestone.over}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const newMilestones = [...(match.targetMilestones || [])];
                                    newMilestones[originalIdx] = { ...newMilestones[originalIdx], over: val };
                                    setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                  }}
                                  className="w-16 h-8 border-none focus-visible:ring-0 font-bold text-sm p-0"
                                />
                              </div>
                            </div>
                            <div className="flex-1 w-full bg-slate-50 dark:bg-slate-900/50 p-2 space-y-2">
                              <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black uppercase text-slate-400">{t.entries}</span>
                                <Button 
                                  size="xs" 
                                  variant="ghost" 
                                  className="h-6 w-6 p-0 text-indigo-600"
                                  onClick={() => {
                                    const newMilestones = [...(match.targetMilestones || [])];
                                    const entries = [...(newMilestones[originalIdx].entries || [])];
                                    entries.push({ odd: 1.8, stake: 100 });
                                    newMilestones[originalIdx] = { ...newMilestones[originalIdx], entries };
                                    setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                  }}
                                >
                                  <Plus size={14} />
                                </Button>
                              </div>
                              <div className="space-y-1">
                                {(milestone.entries || []).map((entry, entryIdx) => (
                                  <div key={`entry-${sortedIdx}-${entryIdx}`} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col flex-1 px-2">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        <Percent size={10} />
                                      </span>
                                      <Input 
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={entry.odd}
                                        onChange={(e) => {
                                          let val = e.target.value.replace(',', '.');
                                          // Allow empty, a single dot, or numbers with a single decimal point
                                          if (val === '' || val === '.' || /^\d*\.?\d*$/.test(val)) {
                                            const newMilestones = [...(match.targetMilestones || [])];
                                            const entries = [...(newMilestones[originalIdx].entries || [])];
                                            entries[entryIdx] = { ...entries[entryIdx], odd: val };
                                            newMilestones[originalIdx] = { ...newMilestones[originalIdx], entries };
                                            setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                          }
                                        }}
                                        className="h-8 border-none focus-visible:ring-0 font-bold text-[13px] p-0"
                                      />
                                    </div>
                                    <div className="flex flex-col flex-1 px-2 border-l border-slate-100 dark:border-slate-800">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        <Coins size={10} />
                                      </span>
                                      <Input 
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={entry.stake}
                                        onChange={(e) => {
                                          let val = e.target.value.replace(',', '.');
                                          if (val === '' || val === '.' || /^\d*\.?\d*$/.test(val)) {
                                            const newMilestones = [...(match.targetMilestones || [])];
                                            const entries = [...(newMilestones[originalIdx].entries || [])];
                                            entries[entryIdx] = { ...entries[entryIdx], stake: val };
                                            newMilestones[originalIdx] = { ...newMilestones[originalIdx], entries };
                                            setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                          }
                                        }}
                                        className="h-8 border-none focus-visible:ring-0 font-bold text-[13px] p-0"
                                      />
                                    </div>
                                    {milestone.entries && milestone.entries.length > 1 && (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-6 w-6 text-red-300 hover:text-red-500"
                                        onClick={() => {
                                          const newMilestones = [...(match.targetMilestones || [])];
                                          const entries = (newMilestones[originalIdx].entries || []).filter((_, i) => i !== entryIdx);
                                          newMilestones[originalIdx] = { ...newMilestones[originalIdx], entries };
                                          setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                        }}
                                      >
                                        <X size={12} />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col w-full sm:w-24 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700">
                              <Button 
                                variant="ghost"
                                size="sm"
                                className={`flex-1 h-10 rounded-none text-[10px] font-bold ${milestone.condition === 'more' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'text-slate-400'}`}
                                onClick={() => {
                                  const newMilestones = [...(match.targetMilestones || [])];
                                  newMilestones[originalIdx] = { ...newMilestones[originalIdx], condition: 'more' };
                                  setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                }}
                              >
                                {t.moreToWin}
                              </Button>
                              <Button 
                                variant="ghost"
                                size="sm"
                                className={`flex-1 h-10 rounded-none text-[10px] font-bold border-l border-slate-50 dark:border-slate-800 ${milestone.condition === 'lessOrEqual' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'text-slate-400'}`}
                                onClick={() => {
                                  const newMilestones = [...(match.targetMilestones || [])];
                                  newMilestones[originalIdx] = { ...newMilestones[originalIdx], condition: 'lessOrEqual' };
                                  setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                }}
                              >
                                {t.lessOrEqualWin}
                              </Button>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-none border-l border-slate-100 dark:border-slate-700"
                              onClick={() => {
                                const newMilestones = (match.targetMilestones || []).filter((_, i) => i !== originalIdx);
                                setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Sections Wrapper */}
        {/* Scoreboard Banner Section */}
        {displayConfigs.showLiveStatus && !isFocusMode && (
          <div className={cn(
            "transition-all duration-300",
            lockedSections.scoreboard && "sticky top-0 z-50 shadow-xl"
          )}>
          <Card className={cn(
            "overflow-hidden border-none shadow-2xl shadow-slate-200/50 bg-white dark:bg-slate-900 rounded-none md:rounded-t-3xl border-b dark:border-slate-800 transition-all duration-300",
            lockedSections.scoreboard && "rounded-none"
          )}>
            <CardContent className="p-0 relative">
              {/* Lock Toggle */}
              <div className="absolute top-2 right-2 z-50">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 rounded-full",
                    lockedSections.scoreboard ? "bg-indigo-500/20 text-indigo-400" : "bg-white/10 text-white/40 hover:text-white"
                  )}
                  onClick={() => toggleLock('scoreboard')}
                >
                  <Pin size={14} className={lockedSections.scoreboard ? "rotate-45" : ""} />
                </Button>
              </div>

              <div className="flex flex-col">
                {/* Score Banner */}
                <div className="p-3 md:p-5 bg-slate-900 text-white relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div className="space-y-1 md:space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-none px-3 py-1 text-[11px] md:text-sm font-black uppercase tracking-wider">
                            {t.batting}: {match.battingTeam}
                          </Badge>
                        </div>
                        {isFreeHit && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-red-600 text-white px-3 py-1 text-[11px] md:text-sm font-black uppercase tracking-wider rounded-md animate-pulse shadow-lg shadow-red-900/50"
                          >
                            🔥 {t.freeHit}
                          </motion.div>
                        )}
                      </div>
                      
                      <div className={cn("flex flex-col items-center w-full", celebration.visible && "hidden")}>
                        <div className="grid w-full gap-2 grid-cols-1 max-w-2xl mx-auto">
                          {/* Match Section */}
                          <div className="flex flex-col items-center p-3 md:p-4 rounded-3xl transition-all duration-500">
                            <div className="flex items-center justify-between w-full mb-3 px-2">
                              {isEditingName ? (
                                <input
                                  type="text"
                                  value={matchInput}
                                  onChange={(e) => setMatchInput(e.target.value)}
                                  autoFocus
                                  onBlur={() => {
                                    setMatch(prev => ({ ...prev, name: matchInput }));
                                    setIsEditingName(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                    if (e.key === 'Escape') setIsEditingName(false);
                                  }}
                                  className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded outline-none"
                                />
                              ) : (
                                <Badge 
                                  className="bg-indigo-500/20 text-indigo-400 border-none px-3 py-1 text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-500/30 transition-colors"
                                  onClick={() => {
                                    setMatchInput(match.name || "");
                                    setIsEditingName(true);
                                  }}
                                >
                                  {match.name || "Match"}
                                </Badge>
                              )}
                              
                              {isEditingBattingTeam ? (
                                <input
                                  type="text"
                                  value={matchInput}
                                  onChange={(e) => setMatchInput(e.target.value)}
                                  autoFocus
                                  onBlur={() => {
                                    setMatch(prev => ({ ...prev, battingTeam: matchInput }));
                                    setIsEditingBattingTeam(false);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                    if (e.key === 'Escape') setIsEditingBattingTeam(false);
                                  }}
                                  className="bg-slate-500/10 text-slate-400 border border-slate-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded outline-none"
                                />
                              ) : (
                                <span 
                                  className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none cursor-pointer hover:text-slate-300 transition-colors"
                                  onClick={() => {
                                    setMatchInput(match.battingTeam || "");
                                    setIsEditingBattingTeam(true);
                                  }}
                                >
                                  {match.battingTeam} {t.batting}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-center gap-6 md:gap-14 mb-3 w-full">
                              {/* Target Section */}
                              <div 
                                className="flex flex-col items-center cursor-pointer group"
                                onClick={() => {
                                  if (!isEditingTarget) {
                                    setIsEditingTarget(true);
                                    if (activeTargetMilestone) {
                                      setDashboardTargetInput(activeTargetMilestone.runs.toString());
                                    }
                                  }
                                }}
                              >
                                <span className="font-black text-slate-500 uppercase tracking-widest mb-1 leading-none text-[8px] md:text-[10px] group-hover:text-slate-400 transition-colors">
                                  <Target size={14} />
                                </span>
                                {isEditingTarget ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="number"
                                      value={dashboardTargetInput}
                                      onChange={(e) => setDashboardTargetInput(e.target.value)}
                                      autoFocus
                                      onBlur={() => {
                                        const newRuns = parseInt(dashboardTargetInput) || 0;
                                        if (activeTargetMilestone) {
                                          const newMilestones = (match.targetMilestones || []).map(m => 
                                            m.over === activeTargetMilestone.over ? { ...m, runs: newRuns } : m
                                          );
                                          setMatch(prev => ({ ...prev, targetMilestones: newMilestones }));
                                        } else {
                                          setMatch(prev => ({ 
                                            ...prev, 
                                            targetMilestones: [{ runs: newRuns, over: match.maxOvers, condition: 'more', entries: [{ odd: 1.8, stake: 0 }] }] 
                                          }));
                                        }
                                        setIsEditingTarget(false);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                        if (e.key === 'Escape') setIsEditingTarget(false);
                                      }}
                                      className="bg-slate-800 text-slate-400 font-black border-2 border-slate-700 rounded-xl px-1 outline-none text-center w-24 md:w-48 text-[1.5rem] md:text-[4rem]"
                                    />
                                  </div>
                                ) : (
                                  <AnimatePresence mode="wait">
                                    <motion.div
                                      key={`${activeMilestone?.over}-${activeMilestone?.runs}`}
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      exit={{ y: -20, opacity: 0 }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                    >
                                      <div className="font-black text-slate-500 group-hover:text-white transition-colors leading-none text-[2.5rem] md:text-[6.5rem] flex flex-col items-center">
                                        <span className="text-[10px] md:text-sm text-slate-600 mb-1">{activeMilestone?.over} Over</span>
                                        {activeMilestone?.runs || 0}
                                      </div>
                                    </motion.div>
                                  </AnimatePresence>
                                )}
                              </div>

                              <div className="bg-white/10 h-16 md:h-32 w-px opacity-50" />

                              {/* Score Section */}
                              <div 
                                className="flex flex-col items-center cursor-pointer group"
                                onClick={() => {
                                  if (!isEditingScore && !isEditingWickets) {
                                    setIsMilestoneRotationPaused(true);
                                    setIsEditingScore(true);
                                    setIsEditingWickets(true);
                                    setScoreInput(match.score.toString());
                                    setWicketsInput(match.wickets.toString());
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-black text-indigo-400/60 uppercase tracking-widest leading-none text-[8px] md:text-[10px] group-hover:text-indigo-400 transition-colors">
                                    {t.runs}
                                  </span>
                                  {/* ওভার ও বল: উপরে রানের পাশে */}
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-baseline gap-1">
                                      <Clock size={10} className="text-emerald-400 self-center" />
                                      <span className="text-[9px] font-sans font-black text-emerald-400/90">{lang === 'bn' ? 'ওভার' : 'Ov'}</span>
                                      <span className="font-mono font-black text-sm md:text-base text-emerald-300">{lang === 'bn' ? toBengaliDigits(overs) : overs}</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-baseline gap-1">
                                      <CircleDot size={10} className="text-cyan-400 self-center" />
                                      <span className="text-[9px] font-sans font-black text-cyan-400/90">{lang === 'bn' ? 'বল' : 'Ball'}</span>
                                      <span className="font-mono font-black text-sm md:text-base text-cyan-300">{lang === 'bn' ? `${toBengaliDigits(ballsInOver)}/${toBengaliDigits(ballsPerOver)}` : `${ballsInOver}/${ballsPerOver}`}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {isEditingScore ? (
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="number"
                                        value={scoreInput}
                                        onChange={(e) => setScoreInput(e.target.value)}
                                        autoFocus
                                        onBlur={(e) => {
                                          const nextTarget = e.relatedTarget as HTMLElement;
                                          setTimeout(() => {
                                            const activeElement = document.activeElement;
                                            if (activeElement?.getAttribute('data-scoreboard-input') !== 'true' && nextTarget?.getAttribute('data-scoreboard-input') !== 'true') {
                                              setMatch(prev => ({ ...prev, score: parseInt(scoreInput) || 0 }));
                                              setIsEditingScore(false);
                                              setIsEditingWickets(false);
                                              setIsMilestoneRotationPaused(false);
                                            }
                                          }, 300);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') e.currentTarget.blur();
                                          if (e.key === 'Escape') {
                                            setIsEditingScore(false);
                                            setIsEditingWickets(false);
                                            setIsMilestoneRotationPaused(false);
                                          }
                                        }}
                                        data-scoreboard-input="true"
                                        className="bg-slate-800 text-white font-black border-2 border-indigo-500 rounded-xl px-1 outline-none text-center w-28 md:w-56 text-[1.5rem] md:text-[4rem]"
                                      />
                                      <span className="text-slate-600 font-light text-2xl md:text-5xl">/</span>
                                      <input
                                        type="number"
                                        value={wicketsInput}
                                        onChange={(e) => setWicketsInput(e.target.value)}
                                        onBlur={(e) => {
                                          const nextTarget = e.relatedTarget as HTMLElement;
                                          setTimeout(() => {
                                            const activeElement = document.activeElement;
                                            if (activeElement?.getAttribute('data-scoreboard-input') !== 'true' && nextTarget?.getAttribute('data-scoreboard-input') !== 'true') {
                                              setMatch(prev => ({ ...prev, wickets: Math.min(10, parseInt(wicketsInput) || 0) }));
                                              setIsEditingScore(false);
                                              setIsEditingWickets(false);
                                              setIsMilestoneRotationPaused(false);
                                            }
                                          }, 300);
                                        }}
                                        data-scoreboard-input="true"
                                        className="bg-slate-800 text-indigo-400 font-bold border-2 border-indigo-500 rounded-xl px-1 outline-none text-center w-12 md:w-24 text-[1.25rem] md:text-[3.5rem]"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      {/* Runs Control */}
                                      <div className="flex flex-col items-center justify-center p-1 bg-black/20 rounded-xl border border-white/5" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          className="p-1 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, score: prev.score + 1 }))}
                                          title="Increment Runs"
                                        >
                                          <ChevronUp size={14} className="text-emerald-400" />
                                        </button>
                                        <button 
                                          className="p-1 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, score: Math.max(0, prev.score - 1) }))}
                                          title="Decrement Runs"
                                        >
                                          <ChevronDown size={14} className="text-emerald-400" />
                                        </button>
                                      </div>

                                      <div className="flex items-baseline cursor-pointer">
                                        <motion.span 
                                          key={`score-m1-${match.score}`}
                                          initial={{ y: 10, opacity: 0 }}
                                          animate={{ y: 0, opacity: 1 }}
                                          className="font-black tracking-tighter group-hover:text-indigo-400 transition-colors leading-none text-[3.5rem] md:text-[7.5rem]"
                                        >
                                          {match.score}
                                        </motion.span>
                                        <span className="font-light text-slate-600 mx-1 text-[2.5rem] md:text-[6.5rem]">/</span>
                                        <motion.span 
                                          key={`wickets-m1-${match.wickets}`}
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          className="font-bold text-indigo-400 leading-none text-[2.5rem] md:text-[6rem]"
                                        >
                                          {match.wickets}
                                        </motion.span>
                                      </div>

                                      {/* Wickets Control */}
                                      <div className="flex flex-col items-center justify-center p-1 bg-black/20 rounded-xl border border-white/5" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          className="p-1 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, wickets: Math.min(10, prev.wickets + 1) }))}
                                          title="Increment Wickets"
                                        >
                                          <ChevronUp size={14} className="text-indigo-400" />
                                        </button>
                                        <button 
                                          className="p-1 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, wickets: Math.max(0, prev.wickets - 1) }))}
                                          title="Decrement Wickets"
                                        >
                                          <ChevronDown size={14} className="text-indigo-400" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Combined Stats Row: Overs, CRR, RRR */}
                            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 bg-black/20 px-4 py-2.5 rounded-2xl border border-white/5 w-full max-w-xl">
                              {/* Overs */}
                              <div 
                                className="flex flex-col items-center cursor-pointer group" 
                                onClick={() => {
                                  if (editingOversLocation !== 'dashboard') {
                                    setIsMilestoneRotationPaused(true);
                                    setEditingOversLocation('dashboard');
                                    setOverInput(Math.floor(match.balls / ballsPerOver).toString());
                                    setBallInput((match.balls % ballsPerOver).toString());
                                  }
                                }}
                              >
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none group-hover:text-slate-400 transition-colors flex items-center gap-1">
                                  {t.overs}
                                  {editingOversLocation !== 'dashboard' && <Edit3 size={8} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />}
                                </span>
                                {editingOversLocation === 'dashboard' ? (
                                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-indigo-500/60 p-1.5 rounded-xl shadow-lg" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-1">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[7px] font-black text-indigo-400 uppercase">{lang === 'bn' ? 'ওভার' : 'Over'}</span>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          min="0"
                                          value={overInput}
                                          onChange={(e) => setOverInput(e.target.value)}
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const o = parseInt(overInput) || 0;
                                              const b = parseInt(ballInput) || 0;
                                              setMatch(prev => ({ ...prev, balls: (o * ballsPerOver) + (b % ballsPerOver) }));
                                              setEditingOversLocation(null);
                                              setIsMilestoneRotationPaused(false);
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingOversLocation(null);
                                              setIsMilestoneRotationPaused(false);
                                            }
                                          }}
                                          className="w-12 bg-slate-800 text-white font-mono text-base font-black border border-slate-700 rounded-lg px-1 text-center outline-none focus:border-indigo-500"
                                        />
                                      </div>
                                      <span className="text-slate-500 font-black text-base mt-2">.</span>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[7px] font-black text-emerald-400 uppercase">{lang === 'bn' ? 'বল' : 'Ball'}</span>
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          min="0"
                                          max={ballsPerOver - 1}
                                          value={ballInput}
                                          onChange={(e) => setBallInput(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const b = parseInt(ballInput) || 0;
                                              const o = parseInt(overInput) || 0;
                                              setMatch(prev => ({ ...prev, balls: (o * ballsPerOver) + (b % ballsPerOver) }));
                                              setEditingOversLocation(null);
                                              setIsMilestoneRotationPaused(false);
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingOversLocation(null);
                                              setIsMilestoneRotationPaused(false);
                                            }
                                          }}
                                          className="w-10 bg-slate-800 text-indigo-300 font-mono text-base font-black border border-slate-700 rounded-lg px-1 text-center outline-none focus:border-emerald-500"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const o = parseInt(overInput) || 0;
                                          const b = parseInt(ballInput) || 0;
                                          setMatch(prev => ({ ...prev, balls: (o * ballsPerOver) + (b % ballsPerOver) }));
                                          setEditingOversLocation(null);
                                          setIsMilestoneRotationPaused(false);
                                        }}
                                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                        title={lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingOversLocation(null);
                                          setIsMilestoneRotationPaused(false);
                                        }}
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                                        title={lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {/* Overs Control */}
                                    <div className="flex items-center gap-1.5 bg-black/35 px-2 py-0.5 rounded-lg border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">{lang === 'bn' ? 'ওভার' : 'Over'}</span>
                                        <span className="font-mono font-black text-slate-200 text-sm md:text-base leading-none group-hover:text-white transition-colors">
                                          {Math.floor(match.balls / ballsPerOver)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          className="p-0.5 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, balls: prev.balls + ballsPerOver }))}
                                          title="Over +"
                                        >
                                          <ChevronUp size={11} className="text-indigo-300" />
                                        </button>
                                        <button 
                                          className="p-0.5 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, balls: Math.max(0, prev.balls - ballsPerOver) }))}
                                          title="Over -"
                                        >
                                          <ChevronDown size={11} className="text-indigo-300" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Dot separator */}
                                    <span className="font-mono font-black text-slate-500 text-lg leading-none">.</span>

                                    {/* Balls Control */}
                                    <div className="flex items-center gap-1.5 bg-black/35 px-2 py-0.5 rounded-lg border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">{lang === 'bn' ? 'বল' : 'Ball'}</span>
                                        <span className="font-mono font-black text-indigo-300 text-sm md:text-base leading-none group-hover:text-indigo-200 transition-colors">
                                          {match.balls % ballsPerOver}
                                        </span>
                                      </div>
                                      <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          className="p-0.5 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, balls: prev.balls + 1 }))}
                                          title="Ball +"
                                        >
                                          <ChevronUp size={11} className="text-emerald-400" />
                                        </button>
                                        <button 
                                          className="p-0.5 hover:bg-white/10 active:scale-90 text-slate-400 hover:text-white rounded transition-all"
                                          onClick={() => setMatch(prev => ({ ...prev, balls: Math.max(0, prev.balls - 1) }))}
                                          title="Ball -"
                                        >
                                          <ChevronDown size={11} className="text-emerald-400" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="h-8 w-px bg-white/10 hidden sm:block" />

                              {/* CRR */}
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">{t.runRate}</span>
                                <div className="text-lg md:text-xl font-mono font-black text-indigo-400">{runRate}</div>
                              </div>

                              {/* RRR Milestone Data */}
                              {rotatedMilestoneData && rotatedMilestoneData.isPending && Number(rotatedMilestoneData.requiredRR) <= 36.00000000001 && (
                                <>
                                  <div className="h-8 w-px bg-white/10 hidden sm:block" />
                                  <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">
                                      {rotatedMilestoneData.condition === 'more' ? `${t.need} ${Math.max(0, rotatedMilestoneData.remaining)}` : `RRR (${rotatedMilestoneData.over} Ov)`}
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg md:text-xl font-mono font-black text-amber-400">{rotatedMilestoneData.requiredRR}</span>
                                      {rotatedMilestoneData.condition === 'more' && <span className="text-[9px] font-bold text-slate-600 uppercase">RRR</span>}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Team & Player Lists */}
        {!isFocusMode && (displayConfigs.showTeamList || displayConfigs.showPlayerList) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-0 md:px-0 mb-4">
            {displayConfigs.showTeamList && (
              <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">{t.team1} & {t.team2}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Team 1</p>
                      <Input 
                        value={match.team1} 
                        onChange={(e) => setMatch(prev => ({ ...prev, team1: e.target.value }))}
                        className="h-11 text-base font-black bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Team 2</p>
                      <Input 
                        value={match.team2} 
                        onChange={(e) => setMatch(prev => ({ ...prev, team2: e.target.value }))}
                        className="h-11 text-base font-black bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">{lang === 'bn' ? 'মোট উইকেট (অপশনাল ১৩ জন পর্যন্ত)' : 'Total Wickets (Optional up to 13)'}</p>
                      <Input 
                        type="number"
                        min={1}
                        max={13}
                        value={match.maxWickets || 10} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setMatch(prev => ({ ...prev, maxWickets: Math.min(13, Math.max(1, val)) }));
                          }
                        }}
                        className="h-11 text-base font-black bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {displayConfigs.showPlayerList && (
              <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords size={16} className="text-indigo-500" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">{lang === 'bn' ? 'প্লেয়ার লিস্ট (১৩ জন পর্যন্ত)' : 'Player List (Up to 13)'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 h-[120px]">
                  <ScrollArea className="h-full pr-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">{match.team1}</p>
                          <div className="flex items-center gap-1.5">
                             <input 
                               type="text"
                               placeholder={lang === 'bn' ? 'নাম' : 'Name'}
                               value={newPlayerName1}
                               onChange={(e) => setNewPlayerName1(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && addSinglePlayer(1)}
                               className="text-xs font-bold bg-indigo-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1 w-20"
                             />
                             <Button size="icon" className="h-6 w-6 bg-indigo-600 hover:bg-indigo-700" onClick={() => addSinglePlayer(1)}>
                               <Plus size={10} />
                             </Button>
                          </div>
                        </div>
                        <textarea 
                          placeholder={lang === 'bn' ? 'খেলোয়াড়দের নাম (কমা দিয়ে, ১৩ জন পর্যন্ত)' : 'Player names (comma separated, up to 13)'}
                          value={rawPlayerInput1} 
                          onChange={(e) => updatePlayerList(1, e.target.value)}
                          className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 min-h-[80px] resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">{match.team2}</p>
                          <div className="flex items-center gap-1.5">
                             <input 
                               type="text"
                               placeholder={lang === 'bn' ? 'নাম' : 'Name'}
                               value={newPlayerName2}
                               onChange={(e) => setNewPlayerName2(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && addSinglePlayer(2)}
                               className="text-xs font-bold bg-indigo-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1 w-20"
                             />
                             <Button size="icon" className="h-6 w-6 bg-indigo-600 hover:bg-indigo-700" onClick={() => addSinglePlayer(2)}>
                               <Plus size={10} />
                             </Button>
                          </div>
                        </div>
                        <textarea 
                          placeholder={lang === 'bn' ? 'খেলোয়াড়দের নাম (কমা দিয়ে, ১৩ জন পর্যন্ত)' : 'Player names (comma separated, up to 13)'}
                          value={rawPlayerInput2} 
                          onChange={(e) => updatePlayerList(2, e.target.value)}
                          className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border-none focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {displayConfigs.showPlayerStats && (
          <div className="mb-4">
            <Scorecard 
              match={match} 
              t={t} 
              lang={lang} 
              onStrikeIdx={match.onStrikeIdx ?? 0}
              onSwapStrike={onSwapStrike}
              onSelectBatter={onSelectBatter}
              onEditPlayer={onEditPlayer}
              onEditTeamScore={onEditTeamScore}
            />
          </div>
        )}

        {displayConfigs.showRecentBalls && !isFocusMode && (
          <div className={cn(
            "transition-all duration-300",
            lockedSections.stats && "sticky top-[100px] md:top-[120px] z-40 shadow-xl"
          )}>
            <Card className={cn(
              "overflow-hidden border-none bg-white dark:bg-slate-900 rounded-none border-b dark:border-slate-800 transition-all duration-300",
              lockedSections.stats && "rounded-none"
            )}>
            <CardContent className="p-0 relative">
              {/* Lock Toggle */}
              <div className="absolute top-2 right-2 z-50">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-6 w-6 rounded-full",
                    lockedSections.stats ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                  )}
                  onClick={() => toggleLock('stats')}
                >
                  <Pin size={12} className={lockedSections.stats ? "rotate-45" : ""} />
                </Button>
              </div>

              {/* Over Progress */}
              <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">{t.currentOver}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800 font-black text-base">
                          {t.overs} {ballsInOver === 0 && match.balls > 0 ? overs : overs + 1}: {currentOverRuns}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 no-scrollbar">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 md:h-9 md:w-9 rounded-lg shrink-0"
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      >
                        <History size={16} className={isHistoryExpanded ? "text-indigo-600" : "text-slate-400"} />
                      </Button>
                      <Separator orientation="vertical" className="h-7 md:h-9 mx-1" />
                      {currentOverEvents.map((event, i) => {
                        const isReBowledExtra = event.type === 'wide' || event.type === 'noball';
                        const isBulk = event.type === 'bulk_over';
                        const isBoundary = event.runs >= 4 || (isReBowledExtra && (event.runs - 1) >= 4);
                        const displayRuns = isReBowledExtra ? event.runs - 1 : event.runs;
                        
                        let bgColor = 'bg-indigo-600 border-indigo-600 text-white shadow-lg';
                        if (event.isWicket) {
                          bgColor = 'bg-red-600 border-red-600 shadow-red-200 text-white shadow-lg';
                        } else if (isBoundary) {
                          bgColor = (event.runs >= 6 || (isReBowledExtra && (event.runs - 1) >= 6)) 
                            ? 'bg-purple-600 border-purple-600 shadow-purple-200 text-white shadow-lg' 
                            : 'bg-green-600 border-green-600 shadow-green-200 text-white shadow-lg';
                        } else if (event.isExtra) {
                          bgColor = 'bg-amber-500 border-amber-500 shadow-amber-200 text-white shadow-lg';
                        } else if (event.runs === 0) {
                          bgColor = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm';
                        }

                        let label: ReactNode = '';
                        if (event.isWicket) {
                          label = displayRuns > 0 ? `W+${displayRuns}` : 'W';
                        } else if (event.type === 'wide') {
                          label = displayRuns > 0 ? `wd+${displayRuns}` : 'Wd';
                        } else if (event.type === 'noball') {
                          label = displayRuns > 0 ? `NB+${displayRuns}` : 'Nb';
                        } else if (isBulk && event.runs === 0) {
                          label = (
                            <div className="flex flex-col items-center justify-center leading-[0.8] py-0.5">
                              <span className="text-[12px] md:text-[14px] font-black">{event.bulkBalls || 6}</span>
                              <span className="text-[7px] md:text-[8px] font-bold opacity-70">DOT</span>
                            </div>
                          );
                        } else {
                          label = event.runs.toString();
                        }

                        return (
                          <motion.div 
                            key={`event-${i}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`p-0.5 rounded-lg flex items-center justify-center border-2 transition-all duration-300 shrink-0 dark:shadow-none overflow-hidden ${bgColor}`}
                          >
                            <BallNumberWordLogo
                              value={event.isWicket ? 'W' : event.runs}
                              label={typeof label === 'string' ? label : undefined}
                              isWicket={event.isWicket}
                              isExtra={event.isExtra}
                              size="xs"
                            />
                          </motion.div>
                        );
                      })}
                      {Array.from({ length: Math.max(0, ballsPerOver - (ballsInOver === 0 && match.balls > 0 ? ballsPerOver : ballsInOver)) }).map((_, i) => (
                        <div 
                          key={`empty-${i}`}
                          className={cn(
                            "relative w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-[16px] md:text-[18px] font-black border-2 transition-all duration-500 shrink-0",
                            (i === 0 && isFreeHit) 
                              ? "border-orange-500 bg-orange-500/10 dark:bg-orange-900/20 shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-300"
                          )}
                        >
                          {i === 0 && isFreeHit && (
                            <motion.div 
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: 1,
                              }}
                              transition={{ repeat: Infinity, duration: 1 }}
                              className="flex items-center justify-center text-orange-500"
                            >
                               <Flame size={14} className="md:w-5 md:h-5" fill="currentColor" />
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>

                    <AnimatePresence>
                      {isHistoryExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden mt-2"
                        >
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">{t.history}</h3>
                              <span className="text-[10px] text-slate-400 font-bold">{match.history.length} {t.balls}</span>
                            </div>
                            <ScrollArea className="h-40 md:h-60 w-full">
                              <div className="space-y-1 pr-3">
                                {match.history.length === 0 ? (
                                  <div className="text-center py-8 text-slate-400 text-xs italic">{t.awaiting}</div>
                                ) : (
                                  match.history.map((event, idx) => {
                                    const isReBowledExtra = event.type === 'wide' || event.type === 'noball';
                                    const isBulk = event.type === 'bulk_over';
                                    const eventOvers = Math.floor((event.totalBallsAtEvent - (isReBowledExtra || isBulk ? 0 : 1)) / ballsPerOver);
                                    const eventBalls = (event.totalBallsAtEvent - (isReBowledExtra || isBulk ? 0 : 1)) % ballsPerOver;
                                    
                                    return (
                                      <div 
                                        key={`hist-${event.timestamp}-${idx}`}
                                        className={cn(
                                          "flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 group",
                                          isBulk && "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30"
                                        )}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="text-[10px] font-mono font-black text-slate-400 w-8">{isBulk ? `${eventOvers}.0` : `${eventOvers}.${eventBalls + 1}`}</div>
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span className={`text-xs font-black ${
                                                event.isWicket ? 'text-red-600' : 
                                                event.runs >= 6 ? 'text-purple-600' :
                                                event.runs >= 4 ? 'text-green-600' : 
                                                isBulk ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'
                                              }`}>
                                                {isBulk ? (
                                                   <span className="flex items-center gap-1.5 leading-none">
                                                     <Hash size={12} />
                                                     {lang === 'bn' ? 'ওভার সামারি' : 'Over Summary'}: {event.runs}R {event.isWicket ? (event.wicketType || 'W') : (event.runs === 0 ? (
                                                       <Badge variant="outline" className="h-4 p-0 px-1 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center overflow-hidden rounded-sm ml-1 text-[8px]">
                                                          <span className="border-r border-emerald-500/20 pr-1 mr-1">{event.bulkBalls || 6}</span>
                                                          <span>DOT</span>
                                                       </Badge>
                                                     ) : '')}
                                                   </span>
                                                ) : (
                                                  <>
                                                    {event.isWicket ? (event.wicketType || 'WICKET') : `${event.runs} ${t.runs}`}
                                                    {event.isWicket && event.runs > 0 && ` (+${event.runs})`}
                                                  </>
                                                )}
                                              </span>
                                              {event.wasFreeHit && (
                                                <Badge className="h-4 px-1 text-[8px] bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 font-black">
                                                  FH
                                                </Badge>
                                              )}
                                              {event.isExtra && (
                                                <Badge className="h-4 text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-none uppercase">
                                                  {event.isWide ? 'WD' : event.isNoBall ? 'NB' : event.isBye ? 'BYE' : event.isLegBye ? 'LB' : event.type}
                                                </Badge>
                                              )}
                                            </div>
                                            <span className="text-[8px] text-slate-400 font-medium">
                                              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                          </div>
                                        </div>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                          onClick={() => undoLast(idx + 1)}
                                          title={t.undoFromHere}
                                        >
                                          <Undo2 size={14} />
                                        </Button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}



        {/* Action Controls Section */}
        <div className={cn(
          "transition-all duration-300 mt-0",
          lockedSections.controls && !isFocusMode && "sticky bottom-0 z-50 shadow-[0_-10px_30px_rgb(0,0,0,0.1)]",
          isFocusMode && "flex-1 flex flex-col justify-center"
        )}>
          <Card className={cn(
            "rounded-none md:rounded-b-3xl border-none overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300",
            lockedSections.controls && !isFocusMode && "rounded-none",
            isFocusMode && "bg-transparent dark:bg-transparent"
          )}>
            {!isFocusMode && (
              <div className="flex justify-center -mt-3 relative z-50 mb-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-6 px-3 rounded-full border-2 text-[10px] font-black uppercase tracking-widest shadow-sm",
                    lockedSections.controls ? "bg-indigo-500 text-white border-indigo-400" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                  onClick={() => toggleLock('controls')}
                >
                  <Pin size={10} className={cn("mr-1", lockedSections.controls ? "rotate-45" : "")} />
                  {lockedSections.controls ? t.unlock : t.lock}
                </Button>
              </div>
            )}
            <CardContent className={cn("p-2", isFocusMode ? "bg-transparent" : "bg-slate-50 dark:bg-slate-900")}>
              {isUpcomingMatch ? (
                <div className="py-2">
                  <MatchCountdownHero 
                    startTime={match.matchStartTime}
                    isoTime={match.matchStartTimeIso}
                    statusText={match.liveStatusText}
                    lang={lang}
                    overs={overs}
                    ballsInOver={ballsInOver}
                    ballsPerOver={ballsPerOver}
                    totalBalls={match.balls}
                    maxOvers={match.maxOvers || 20}
                    format={match.format}
                    target={match.target}
                    score={match.score}
                    wickets={match.wickets}
                    onStartMatchNow={() => {
                      setMatch(prev => ({
                        ...prev,
                        isUpcoming: false,
                        liveStatusText: lang === 'bn' ? 'ম্যাচ শুরু হয়েছে' : 'Match Started'
                      }));
                      toast.success(lang === 'bn' ? 'ম্যাচ শুরু করা হয়েছে! স্কোর ইনপুট দিতে পারেন।' : 'Match started! You can now score.');
                    }}
                    onEditStartTime={() => setIsStartTimeEditorOpen(true)}
                    onOpenSyncModal={() => setIsLiveMatchModalOpen(true)}
                    onEditTargetOver={() => {
                      setTargetManagerInitialFocus('over');
                      setIsTargetManagerOpen(true);
                    }}
                    onEditTargetRuns={() => {
                      setTargetManagerInitialFocus('target');
                      setIsTargetManagerOpen(true);
                    }}
                    onOpenTargetManager={() => {
                      setTargetManagerInitialFocus('multiple');
                      setIsTargetManagerOpen(true);
                    }}
                  />
                </div>
              ) : match.liveMatchUrl && match.liveMatchUrl.trim() !== '' ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-emerald-500/30 shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
                  <div className="w-full rounded-2xl p-4 border border-emerald-500/20 shadow-inner flex flex-col gap-3.5 bg-slate-900 text-white">
                    {/* Top Row: Pulsing Indicator, Text & Sync Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-2xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <span className="relative flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                            {lang === 'bn' ? 'ম্যাচ লিংক থেকে লাইভ স্কোর যুক্ত হচ্ছে' : 'Live Score Syncing from Match Link'}
                          </span>
                          <span className="text-[12px] font-mono font-bold truncate max-w-[260px] sm:max-w-md text-slate-300">
                            {match.liveStatusText || match.liveMatchUrl}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setIsLiveMatchModalOpen(true)}
                          className="text-xs font-bold border-slate-700 bg-slate-800 text-white hover:bg-slate-700 h-8 rounded-xl cursor-pointer"
                        >
                          {lang === 'bn' ? 'সিঙ্ক সেটিংস' : 'Sync Settings'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setMatch(prev => ({
                              ...prev,
                              liveMatchUrl: "",
                              liveSyncEnabled: false,
                              liveStatusText: undefined,
                              liveRecentBalls: undefined,
                              liveSyncError: undefined,
                              isUpcoming: undefined,
                              matchStartTime: undefined
                            }));
                            toast.info(lang === 'bn' ? 'লাইভ লিংক বিচ্ছিন্ন করা হয়েছে, ম্যানুয়াল ইনপুট চালু হয়েছে' : 'Live link disconnected, manual input enabled');
                          }}
                          className="text-xs font-bold h-8 rounded-xl cursor-pointer"
                        >
                          {lang === 'bn' ? 'ম্যানুয়াল ইনপুট' : 'Manual Input'}
                        </Button>
                      </div>
                    </div>

                    {/* Prominent Match Stats Strip: টার্গেট ওভার, টার্গেট রান */}
                    <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                      {/* টার্গেট ওভার (Editable on click) */}
                      <div 
                        onClick={() => {
                          setTargetManagerInitialFocus('over');
                          setIsTargetManagerOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-indigo-500/60 hover:bg-slate-800 text-center shadow-inner cursor-pointer transition-all active:scale-95 group"
                        title={lang === 'bn' ? 'টার্গেট ওভার পরিবর্তন করতে ক্লিক করুন' : 'Click to edit target overs'}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-300 flex items-center gap-1">
                          <Target size={11} className="text-indigo-400" />
                          {lang === 'bn' ? 'টার্গেট ওভার' : 'Target Overs'}
                          <Edit3 size={9} className="opacity-70 text-slate-400 group-hover:text-indigo-400 ml-0.5" />
                        </span>
                        <span className="text-base sm:text-xl font-black font-mono text-indigo-400 tracking-tight group-hover:scale-105 transition-transform">
                          {match.format === '100'
                            ? (lang === 'bn' ? '১০০ বল' : '100 Ball')
                            : (lang === 'bn' ? `${toBengaliDigits(match.maxOvers || 20)} ওভার` : `${match.maxOvers || 20} Ov`)}
                        </span>
                        <span className="text-[9px] text-indigo-300/80 font-mono flex items-center gap-0.5">
                          <span>{match.format === '100' ? (lang === 'bn' ? 'দ্য হান্ড্রেড' : '100-Ball') : (match.maxOvers === 20 ? 'T20' : match.maxOvers === 50 ? 'ODI' : `${match.maxOvers} Ov`)}</span>
                          <span className="text-[8px] text-slate-400 underline ml-1">{lang === 'bn' ? 'এডিট' : 'edit'}</span>
                        </span>
                      </div>

                      {/* টার্গেট রান (Editable on click) */}
                      <div 
                        onClick={() => {
                          setTargetManagerInitialFocus('target');
                          setIsTargetManagerOpen(true);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/60 hover:bg-slate-800 text-center shadow-inner cursor-pointer transition-all active:scale-95 group"
                        title={lang === 'bn' ? 'টার্গেট রান পরিবর্তন করতে ক্লিক করুন' : 'Click to edit target runs'}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-amber-300 flex items-center gap-1">
                          <Flag size={11} className="text-amber-400" />
                          {lang === 'bn' ? 'টার্গেট রান' : 'Target Runs'}
                          <Edit3 size={9} className="opacity-70 text-slate-400 group-hover:text-amber-400 ml-0.5" />
                        </span>
                        <span className="text-base sm:text-xl font-black font-mono text-amber-400 tracking-tight group-hover:scale-105 transition-transform">
                          {match.target 
                            ? (lang === 'bn' ? `${toBengaliDigits(match.target)} রান` : `${match.target} runs`)
                            : (lang === 'bn' ? '১ম ইনিংস' : '1st Innings')}
                        </span>
                        <span className="text-[9px] text-amber-300/80 font-mono flex items-center gap-0.5">
                          {match.target 
                            ? (lang === 'bn' 
                                ? `বাকি: ${toBengaliDigits(Math.max(0, match.target - match.score))} রান` 
                                : `Need: ${Math.max(0, match.target - match.score)} runs`)
                            : (lang === 'bn' ? 'লক্ষ্য সেট করুন' : 'Set target')}
                          <span className="text-[8px] text-slate-400 underline ml-1">{lang === 'bn' ? 'এডিট' : 'edit'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Multiple Targets Strip: ৩, ৪ এডিট ও আরও কয়েকটি টার্গেট রান এবং ওভার যুক্ত করার অপশন */}
                    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800">
                      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Target size={11} className="text-cyan-400" />
                          {lang === 'bn' ? 'টার্গেট ওভার ও রানসমূহ:' : 'Target Milestones:'}
                        </span>
                        {(match.targetMilestones || []).length > 0 ? (
                          (match.targetMilestones || []).map((m, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setTargetManagerInitialFocus('multiple');
                                setIsTargetManagerOpen(true);
                              }}
                              className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 hover:border-indigo-500/60 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                              title={lang === 'bn' ? 'টার্গেট পরিবর্তন করতে ক্লিক করুন' : 'Click to edit target'}
                            >
                              <span>{lang === 'bn' ? `${toBengaliDigits(m.over)} ওভ: ${toBengaliDigits(m.runs)} রান` : `${m.over} Ov: ${m.runs} Runs`}</span>
                              <Edit3 size={9} className="opacity-60 text-slate-400" />
                            </button>
                          ))
                        ) : match.target ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetManagerInitialFocus('target');
                              setIsTargetManagerOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{lang === 'bn' ? `${toBengaliDigits(match.maxOvers || 20)} ওভ: ${toBengaliDigits(match.target)} রান` : `${match.maxOvers || 20} Ov: ${match.target} Runs`}</span>
                            <Edit3 size={9} className="opacity-60 text-slate-400" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {lang === 'bn' ? '১ম ইনিংস (টার্গেট যুক্ত করুন)' : '1st Innings (Add target)'}
                          </span>
                        )}
                      </div>

                      {/* Add / Manage Target Button */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTargetManagerInitialFocus('multiple');
                          setIsTargetManagerOpen(true);
                        }}
                        className="h-7 px-2.5 text-[11px] font-bold border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                      >
                        <Plus size={12} className="text-cyan-400" />
                        <span>{lang === 'bn' ? '৩, ৪ এডিট ও আরও টার্গেট যুক্ত' : 'Edit 3, 4 & Add Target'}</span>
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2.5 text-center font-medium">
                    {lang === 'bn' 
                      ? 'ম্যাচ লিংক সংযুক্ত থাকায় ম্যানুয়াল বল ইনপুট কিপ্যাড লুকানো রয়েছে।' 
                      : 'Manual ball input keypad is hidden while match link is connected.'}
                  </p>
                </div>
              ) : (
                <div className={cn(
                  "bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto p-4 md:p-8",
                  isFocusMode ? "p-6 sm:p-10 border-indigo-100 dark:border-indigo-900/30 shadow-indigo-100/50 dark:shadow-none" : ""
                )}>
                  {/* Over & Ball & Format Controller Header */}
                <div className="w-auto max-w-full mx-auto flex items-center justify-center gap-2 sm:gap-3 bg-slate-50/50 dark:bg-slate-900/45 rounded-lg border border-slate-100 dark:border-slate-800/80 p-1 px-3 mb-2.5 shadow-sm">
                  {/* Overs & Balls control */}
                  {editingOversLocation === 'controller' ? (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-lg border border-indigo-500/50 shadow-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase text-indigo-500">{lang === 'bn' ? 'ওভার' : 'OV'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="0"
                            value={overInput}
                            onChange={(e) => setOverInput(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const o = parseInt(overInput) || 0;
                                const b = parseInt(ballInput) || 0;
                                setMatch(prev => ({ ...prev, balls: (o * ballsPerOver) + (b % ballsPerOver) }));
                                setEditingOversLocation(null);
                                setIsMilestoneRotationPaused(false);
                              }
                              if (e.key === 'Escape') {
                                setEditingOversLocation(null);
                                setIsMilestoneRotationPaused(false);
                              }
                            }}
                            className="w-9 text-center text-xs font-mono font-black bg-slate-100 dark:bg-slate-800 rounded px-0.5 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <span className="text-slate-400 font-bold">.</span>
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] font-black uppercase text-emerald-500">{lang === 'bn' ? 'বল' : 'BL'}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="0"
                            max={ballsPerOver - 1}
                            value={ballInput}
                            onChange={(e) => setBallInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const o = parseInt(overInput) || 0;
                                const b = parseInt(ballInput) || 0;
                                setMatch(prev => ({ ...prev, balls: (o * ballsPerOver) + (b % ballsPerOver) }));
                                setEditingOversLocation(null);
                                setIsMilestoneRotationPaused(false);
                              }
                              if (e.key === 'Escape') {
                                setEditingOversLocation(null);
                                setIsMilestoneRotationPaused(false);
                              }
                            }}
                            className="w-9 text-center text-xs font-mono font-black bg-slate-100 dark:bg-slate-800 rounded px-0.5 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const o = parseInt(overInput) || 0;
                            const b = parseInt(ballInput) || 0;
                            setMatch(prev => ({ ...prev, balls: (o * ballsPerOver) + (b % ballsPerOver) }));
                            setEditingOversLocation(null);
                            setIsMilestoneRotationPaused(false);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded p-1 text-[10px] font-bold shrink-0"
                          title={lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOversLocation(null);
                            setIsMilestoneRotationPaused(false);
                          }}
                          className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded p-1 text-[10px] font-bold shrink-0"
                          title={lang === 'bn' ? 'বাতিল' : 'Cancel'}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Overs control */}
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="flex flex-col cursor-pointer group"
                          onClick={() => {
                            setIsMilestoneRotationPaused(true);
                            setEditingOversLocation('controller');
                            setOverInput(Math.floor(match.balls / ballsPerOver).toString());
                            setBallInput((match.balls % ballsPerOver).toString());
                          }}
                          title={lang === 'bn' ? 'সরাসরি এডিট করতে ক্লিক করুন' : 'Click to directly edit'}
                        >
                          <span className="text-[7px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider leading-none mb-0.5 flex items-center gap-0.5 group-hover:text-indigo-400 transition-colors">
                            {lang === 'bn' ? 'ওভার' : 'OVERS'}
                            <Edit3 size={6} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                          </span>
                          <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100 leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {Math.floor(match.balls / ballsPerOver)}
                          </span>
                        </div>
                        <div className={cn("flex flex-col items-center justify-between bg-white dark:bg-slate-950/60 rounded-full border border-slate-200 dark:border-white/10 p-0.5 h-[26px] w-[14px] shrink-0 select-none shadow-sm gap-0.5", ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) && "invisible pointer-events-none")}>
                          <button 
                            onClick={() => handleAdjustOvers(1)} 
                            className="text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer active:scale-125 flex items-center justify-center w-full h-[45%]"
                            title={lang === 'bn' ? 'ওভার বাড়ান' : 'Increase Overs'}
                          >
                            <ChevronUp size={7} className="stroke-[3.5px]" />
                          </button>
                          <button 
                            onClick={() => handleAdjustOvers(-1)} 
                            className="text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer active:scale-125 flex items-center justify-center w-full h-[45%]"
                            title={lang === 'bn' ? 'ওভার কমান' : 'Decrease Overs'}
                          >
                            <ChevronDown size={7} className="stroke-[3.5px]" />
                          </button>
                        </div>
                      </div>

                      <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800" />

                      {/* Balls control */}
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="flex flex-col cursor-pointer group"
                          onClick={() => {
                            setIsMilestoneRotationPaused(true);
                            setEditingOversLocation('controller');
                            setOverInput(Math.floor(match.balls / ballsPerOver).toString());
                            setBallInput((match.balls % ballsPerOver).toString());
                          }}
                          title={lang === 'bn' ? 'সরাসরি এডিট করতে ক্লিক করুন' : 'Click to directly edit'}
                        >
                          <span className="text-[7px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider leading-none mb-0.5 flex items-center gap-0.5 group-hover:text-indigo-400 transition-colors">
                            {lang === 'bn' ? 'বল' : 'BALLS'}
                            <Edit3 size={6} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                          </span>
                          <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100 leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {match.balls % ballsPerOver}
                          </span>
                        </div>
                        <div className={cn("flex flex-col items-center justify-between bg-white dark:bg-slate-950/60 rounded-full border border-slate-200 dark:border-white/10 p-0.5 h-[26px] w-[14px] shrink-0 select-none shadow-sm gap-0.5", ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) && "invisible pointer-events-none")}>
                          <button 
                            onClick={() => handleAdjustBalls(1)} 
                            className="text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer active:scale-125 flex items-center justify-center w-full h-[45%]"
                            title={lang === 'bn' ? 'বল বাড়ান' : 'Increase Balls'}
                          >
                            <ChevronUp size={7} className="stroke-[3.5px]" />
                          </button>
                          <button 
                            onClick={() => handleAdjustBalls(-1)} 
                            className="text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer active:scale-125 flex items-center justify-center w-full h-[45%]"
                            title={lang === 'bn' ? 'বল কমান' : 'Decrease Balls'}
                          >
                            <ChevronDown size={7} className="stroke-[3.5px]" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800" />

                  {/* Format dropdown control */}
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider leading-none mb-0.5">
                        {lang === 'bn' ? 'ফরম্যাট' : 'FORMAT'}
                      </span>
                      <div className="relative flex items-center">
                        <select
                          value={match.format || (match.maxOvers === 10 ? '10' : match.maxOvers === 50 ? '50' : '20')}
                          onChange={(e) => handleSelectFormat(e.target.value as '20' | '10' | '50' | '100')}
                          className="bg-transparent text-xs font-mono font-black text-slate-800 dark:text-slate-100 leading-none pr-3 outline-none cursor-pointer appearance-none border-none focus:ring-0 p-0"
                        >
                          <option value="20" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {lang === 'bn' ? '২০ ওভার' : '20 Overs'}
                          </option>
                          <option value="10" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {lang === 'bn' ? '১০ ওভার' : '10 Overs'}
                          </option>
                          <option value="50" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {lang === 'bn' ? '৫০ ওভার' : '50 Overs'}
                          </option>
                          <option value="100" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {lang === 'bn' ? '১০০ বল' : '100 Balls'}
                          </option>
                        </select>
                        <ChevronDown size={10} className="absolute right-0 pointer-events-none text-indigo-500 dark:text-indigo-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ball Input Buttons Grid */}
                <div className={cn(
                  "grid grid-cols-4 gap-3 md:gap-6 w-full animate-in fade-in duration-200", 
                  isFocusMode && "gap-4 sm:gap-8"
                )}>
                    {controllerView === 'main' ? (
                      <>
                        {[0, 1, 2].map((run) => (
                          <motion.button
                            key={`run-${run}`}
                            whileHover={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 1.12 } : {}}
                            whileTap={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 0.92 } : {}}
                            onClick={() => handleBall(run)}
                            disabled={(match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))}
                            className={cn(
                              "rounded-full p-0 border-none transition-transform shadow-md overflow-hidden bg-transparent focus:outline-none shrink-0",
                              ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) && "invisible pointer-events-none",
                              isFocusMode ? "w-[72px] h-[72px] sm:w-24 sm:h-24" : "w-[67px] h-[67px] md:w-[83px] md:h-[83px]"
                            )}
                          >
                            <BallNumberWordLogo value={run} isCircle={true} className="w-full h-full" />
                          </motion.button>
                        ))}
                        
                        {/* Undo Button in Row 1 */}
                        <motion.button
                          key="undo-btn-main"
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => undoLast()}
                          className={cn(
                            "rounded-full border-2 border-slate-700 bg-slate-900 text-slate-100 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 flex items-center justify-center font-black transition-colors hover:bg-slate-800 shadow-md shrink-0",
                            isFocusMode ? "w-[72px] h-[72px] sm:w-24 sm:h-24 text-2xl sm:text-3xl" : "w-[67px] h-[67px] md:w-[83px] md:h-[83px] text-xl md:text-2xl"
                          )}
                        >
                          <Undo2 size={isFocusMode ? 32 : 28} />
                        </motion.button>
       
                        {[4, 6].map((run) => (
                          <motion.button
                            key={`run-${run}`}
                            whileHover={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 1.12 } : {}}
                            whileTap={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 0.92 } : {}}
                            onClick={() => handleBall(run)}
                            disabled={(match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))}
                            className={cn(
                              "rounded-full p-0 border-none transition-transform shadow-md overflow-hidden bg-transparent focus:outline-none shrink-0",
                              ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) && "invisible pointer-events-none",
                              isFocusMode ? "w-[72px] h-[72px] sm:w-24 sm:h-24" : "w-[67px] h-[67px] md:w-[83px] md:h-[83px]"
                            )}
                          >
                            <BallNumberWordLogo value={run} isCircle={true} className="w-full h-full" />
                          </motion.button>
                        ))}
                        
                        <motion.button
                          key="wicket-btn"
                          whileHover={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 1.12 } : {}}
                          whileTap={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 0.92 } : {}}
                          onClick={handleWicketBtnClick}
                          disabled={(match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))}
                          className={cn(
                            "rounded-full border-2 border-red-500 bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center font-black transition-colors hover:from-red-500 hover:to-red-700 shadow-md shrink-0",
                            ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) && "invisible pointer-events-none",
                            isFocusMode ? "w-[72px] h-[72px] sm:w-24 sm:h-24" : "w-[67px] h-[67px] md:w-[83px] md:h-[83px]"
                          )}
                        >
                          <UserMinus size={isFocusMode ? 32 : 28} />
                        </motion.button>
                        <motion.button
                          key="more-btn"
                          whileHover={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 1.12 } : {}}
                          whileTap={!((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) ? { scale: 0.92 } : {}}
                          onClick={() => {
                            if ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) return;
                            setControllerView('more');
                          }}
                          disabled={(match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))}
                          className={cn(
                            "rounded-full border-2 border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black transition-colors hover:from-emerald-500 hover:to-teal-700 shadow-md shrink-0",
                            ((match.wickets >= (match.maxWickets || 10)) || (match.balls >= ((match.maxOvers || 20) * ballsPerOver))) && "invisible pointer-events-none",
                            isFocusMode ? "w-[72px] h-[72px] sm:w-24 sm:h-24" : "w-[67px] h-[67px] md:w-[83px] md:h-[83px]"
                          )}
                        >
                          <MoreHorizontal size={isFocusMode ? 32 : 28} />
                        </motion.button>
                      </>
                    ) : controllerView === 'wicket' ? (
                      <div className="col-span-4 grid grid-cols-4 gap-2 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         {Object.entries(t.wicketTypes as Record<string, string>).map(([key, label], idx) => {
                            let Icon = UserMinus;
                            if (key === 'bowled') Icon = Zap;
                            if (key === 'caught') Icon = Hand;
                            if (key === 'caughtAndBowled') Icon = Hand;
                            if (key === 'lbw') Icon = Footprints;
                            if (key === 'runOut') Icon = MoveRight;
                            if (key === 'stumped') Icon = Swords;
                            if (key === 'hitWicket') Icon = Hammer;
                            if (key === 'others') Icon = MoreHorizontal;

                            return (
                              <motion.button
                                  key={key}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: idx * 0.03 }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => {
                                    if (key === 'runOut') setControllerView('runOutRuns');
                                    else {
                                      handleBall(0, label);
                                    }
                                  }}
                                  className="h-[67px] md:h-[83px] rounded-2xl bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800/30 flex flex-col items-center justify-center gap-1 p-1 shadow-sm transition-all hover:bg-red-100/50"
                              >
                                  <Icon size={16} className="text-red-500" />
                                  <span className="text-[9px] md:text-[10px] font-black uppercase text-red-700 dark:text-red-400 text-center leading-tight tracking-tighter">{label}</span>
                              </motion.button>
                            );
                         })}
                         <motion.button
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => setControllerView('main')}
                           className="h-[67px] md:h-[83px] rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 shadow-sm"
                         >
                            <ChevronLeft className="text-slate-500" size={18} />
                            <span className="text-[9px] font-black uppercase text-slate-500">{t.back || 'Back'}</span>
                         </motion.button>
                      </div>
                    ) : controllerView === 'more' ? (
                      <div className="col-span-4 grid grid-cols-4 gap-2 md:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-green-200 dark:border-green-800/30 flex flex-col gap-0.5" onClick={() => { toggleExtra('wide'); setControllerView('main'); }}>
                           <span className="text-xs font-black text-green-600">WD</span>
                           <span className="text-[8px] opacity-60">WIDE</span>
                         </Button>
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-green-200 dark:border-green-800/30 flex flex-col gap-0.5" onClick={() => { toggleExtra('noBall'); setControllerView('main'); }}>
                           <span className="text-xs font-black text-green-600">NB</span>
                           <span className="text-[8px] opacity-60">NO BALL</span>
                         </Button>
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/30 flex flex-col gap-0.5" onClick={() => { toggleExtra('byes'); setControllerView('main'); }}>
                           <span className="text-xs font-black text-indigo-600">BYE</span>
                           <span className="text-[8px] opacity-60">BYES</span>
                         </Button>
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/30 flex flex-col gap-0.5" onClick={() => { toggleExtra('legByes'); setControllerView('main'); }}>
                           <span className="text-xs font-black text-indigo-600">LB</span>
                           <span className="text-[8px] opacity-60">LEG BYE</span>
                         </Button>
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-slate-200 dark:border-slate-800/30 text-lg font-black" onClick={() => { handleBall(3); }}>3</Button>
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-slate-200 dark:border-slate-800/30 text-lg font-black" onClick={() => { handleBall(5); }}>5</Button>
                         <Button variant="outline" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-red-200 dark:border-red-800/30 flex flex-col gap-0.5" onClick={() => { handlePenalty(); setControllerView('main'); }}>
                           <span className="text-red-600 font-black text-sm">-5</span>
                           <span className="text-[8px] font-bold text-red-500 uppercase leading-none">{t.penaltyRun}</span>
                         </Button>
                         <Button variant="ghost" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1" onClick={() => setControllerView('main')}>
                           <ChevronLeft size={18} className="text-slate-400" />
                           <span className="text-[9px] font-black uppercase text-slate-400">{t.back || 'Back'}</span>
                         </Button>
                      </div>
                    ) : controllerView === 'runOutRuns' ? (
                      <div className="col-span-4 grid grid-cols-5 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <p className="col-span-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.runs} ({t.wicketTypes.runOut})</p>
                         {[0, 1, 2, 3].map(r => (
                           <Button key={r} variant="destructive" className="h-[67px] md:h-[83px] rounded-2xl text-xl font-black bg-red-600 hover:bg-red-700 shadow-md" onClick={() => { handleBall(r, t.wicketTypes.runOut); }}>{r}</Button>
                         ))}
                         <Button variant="ghost" className="h-[67px] md:h-[83px] rounded-2xl border-2 border-dashed border-slate-200" onClick={() => setControllerView('wicket')}><ChevronLeft /></Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

                <AnimatePresence>
                  {isMoreMenuOpen && isBulkInputOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsWicketSubMenuOpen(false);
                        setIsBulkInputOpen(false);
                        setControllerView('main');
                      }}
                    >
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                              {t.bulkOverInput}
                            </h3>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setIsMoreMenuOpen(false);
                                setIsBulkInputOpen(false);
                                setControllerView('main');
                              }}
                            >
                              <X size={24} />
                            </Button>
                          </div>

                          <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                                  <Hash size={12} />
                                  {lang === 'bn' ? `ওভার ${Math.floor(match.balls / ballsPerOver) + 1}` : `Over ${Math.floor(match.balls / ballsPerOver) + 1}`}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {isBallByBallMode ? (lang === 'bn' ? 'ম্যানুয়াল ইনপুট' : 'Manual Entry') : (lang === 'bn' ? 'অটোমেটিক সামারি' : 'Auto Summary')}
                              </span>
                            </div>

                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-2">
                              <button 
                                className={cn(
                                  "flex-1 py-1.5 text-[11px] font-black uppercase rounded-lg transition-all",
                                  !isBallByBallMode ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600" : "text-slate-500"
                                )}
                                onClick={() => setIsBallByBallMode(false)}
                              >
                                {lang === 'bn' ? 'সাধারণ' : 'Summary'}
                              </button>
                              <button 
                                className={cn(
                                  "flex-1 py-1.5 text-[11px] font-black uppercase rounded-lg transition-all",
                                  isBallByBallMode ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600" : "text-slate-500"
                                )}
                                onClick={() => setIsBallByBallMode(true)}
                              >
                                {lang === 'bn' ? 'বল বাই বল' : 'Ball by Ball'}
                              </button>
                            </div>

                            {!isBallByBallMode ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                                    <Hash size={14} className="text-amber-500" />
                                    {lang === 'bn' ? 'বল সংখ্যা' : 'No. of Balls'}
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-12 w-10 shrink-0"
                                      onClick={() => setBulkBalls(prev => Math.max(1, (parseInt(prev) || 0) - 1).toString())}
                                    >
                                      <ChevronDown size={18} />
                                    </Button>
                                    <Input 
                                      type="number"
                                      value={bulkBalls}
                                      onChange={(e) => setBulkBalls(e.target.value)}
                                      placeholder={ballsPerOver.toString()}
                                      className="h-12 text-center text-lg font-bold"
                                    />
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      className="h-12 w-10 shrink-0"
                                      onClick={() => setBulkBalls(prev => ((parseInt(prev) || 0) + 1).toString())}
                                    >
                                      <ChevronUp size={18} />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-6 gap-1.5 mt-2">
                                    {[1, ballsPerOver, ballsPerOver * 2, ballsPerOver * 3, ballsPerOver * 4, ballsPerOver * 5].map((b) => (
                                      <Button 
                                        key={`quick-ball-${b}`}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                          "h-10 text-xs font-black border-slate-100 dark:border-slate-800",
                                          bulkBalls === b.toString() ? "bg-amber-500 border-amber-500 text-white" : "bg-white dark:bg-slate-900 text-slate-500"
                                        )}
                                        onClick={() => setBulkBalls(b.toString())}
                                      >
                                        {b}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                                      <Trophy size={14} className="text-indigo-500" />
                                      {t.runs}
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-12 w-10 shrink-0"
                                        onClick={() => setBulkRuns(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString())}
                                      >
                                        <ChevronDown size={18} />
                                      </Button>
                                      <Input 
                                        type="number"
                                        value={bulkRuns}
                                        onChange={(e) => setBulkRuns(e.target.value)}
                                        placeholder="0"
                                        className="h-12 text-center text-lg font-bold"
                                      />
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-12 w-10 shrink-0"
                                        onClick={() => setBulkRuns(prev => ((parseInt(prev) || 0) + 1).toString())}
                                      >
                                        <ChevronUp size={18} />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-2">
                                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((r) => (
                                        <Button 
                                          key={`quick-run-${r}`}
                                          variant="outline"
                                          size="sm"
                                          className={cn(
                                            "h-10 text-lg font-black border-slate-100 dark:border-slate-800",
                                            bulkRuns === r.toString() ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500"
                                          )}
                                          onClick={() => setBulkRuns(r.toString())}
                                        >
                                          {r}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                                      <UserMinus size={14} className="text-red-500" />
                                      {t.out}
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-12 w-10 shrink-0"
                                        onClick={() => setBulkWickets(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString())}
                                      >
                                        <ChevronDown size={18} />
                                      </Button>
                                      <Input 
                                        type="number"
                                        value={bulkWickets}
                                        onChange={(e) => setBulkWickets(e.target.value)}
                                        placeholder="0"
                                        className="h-12 text-center text-lg font-bold"
                                      />
                                      <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-12 w-10 shrink-0"
                                        onClick={() => setBulkWickets(prev => Math.max(0, Math.min(10 - match.wickets, (parseInt(prev) || 0) + 1)).toString())}
                                      >
                                        <ChevronUp size={18} />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                                      {[0, 1, 2, 3, 4, 5, 6].map((w) => (
                                        <Button 
                                          key={`quick-wicket-${w}`}
                                          variant="outline"
                                          size="sm"
                                          className={cn(
                                            "h-10 text-lg font-black border-slate-100 dark:border-slate-800",
                                            bulkWickets === w.toString() ? "bg-red-600 border-red-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500"
                                          )}
                                          onClick={() => setBulkWickets(w.toString())}
                                        >
                                          {w}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 pt-1 scrollbar-none">
                                    {interactiveOverBalls.map((val, idx) => (
                                      <button
                                        key={idx}
                                        className={cn(
                                          "w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-base font-black transition-all border-2",
                                          activeBallIndex === idx 
                                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 scale-110 shadow-lg" 
                                            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400",
                                          val !== '' && "border-green-500 text-green-600 bg-green-50/30 dark:bg-green-900/10"
                                        )}
                                        onClick={() => {
                                          setActiveBallIndex(idx);
                                          setBallDetailMenu(null);
                                          setBallSubDetail(null);
                                        }}
                                      >
                                        {val === '' ? idx+1 : (
                                          val.toString().startsWith('W:') 
                                            ? val.toString().split(':')[1]
                                            : val
                                        )}
                                      </button>
                                    ))}
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-300 shrink-0"
                                      onClick={() => {
                                        setInteractiveOverBalls([...interactiveOverBalls, '']);
                                      }}
                                    >
                                      <Plus size={14} />
                                    </Button>
                                  </div>

                                  {!ballDetailMenu ? (
                                    <div className="grid grid-cols-4 gap-2">
                                      {[0, 1, 2, 3, 4, 6, 'W', 'WD', 'NB'].map((score) => (
                                        <Button
                                          key={score}
                                          variant="outline"
                                          className={cn(
                                            "h-14 font-black text-2xl shadow-sm border-slate-200 dark:border-slate-700",
                                            score === 'W' ? "text-red-600 border-red-100 dark:border-red-900/20" : 
                                            (score === 'WD' || score === 'NB') ? "text-blue-600 border-blue-100 dark:border-blue-900/20 text-sm" : 
                                            "text-slate-800 dark:text-slate-200"
                                          )}
                                          onClick={() => {
                                            if (score === 'W' || score === 'WD' || score === 'NB') {
                                              setBallDetailMenu(score);
                                              setBallSubDetail(null);
                                            } else {
                                              const newBalls = [...interactiveOverBalls];
                                              newBalls[activeBallIndex] = score;
                                              setInteractiveOverBalls(newBalls);
                                              if (activeBallIndex < interactiveOverBalls.length - 1) {
                                                setActiveBallIndex(activeBallIndex + 1);
                                              }
                                            }
                                          }}
                                        >
                                          {score}
                                        </Button>
                                      ))}
                                      <Button
                                        variant="ghost"
                                        className="h-12 font-bold text-xs text-slate-400 uppercase tracking-wider col-span-1"
                                        onClick={() => {
                                          const newBalls = [...interactiveOverBalls];
                                          newBalls[activeBallIndex] = '';
                                          setInteractiveOverBalls(newBalls);
                                        }}
                                      >
                                        {lang === 'bn' ? 'মুছুন' : 'Clear'}
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                                      <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                                          {ballSubDetail === 'RunOut_Runs' ? (lang === 'bn' ? 'রান আউট + রান' : 'Run Out + Runs') :
                                           ballSubDetail === 'WD_Wicket' ? (lang === 'bn' ? 'ওয়াইড + উইকেট' : 'Wide + Wicket') :
                                           ballSubDetail === 'NB_Wicket' ? (lang === 'bn' ? 'নো-বল + উইকেট' : 'No Ball + Wicket') :
                                           ballDetailMenu === 'W' ? (lang === 'bn' ? 'উইকেটের ধরণ' : 'Wicket Type') : 
                                           ballDetailMenu === 'WD' ? (lang === 'bn' ? 'ওয়াইড + রান' : 'Wide + Runs') : 
                                           (lang === 'bn' ? 'নো-বল + রান' : 'No Ball + Runs')}
                                        </span>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 text-slate-400"
                                          onClick={() => {
                                            if (ballSubDetail) setBallSubDetail(null);
                                            else setBallDetailMenu(null);
                                          }}
                                        >
                                          <X size={14} />
                                        </Button>
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-2">
                                        {ballSubDetail === 'RunOut_Runs' || ballSubDetail === 'WD_Wicket' || ballSubDetail === 'NB_Wicket' ? (
                                          [0, 1, 2, 3, 4, 6].map(runs => (
                                            <Button
                                              key={runs}
                                              variant="outline"
                                              className="h-10 text-xs font-black border-slate-200"
                                              onClick={() => {
                                                const newBalls = [...interactiveOverBalls];
                                                if (ballSubDetail === 'RunOut_Runs') {
                                                  newBalls[activeBallIndex] = `W:RunOut:R:${runs}`;
                                                } else {
                                                  const type = ballSubDetail.split('_')[0]; // WD or NB
                                                  newBalls[activeBallIndex] = `${type}${runs}W`;
                                                  newBalls.push(''); // Extras don't count, add new legal ball field
                                                }
                                                setInteractiveOverBalls(newBalls);
                                                setBallDetailMenu(null);
                                                setBallSubDetail(null);
                                                if (activeBallIndex < newBalls.length - 1) {
                                                  setActiveBallIndex(activeBallIndex + 1);
                                                }
                                              }}
                                            >
                                              {runs} {lang === 'bn' ? 'রান' : 'Runs'}
                                            </Button>
                                          ))
                                        ) : ballDetailMenu === 'W' ? (
                                          Object.entries(t.wicketTypes as Record<string, string>).map(([key, label]) => (
                                            <Button
                                              key={key}
                                              variant="outline"
                                              className="h-10 text-[10px] font-bold border-slate-200 py-1"
                                              onClick={() => {
                                                if (key === 'runOut') {
                                                  setBallSubDetail('RunOut_Runs');
                                                } else {
                                                  const newBalls = [...interactiveOverBalls];
                                                  newBalls[activeBallIndex] = `W:${label}`;
                                                  setInteractiveOverBalls(newBalls);
                                                  setBallDetailMenu(null);
                                                  if (activeBallIndex < interactiveOverBalls.length - 1) {
                                                    setActiveBallIndex(activeBallIndex + 1);
                                                  }
                                                }
                                              }}
                                            >
                                              {label}
                                            </Button>
                                          ))
                                        ) : (
                                          <>
                                            {[0, 1, 2, 3, 4, 6].map(runs => (
                                              <Button
                                                key={runs}
                                                variant="outline"
                                                className="h-10 text-xs font-black border-slate-200"
                                                onClick={() => {
                                                  const newBalls = [...interactiveOverBalls];
                                                  newBalls[activeBallIndex] = `${ballDetailMenu}${runs}`;
                                                  newBalls.push('');
                                                  setInteractiveOverBalls(newBalls);
                                                  setBallDetailMenu(null);
                                                  if (activeBallIndex < newBalls.length - 1) {
                                                    setActiveBallIndex(activeBallIndex + 1);
                                                  }
                                                }}
                                              >
                                                {ballDetailMenu}+{runs}
                                              </Button>
                                            ))}
                                            <Button
                                              variant="outline"
                                              className="h-10 text-[10px] font-black border-red-200 text-red-600 bg-red-50 dark:bg-red-900/10"
                                              onClick={() => {
                                                setBallSubDetail(`${ballDetailMenu}_Wicket`);
                                              }}
                                            >
                                              + {lang === 'bn' ? 'উইকেট' : 'Wicket'}
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                                    {lang === 'bn' ? 'ড্যাশবোর্ডের মতো প্রতিটি বলের স্কোর সিলেক্ট করুন' : 'Select ball outcome'}
                                  </p>
                                </div>
                              )}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                className="h-12 font-bold"
                                onClick={() => {
                                  setIsBulkInputOpen(false);
                                  setIsMoreMenuOpen(false);
                                  setControllerView('main');
                                }}
                              >
                                {t.cancel}
                              </Button>
                              <Button 
                                variant="default" 
                                className="h-12 font-bold bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleBulkOver}
                              >
                                {t.addOver}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

          </div>
          )}
        </div>

        {/* Bottom Administrative Tray - Styled as Mobile Tab Bar */}
        <div className="z-[110] px-2 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-around shrink-0 overflow-x-auto no-scrollbar gap-1">
           {/* Home Button */}
           <button 
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px]"
             onClick={goHome}
             title={lang === 'bn' ? 'হোম ড্যাশবোর্ড' : 'Home Dashboard'}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100">
               <Home size={19} />
             </div>
             <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-tighter">{lang === 'bn' ? 'হোম' : 'Home'}</span>
           </button>

           {/* Tournament Folders */}
           <button 
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px]"
             onClick={() => {
               goHome();
               setIsShowingTournaments(true);
             }}
             title={lang === 'bn' ? 'টুর্নামেন্ট ফোল্ডার' : 'Tournament Folders'}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
               <Folder size={18} />
             </div>
             <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-tighter">{lang === 'bn' ? 'ফোল্ডার' : 'Folders'}</span>
           </button>

           {/* Google Calendar */}
           <button 
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px]"
             onClick={() => setIsGoogleCalendarModalOpen(true)}
             title={lang === 'bn' ? 'গুগল ক্যালেন্ডার' : 'Google Calendar'}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
               <Calendar size={18} />
             </div>
             <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-tighter">{lang === 'bn' ? 'ক্যালেন্ডার' : 'Calendar'}</span>
           </button>

           {/* Reset Score */}
           <button 
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px]"
             onClick={resetMatch}
             title={lang === 'bn' ? 'স্কোর রিসেট' : 'Reset Score'}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100">
               <RotateCcw size={18} />
             </div>
             <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-tighter">{lang === 'bn' ? 'রিসেট' : 'Reset'}</span>
           </button>

           {/* Matches */}
           <button 
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px]"
             onClick={() => setIsShowingMatches(true)}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600">
               <Trophy size={18} />
             </div>
             <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-tighter">{t.matches}</span>
           </button>

           {/* Bulk Over */}
           <button 
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px]"
             onClick={() => {
                setIsMoreMenuOpen(true);
                setIsBulkInputOpen(true);
             }}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600">
               <Hash size={18} />
             </div>
             <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-tighter">{lang === 'bn' ? 'বাল্ক' : 'Bulk'}</span>
           </button>

           {/* Google Search Button (Replaces bottom-right Admin button) */}
           <button 
             type="button"
             className="flex flex-col items-center gap-1 group shrink-0 min-w-[48px] cursor-pointer"
             onClick={() => setIsGoogleSearchModalOpen(true)}
             title={lang === 'bn' ? 'গুগল সার্চ ও ক্রিকেট তথ্য' : 'Google Search & Cricket Hub'}
           >
             <div className="p-2 rounded-xl group-active:scale-95 transition-transform bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:ring-2 group-hover:ring-blue-400/40 border border-blue-100 dark:border-blue-900/50 shadow-2xs">
               <Search size={18} className="group-hover:scale-110 transition-transform" />
             </div>
             <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-tighter">
               {lang === 'bn' ? 'গুগল সার্চ' : 'Google'}
             </span>
           </button>
        </div>
      </div>
      
      {/* Full-screen Celebration Overlay (Animations only) */}
      <AnimatePresence>
        {celebration.visible && celebration.showAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-hidden pointer-events-none select-none"
          >
            <motion.div
              initial={celebration.type === 'over' ? { y: '100%', opacity: 0 } : { scale: 0.5, y: 100, rotate: -10 }}
              animate={celebration.type === 'over' ? { y: ['100%', '0%', '0%', '100%'], opacity: [0, 1, 1, 0] } : { scale: 1, y: 0.001, rotate: 0, opacity: 1 }}
              exit={celebration.type === 'over' ? { y: '100%', opacity: 0 } : { scale: 2, opacity: 0 }}
              transition={celebration.type === 'over' 
                ? { duration: 4, times: [0, 0.2, 0.8, 1], ease: "easeInOut" } 
                : { type: "spring", damping: 15 }
              }
              className="relative flex flex-col items-center gap-6"
            >
              {/* Badge for Demo Type */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    celebration.type === 'four' ? 'bg-green-500' :
                    celebration.type === 'six' ? 'bg-purple-500' :
                    celebration.type === 'wicket' ? 'bg-red-500' :
                    celebration.type === 'extra' ? 'bg-amber-500' : 'bg-indigo-500'
                  )} />
                  <div className="flex items-center gap-2">
                    {(celebration.type === 'wicket' || celebration.type === 'dot') ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                           <circle cx="12" cy="12" r="10" />
                           <path d="M12 2a10 10 0 0 0-10 10" />
                           <path d="M22 12a10 10 0 0 1-10 10" />
                        </svg>
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{ rotate: [0, -20, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                          <path d="M18 2L4 16l2 2L20 4z" />
                          <path d="M2 22l4-4" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

              {/* Central Illustration / Demo Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                className={cn(
                  "p-8 rounded-full bg-white/5 border-2 relative",
                  celebration.type === 'four' ? 'border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                  celebration.type === 'six' ? 'border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)]' :
                  celebration.type === 'wicket' ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)]' :
                  'border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.3)]'
                )}
              >
                {celebration.type === 'four' ? (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div 
                      className="filter drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <BallNumberWordLogo value={4} size="hero" animated={true} />
                    </motion.div>
                    <div className="text-xl font-black text-green-400 uppercase tracking-[0.3em]">{t.boundary4}</div>
                  </div>
                ) : celebration.type === 'six' ? (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div 
                      className="filter drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <BallNumberWordLogo value={6} size="hero" animated={true} />
                    </motion.div>
                    <div className="text-xl font-black text-purple-400 uppercase tracking-[0.3em]">{t.boundary6}</div>
                  </div>
                ) : celebration.type === 'wicket' ? (
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* LBW Animation (Umpire Raising Finger) */}
                    {(celebration.wicketType?.toLowerCase().includes('lbw') || celebration.wicketType?.toLowerCase().includes('এলবিডব্লিউ')) ? (
                      <motion.div 
                        className="flex flex-col items-center"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: -10, opacity: 1 }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                      >
                        <div className="w-4 h-12 bg-white rounded-t-full border-2 border-red-500 shadow-lg" />
                        <div className="w-10 h-8 bg-white rounded-b-xl border-x-2 border-b-2 border-red-500 shadow-md -mt-1" />
                      </motion.div>
                    ) : /* Caught Animation (Ball into two hands) */
                    (celebration.wicketType?.toLowerCase().includes('caught') || celebration.wicketType?.toLowerCase().includes('ক্যাচ')) ? (
                      <div className="flex items-center gap-4 relative">
                        <motion.div animate={{ rotate: [-20, -5, -20] }} transition={{ duration: 0.5, repeat: Infinity }}><Hand size={40} className="text-red-400" /></motion.div>
                        <motion.div animate={{ rotate: [20, 5, 20] }} transition={{ duration: 0.5, repeat: Infinity }}><Hand size={40} className="text-red-400 -scale-x-100" /></motion.div>
                        <motion.div 
                          className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg" 
                          animate={{ y: [0, 45, 0], opacity: [0, 1, 0] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "easeIn" }}
                        />
                      </div>
                    ) : /* Bowled/Stumped/RunOut (Stumps Breaking) */
                    (celebration.wicketType?.toLowerCase().includes('bowled') || celebration.wicketType?.toLowerCase().includes('বোল্ড') || 
                     celebration.wicketType?.toLowerCase().includes('stumped') || celebration.wicketType?.toLowerCase().includes('স্টাম্পড') ||
                     celebration.wicketType?.toLowerCase().includes('run out') || celebration.wicketType?.toLowerCase().includes('রান আউট')) ? (
                      <div className="relative flex items-center justify-center pt-8">
                        {/* Crease Line for Run Out */}
                        {(celebration.wicketType?.toLowerCase().includes('run out') || celebration.wicketType?.toLowerCase().includes('রান আউট')) && (
                          <motion.div 
                            className="absolute bottom-0 w-32 h-[2px] bg-white/40" 
                            initial={{ scaleX: 0 }} 
                            animate={{ scaleX: 1 }} 
                          />
                        )}
                        {/* Stumps */}
                        <div className="flex gap-2">
                          {[1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2 h-16 bg-white border border-red-500 rounded-sm"
                              animate={{ 
                                rotate: [0, i === 2 ? 0 : (i === 1 ? -15 : 15), 0],
                                y: [0, i === 2 ? -5 : (i === 1 ? -2 : -2), 0]
                              }}
                              transition={{ duration: 0.4, repeat: Infinity }}
                            />
                          ))}
                        </div>
                        {/* Ball hitting stumps */}
                        <motion.div 
                          className="absolute w-4 h-4 bg-white rounded-full shadow-md z-10"
                          initial={{ x: -100, y: 0 }}
                          animate={{ x: 0, y: 10, opacity: [1, 1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                    ) : (
                      <UserMinus size={64} className="text-red-500" />
                    )}
                  </div>
                ) : celebration.type === 'dot' ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-6xl font-black text-indigo-400">0</div>
                    <div className="text-xs font-black text-indigo-300 uppercase tracking-widest">{t.dotBall}</div>
                  </div>
                ) : celebration.type === 'over' ? (
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] mb-1">{t.overCompleted}</div>
                    <div className="text-5xl font-black text-white mb-2">{celebration.overData?.num}</div>
                    <div className="flex gap-4 items-center border-t border-white/10 pt-2">
                       <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{t.runs}</span>
                          <span className={cn(
                            "text-2xl font-black",
                            celebration.overData?.runs === 0 ? "text-indigo-400" : "text-green-400"
                          )}>
                            {celebration.overData?.runs}
                          </span>
                       </div>
                       <div className="w-[1px] h-8 bg-white/10" />
                       <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{t.wicket}</span>
                          <span className="text-2xl font-black text-red-400">{celebration.overData?.wickets}</span>
                       </div>
                    </div>
                  </div>
                ) : celebration.type === 'extra' ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-7xl font-black text-amber-500">{(celebration.value || 0) + 1}</div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-widest whitespace-nowrap">
                      {celebration.extraType} {celebration.value && celebration.value > 0 ? `+ ${celebration.value}` : ''}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-7xl font-black text-white">{celebration.value}</div>
                    <div className="text-xs font-black text-indigo-300 uppercase tracking-widest">{t.runs}</div>
                  </div>
                )}
                
                {/* Orbital dots */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`orbit-${i}`}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                    className="absolute inset-0"
                  >
                    <div className={cn(
                      "absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                      celebration.type === 'four' ? 'bg-green-400' :
                      celebration.type === 'six' ? 'bg-purple-400' : 
                      celebration.type === 'wicket' ? 'bg-red-400' :
                      celebration.type === 'extra' ? 'bg-amber-400' :
                      'bg-indigo-400'
                    )} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Text Result */}
              <div className="flex flex-col items-center">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    "text-6xl md:text-9xl font-black italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-center bg-clip-text text-transparent bg-gradient-to-b",
                    celebration.type === 'four' ? 'from-green-300 to-green-600' :
                    celebration.type === 'six' ? 'from-purple-300 to-purple-600' : 
                    celebration.type === 'wicket' ? 'from-red-400 to-red-700' :
                    celebration.type === 'over' && celebration.overData?.runs === 0 ? 'from-indigo-300 to-indigo-600' : 'from-slate-200 to-slate-500'
                  )}
                >
                  {celebration.type === 'four' ? t.celebrationFour :
                  celebration.type === 'six' ? t.celebrationSix : 
                  celebration.type === 'wicket' ? t.celebrationWicket :
                  celebration.type === 'over' && celebration.overData?.runs === 0 ? t.maidenOver : ""}
                </motion.div>
                
                {celebration.type === 'wicket' && celebration.wicketType && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 text-white/90 text-2xl md:text-4xl font-black uppercase tracking-widest bg-red-600/20 px-8 py-2 rounded-2xl backdrop-blur-md border border-red-500/30 shadow-lg"
                  >
                    {celebration.wicketType}
                  </motion.div>
                )}
              </div>
              
              {/* Particle Effects (Simulated with multiple dots) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0 }}
                    animate={{ 
                      x: Math.cos(i * 18 * Math.PI / 180) * (200 + Math.random() * 100),
                      y: Math.sin(i * 18 * Math.PI / 180) * (200 + Math.random() * 100),
                      opacity: 0,
                      scale: 0
                    }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    className={cn(
                      "w-2 h-2 rounded-full absolute",
                      celebration.type === 'four' ? 'bg-green-500' :
                      celebration.type === 'six' ? 'bg-purple-500' : 'bg-red-500'
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Score Edit Modal */}
      {/* Match Schedule Modal */}
      <AnimatePresence>
        {isShowingSchedule && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => {
              if (editingEventId) {
                setEditingEventId(null);
                setTempEvent({});
              } else {
                setIsShowingSchedule(false);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border-2 border-indigo-500/20 max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.matchSchedule}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{schedule.length} {lang === 'bn' ? 'ম্যাচ তালিকাভুক্ত' : 'Matches Scheduled'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/30 hover:bg-indigo-100"
                    onClick={() => setIsGoogleCalendarModalOpen(true)}
                  >
                    <Calendar size={14} />
                    <span>{lang === 'bn' ? 'ক্যালেন্ডার সিঙ্ক' : 'Calendar Sync'}</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsShowingSchedule(false)}>
                    <X size={24} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {(editingEventId || Object.keys(tempEvent).length > 0) ? (() => {
                  const currentTourn = tournaments.find(t => t.id === tempEvent.tournamentId || t.name === tempEvent.group);
                  const folderTeams = currentTourn ? currentTourn.teams : [];

                  return (
                    <div className="space-y-4 p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50">
                      <div className="flex items-center justify-between mb-2">
                         <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">
                           {editingEventId ? t.editEvent : (tempEvent.isCopy ? t.copyEvent : t.addEvent)}
                         </h4>
                         <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-red-500" onClick={() => { setEditingEventId(null); setTempEvent({}); }}>{t.cancel}</Button>
                      </div>

                      {/* 1. Tournament Folder Selection (Top) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                          <Folder size={12} className="text-amber-500" />
                          {lang === 'bn' ? 'টুর্নামেন্ট ফোল্ডার নির্বাচন করুন:' : 'Select Tournament Folder:'}
                        </label>
                        <select
                          value={tempEvent.tournamentId || ''}
                          onChange={e => {
                            const selectedId = e.target.value;
                            const selectedTourn = tournaments.find(t => t.id === selectedId);
                            setTempEvent(prev => ({
                              ...prev,
                              tournamentId: selectedId,
                              group: selectedTourn ? selectedTourn.name : prev.group,
                              team1: selectedTourn?.teams[0] || '',
                              team2: selectedTourn?.teams[1] || ''
                            }));
                          }}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-bold h-11 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-100"
                        >
                          <option value="">{lang === 'bn' ? '-- টুর্নামেন্ট ফোল্ডার বেছে নিন --' : '-- Choose Tournament Folder --'}</option>
                          {tournaments.map(t => (
                            <option key={t.id} value={t.id}>📂 {t.name} ({t.teams.length} {lang === 'bn' ? 'টিম' : 'teams'})</option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Team 1 (Team A) & Team 2 (Team B) selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{lang === 'bn' ? 'টিম এ (টিম ১)' : 'Team A (Team 1)'}</label>
                          {folderTeams.length > 0 ? (
                            <select
                              value={tempEvent.team1 || ""}
                              onChange={e => {
                                const val = e.target.value;
                                setTempEvent(prev => ({ 
                                  ...prev, 
                                  team1: val,
                                  team2: prev.team2 === val ? (folderTeams.find(t => t !== val) || '') : prev.team2
                                }));
                              }}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-bold h-11 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-100"
                            >
                              <option value="">{lang === 'bn' ? '-- টিম এ নির্বাচন করুন --' : '-- Select Team A --'}</option>
                              {folderTeams.map((tName, idx) => (
                                <option key={`t1-${idx}`} value={tName}>{tName}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="relative">
                              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <Input 
                                value={tempEvent.team1 || ""} 
                                onChange={e => setTempEvent(prev => ({ ...prev, team1: e.target.value }))}
                                className="bg-white dark:bg-slate-800 border-none pl-9 font-bold h-11 rounded-xl"
                                placeholder={lang === 'bn' ? 'প্রথমে ফোল্ডার সিলেক্ট করুন' : 'Select folder first'}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{lang === 'bn' ? 'টিম বি (টিম ২)' : 'Team B (Team 2)'}</label>
                          {folderTeams.length > 0 ? (
                            <select
                              value={tempEvent.team2 || ""}
                              onChange={e => setTempEvent(prev => ({ ...prev, team2: e.target.value }))}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-bold h-11 rounded-xl px-3 text-xs text-slate-800 dark:text-slate-100"
                            >
                              <option value="">{lang === 'bn' ? '-- টিম বি নির্বাচন করুন --' : '-- Select Team B --'}</option>
                              {folderTeams.filter(tName => tName !== tempEvent.team1).map((tName, idx) => (
                                <option key={`t2-${idx}`} value={tName}>{tName}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="relative">
                              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <Input 
                                value={tempEvent.team2 || ""} 
                                onChange={e => setTempEvent(prev => ({ ...prev, team2: e.target.value }))}
                                className="bg-white dark:bg-slate-800 border-none pl-9 font-bold h-11 rounded-xl"
                                placeholder={lang === 'bn' ? 'প্রথমে ফোল্ডার সিলেক্ট করুন' : 'Select folder first'}
                              />
                            </div>
                          )}
                        </div>

                        {/* Tournament Folder Quick Selection Chips for Active Folder Only */}
                        {currentTourn && currentTourn.teams.length > 0 && (
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 ml-1 flex items-center gap-1">
                              <Folder size={12} className="text-amber-500" />
                              {lang === 'bn' ? `শুধু "${currentTourn.name}" ফোল্ডারের দলসমূহ:` : `Teams in "${currentTourn.name}":`}
                            </label>
                            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                              {currentTourn.teams.map((tName, idx) => {
                                const isTeam1 = tempEvent.team1 === tName;
                                const isTeam2 = tempEvent.team2 === tName;
                                return (
                                  <button
                                    key={`${currentTourn.id}-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      if (!tempEvent.team1 || isTeam1) {
                                        setTempEvent(prev => ({ ...prev, team1: tName }));
                                      } else if (!tempEvent.team2 || isTeam2) {
                                        setTempEvent(prev => ({ ...prev, team2: tName }));
                                      } else {
                                        setTempEvent(prev => ({ ...prev, team1: tName }));
                                      }
                                    }}
                                    className={cn(
                                      "text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all border",
                                      isTeam1 ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" :
                                      isTeam2 ? "bg-purple-600 text-white border-purple-600 shadow-xs" :
                                      "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                                    )}
                                  >
                                    <span>{tName}</span>
                                    {isTeam1 && <span className="text-[8px] bg-white/20 px-1 rounded">{lang === 'bn' ? 'টিম এ' : 'Team A'}</span>}
                                    {isTeam2 && <span className="text-[8px] bg-white/20 px-1 rounded">{lang === 'bn' ? 'টিম বি' : 'Team B'}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{t.eventDate}</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <Input 
                              type="date"
                              value={tempEvent.date || ""} 
                              onChange={e => setTempEvent(prev => ({ ...prev, date: e.target.value }))}
                              className="bg-white dark:bg-slate-800 border-none pl-9 font-bold h-11 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{t.eventTime}</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <Input 
                              type="time"
                              value={tempEvent.time || ""} 
                              onChange={e => setTempEvent(prev => ({ ...prev, time: e.target.value }))}
                              className="bg-white dark:bg-slate-800 border-none pl-9 font-bold h-11 rounded-xl"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{t.group}</label>
                          <Input 
                            value={tempEvent.group || ""} 
                            onChange={e => setTempEvent(prev => ({ ...prev, group: e.target.value }))}
                            className="bg-white dark:bg-slate-800 border-none font-bold h-11 rounded-xl"
                            placeholder="Group A"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">{t.venue}</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <Input 
                              value={tempEvent.venue || ""} 
                              onChange={e => setTempEvent(prev => ({ ...prev, venue: e.target.value }))}
                              className="bg-white dark:bg-slate-800 border-none pl-9 font-bold h-11 rounded-xl"
                              placeholder="Stadium"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                         <Button className="flex-1 h-12 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700" onClick={saveScheduleEvent}>
                            {t.saveEvent}
                         </Button>
                         {editingEventId && (
                           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-red-500 hover:bg-red-50" onClick={() => { deleteScheduleEvent(editingEventId); setEditingEventId(null); setTempEvent({}); }}>
                              <Trash2 size={20} />
                           </Button>
                         )}
                      </div>
                    </div>
                  );
                })() : (
                  <Button 
                    variant="outline" 
                    className="w-full h-16 rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 flex items-center justify-center gap-3 group transition-all"
                    onClick={() => setTempEvent({ date: new Date().toISOString().split('T')[0], time: "10:00" })}
                  >
                    <Plus className="group-hover:rotate-90 transition-transform" />
                    <span className="font-black uppercase tracking-widest text-xs">{t.addEvent}</span>
                  </Button>
                )}

                {/* Auto Score Banner */}
                <div className="p-3 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-500 shrink-0" />
                    <span>
                      {lang === 'bn' 
                        ? 'সময়সূচি অনুযায়ী ম্যাচের ৩০ মিনিট পূর্বে থেকে স্বয়ংক্রিয়ভাবে স্কোর ইনপুট সেশন সক্রিয় হবে।' 
                        : 'Scores can be automatically inputted starting 30 minutes before match schedule time.'}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Tournament Folders List with Matches */}
                  {tournaments.map((tourn) => {
                    const folderMatches = schedule.filter(s => s.tournamentId === tourn.id || s.group === tourn.name);
                    return (
                      <div 
                        key={tourn.id}
                        className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border-2 border-slate-200/80 dark:border-slate-800 space-y-4 shadow-2xs"
                      >
                        {/* Tournament Folder Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/80 gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                              <FolderOpen size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                                <span>{tourn.name}</span>
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold shrink-0">
                                  {tourn.teams.length} {lang === 'bn' ? 'টি দল' : 'teams'}
                                </Badge>
                              </h4>
                              <p className="text-[10px] font-bold text-slate-400">
                                {folderMatches.length} {lang === 'bn' ? 'টি সিডিউল করা ম্যাচ' : 'scheduled matches'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl gap-1 shrink-0"
                            onClick={() => {
                              setEditingEventId(null);
                              setTempEvent({
                                date: new Date().toISOString().split('T')[0],
                                time: "10:00",
                                tournamentId: tourn.id,
                                group: tourn.name,
                                team1: tourn.teams[0] || "",
                                team2: tourn.teams[1] || ""
                              });
                            }}
                          >
                            <Plus size={14} />
                            <span>{lang === 'bn' ? 'ম্যাচ সিডিউল যোগ' : 'Add Match'}</span>
                          </Button>
                        </div>

                        {/* Teams in this Folder */}
                        {tourn.teams.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Flag size={11} />
                              {lang === 'bn' ? 'টুর্নামেন্টের দলসমূহ:' : 'Folder Teams:'}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {tourn.teams.map((tName, idx) => (
                                <span 
                                  key={idx}
                                  className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-600 shadow-2xs"
                                >
                                  {tName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matches in this Folder */}
                        {folderMatches.length === 0 ? (
                          <div className="py-4 text-center bg-white/60 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400">{lang === 'bn' ? 'এই ফোল্ডারে কোনো ম্যাচ সিডিউল করা নেই' : 'No matches scheduled in this folder yet'}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5">
                            {folderMatches.map(event => {
                              const status = getScheduleTimeStatus(event);
                              return (
                                <div 
                                  key={event.id}
                                  className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:border-indigo-500/30 transition-all cursor-pointer relative"
                                  onClick={() => {
                                    setEditingEventId(event.id);
                                    setTempEvent(event);
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 rounded-md">
                                        {event.group || tourn.name}
                                      </span>
                                      <div className="flex items-center gap-1 text-slate-400">
                                        <Clock size={10} />
                                        <span className="text-[10px] font-bold">{event.time}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] font-black text-slate-500 flex items-center gap-1 mr-16">
                                      <Calendar size={10} />
                                      {event.date}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-center gap-4">
                                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{event.team1}</span>
                                      <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-[10px] flex items-center justify-center shrink-0">
                                        {event.team1.substring(0, 2).toUpperCase()}
                                      </div>
                                    </div>

                                    <span className="text-[10px] font-black text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md">VS</span>

                                    <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-black text-[10px] flex items-center justify-center shrink-0">
                                        {event.team2.substring(0, 2).toUpperCase()}
                                      </div>
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{event.team2}</span>
                                    </div>
                                  </div>

                                  {event.venue && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1 text-slate-400">
                                      <MapPin size={10} />
                                      <span className="text-[10px] font-bold uppercase truncate">{event.venue}</span>
                                    </div>
                                  )}

                                  {/* Auto Input Action Bar */}
                                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className={cn(
                                        "text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1",
                                        status.isLive ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" :
                                        status.isUpcoming30Min ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" :
                                        "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                      )}>
                                        <Zap size={10} className={status.isReady ? "text-amber-500 animate-pulse" : "text-slate-400"} />
                                        {status.label}
                                      </span>
                                      {event.date && event.time && (
                                        <MatchCountdownBadge 
                                          startTime={`${event.date} ${event.time}`} 
                                          lang={lang} 
                                          className="text-[10px] px-2 py-0.5"
                                        />
                                      )}
                                    </div>

                                    <Button
                                      size="sm"
                                      onClick={() => loadScheduleEventToMatch(event)}
                                      className={cn(
                                        "h-7 text-[10px] font-black uppercase rounded-lg gap-1 px-2.5 transition-all shadow-2xs",
                                        status.isReady 
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse" 
                                          : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                                      )}
                                    >
                                      <Play size={10} />
                                      <span>
                                        {status.isReady 
                                          ? (lang === 'bn' ? '⚡ অটো স্কোর ইনপুট' : '⚡ Auto Input Score') 
                                          : (lang === 'bn' ? 'ম্যাচে ইনপুট লোড' : 'Load to Match')}
                                      </span>
                                    </Button>
                                  </div>

                                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 text-indigo-500 hover:bg-indigo-50"
                                      title={lang === 'bn' ? "কপি করুন" : "Copy"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingEventId(null);
                                        setTempEvent({ ...event, isCopy: true });
                                      }}
                                    >
                                      <Copy size={11} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 text-indigo-500 hover:bg-indigo-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingEventId(event.id);
                                        setTempEvent(event);
                                      }}
                                    >
                                      <Edit3 size={11} />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Other / Unassigned Matches */}
                  {(() => {
                    const unassignedMatches = schedule.filter(s => !s.tournamentId && !tournaments.some(t => t.name === s.group));
                    if (unassignedMatches.length === 0) return null;
                    return (
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                          <Folder size={18} className="text-slate-400" />
                          <h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase">
                            {lang === 'bn' ? 'অন্যান্য / সাধারণ সিডিউল' : 'Other / General Schedule'}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {unassignedMatches.map(event => {
                            const status = getScheduleTimeStatus(event);
                            return (
                              <div 
                                key={event.id}
                                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-indigo-500/30 transition-all cursor-pointer relative"
                                onClick={() => {
                                  setEditingEventId(event.id);
                                  setTempEvent(event);
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 rounded-md">
                                    {event.group || 'General'}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 mr-16">{event.date} • {event.time}</span>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{event.team1}</span>
                                  <span className="text-[10px] font-black text-slate-400">VS</span>
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{event.team2}</span>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={cn(
                                      "text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1",
                                      status.isLive ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" :
                                      status.isUpcoming30Min ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" :
                                      "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                    )}>
                                      <Zap size={10} className={status.isReady ? "text-amber-500 animate-pulse" : "text-slate-400"} />
                                      {status.label}
                                    </span>
                                    {event.date && event.time && (
                                      <MatchCountdownBadge 
                                        startTime={`${event.date} ${event.time}`} 
                                        lang={lang} 
                                        className="text-[10px] px-2 py-0.5"
                                      />
                                    )}
                                  </div>

                                  <Button
                                    size="sm"
                                    onClick={() => loadScheduleEventToMatch(event)}
                                    className={cn(
                                      "h-7 text-[10px] font-black uppercase rounded-lg gap-1 px-2.5 transition-all shadow-2xs",
                                      status.isReady 
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse" 
                                        : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                                    )}
                                  >
                                    <Play size={10} />
                                    <span>
                                      {status.isReady 
                                        ? (lang === 'bn' ? '⚡ অটো স্কোর ইনপুট' : '⚡ Auto Input Score') 
                                        : (lang === 'bn' ? 'ম্যাচে ইনপুট লোড' : 'Load to Match')}
                                    </span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tournament Folders Dedicated Modal */}
      <AnimatePresence>
        {isShowingTournaments && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setIsShowingTournaments(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border-2 border-amber-500/20 max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <FolderOpen size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {t.tournamentFolders}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {tournaments.length} {lang === 'bn' ? 'টি টুর্নামেন্ট ফোল্ডার সংরক্ষিত' : 'Tournament Folders Saved'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsShowingTournaments(false)}>
                  <X size={22} />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {/* Create New Folder Bar */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                  <label className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <FolderPlus size={16} className="text-amber-500" />
                    <span>{lang === 'bn' ? 'নতুন টুর্নামেন্ট ফোল্ডার তৈরি করুন' : 'Create New Tournament Folder'}</span>
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder={lang === 'bn' ? 'যেমন: বিপিএল ২০২৬, এশিয়া কাপ...' : 'e.g., BPL 2026, Asia Cup...'}
                      value={newTournamentFolderInput}
                      onChange={(e) => setNewTournamentFolderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTournamentFolder();
                      }}
                      className="bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800 font-medium text-sm"
                    />
                    <Button 
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 shrink-0"
                      onClick={addTournamentFolder}
                    >
                      <Plus size={16} className="mr-1" />
                      <span>{lang === 'bn' ? 'তৈরি করুন' : 'Create'}</span>
                    </Button>
                  </div>
                </div>

                {/* Tournaments List */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    {lang === 'bn' ? 'আপনার টুর্নামেন্ট ফোল্ডারসমূহ:' : 'Your Tournament Folders:'}
                  </h4>

                  {tournaments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 space-y-2">
                      <Folder size={32} className="mx-auto text-amber-300" />
                      <p className="text-sm font-bold">{lang === 'bn' ? 'কোনো টুর্নামেন্ট ফোল্ডার নেই' : 'No tournament folders created'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tournaments.map((tourn) => {
                        const isExpanded = expandedFolderIds[tourn.id];
                        return (
                          <div 
                            key={tourn.id} 
                            className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
                          >
                            {/* Folder Header */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
                              <button 
                                onClick={() => toggleFolderExpand(tourn.id)}
                                className="flex items-center gap-2.5 text-left font-bold text-sm text-slate-800 dark:text-slate-100 flex-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              >
                                {isExpanded ? (
                                  <FolderOpen size={20} className="text-amber-500 shrink-0 fill-amber-500/20" />
                                ) : (
                                  <Folder size={20} className="text-amber-500 shrink-0 fill-amber-500/20" />
                                )}
                                <span className="text-sm font-black">{tourn.name}</span>
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold shrink-0">
                                  {tourn.teams.length} {lang === 'bn' ? 'টি দল' : 'teams'}
                                </Badge>
                              </button>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-amber-600"
                                  onClick={() => toggleFolderExpand(tourn.id)}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => deleteTournamentFolder(tourn.id)}
                                  title={lang === 'bn' ? 'ফোল্ডার মুছুন' : 'Delete Folder'}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>

                            {/* Folder Contents */}
                            {isExpanded && (
                              <div className="p-4 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {/* Add Team to this Folder */}
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder={lang === 'bn' ? 'নতুন টিম যোগ করুন (যেমন: বাংলাদেশ)...' : 'Add team to this folder...'}
                                    value={tournamentTeamInput[tourn.id] || ''}
                                    onChange={(e) => setTournamentTeamInput(prev => ({ ...prev, [tourn.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') addTeamToTournamentFolder(tourn.id);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-800 text-xs h-9"
                                  />
                                  <Button 
                                    size="sm" 
                                    className="h-9 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                    onClick={() => addTeamToTournamentFolder(tourn.id)}
                                  >
                                    <Plus size={14} className="mr-1" />
                                    <span>{lang === 'bn' ? 'টিম যোগ' : 'Add Team'}</span>
                                  </Button>
                                </div>

                                {/* Teams Chips */}
                                {tourn.teams.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    {lang === 'bn' ? 'এই ফোল্ডারে এখনও কোনো দল যোগ করা হয়নি' : 'No teams added to this folder yet'}
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {tourn.teams.map((teamName, tIdx) => {
                                      return (
                                        <div 
                                          key={tIdx} 
                                          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl"
                                        >
                                          <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                            <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{teamName}</span>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {/* Set Batting */}
                                            <button 
                                              title={lang === 'bn' ? 'ব্যাটিং টিম হিসাবে সেট করুন' : 'Set as Batting Team'}
                                              className="px-2 py-1 rounded-lg text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                                              onClick={() => {
                                                const currentTeams = match.teams || [match.team1, match.team2];
                                                const updatedTeams = currentTeams.includes(teamName) ? currentTeams : [...currentTeams, teamName];
                                                setMatch(prev => ({
                                                  ...prev,
                                                  teams: updatedTeams,
                                                  battingTeam: teamName,
                                                  team1: teamName
                                                }));
                                                toast.success(lang === 'bn' ? `${teamName} ব্যাটিং টিম হিসেবে সেট করা হয়েছে` : `${teamName} set as Batting Team`);
                                              }}
                                            >
                                              <span>⚡</span>
                                              <span>{lang === 'bn' ? 'ব্যাটিং' : 'Bat'}</span>
                                            </button>

                                            {/* Set Bowling */}
                                            <button 
                                              title={lang === 'bn' ? 'বোলিং টিম হিসাবে সেট করুন' : 'Set as Bowling Team'}
                                              className="px-2 py-1 rounded-lg text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold hover:bg-red-200 transition-colors flex items-center gap-1"
                                              onClick={() => {
                                                const currentTeams = match.teams || [match.team1, match.team2];
                                                const updatedTeams = currentTeams.includes(teamName) ? currentTeams : [...currentTeams, teamName];
                                                setMatch(prev => ({
                                                  ...prev,
                                                  teams: updatedTeams,
                                                  bowlingTeam: teamName,
                                                  team2: teamName
                                                }));
                                                toast.success(lang === 'bn' ? `${teamName} বোলিং টিম হিসেবে সেট করা হয়েছে` : `${teamName} set as Bowling Team`);
                                              }}
                                            >
                                              <span>🎯</span>
                                              <span>{lang === 'bn' ? 'বোলিং' : 'Bowl'}</span>
                                            </button>

                                            {/* Delete Team from Folder */}
                                            <button 
                                              title={lang === 'bn' ? 'ফোল্ডার থেকে মুছুন' : 'Remove from folder'}
                                              className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                              onClick={() => removeTeamFromTournamentFolder(tourn.id, teamName)}
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Folder Scheduled Matches */}
                                {(() => {
                                  const folderMatches = schedule.filter(s => s.tournamentId === tourn.id || s.group === tourn.name);
                                  return (
                                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                          <Calendar size={12} />
                                          {lang === 'bn' ? 'ম্যাচ সময়সূচি:' : 'Match Schedules:'}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg px-2"
                                          onClick={() => {
                                            setIsShowingTournaments(false);
                                            setIsShowingSchedule(true);
                                            setEditingEventId(null);
                                            setTempEvent({
                                              date: new Date().toISOString().split('T')[0],
                                              time: "10:00",
                                              tournamentId: tourn.id,
                                              group: tourn.name,
                                              team1: tourn.teams[0] || "",
                                              team2: tourn.teams[1] || ""
                                            });
                                          }}
                                        >
                                          <Plus size={12} className="mr-0.5" />
                                          <span>{lang === 'bn' ? 'ম্যাচ সিডিউল যোগ' : 'Add Match'}</span>
                                        </Button>
                                      </div>

                                      {folderMatches.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-center">
                                          {lang === 'bn' ? 'এই ফোল্ডারে কোনো ম্যাচ সিডিউল করা নেই' : 'No scheduled matches'}
                                        </p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {folderMatches.map(eMatch => (
                                            <div 
                                              key={eMatch.id}
                                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="text-indigo-600 dark:text-indigo-400 font-black">{eMatch.team1}</span>
                                                <span className="text-[10px] text-slate-400 font-black">VS</span>
                                                <span className="text-indigo-600 dark:text-indigo-400 font-black">{eMatch.team2}</span>
                                              </div>
                                              <span className="text-[10px] text-slate-400 font-semibold">{eMatch.date} • {eMatch.time}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingTeamScore && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setIsEditingTeamScore(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border-2 border-indigo-500/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.editTeamScore}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingTeamScore(false)}>
                    <X size={20} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === 'bn' ? 'ব্যাটিং টিম' : 'Batting Team'}</label>
                    <div className="grid grid-cols-2 gap-2">
                       <Button 
                         variant={tempEditScore.battingTeam === match.team1 ? "default" : "outline"}
                         className={cn(
                           "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                           tempEditScore.battingTeam === match.team1 ? "bg-indigo-600 shadow-lg shadow-indigo-500/20" : "border-2 border-slate-100 dark:border-slate-800"
                         )}
                         onClick={() => setTempEditScore(prev => ({ ...prev, battingTeam: match.team1 }))}
                       >
                         {match.team1}
                       </Button>
                       <Button 
                         variant={tempEditScore.battingTeam === match.team2 ? "default" : "outline"}
                         className={cn(
                           "h-12 rounded-xl text-xs font-black uppercase tracking-wider",
                           tempEditScore.battingTeam === match.team2 ? "bg-indigo-600 shadow-lg shadow-indigo-500/20" : "border-2 border-slate-100 dark:border-slate-800"
                         )}
                         onClick={() => setTempEditScore(prev => ({ ...prev, battingTeam: match.team2 }))}
                       >
                         {match.team2}
                       </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.runs}</label>
                      <Input 
                        type="number"
                        value={tempEditScore.runs}
                        onChange={e => setTempEditScore(prev => ({ ...prev, runs: parseInt(e.target.value) || 0 }))}
                        className="h-14 text-2xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.wickets}</label>
                      <Input 
                        type="number"
                        max={match.maxWickets || 10}
                        value={tempEditScore.wickets}
                        onChange={e => setTempEditScore(prev => ({ ...prev, wickets: parseInt(e.target.value) || 0 }))}
                        className="h-14 text-2xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === 'bn' ? 'ওভার' : 'Overs'}</label>
                      <Input 
                        type="number"
                        min={0}
                        value={tempEditScore.overs}
                        onChange={e => setTempEditScore(prev => ({ ...prev, overs: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="h-14 text-2xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === 'bn' ? 'বল' : 'Balls'}</label>
                      <Input 
                        type="number"
                        min={0}
                        max={(match.format === '100' ? 5 : 6) - 1}
                        value={tempEditScore.balls}
                        onChange={e => setTempEditScore(prev => ({ ...prev, balls: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="h-14 text-2xl font-black rounded-2xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                  </div>
                </div>

                <Button className="w-full h-14 rounded-2xl text-lg font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30" onClick={saveTeamScoreEdit}>
                  {t.save}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Stats Edit Modal */}
      <AnimatePresence>
        {editingPlayerIdx !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setEditingPlayerIdx(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border-2 border-indigo-500/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.editPlayer}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tempEditPlayer.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingPlayerIdx(null)}>
                    <X size={20} />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.playerName}</label>
                    <Input 
                      value={tempEditPlayer.name}
                      onChange={e => setTempEditPlayer(prev => ({ ...prev, name: e.target.value }))}
                      className="h-12 font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.runs}</label>
                      <Input 
                        type="number"
                        value={tempEditPlayer.runs}
                        onChange={e => setTempEditPlayer(prev => ({ ...prev, runs: parseInt(e.target.value) || 0 }))}
                        className="h-11 font-black rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.balls}</label>
                      <Input 
                        type="number"
                        value={tempEditPlayer.balls}
                        onChange={e => setTempEditPlayer(prev => ({ ...prev, balls: parseInt(e.target.value) || 0 }))}
                        className="h-11 font-black rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.fours}</label>
                      <Input 
                        type="number"
                        value={tempEditPlayer.fours}
                        onChange={e => setTempEditPlayer(prev => ({ ...prev, fours: parseInt(e.target.value) || 0 }))}
                        className="h-11 font-black rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.sixes}</label>
                      <Input 
                        type="number"
                        value={tempEditPlayer.sixes}
                        onChange={e => setTempEditPlayer(prev => ({ ...prev, sixes: parseInt(e.target.value) || 0 }))}
                        className="h-11 font-black rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-4"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex-1">
                      <input 
                        type="checkbox"
                        id="edit-is-out"
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={tempEditPlayer.isOut}
                        onChange={e => setTempEditPlayer(prev => ({ ...prev, isOut: e.target.checked }))}
                      />
                      <label htmlFor="edit-is-out" className="text-xs font-black uppercase text-slate-500 tracking-wider cursor-pointer select-none">{t.out}</label>
                    </div>
                    {tempEditPlayer.isOut && (
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lang === 'bn' ? 'উইকেটের ধরণ' : 'Wicket Type'}</label>
                        <select 
                          value={tempEditPlayer.wicketType || ""}
                          onChange={e => setTempEditPlayer(prev => ({ ...prev, wicketType: e.target.value }))}
                          className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-none px-2 text-xs font-bold"
                        >
                          <option value="">{t.wicket}</option>
                          {Object.entries(t.wicketTypes as Record<string, string>).map(([key, label]) => (
                            <option key={key} value={label}>{label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <Button className="w-full h-12 rounded-xl text-lg font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30" onClick={savePlayerEdit}>
                  {t.save}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Milestone Modal */}
      <AnimatePresence>
        {editingMilestoneObj !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setEditingMilestoneObj(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border-2 border-indigo-500/20 max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {lang === 'bn' ? 'মাইলস্টোন এডিট / ডিলিট' : 'Edit / Delete Milestone'}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400">
                        {lang === 'bn' ? 'টার্গেট রান, ওভার ও অডস পরিবর্তন করুন' : 'Modify target runs, overs and odds'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingMilestoneObj(null)}>
                    <X size={20} />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Runs and Overs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Flame size={12} className="text-amber-500" />
                        {lang === 'bn' ? 'টার্গেট রান' : 'Target Runs'}
                      </label>
                      <Input 
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        value={tempEditMilestone.runs}
                        onChange={e => setTempEditMilestone(prev => ({ ...prev, runs: parseInt(e.target.value) || 0 }))}
                        className="h-12 text-xl font-black rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-center"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Clock size={12} className="text-indigo-500" />
                        {lang === 'bn' ? 'ওভার' : 'Over'}
                      </label>
                      <Input 
                        type="number"
                        step="0.1"
                        min="0"
                        value={tempEditMilestone.over}
                        onChange={e => setTempEditMilestone(prev => ({ ...prev, over: parseFloat(e.target.value) || 0 }))}
                        className="h-12 text-xl font-black rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-center"
                      />
                    </div>
                  </div>

                  {/* Condition Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t.winCondition}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={tempEditMilestone.condition === 'more' ? 'default' : 'outline'}
                        className={cn(
                          "h-11 rounded-xl text-xs font-black flex items-center justify-center gap-1.5",
                          tempEditMilestone.condition === 'more' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        )}
                        onClick={() => setTempEditMilestone(prev => ({ ...prev, condition: 'more' }))}
                      >
                        <TrendingUp size={14} />
                        {t.moreToWin}
                      </Button>
                      <Button
                        type="button"
                        variant={tempEditMilestone.condition === 'lessOrEqual' ? 'default' : 'outline'}
                        className={cn(
                          "h-11 rounded-xl text-xs font-black flex items-center justify-center gap-1.5",
                          tempEditMilestone.condition === 'lessOrEqual' ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                        )}
                        onClick={() => setTempEditMilestone(prev => ({ ...prev, condition: 'lessOrEqual' }))}
                      >
                        <TrendingDown size={14} />
                        {t.lessOrEqualWin}
                      </Button>
                    </div>
                  </div>

                  {/* Odds & Stakes Entries */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {lang === 'bn' ? 'অডস ও স্টেক এন্ট্রি' : 'Odds & Stake Entries'}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTempEditMilestone(prev => ({
                            ...prev,
                            entries: [...prev.entries, { odd: 1.8, stake: 100 }]
                          }));
                        }}
                        className="h-7 text-[10px] font-black text-indigo-600 dark:text-indigo-400 gap-1 px-2"
                      >
                        <Plus size={12} />
                        {lang === 'bn' ? 'এন্ট্রি যোগ করুন' : 'Add Entry'}
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {tempEditMilestone.entries.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase">
                              {lang === 'bn' ? 'অডস (Odd)' : 'Odd'}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              value={entry.odd}
                              onChange={e => {
                                const val = e.target.value;
                                setTempEditMilestone(prev => {
                                  const updated = [...prev.entries];
                                  updated[idx] = { ...updated[idx], odd: val };
                                  return { ...prev, entries: updated };
                                });
                              }}
                              className="h-9 text-xs font-black rounded-lg bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase">
                              {lang === 'bn' ? 'স্টেক (Stake)' : 'Stake'}
                            </span>
                            <Input
                              type="number"
                              step="1"
                              value={entry.stake}
                              onChange={e => {
                                const val = e.target.value;
                                setTempEditMilestone(prev => {
                                  const updated = [...prev.entries];
                                  updated[idx] = { ...updated[idx], stake: val };
                                  return { ...prev, entries: updated };
                                });
                              }}
                              className="h-9 text-xs font-black rounded-lg bg-white dark:bg-slate-900"
                            />
                          </div>
                          {tempEditMilestone.entries.length > 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setTempEditMilestone(prev => ({
                                  ...prev,
                                  entries: prev.entries.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg mt-3"
                              title={lang === 'bn' ? 'মুছুন' : 'Delete Entry'}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <Button 
                    className="w-full h-12 rounded-xl text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                    onClick={handleSaveEditMilestone}
                  >
                    <Check size={16} className="mr-1.5" />
                    {t.save}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      className="h-10 rounded-xl text-xs font-black text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => {
                        if (editingMilestoneObj) {
                          handleDeleteMilestone(editingMilestoneObj.milestone);
                          setEditingMilestoneObj(null);
                        }
                      }}
                    >
                      <Trash2 size={14} className="mr-1" />
                      {lang === 'bn' ? 'মাইলস্টোন ডিলিট' : 'Delete Milestone'}
                    </Button>
                    <Button 
                      variant="ghost"
                      className="h-10 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => setEditingMilestoneObj(null)}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Calendar Integration Modal */}
      <GoogleCalendarModal 
        isOpen={isGoogleCalendarModalOpen}
        onClose={() => setIsGoogleCalendarModalOpen(false)}
        schedule={schedule}
        currentMatch={match}
        lang={lang}
      />

      {/* User & Admin Links Modal */}
      <AnimatePresence>
        {isLinksModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLinksModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Link2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === 'bn' ? 'অ্যাপ লিংক ও এক্সেস' : 'App Access Links'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'ব্যবহারকারী ও এডমিন লিংকসমূহ' : 'User & Admin official links'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsLinksModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* 1. User Link Card */}
                <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        {lang === 'bn' ? 'ইউজার লিংক (পাবলিক / শেয়ার লিংক)' : 'User Link (Public / Shared URL)'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400">
                      Live
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {lang === 'bn' ? 'সাধারণ ব্যবহারকারী এবং গ্রাহকদের সাথে এই লিংকটি শেয়ার করুন:' : 'Share this live link with regular users & visitors:'}
                  </p>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <input 
                      readOnly 
                      value="https://ais-pre-vjlhqimpdnoldww2n3qtzy-145385287677.asia-southeast1.run.app"
                      className="w-full text-xs bg-transparent border-0 outline-none text-slate-700 dark:text-slate-300 select-all font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("https://ais-pre-vjlhqimpdnoldww2n3qtzy-145385287677.asia-southeast1.run.app");
                        toast.success(lang === 'bn' ? 'ইউজার লিংক কপি হয়েছে!' : 'User link copied to clipboard!');
                      }}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Copy size={12} />
                      {lang === 'bn' ? 'কপি' : 'Copy'}
                    </button>
                    <a
                      href="https://ais-pre-vjlhqimpdnoldww2n3qtzy-145385287677.asia-southeast1.run.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={lang === 'bn' ? 'নতুন ট্যাবে খুলুন' : 'Open in new tab'}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Direct Bet Slip View Link */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Ticket size={13} className="text-indigo-500" />
                    {lang === 'bn' ? 'সরাসরি বেট স্লিপ পেজ লিংক:' : 'Direct Bet Slip Studio Link:'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <input 
                      readOnly 
                      value="https://ais-pre-vjlhqimpdnoldww2n3qtzy-145385287677.asia-southeast1.run.app/#betslip"
                      className="w-full text-xs bg-transparent border-0 outline-none text-slate-700 dark:text-slate-300 select-all font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("https://ais-pre-vjlhqimpdnoldww2n3qtzy-145385287677.asia-southeast1.run.app/#betslip");
                        toast.success(lang === 'bn' ? 'বেট স্লিপ লিংক কপি হয়েছে!' : 'Bet slip link copied!');
                      }}
                      className="shrink-0 px-2 py-1 text-[10px] font-bold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 flex items-center gap-1"
                    >
                      <Copy size={11} />
                      {lang === 'bn' ? 'কপি' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* 2. Admin Link Card */}
                <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown size={15} className="text-rose-600 dark:text-rose-400" />
                      <span className="text-xs font-black uppercase tracking-wide text-rose-800 dark:text-rose-300">
                        {lang === 'bn' ? 'এডমিন লিংক (কন্ট্রোল ও ম্যানেজমেন্ট)' : 'Admin Link (Management & Console)'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700 dark:text-rose-400">
                      Admin
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {lang === 'bn' ? 'অ্যাপ এডিট, কোড কনসোল ও এডমিন অ্যাসিস্ট্যান্ট এক্সেস করতে:' : 'To edit app, prompt AI assistant, and manage code:'}
                  </p>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <input 
                      readOnly 
                      value="https://aistudio.google.com/apps/d440a626-7bb9-4a03-994b-3076e151f286?showAssistant=true&project=nothing-1c47a"
                      className="w-full text-xs bg-transparent border-0 outline-none text-slate-700 dark:text-slate-300 select-all font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("https://aistudio.google.com/apps/d440a626-7bb9-4a03-994b-3076e151f286?showAssistant=true&project=nothing-1c47a");
                        toast.success(lang === 'bn' ? 'এডমিন কনসোল লিংক কপি হয়েছে!' : 'Admin console link copied!');
                      }}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1"
                    >
                      <Copy size={12} />
                      {lang === 'bn' ? 'কপি' : 'Copy'}
                    </button>
                    <a
                      href="https://aistudio.google.com/apps/d440a626-7bb9-4a03-994b-3076e151f286?showAssistant=true&project=nothing-1c47a"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={lang === 'bn' ? 'এডমিন কনসোল খুলুন' : 'Open Admin Console'}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Dev URL */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{lang === 'bn' ? 'ডেভ এনভায়রনমেন্ট প্রিভিউ:' : 'Dev preview link:'}</span>
                    <a 
                      href="https://ais-dev-vjlhqimpdnoldww2n3qtzy-145385287677.asia-southeast1.run.app" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <span>ais-dev-...run.app</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* 3. Cloud Data Backup & Safety */}
                <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
                        {lang === 'bn' ? 'ডাটা ব্যাকআপ ও সুরক্ষা (Cloud Backup)' : 'Cloud Data Backup & Safety'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {lang === 'bn' ? 'ব্রাউজার ক্যাশ ডিলিট হলেও আপনার ম্যাচ, শিডিউল ও টুর্নামেন্ট ডাটা সুরক্ষিত রাখতে সার্ভার ব্যাকআপ ব্যবহার করুন:' : 'Backup your matches, schedule, and tournament data to prevent loss on browser cache wipe:'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/backup/save", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ matches, currentMatchId, schedule, tournaments, timestamp: Date.now() })
                          });
                          const json = await res.json();
                          if (json.success) {
                            toast.success(lang === 'bn' ? 'ক্লাউড ব্যাকআপ সফলভাবে সম্পন্ন হয়েছে!' : 'Cloud backup saved successfully!');
                          }
                        } catch {
                          toast.error(lang === 'bn' ? 'ব্যাকআপ সেভ ব্যর্থ হয়েছে' : 'Backup save failed');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download size={13} />
                      {lang === 'bn' ? 'এখনই ক্লাউড ব্যাকআপ নিন' : 'Save Cloud Backup'}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/backup/load");
                          const json = await res.json();
                          if (json.success && json.data) {
                            if (Array.isArray(json.data.matches)) setMatches(json.data.matches);
                            if (json.data.currentMatchId) setCurrentMatchId(json.data.currentMatchId);
                            if (Array.isArray(json.data.schedule)) setSchedule(json.data.schedule);
                            if (Array.isArray(json.data.tournaments)) setTournaments(json.data.tournaments);
                            toast.success(lang === 'bn' ? 'ক্লাউড থেকে সফলভাবে ডাটা রিস্টোর হয়েছে!' : 'Data restored from Cloud Backup!');
                          } else {
                            toast.error(lang === 'bn' ? 'কোনো ব্যাকআপ পাওয়া যায়নি' : 'No backup found');
                          }
                        } catch {
                          toast.error(lang === 'bn' ? 'রিস্টোর ব্যর্থ হয়েছে' : 'Restore failed');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload size={13} />
                      {lang === 'bn' ? 'ক্লাউড থেকে রিস্টোর' : 'Restore Cloud Backup'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsLinksModalOpen(false)}
                  className="text-xs"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Search & Cricket Hub Modal (Connected to bottom-right button) */}
      <AnimatePresence>
        {isGoogleSearchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsGoogleSearchModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-amber-50/60 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center">
                    <Search size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span className="bg-gradient-to-r from-blue-600 via-rose-500 to-amber-600 bg-clip-text text-transparent font-black">
                        {lang === 'bn' ? 'গুগল সার্চ ও ক্রিকেট তথ্য' : 'Google Search & Cricket Hub'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'লাইভ ম্যাচ, স্কোর, সময়সূচী ও খবর সরাসরি গুগলে খুঁজুন' : 'Search live match scores, schedules & news on Google'}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsGoogleSearchModalOpen(false)}
                  className="rounded-full h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* 1. Google Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = googleSearchQuery.trim() || 'live cricket score today';
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="space-y-2"
                >
                  <div className="relative flex items-center">
                    <Search size={16} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                    <input
                      type="text"
                      value={googleSearchQuery}
                      onChange={(e) => setGoogleSearchQuery(e.target.value)}
                      placeholder={lang === 'bn' ? 'গুগলে ক্রিকেট বা যেকোনো বিষয় সার্চ করুন...' : 'Search Google for cricket scores, news...'}
                      className="w-full text-xs py-3 pl-10 pr-24 rounded-2xl border-2 border-blue-200 dark:border-blue-900 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 shadow-inner font-medium transition-all"
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {googleSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setGoogleSearchQuery("")}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-full"
                          title="মুছে ফেলুন"
                        >
                          <X size={13} />
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                      >
                        <span>{lang === 'bn' ? 'সার্চ' : 'Search'}</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                </form>

                {/* 2. Popular Cricket Quick Searches */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500" />
                      {lang === 'bn' ? 'জনপ্রিয় ক্রিকেট সার্চ (১-ক্লিকে ফলাফল):' : 'Popular Cricket Searches (1-Click):'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { 
                        label: lang === 'bn' ? '🏏 আজকের লাইভ স্কোর' : '🏏 Live Cricket Score', 
                        query: 'live cricket score today' 
                      },
                      { 
                        label: lang === 'bn' ? '🇧🇩 বাংলাদেশ ম্যাচ লাইভ' : '🇧🇩 Bangladesh Match Live', 
                        query: 'bangladesh cricket match live score' 
                      },
                      { 
                        label: lang === 'bn' ? '🔥 ভারত বনাম পাকিস্তান' : '🔥 India vs Pakistan Live', 
                        query: 'india vs pakistan cricket live score' 
                      },
                      { 
                        label: lang === 'bn' ? '🏆 বিপিএল ২০২৫ সময়সূচী' : '🏆 BPL 2025 Schedule', 
                        query: 'bpl 2025 cricket schedule and points table' 
                      },
                      { 
                        label: lang === 'bn' ? '🌟 আইপিএল পয়েন্ট টেবিল' : '🌟 IPL Points Table', 
                        query: 'ipl points table live cricket' 
                      },
                      { 
                        label: lang === 'bn' ? '📊 আইসিসি র‍্যাংকিং' : '📊 ICC Rankings', 
                        query: 'icc mens cricket team rankings player ranking' 
                      },
                      { 
                        label: lang === 'bn' ? '📰 ক্রিকেট তাজা খবর' : '📰 Cricket News Today', 
                        query: 'cricket news latest updates' 
                      },
                      { 
                        label: lang === 'bn' ? '🌐 ক্রিকবাজ লাইভ স্কোর' : '🌐 Cricbuzz Live', 
                        query: 'cricbuzz live cricket score today match' 
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          window.open(`https://www.google.com/search?q=${encodeURIComponent(item.query)}`, '_blank', 'noopener,noreferrer');
                        }}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left flex items-center justify-between group cursor-pointer shadow-2xs"
                      >
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {item.label}
                        </span>
                        <ExternalLink size={11} className="text-slate-400 group-hover:text-blue-500 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Direct Live Match Sync Integration Tip */}
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {lang === 'bn' ? 'গুগল থেকে প্রাপ্ত লিংক অ্যাপে সিঙ্ক করবেন?' : 'Sync live scores directly from web?'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'bn' ? 'Cricbuzz বা Cricinfo লিংক দিয়ে অটো-স্কোর আপডেট নিন' : 'Use match URLs to auto-update balls & scores'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoogleSearchModalOpen(false);
                      setIsLiveMatchModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>{lang === 'bn' ? 'লাইভ সিঙ্ক' : 'Live Sync'}</span>
                    <Radio size={10} />
                  </button>
                </div>

                {/* 4. Admin Tools Option (Preserves Admin Assistant access) */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Crown size={15} className="text-rose-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        {lang === 'bn' ? 'এডমিন অ্যাসিস্ট্যান্ট ও কনসোল' : 'Admin Assistant & Console'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'bn' ? 'কোড এডিট ও ম্যানেজমেন্ট এক্সেস' : 'AI Studio prompt & administration'}
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://aistudio.google.com/apps/d440a626-7bb9-4a03-994b-3076e151f286?showAssistant=true&project=nothing-1c47a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 text-[10px] font-bold shrink-0 flex items-center gap-1"
                    title={lang === 'bn' ? 'এডমিন অ্যাসিস্ট্যান্ট খুলুন' : 'Open Admin Assistant'}
                  >
                    <span>{lang === 'bn' ? 'এডমিন খুলুন' : 'Open Admin'}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const q = googleSearchQuery.trim() || 'cricket live score';
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Globe size={13} />
                  <span>Google.com</span>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsGoogleSearchModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLiveMatchModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLiveMatchModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Radio size={18} className={match.liveSyncEnabled ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      {lang === 'bn' ? 'ম্যাচ লাইভ লিংক সিঙ্ক' : 'Live Match Link Sync'}
                      {match.liveMatchUrl && (
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          match.liveSyncEnabled ? "bg-emerald-500 animate-ping" : "bg-amber-400"
                        )} />
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'চলতি ম্যাচের সাথে লাইভ ক্রিকেট স্কোর যুক্ত করুন' : 'Connect live cricket score to active match'}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsLiveMatchModalOpen(false)}
                  className="rounded-full h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* 1. Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" />
                    {lang === 'bn' ? '১-ক্লিকে ডেমো টেস্ট (লাইভ পরিবর্তন দেখতে):' : '1-Click Demo Matches (Test live changes):'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '🇧🇩 BAN vs IND', url: 'demo://ban-vs-ind', sub: 'Live Demo' },
                      { label: '⚡ IND vs PAK', url: 'demo://ind-vs-pak', sub: 'Live Demo' },
                      { label: '🏆 BPL Final', url: 'demo://bpl-final', sub: 'Live Demo' },
                      { label: '⏰ Upcoming', url: 'demo://upcoming', sub: 'শুরু হয়নি' },
                    ].map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => {
                          setLiveUrlInput(item.url);
                          setMatch(prev => ({ ...prev, liveMatchUrl: item.url, liveSyncEnabled: true }));
                          fetchLiveMatchData(item.url, true);
                        }}
                        className={cn(
                          "py-2 px-2 rounded-xl text-[11px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-xs",
                          match.liveMatchUrl === item.url
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        )}
                      >
                        <span className="truncate w-full">{item.label}</span>
                        <span className="text-[9px] opacity-75 font-mono">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Link Input Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{lang === 'bn' ? 'ম্যাচের ওয়েব লিংক:' : 'Match Web URL:'}</span>
                    <span className="text-[10px] text-slate-400">Cricinfo, Cricbuzz, CREX, etc.</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={liveUrlInput}
                      onChange={(e) => setLiveUrlInput(e.target.value)}
                      placeholder="https://www.cricbuzz.com/live-cricket-scores/... বা demo://..."
                      className="w-full text-xs py-2.5 pl-8 pr-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 font-mono outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                    />
                    <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    {liveUrlInput && (
                      <button
                        type="button"
                        onClick={() => setLiveUrlInput("")}
                        className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setLiveUrlInput(text);
                            toast.success(lang === 'bn' ? "লিংক পেস্ট হয়েছে" : "Link pasted");
                          }
                        } catch {
                          toast.info(lang === 'bn' ? "ক্লিপবোর্ড এক্সেস করা যায়নি" : "Clipboard unavailable");
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-1 py-0.5 cursor-pointer"
                    >
                      {lang === 'bn' ? 'পেস্ট' : 'Paste'}
                    </button>
                  </div>
                </div>

                {/* Pre-Sync Configuration: Target Overs & Target Runs */}
                <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3 shadow-2xs">
                  {/* Header & Status Indicator */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/70 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {lang === 'bn' ? 'টার্গেট ওভার ও রান নির্ধারণ' : 'Target Overs & Runs Setup'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {selectedOverId === '100 Ball' ? (lang === 'bn' ? '১০০ বল' : '100 Ball') : `${match.maxOvers || 20} ${lang === 'bn' ? 'ওভার' : 'Ov'}`}
                      {' • '}
                      {match.target ? `${lang === 'bn' ? 'টার্গেট:' : 'Target:'} ${match.target}` : (lang === 'bn' ? '১ম ইনিংস' : '1st Inn')}
                    </span>
                  </div>

                  {/* 1. Target Overs (5, 6, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, T10, 100 Ball) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock size={12} className="text-indigo-500" />
                        {lang === 'bn' ? 'টার্গেট ওভার নির্বাচন করুন:' : 'Select Target Overs:'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {selectedOverId ? `${lang === 'bn' ? 'বর্তমান:' : 'Active:'} ${selectedOverId}` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {(
                        [
                          { id: '5', label: '5 Ov', bnLabel: '৫ ওভ', overs: 5 },
                          { id: '6', label: '6 Ov', bnLabel: '৬ ওভ', overs: 6 },
                          { id: '10', label: '10 Ov', bnLabel: '১০ ওভ', overs: 10, format: '10' },
                          { id: '12', label: '12 Ov', bnLabel: '১২ ওভ', overs: 12 },
                          { id: '15', label: '15 Ov', bnLabel: '১৫ ওভ', overs: 15 },
                          { id: '20', label: '20 Ov', bnLabel: '২০ ওভ (T20)', overs: 20, format: '20' },
                          { id: '25', label: '25 Ov', bnLabel: '২৫ ওভ', overs: 25 },
                          { id: '30', label: '30 Ov', bnLabel: '৩০ ওভ', overs: 30 },
                          { id: '35', label: '35 Ov', bnLabel: '৩৫ ওভ', overs: 35 },
                          { id: '40', label: '40 Ov', bnLabel: '৪০ ওভ', overs: 40 },
                          { id: '45', label: '45 Ov', bnLabel: '৪৫ ওভ', overs: 45 },
                          { id: '50', label: '50 Ov', bnLabel: '৫০ ওভ (ODI)', overs: 50, format: '50' },
                          { id: 'T10', label: 'T10', bnLabel: 'T10', overs: 10, format: '10' },
                          { id: '100 Ball', label: '100 Ball', bnLabel: '১০০ বল', overs: 17, format: '100' },
                        ] as Array<{ id: string; label: string; bnLabel: string; overs: number; format?: '10' | '20' | '50' | '100' }>
                      ).map((item) => {
                        const isSelected = selectedOverId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedOverId(item.id);
                              setMatch(prev => ({
                                ...prev,
                                maxOvers: item.overs,
                                format: item.format || (item.overs === 20 ? '20' : item.overs === 50 ? '50' : item.overs === 10 ? '10' : prev.format)
                              }));
                              toast.success(
                                lang === 'bn' 
                                  ? `টার্গেট ওভার: ${item.bnLabel} নির্ধারণ করা হয়েছে` 
                                  : `Target Overs set to ${item.label}`
                              );
                            }}
                            className={cn(
                              "py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all text-center flex items-center justify-center gap-0.5 cursor-pointer border shadow-2xs",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/40 shadow-sm font-black"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40"
                            )}
                          >
                            {isSelected && <Check size={10} className="stroke-[3]" />}
                            <span className="truncate">{lang === 'bn' ? item.bnLabel : item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Target Runs Selection & Input */}
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Flag size={12} className="text-amber-500" />
                        {lang === 'bn' ? 'টার্গেট রান নির্বাচন করুন (বা টাইপ করুন):' : 'Select or Enter Target Runs:'}
                      </span>
                      {match.target ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMatch(prev => ({ ...prev, target: undefined }));
                            setCustomTargetInput("");
                            toast.info(lang === 'bn' ? "টার্গেট মুছে ফেলা হয়েছে (১ম ইনিংস)" : "Target cleared (1st Innings)");
                          }}
                          className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                        >
                          <X size={10} />
                          {lang === 'bn' ? 'টার্গেট মুছুন' : 'Clear Target'}
                        </button>
                      ) : null}
                    </div>

                    {/* Quick Preset Target Runs Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      <button
                        type="button"
                        onClick={() => {
                          setMatch(prev => ({ ...prev, target: undefined }));
                          setCustomTargetInput("");
                          toast.info(lang === 'bn' ? "১ম ইনিংস নির্বাচন করা হয়েছে" : "1st Innings selected (No Target)");
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap cursor-pointer shrink-0",
                          !match.target
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs font-black ring-1 ring-amber-400"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        )}
                      >
                        {lang === 'bn' ? '১ম ইনিংস (নেই)' : '1st Inn (None)'}
                      </button>
                      {[80, 100, 120, 140, 150, 160, 175, 180, 200, 220, 250, 280, 300].map((runs) => {
                        const isMatchTarget = match.target === runs;
                        return (
                          <button
                            key={runs}
                            type="button"
                            onClick={() => {
                              setMatch(prev => ({ ...prev, target: runs }));
                              setCustomTargetInput(String(runs));
                              toast.success(lang === 'bn' ? `টার্গেট রান: ${runs}` : `Target: ${runs} runs`);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all whitespace-nowrap cursor-pointer shrink-0",
                              isMatchTarget
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black ring-1 ring-indigo-400"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            )}
                          >
                            {runs}
                          </button>
                        );
                      })}
                    </div>

                    {/* Numeric Input Field with Stepper Buttons */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={customTargetInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomTargetInput(val);
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num > 0) {
                              setMatch(prev => ({ ...prev, target: num }));
                            } else if (!val.trim()) {
                              setMatch(prev => ({ ...prev, target: undefined }));
                            }
                          }}
                          placeholder={lang === 'bn' ? 'কাস্টম টার্গেট রান লিখুন (যেমন: ১৮২)' : 'Custom Target Runs (e.g. 182)'}
                          className="w-full text-xs py-2 pl-8 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
                        />
                        <Target size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        {customTargetInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTargetInput("");
                              setMatch(prev => ({ ...prev, target: undefined }));
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Steppers */}
                      <div className="flex items-center gap-1 shrink-0">
                        {[-10, -1, 1, 10].map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => {
                              const cur = match.target || 0;
                              const next = Math.max(0, cur + step);
                              if (next === 0) {
                                setMatch(prev => ({ ...prev, target: undefined }));
                                setCustomTargetInput("");
                              } else {
                                setMatch(prev => ({ ...prev, target: next }));
                                setCustomTargetInput(String(next));
                              }
                            }}
                            className="h-8 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold cursor-pointer transition-all shadow-2xs"
                            title={step > 0 ? `+${step} Runs` : `${step} Runs`}
                          >
                            {step > 0 ? `+${step}` : step}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Real-time Match Calculation / Target Banner */}
                    <div className="p-2 rounded-xl bg-indigo-100/50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono">
                      {match.target ? (
                        <>
                          <div className="text-slate-800 dark:text-slate-200 flex items-center gap-1 font-sans font-bold">
                            <span className="text-indigo-600 dark:text-indigo-400 font-black">
                              {lang === 'bn' ? 'টার্গেট:' : 'Target:'}
                            </span>
                            <span>{match.target} {lang === 'bn' ? 'রান' : 'runs'}</span>
                            <span className="text-slate-400">({selectedOverId === '100 Ball' ? (lang === 'bn' ? '১০০ বল' : '100b') : `${match.maxOvers || 20} ${lang === 'bn' ? 'ওভার' : 'ov'}`})</span>
                          </div>
                          <div className="text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            {lang === 'bn' 
                              ? `জয়ের জন্য বাকি: ${Math.max(0, match.target - match.score)} রান (${Math.max(0, (match.maxOvers * 6) - match.balls)} বলে)`
                              : `Need ${Math.max(0, match.target - match.score)} runs in ${Math.max(0, (match.maxOvers * 6) - match.balls)} balls`
                            }
                          </div>
                        </>
                      ) : (
                        <div className="text-amber-700 dark:text-amber-300 font-medium text-[10px] flex items-center gap-1 w-full justify-between">
                          <span>{lang === 'bn' ? 'ℹ️ ১ম ইনিংস চলমান (কোনো রান টার্গেট নির্ধারিত নেই)' : 'ℹ️ 1st Innings in progress (No target set)'}</span>
                          <span className="font-bold font-mono">Max: {match.maxOvers || 20} Ov</span>
                        </div>
                      )}
                    </div>

                    {/* Lock Custom Target & Overs on Sync Toggle */}
                    <div className="pt-1 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={keepCustomTargetOnSync}
                          onChange={(e) => setKeepCustomTargetOnSync(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{lang === 'bn' ? 'লাইভ সিঙ্কের সময় আমার দেওয়া টার্গেট ও ওভার বজায় রাখুন' : 'Keep my target & overs during live sync'}</span>
                      </label>
                      <span className="text-[10px] text-indigo-500 font-bold">
                        {keepCustomTargetOnSync ? (lang === 'bn' ? 'সুরক্ষিত 🔒' : 'Locked 🔒') : (lang === 'bn' ? 'অটো' : 'Auto')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Sync Action & Auto Poll Settings */}
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="modal-auto-sync-toggle"
                        checked={match.liveSyncEnabled || false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          if (enabled && !match.liveMatchUrl && liveUrlInput.trim()) {
                            setMatch(prev => ({ ...prev, liveMatchUrl: liveUrlInput.trim(), liveSyncEnabled: true }));
                            fetchLiveMatchData(liveUrlInput.trim(), true);
                          } else {
                            setMatch(prev => ({ ...prev, liveSyncEnabled: enabled }));
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="modal-auto-sync-toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                        {lang === 'bn' ? 'স্বয়ংক্রিয় লাইভ সিঙ্ক (Auto Polling)' : 'Auto Polling Sync'}
                      </label>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isFetchingLiveUrl || !liveUrlInput.trim()}
                      onClick={() => {
                        const clean = liveUrlInput.trim();
                        setMatch(prev => ({ ...prev, liveMatchUrl: clean, liveSyncEnabled: true }));
                        fetchLiveMatchData(clean, true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-3 h-8 shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={12} className={isFetchingLiveUrl ? "animate-spin" : ""} />
                      {isFetchingLiveUrl ? (lang === 'bn' ? 'ফেচ হচ্ছে...' : 'Fetching...') : (lang === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Sync Now')}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 border-t border-indigo-100 dark:border-slate-700/60 text-xs gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">
                      {lang === 'bn' ? 'সিঙ্ক ফ্রিকোয়েন্সি (রিপ্রেস রেট):' : 'Polling Frequency (Refresh Rate):'}
                    </span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
                      {[0.00000001, 1, 2, 3, 5, 10, 30].map((sec) => {
                        const isSelected = sec === 0.00000001
                          ? (match.liveSyncInterval === 0.00000001 || !match.liveSyncInterval || match.liveSyncInterval < 0.1)
                          : match.liveSyncInterval === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setMatch(prev => ({ ...prev, liveSyncInterval: sec }));
                              toast.success(
                                sec === 0.00000001
                                  ? (lang === 'bn' ? 'প্রতি 0.00000001 সেকেন্ডে অটো রিপ্রেস সেট হয়েছে (ডিফল্ট)' : 'Auto refresh set to 0.00000001s (Default)')
                                  : (lang === 'bn' ? `প্রতি ${sec} সেকেন্ডে সিঙ্ক হবে` : `Sync every ${sec}s`)
                              );
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap",
                              isSelected
                                ? "bg-indigo-600 text-white shadow-xs font-black ring-1 ring-indigo-400"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            )}
                          >
                            {sec === 0.00000001 ? (lang === 'bn' ? '0.00000001s ⚡ (ডিফল্ট)' : '0.00000001s ⚡ (Def)') : `${sec}s`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Active Match Status Preview */}
                {match.liveMatchUrl && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 text-white border border-slate-800 space-y-2.5 font-mono">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", match.liveSyncEnabled ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
                        <span className="font-sans font-black text-emerald-400 text-xs uppercase tracking-wider">
                          {match.battingTeam || match.team1} vs {match.bowlingTeam || match.team2}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {match.lastSyncedAt ? `${lang === 'bn' ? 'আপডেট:' : 'Synced:'} ${match.lastSyncedAt}` : ''}
                      </span>
                    </div>

                    {isUpcomingMatch ? (
                      <div className="flex flex-col gap-2 py-1">
                        <div className="flex items-center justify-between">
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                            <Clock size={12} />
                            {lang === 'bn' ? 'ম্যাচ এখনও শুরু হয়নি' : 'Match Not Started Yet'}
                          </span>
                          <MatchCountdownBadge 
                            startTime={match.matchStartTime}
                            isoTime={match.matchStartTimeIso}
                            lang={lang}
                          />
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-400 font-sans block">
                              {lang === 'bn' ? 'শুরুর নির্ধারিত সময়:' : 'Scheduled Start Time:'}
                            </span>
                            <span className="text-sm font-bold text-amber-300 font-mono">
                              {match.matchStartTime || match.liveStatusText || (lang === 'bn' ? 'শীঘ্রই শুরু হবে' : 'Starting Soon')}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsLiveMatchModalOpen(false);
                              setIsStartTimeEditorOpen(true);
                            }}
                            className="border-amber-400/50 text-amber-300 hover:bg-amber-950/40 text-xs font-bold h-7 rounded-lg"
                          >
                            <Edit3 size={11} className="mr-1" />
                            {lang === 'bn' ? 'সময় পরিবর্তন' : 'Edit Time'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between font-sans">
                        <div>
                          <span className="text-3xl font-black font-mono text-cyan-400 tracking-tight">
                            {match.score}-{match.wickets}
                          </span>
                          <span className="text-slate-400 text-sm ml-2 font-mono">
                            ({Math.floor(match.balls / ballsPerOver)}.{match.balls % ballsPerOver} ov)
                          </span>
                        </div>

                        {match.liveStatusText && (
                          <div className="text-amber-400 font-bold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800 max-w-[200px] truncate text-right">
                            {match.liveStatusText}
                          </div>
                        )}
                      </div>
                    )}

                    {!isUpcomingMatch && match.liveRecentBalls && match.liveRecentBalls.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase font-sans">Recent:</span>
                        {match.liveRecentBalls.slice(-8).map((ball, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono",
                              ball === 'W' ? "bg-red-600 text-white" :
                              (ball === '4' || ball === '6') ? "bg-amber-400 text-black font-black" :
                              "bg-slate-800 text-slate-200 border border-slate-700"
                            )}
                          >
                            {ball}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                {match.liveMatchUrl ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMatch(prev => ({
                        ...prev,
                        liveMatchUrl: "",
                        liveSyncEnabled: false,
                        liveStatusText: undefined,
                        liveRecentBalls: undefined,
                        liveSyncError: undefined,
                        isUpcoming: undefined,
                        matchStartTime: undefined
                      }));
                      setLiveUrlInput("");
                      toast.info(lang === 'bn' ? 'লাইভ লিংক বিচ্ছিন্ন করা হয়েছে' : 'Live link removed');
                    }}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    <X size={13} className="mr-1" />
                    {lang === 'bn' ? 'লিংক মুছুন' : 'Disconnect'}
                  </Button>
                ) : <div />}

                <Button
                  size="sm"
                  onClick={() => setIsLiveMatchModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs px-4 cursor-pointer"
                >
                  {lang === 'bn' ? 'ঠিক আছে' : 'Done'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Start Time & Countdown Editor Modal */}
      <MatchStartTimeEditorModal
        isOpen={isStartTimeEditorOpen}
        onClose={() => setIsStartTimeEditorOpen(false)}
        currentStartTime={match.matchStartTime}
        currentIsoTime={match.matchStartTimeIso}
        isUpcoming={isUpcomingMatch}
        lang={lang}
        onSave={(startTime, isoTime, isUpcoming) => {
          setMatch(prev => ({
            ...prev,
            matchStartTime: startTime,
            matchStartTimeIso: isoTime,
            isUpcoming: isUpcoming,
            liveStatusText: isUpcoming 
              ? (lang === 'bn' ? `ম্যাচ শুরুর নির্ধারিত সময়: ${startTime}` : `Match starts at ${startTime}`) 
              : prev.liveStatusText
          }));
          toast.success(lang === 'bn' ? 'ম্যাচ শুরুর সময় ও কাউন্টডাউন সংরক্ষিত হয়েছে!' : 'Match start countdown updated!');
        }}
        onClear={() => {
          setMatch(prev => ({
            ...prev,
            matchStartTime: undefined,
            matchStartTimeIso: undefined,
            isUpcoming: false
          }));
          toast.info(lang === 'bn' ? 'ম্যাচ শুরুর সময় মুছে ফেলা হয়েছে' : 'Match start time cleared');
        }}
      />

      {/* Target Overs & Target Runs Manager Modal */}
      <TargetManagerModal
        isOpen={isTargetManagerOpen}
        onClose={() => setIsTargetManagerOpen(false)}
        lang={lang}
        maxOvers={match.maxOvers || 20}
        format={match.format}
        target={match.target}
        targetMilestones={match.targetMilestones || []}
        initialFocus={targetManagerInitialFocus}
        onSave={({ maxOvers, target, targetMilestones }) => {
          setMatch(prev => ({
            ...prev,
            maxOvers,
            target,
            targetMilestones
          }));
          toast.success(lang === 'bn' ? '৩ ও ৪ (টার্গেট ওভার ও রান) এবং মাইলস্টোন সফলভাবে আপডেট হয়েছে!' : 'Target overs, runs & milestones updated successfully!');
        }}
      />
    </div>
  );
}
