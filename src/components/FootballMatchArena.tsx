import React, { useState } from 'react';
import { 
  Clock, Share2, Plus, Trash2, Edit3, Check, X, 
  RefreshCw, Activity
} from 'lucide-react';
import { MatchState, FootballGoalEvent, FootballCardEvent, FootballStats, getShortTeamName } from '../types';
import { MatchCountdownBadge } from './MatchCountdown';
import { toast } from 'sonner';

interface FootballMatchArenaProps {
  match: MatchState;
  onUpdateMatch: (updater: (prev: MatchState) => MatchState) => void;
  onShareResult: (match: MatchState) => void;
  onOpenSyncModal: () => void;
  onFetchLive: (url?: string, isManual?: boolean) => void;
  onOpenAdmin?: () => void;
  lang: 'en' | 'bn';
}

export const getFootballSourceHref = (m: MatchState): string => {
  const raw = (m.liveMatchUrl || '').trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const t1 = (m.team1 || 'Team 1').trim();
  const t2 = (m.team2 || 'Team 2').trim();
  return `https://www.google.com/search?q=${encodeURIComponent(`${t1} vs ${t2} sofascore live score`)}`;
};

export const FootballMatchArena: React.FC<FootballMatchArenaProps> = ({
  match,
  onUpdateMatch,
  onShareResult,
  onOpenSyncModal,
  onFetchLive,
  lang
}) => {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalMinute, setGoalMinute] = useState("75'");
  const [goalPlayer, setGoalPlayer] = useState('');
  const [goalTeam, setGoalTeam] = useState<'team1' | 'team2'>('team1');
  const [isPenalty, setIsPenalty] = useState(false);
  const [isOwnGoal, setIsOwnGoal] = useState(false);

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [cardMinute, setCardMinute] = useState("70'");
  const [cardPlayer, setCardPlayer] = useState('');
  const [cardTeam, setCardTeam] = useState<'team1' | 'team2'>('team1');
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');

  const [isEditingMinute, setIsEditingMinute] = useState(false);
  const [minuteInput, setMinuteInput] = useState(String(match.footballMinute || "74'"));

  const [isEditingVenue, setIsEditingVenue] = useState(false);
  const [venueInput, setVenueInput] = useState(match.footballVenue || '');

  const score1 = match.footballScore1 ?? 0;
  const score2 = match.footballScore2 ?? 0;
  const rawMin = String(match.footballMinute || 'Upcoming');
  const rawPer = String(match.footballPeriod || 'Not started');
  const hasActiveLiveMinute = /^\d{1,3}(?:\+\d{1,2})?'?$/.test(rawMin.trim());
  const isFinished =
    Boolean(match.isFinished) ||
    rawPer.toUpperCase() === 'FT' ||
    rawMin.toUpperCase() === 'FT' ||
    (!hasActiveLiveMinute && (
      rawMin.toLowerCase().includes('finish') ||
      String(match.liveStatusText || '').toLowerCase().includes('finish') ||
      String(match.liveStatusText || '').toLowerCase().includes('full time')
    ));
  const isUpc = !isFinished && (
    match.isUpcoming === true ||
    (!hasActiveLiveMinute &&
      score1 === 0 &&
      score2 === 0 &&
      ['upcoming', 'not started', 'pre', 'scheduled', ''].includes(rawMin.toLowerCase().trim()))
  );
  const shortT1 = getShortTeamName(match.team1, 'T1');
  const shortT2 = getShortTeamName(match.team2, 'T2');
  const minute = isFinished ? 'FT' : isUpc ? 'Upcoming' : rawMin;
  const period = isFinished ? 'FT' : isUpc ? 'Not started' : rawPer;
  const goals = isUpc ? [] : (match.footballGoals || []);
  const cards = isUpc ? [] : (match.footballCards || []);
  const stats: FootballStats = match.footballStats || {
    possession: [48, 52],
    shots: [4, 9],
    shotsOnTarget: [1, 2],
    corners: [2, 3],
    fouls: [10, 13],
    yellowCards: [1, 2],
    redCards: [0, 0],
    offsides: [0, 0]
  };

  const sourceHref = getFootballSourceHref(match);

  const handleAdjustScore = (team: 1 | 2, delta: number) => {
    onUpdateMatch(prev => {
      const next = { ...prev, isUpcoming: false, isFinished: false, sectionOverride: 'live' as const };
      if (team === 1) {
        next.footballScore1 = Math.max(0, (next.footballScore1 ?? 0) + delta);
      } else {
        next.footballScore2 = Math.max(0, (next.footballScore2 ?? 0) + delta);
      }
      if (!next.footballMinute || String(next.footballMinute).toLowerCase() === 'upcoming' || String(next.footballMinute).toUpperCase() === 'FT') {
        next.footballMinute = "79'";
      }
      if (!next.footballPeriod || String(next.footballPeriod).toLowerCase() === 'not started' || String(next.footballPeriod).toUpperCase() === 'FT') {
        next.footballPeriod = '2H';
      }
      next.liveStatusText = `${next.team1} ${next.footballScore1} - ${next.footballScore2} ${next.team2} (${next.footballMinute || ''})`;
      return next;
    });
  };

  const handleSetPeriod = (p: '1H' | 'HT' | '2H' | 'ET' | 'P' | 'FT') => {
    onUpdateMatch(prev => {
      const curMin = String(prev.footballMinute || '');
      const isResettableMin =
        !curMin ||
        curMin.toLowerCase() === 'upcoming' ||
        curMin.toLowerCase() === 'not started' ||
        curMin.toUpperCase() === 'FT' ||
        curMin.toUpperCase() === 'HT';
      const cleanMin = isResettableMin
        ? (p === '1H' ? "25'" : p === 'ET' ? "95'" : p === 'P' ? 'PEN' : "79'")
        : curMin;
      return {
        ...prev,
        isUpcoming: false,
        isFinished: p === 'FT',
        sectionOverride: p === 'FT' ? 'finished' : 'live',
        footballPeriod: p,
        footballMinute: p === 'HT' ? 'HT' : p === 'FT' ? 'FT' : cleanMin,
        liveStatusText: p === 'FT'
          ? `FT • ${prev.team1} ${prev.footballScore1 ?? 0} - ${prev.footballScore2 ?? 0} ${prev.team2} (Finished)`
          : `${p} • ${prev.team1} ${prev.footballScore1 ?? 0} - ${prev.footballScore2 ?? 0} ${prev.team2} (${p === 'HT' ? 'HT' : cleanMin})`
      };
    });
    toast.success(lang === 'bn' ? `ম্যাচের অবস্থা পরিবর্তিত: ${p}` : `Match period set to: ${p}`);
  };

  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalPlayer.trim()) {
      toast.error(lang === 'bn' ? 'দয়া করে গোলদাতার নাম লিখুন' : 'Please enter scorer name');
      return;
    }
    const cleanMin = goalMinute.includes("'") ? goalMinute : `${goalMinute}'`;
    const newGoal: FootballGoalEvent = {
      id: `goal-${Date.now()}`,
      minute: cleanMin,
      player: goalPlayer.trim(),
      team: goalTeam,
      isPenalty,
      isOwnGoal
    };

    onUpdateMatch(prev => {
      const nextGoals = [...(prev.footballGoals || []), newGoal];
      const next = {
        ...prev,
        footballGoals: nextGoals,
        footballScore1: goalTeam === 'team1' ? (prev.footballScore1 ?? 0) + 1 : prev.footballScore1,
        footballScore2: goalTeam === 'team2' ? (prev.footballScore2 ?? 0) + 1 : prev.footballScore2
      };
      next.liveStatusText = `⚽ GOAL! ${goalPlayer.trim()} ${cleanMin}`;
      return next;
    });

    toast.success(lang === 'bn' ? `⚽ গোল যুক্ত হয়েছে: ${goalPlayer} (${cleanMin})` : `⚽ Goal added: ${goalPlayer} (${cleanMin})`);
    setIsAddingGoal(false);
    setGoalPlayer('');
    setIsPenalty(false);
    setIsOwnGoal(false);
  };

  const handleDeleteGoal = (index: number) => {
    onUpdateMatch(prev => {
      const g = (prev.footballGoals || [])[index];
      const filtered = (prev.footballGoals || []).filter((_, idx) => idx !== index);
      const next = { ...prev, footballGoals: filtered };
      if (g) {
        if (g.team === 'team1') next.footballScore1 = Math.max(0, (next.footballScore1 ?? 0) - 1);
        if (g.team === 'team2') next.footballScore2 = Math.max(0, (next.footballScore2 ?? 0) - 1);
      }
      return next;
    });
    toast.info(lang === 'bn' ? 'গোল মুছে ফেলা হয়েছে' : 'Goal removed');
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardPlayer.trim()) {
      toast.error(lang === 'bn' ? 'দয়া করে খেলোয়াড়ের নাম লিখুন' : 'Please enter player name');
      return;
    }
    const cleanMin = cardMinute.includes("'") ? cardMinute : `${cardMinute}'`;
    const newCard: FootballCardEvent = {
      id: `card-${Date.now()}`,
      minute: cleanMin,
      player: cardPlayer.trim(),
      team: cardTeam,
      type: cardType
    };

    onUpdateMatch(prev => ({
      ...prev,
      footballCards: [...(prev.footballCards || []), newCard]
    }));

    toast.success(lang === 'bn' ? `কার্ড যুক্ত হয়েছে: ${cardPlayer}` : `Card added: ${cardPlayer}`);
    setIsAddingCard(false);
    setCardPlayer('');
  };

  const handleDeleteCard = (index: number) => {
    onUpdateMatch(prev => ({
      ...prev,
      footballCards: (prev.footballCards || []).filter((_, idx) => idx !== index)
    }));
    toast.info(lang === 'bn' ? 'কার্ড মুছে ফেলা হয়েছে' : 'Card removed');
  };

  const handleAdjustStat = (key: keyof FootballStats, teamIndex: 0 | 1, delta: number) => {
    onUpdateMatch(prev => {
      const curStats = { ...(prev.footballStats || stats) };
      const curPair: [number, number] = curStats[key] ? [...curStats[key]!] : [0, 0];
      curPair[teamIndex] = Math.max(0, curPair[teamIndex] + delta);
      if (key === 'possession') {
        curPair[1 - teamIndex] = Math.max(0, 100 - curPair[teamIndex]);
      }
      curStats[key] = curPair;
      return { ...prev, footballStats: curStats };
    });
  };

  const poss1 = stats.possession ? stats.possession[0] : 48;
  const poss2 = stats.possession ? stats.possession[1] : 52;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Main Football Stadium Scoreboard Card (Matches Image 1) */}
      <div className="w-full rounded-[28px] bg-gradient-to-b from-[#0b1530] via-[#091021] to-[#050914] border border-blue-500/30 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Dotted Stadium Pattern Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#3b82f6_1.2px,transparent_1.2px)] [background-size:18px_18px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-2.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent blur-xs opacity-80" />

        {/* Top Header: ⚽ ফুটবল ম্যাচ Pill & Period Switcher (১ম | বিরতি | ২য় | পূর্ণ সময়) */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3.5 mb-5 relative z-10 flex-wrap">
          <div className="flex items-center gap-2">
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={lang === 'bn' ? 'সোর্স লিংক ওপেন করতে ক্লিক করুন' : 'Click to open source link'}
              className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide bg-[#102046]/90 hover:bg-[#162d61] text-[#60a5fa] border border-blue-500/40 flex items-center gap-2 shadow-inner cursor-pointer transition-all"
            >
              <span className="text-base select-none leading-none">⚽</span>
              <span>{lang === 'bn' ? 'ফুটবল ম্যাচ' : 'Football Match'}</span>
            </a>
            {isFinished ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {lang === 'bn' ? '🏁 সমাপ্ত (FT)' : '🏁 FT • Finished'}
              </span>
            ) : isUpc ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {lang === 'bn' ? '⏰ এখনো শুরু হয়নি' : '⏰ Not Started'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                {lang === 'bn' ? '🔴 চলমান (LIVE)' : '🔴 LIVE'}
              </span>
            )}
          </div>

          {/* Period Badges: ১ম | বিরতি | ২য় | পূর্ণ সময় */}
          <div className="flex items-center gap-1 bg-[#060a14]/90 p-1 rounded-full border border-white/10">
            {(['1H', 'HT', '2H', 'FT'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleSetPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                  period === p 
                    ? 'bg-[#1d63ff] text-white shadow-[0_0_14px_rgba(29,99,255,0.65)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === '1H' ? (lang === 'bn' ? '১ম' : '1H') :
                 p === 'HT' ? (lang === 'bn' ? 'বিরতি' : 'HT') :
                 p === '2H' ? (lang === 'bn' ? '২য়' : '2H') : (lang === 'bn' ? 'পূর্ণ সময়' : 'FT')}
              </button>
            ))}
          </div>
        </div>

        {/* Center Teams & Glowing Scoreboard (Matches Image 1) */}
        <div className="grid grid-cols-7 items-center gap-2 sm:gap-4 my-2 relative z-10">
          {/* Team 1 (Home) */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              title={lang === 'bn' ? `${match.team1} - সোর্স লিংক ওপেন করতে ক্লিক করুন` : `Click to open source link for ${match.team1}`}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#4f46e5] to-[#3730a3] border-2 border-indigo-400/60 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_24px_rgba(79,70,229,0.5)] mb-2.5 select-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              🏰
            </a>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate max-w-full" title={match.team1 || 'Team 1'}>
              {shortT1}
            </h2>
            <span className="text-[11px] uppercase font-black text-[#4b83f2] tracking-wider mt-0.5">HOME</span>
            {/* Inline Team 1 Goal Scorers */}
            {goals.filter(g => g.team === 'team1').length > 0 && (
              <div className="mt-2 space-y-0.5 text-xs text-slate-200 font-medium">
                {goals
                  .filter(g => g.team === 'team1')
                  .map((g, i) => (
                    <div key={g.id || i} className="flex items-center justify-center gap-1">
                      <span className="truncate max-w-[130px]">{g.player}</span>
                      <span className="text-emerald-400 font-mono font-bold">{g.minute}</span>
                      <span>⚽</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Center: Glowing Score (or VS if not started) & Match Clock */}
          <div className="col-span-1 flex flex-col items-center justify-center text-center">
            {isUpc ? (
              <div className="flex flex-col items-center justify-center">
                <span className="font-mono font-black text-2xl sm:text-3xl text-amber-300 tracking-widest px-3 py-1 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  VS
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 font-mono font-black text-4xl sm:text-5xl text-white tracking-tight drop-shadow-[0_0_16px_rgba(59,130,246,0.45)]">
                <span
                  onClick={() => handleAdjustScore(1, 1)}
                  onContextMenu={(e) => { e.preventDefault(); handleAdjustScore(1, -1); }}
                  className="text-[#8ab4f8] cursor-pointer select-none"
                  title={lang === 'bn' ? 'ক্লিক করলে গোল বাড়বে' : 'Click to increment score'}
                >
                  {score1}
                </span>
                <span className="text-slate-500 text-2xl sm:text-3xl">-</span>
                <span
                  onClick={() => handleAdjustScore(2, 1)}
                  onContextMenu={(e) => { e.preventDefault(); handleAdjustScore(2, -1); }}
                  className="text-[#22d3ee] cursor-pointer select-none"
                  title={lang === 'bn' ? 'ক্লিক করলে গোল বাড়বে' : 'Click to increment score'}
                >
                  {score2}
                </span>
              </div>
            )}

            {/* Match Minute Clock Pill */}
            {isEditingMinute ? (
              <div className="flex items-center gap-1 mt-3">
                <input
                  type="text"
                  value={minuteInput}
                  onChange={e => setMinuteInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onUpdateMatch(prev => ({ ...prev, footballMinute: minuteInput.trim() }));
                      setIsEditingMinute(false);
                    }
                    if (e.key === 'Escape') setIsEditingMinute(false);
                  }}
                  autoFocus
                  placeholder="79'"
                  className="w-14 bg-slate-900 border border-blue-400 text-center font-mono text-xs text-white rounded-full px-2 py-0.5 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMatch(prev => ({ ...prev, footballMinute: minuteInput.trim() }));
                    setIsEditingMinute(false);
                  }}
                  className="p-1 rounded-full bg-blue-600 text-white text-xs cursor-pointer"
                >
                  <Check size={10} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setMinuteInput(String(minute));
                  setIsEditingMinute(true);
                }}
                className={`mt-3 px-4 py-1 rounded-full border font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-inner whitespace-nowrap ${
                  isFinished
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#091224]/95 border-blue-500/40 text-[#8ab4f8] hover:border-blue-400'
                }`}
                title={lang === 'bn' ? 'মিনিট পরিবর্তন করতে ক্লিক করুন' : 'Click to edit minute'}
              >
                <Clock size={12} className={isFinished ? 'text-amber-400' : 'text-blue-400'} />
                <span>{isFinished ? 'FT' : isUpc ? (lang === 'bn' ? 'আপকামিং' : 'Upcoming') : minute}</span>
              </div>
            )}
            {isUpc && (
              <div className="mt-2">
                <MatchCountdownBadge
                  startTime={match.matchStartTime || match.liveStatusText}
                  isoTime={match.matchStartTimeIso}
                  lang={lang}
                />
              </div>
            )}
          </div>

          {/* Team 2 (Away) */}
          <div className="col-span-3 flex flex-col items-center text-center">
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              title={lang === 'bn' ? `${match.team2} - সোর্স লিংক ওপেন করতে ক্লিক করুন` : `Click to open source link for ${match.team2}`}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#14b8a6] to-[#0f766e] border-2 border-teal-400/60 flex items-center justify-center text-3xl sm:text-4xl shadow-[0_0_24px_rgba(20,184,166,0.5)] mb-2.5 select-none cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              ⚔️
            </a>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate max-w-full" title={match.team2 || 'Team 2'}>
              {shortT2}
            </h2>
            <span className="text-[11px] uppercase font-black text-[#14b8a6] tracking-wider mt-0.5">AWAY</span>
            {/* Inline Team 2 Goal Scorers */}
            {goals.filter(g => g.team === 'team2').length > 0 && (
              <div className="mt-2 space-y-0.5 text-xs text-slate-200 font-medium">
                {goals
                  .filter(g => g.team === 'team2')
                  .map((g, i) => (
                    <div key={g.id || i} className="flex items-center justify-center gap-1">
                      <span>⚽</span>
                      <span className="truncate max-w-[130px]">{g.player}</span>
                      <span className="text-cyan-400 font-mono font-bold">{g.minute}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Stadium & Quick Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 mt-4 text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-2">
            <span>🏟️</span>
            {isEditingVenue ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={venueInput}
                  onChange={e => setVenueInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onUpdateMatch(prev => ({ ...prev, footballVenue: venueInput.trim() }));
                      setIsEditingVenue(false);
                    }
                    if (e.key === 'Escape') setIsEditingVenue(false);
                  }}
                  autoFocus
                  placeholder="Stadium"
                  className="bg-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-white text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMatch(prev => ({ ...prev, footballVenue: venueInput.trim() }));
                    setIsEditingVenue(false);
                  }}
                  className="p-1 rounded bg-blue-600 text-white text-xs cursor-pointer"
                >
                  <Check size={10} />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setVenueInput(match.footballVenue || '');
                  setIsEditingVenue(true);
                }}
                className="font-medium hover:text-white cursor-pointer hover:underline transition-colors"
                title="Click to edit stadium"
              >
                {match.footballVenue || (lang === 'bn' ? 'স্টেডিয়াম যুক্ত করুন' : 'Official Stadium')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onFetchLive(match.liveMatchUrl, true)}
              className="px-2.5 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <RefreshCw size={11} />
              <span>{lang === 'bn' ? 'সিঙ্ক' : 'Sync'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{lang === 'bn' ? 'লিংক' : 'Link'}</span>
            </button>
            <button
              type="button"
              onClick={() => onShareResult(match)}
              className="px-2.5 py-1 rounded-full bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Share2 size={11} />
              <span>{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Goal Timeline & Scorers Section (Matches Image 3) */}
      <div className="w-full rounded-[26px] bg-[#0d1323] border border-slate-800/90 p-4 sm:p-5 shadow-xl space-y-3 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">⚽</span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
              {lang === 'bn' ? 'গোল ও স্কোরার তালিকা' : 'Goals & Scorers'} ({goals.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingGoal(true)}
            className="px-3.5 py-1.5 rounded-full border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 text-xs font-black cursor-pointer flex items-center gap-1"
          >
            <Plus size={12} />
            <span>{lang === 'bn' ? '+ গোল যোগ' : '+ Add Goal'}</span>
          </button>
        </div>

        {isAddingGoal && (
          <form onSubmit={handleAddGoalSubmit} className="p-3.5 rounded-2xl bg-[#11192e] border border-blue-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-300">
                {lang === 'bn' ? 'নতুন গোল বিবরণ:' : 'New Goal Details:'}
              </span>
              <button type="button" onClick={() => setIsAddingGoal(false)}>
                <X size={14} className="text-slate-400 hover:text-red-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={goalMinute}
                onChange={e => setGoalMinute(e.target.value)}
                placeholder="9'"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={goalPlayer}
                onChange={e => setGoalPlayer(e.target.value)}
                placeholder="Player Name"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-blue-500"
              />
              <select
                value={goalTeam}
                onChange={e => setGoalTeam(e.target.value as 'team1' | 'team2')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-blue-500"
              >
                <option value="team1">{shortT1}</option>
                <option value="team2">{shortT2}</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPenalty}
                  onChange={e => setIsPenalty(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'bn' ? 'পেনাল্টি (PEN)' : 'Penalty (PEN)'}</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOwnGoal}
                  onChange={e => setIsOwnGoal(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'bn' ? 'আত্মঘাতী গোল (OG)' : 'Own Goal (OG)'}</span>
              </label>
            </div>

            <button type="submit" className="w-full h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl cursor-pointer">
              <Check size={12} className="mr-1" />
              <span>{lang === 'bn' ? 'গোল নিশ্চিত করুন' : 'Confirm Goal'}</span>
            </button>
          </form>
        )}

        {goals.length === 0 ? (
          <p className="text-center py-3 text-xs text-slate-500 italic font-mono">
            {lang === 'bn' ? 'এখনও কোনো গোল হয়নি' : 'No goals scored yet'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {goals.map((g, idx) => {
              const isT1 = g.team === 'team1';
              const teamName = isT1 ? shortT1 : shortT2;
              return (
                <div
                  key={g.id || idx}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#11192e] border border-blue-500/20"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm select-none">⚽</span>
                    <span className="font-mono font-black text-xs text-blue-400">
                      {g.minute}
                    </span>
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs sm:text-sm font-black text-white truncate">
                        {g.player}
                      </span>
                      <span className="text-xs text-slate-400 font-medium truncate">
                        ({teamName})
                      </span>
                      {g.isPenalty && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          PEN
                        </span>
                      )}
                      {g.isOwnGoal && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          OG
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(idx)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                    title="Delete goal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Cards & Discipline Section (Matches Image 3) */}
      <div className="w-full rounded-[26px] bg-[#0d1323] border border-slate-800/90 p-4 sm:p-5 shadow-xl space-y-3.5 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg select-none">🟨</span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {lang === 'bn' ? 'কার্ড ও ফাউল তালিকা' : 'Cards & Discipline'} ({cards.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="px-3.5 py-1.5 rounded-full border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs font-black cursor-pointer flex items-center gap-1"
          >
            <Plus size={12} />
            <span>{lang === 'bn' ? '+ কার্ড যোগ' : '+ Add Card'}</span>
          </button>
        </div>

        {isAddingCard && (
          <form onSubmit={handleAddCardSubmit} className="p-3.5 rounded-2xl bg-[#131b2e] border border-amber-700/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300">
                {lang === 'bn' ? 'নতুন কার্ডের বিবরণ:' : 'New Card Details:'}
              </span>
              <button type="button" onClick={() => setIsAddingCard(false)}>
                <X size={14} className="text-slate-400 hover:text-red-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={cardMinute}
                onChange={e => setCardMinute(e.target.value)}
                placeholder="31'"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none"
              />
              <input
                type="text"
                value={cardPlayer}
                onChange={e => setCardPlayer(e.target.value)}
                placeholder="Player name"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none"
              />
              <select
                value={cardTeam}
                onChange={e => setCardTeam(e.target.value as 'team1' | 'team2')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-white outline-none"
              >
                <option value="team1">{shortT1}</option>
                <option value="team2">{shortT2}</option>
              </select>
              <select
                value={cardType}
                onChange={e => setCardType(e.target.value as 'yellow' | 'red')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-white outline-none"
              >
                <option value="yellow">🟨 Yellow</option>
                <option value="red">🟥 Red</option>
              </select>
            </div>

            <button type="submit" className="w-full h-8 flex items-center justify-center bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl cursor-pointer">
              <Check size={12} className="mr-1" />
              <span>{lang === 'bn' ? 'কার্ড নিশ্চিত করুন' : 'Confirm Card'}</span>
            </button>
          </form>
        )}

        {cards.length === 0 ? (
          <p className="text-center py-3 text-xs text-slate-500 italic font-mono">
            {lang === 'bn' ? 'কোনো কার্ড নেই' : 'No cards issued'}
          </p>
        ) : (
          <div className="space-y-2.5">
            {cards.map((c, idx) => (
              <div
                key={c.id || idx}
                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#131b2e] border border-slate-700/60"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-lg select-none">{c.type === 'red' ? '🟥' : '🟨'}</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-slate-400">{c.minute}</span>
                  <span className="text-xs sm:text-sm font-black text-white truncate">{c.player}</span>
                  <span className="text-xs text-slate-400 truncate">({c.team === 'team1' ? shortT1 : shortT2})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCard(idx)}
                  className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Football Match Statistics (ম্যাচ পরিসংখ্যান - Matches Image 3) */}
      <div className="w-full rounded-[26px] bg-[#0d1323] border border-slate-800/90 p-4 sm:p-5 shadow-xl space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-blue-500 shrink-0" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {lang === 'bn' ? 'ম্যাচ পরিসংখ্যান' : 'Match Statistics'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono font-black text-right">
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[120px]"
              title={lang === 'bn' ? `${match.team1} - সোর্স লিংক ওপেন করুন` : `Open source link for ${match.team1}`}
            >
              <span>🏰</span>
              <span className="truncate">{shortT1}</span>
            </a>
            <span className="text-slate-400">vs</span>
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1 truncate max-w-[130px]"
              title={lang === 'bn' ? `${match.team2} - সোর্স লিংক ওপেন করুন` : `Open source link for ${match.team2}`}
            >
              <span>⚔️</span>
              <span className="truncate">{shortT2}</span>
            </a>
          </div>
        </div>

        {/* Possession Dual Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
            <span className="font-mono text-blue-400">{poss1}%</span>
            <span className="uppercase text-[11px] tracking-wider text-slate-400">
              {lang === 'bn' ? 'বল দখল (POSSESSION)' : 'BALL POSSESSION'}
            </span>
            <span className="font-mono text-cyan-400">{poss2}%</span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${poss1}%` }} 
              className="bg-[#2563eb] h-full transition-all duration-300" 
            />
            <div 
              style={{ width: `${poss2}%` }} 
              className="bg-[#06b6d4] h-full transition-all duration-300" 
            />
          </div>
          <div className="flex justify-between items-center text-[11px] pt-0.5">
            <div className="flex gap-1.5">
              <button 
                type="button" 
                onClick={() => handleAdjustStat('possession', 0, 5)} 
                className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 cursor-pointer"
              >
                +5%
              </button>
              <button 
                type="button" 
                onClick={() => handleAdjustStat('possession', 0, -5)} 
                className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer"
              >
                -5%
              </button>
            </div>
            <div className="flex gap-1.5">
              <button 
                type="button" 
                onClick={() => handleAdjustStat('possession', 1, -5)} 
                className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer"
              >
                -5%
              </button>
              <button 
                type="button" 
                onClick={() => handleAdjustStat('possession', 1, 5)} 
                className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 font-bold hover:bg-cyan-500/30 cursor-pointer"
              >
                +5%
              </button>
            </div>
          </div>
        </div>

        {/* Comparative Stats Grid */}
        <div className="space-y-3 pt-2">
          {[
            { label: lang === 'bn' ? 'মোট শট' : 'Total Shots', key: 'shots' as keyof FootballStats },
            { label: lang === 'bn' ? 'টার্গেটে শট' : 'Shots on Target', key: 'shotsOnTarget' as keyof FootballStats },
            { label: lang === 'bn' ? 'কর্নার কিক' : 'Corner Kicks', key: 'corners' as keyof FootballStats },
            { label: lang === 'bn' ? 'ফাউল' : 'Fouls', key: 'fouls' as keyof FootballStats },
            { label: lang === 'bn' ? 'অফসাইড' : 'Offsides', key: 'offsides' as keyof FootballStats },
          ].map(statItem => {
            const pair = stats[statItem.key] || [0, 0];
            const v1 = pair[0];
            const v2 = pair[1];
            const total = (v1 + v2) || 1;
            const pct1 = v1 === 0 && v2 === 0 ? 50 : Math.round((v1 / total) * 100);

            return (
              <div key={statItem.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-mono font-bold text-blue-400">
                    <button
                      type="button"
                      onClick={() => handleAdjustStat(statItem.key, 0, 1)}
                      className="w-6 h-6 rounded-lg bg-[#162038] hover:bg-blue-600 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      +
                    </button>
                    <span>{v1}</span>
                  </div>

                  <span className="text-xs font-bold text-slate-400">
                    {statItem.label}
                  </span>

                  <div className="flex items-center gap-2 font-mono font-bold text-cyan-400">
                    <span>{v2}</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustStat(statItem.key, 1, 1)}
                      className="w-6 h-6 rounded-lg bg-[#162038] hover:bg-cyan-600 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                  <div style={{ width: `${pct1}%` }} className="bg-[#3b82f6] h-full transition-all duration-300" />
                  <div style={{ width: `${100 - pct1}%` }} className="bg-[#06b6d4] h-full transition-all duration-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
