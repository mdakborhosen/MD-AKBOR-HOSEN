import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { X, Trophy, Award, Target, Edit3, Flame, User } from 'lucide-react';
import { MatchState, PlayerStats, BowlerStats } from '../types';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  teamName?: string;
  currentMatch: MatchState;
  allMatches: MatchState[];
  lang?: string;
  onEditCurrentBatter?: () => void;
}

function parseOversToFloat(oversStr: string | number | undefined, bpo = 6): number {
  if (typeof oversStr === 'number') return Number.isFinite(oversStr) ? oversStr : 0;
  const parts = String(oversStr || '0').trim().split('.');
  const ov = parseInt(parts[0] || '0', 10) || 0;
  const rem = parseInt(parts[1] || '0', 10) || 0;
  return ov + rem / bpo;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  playerName,
  teamName,
  currentMatch,
  allMatches,
  lang = 'en',
  onEditCurrentBatter
}) => {
  const cleanTarget = (playerName || '').trim().toLowerCase();

  const profile = useMemo(() => {
    if (!cleanTarget) return null;

    const findBatterInMatch = (m: MatchState): PlayerStats | null => {
      const pools = [
        ...(m.team1BattingStats || []),
        ...(m.team2BattingStats || []),
        ...(m.battingStats || [])
      ];
      return (
        pools.find((p) => (p.name || '').trim().toLowerCase() === cleanTarget && !p.yetToBat) ||
        pools.find((p) => (p.name || '').trim().toLowerCase() === cleanTarget) ||
        null
      );
    };

    const findBowlerInMatch = (m: MatchState): BowlerStats | null => {
      const pools = [
        ...(m.team1BowlingStats || []),
        ...(m.team2BowlingStats || []),
        ...(m.liveBowlerStats ? [m.liveBowlerStats] : [])
      ];
      return pools.find((bw) => (bw.name || '').trim().toLowerCase() === cleanTarget) || null;
    };

    const currentBat = findBatterInMatch(currentMatch);
    const currentBowl = findBowlerInMatch(currentMatch);

    let matchesPlayed = 0;
    let totalRuns = 0;
    let totalBallsFaced = 0;
    let totalFours = 0;
    let totalSixes = 0;
    let highScore = 0;
    let outs = 0;

    let totalWickets = 0;
    let totalRunsConceded = 0;
    let totalOversFloat = 0;
    let bestWickets = 0;
    let bestConceded = 999;

    const matchChartData: Array<{ match: string; runs: number; sr: number; wickets: number }> = [];

    const sourceList = allMatches.some((m) => m.id === currentMatch.id)
      ? allMatches
      : [currentMatch, ...allMatches];

    sourceList.forEach((m) => {
      const b = findBatterInMatch(m);
      const bw = findBowlerInMatch(m);
      if (!b && !bw) return;
      matchesPlayed += 1;

      const bpo = m.format === '100' ? 5 : 6;
      const mRuns = b && !b.yetToBat ? b.runs || 0 : 0;
      const mBalls = b && !b.yetToBat ? b.balls || 0 : 0;
      const mSr = mBalls > 0 ? Number(((mRuns / mBalls) * 100).toFixed(1)) : 0;

      if (b && !b.yetToBat) {
        totalRuns += mRuns;
        totalBallsFaced += mBalls;
        totalFours += b.fours || 0;
        totalSixes += b.sixes || 0;
        if (mRuns > highScore) highScore = mRuns;
        if (b.isOut) outs += 1;
      }

      const mWickets = bw?.wickets || 0;
      const mConceded = bw?.runs || 0;
      const mOvFloat = parseOversToFloat(bw?.overs, bpo);
      if (bw) {
        totalWickets += mWickets;
        totalRunsConceded += mConceded;
        totalOversFloat += mOvFloat;
        if (mWickets > bestWickets || (mWickets === bestWickets && mWickets > 0 && mConceded < bestConceded)) {
          bestWickets = mWickets;
          bestConceded = mConceded;
        }
      }

      const shortMatch = `${(m.team1 || 'T1').slice(0, 4)}v${(m.team2 || 'T2').slice(0, 4)}`;
      matchChartData.push({
        match: shortMatch,
        runs: mRuns,
        sr: mSr,
        wickets: mWickets
      });
    });

    const careerSr = totalBallsFaced > 0 ? ((totalRuns / totalBallsFaced) * 100).toFixed(1) : '0.0';
    const careerAvg = outs > 0 ? (totalRuns / outs).toFixed(2) : totalRuns > 0 ? `${totalRuns}.00*` : '0.00';
    const careerEcon = totalOversFloat > 0 ? (totalRunsConceded / totalOversFloat).toFixed(2) : '0.00';

    const role =
      (currentBat || totalRuns > 0) && (currentBowl || totalWickets > 0)
        ? (lang === 'bn' ? 'অলরাউন্ডার' : 'All-Rounder')
        : currentBowl || totalWickets > 0
        ? (lang === 'bn' ? 'বোলার' : 'Bowler')
        : (lang === 'bn' ? 'ব্যাটার' : 'Batter');

    const initials = (playerName || 'P')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      initials,
      role,
      currentBat,
      currentBowl,
      matchesPlayed: Math.max(1, matchesPlayed),
      totalRuns,
      highScore,
      totalFours,
      totalSixes,
      careerSr,
      careerAvg,
      totalWickets,
      bestBowling: bestWickets > 0 ? `${bestWickets}/${bestConceded}` : '0/0',
      careerEcon,
      matchChartData: matchChartData.slice(0, 8)
    };
  }, [cleanTarget, currentMatch, allMatches, playerName, lang]);

  if (!isOpen || !playerName || !profile) return null;

  const curBatSr =
    profile.currentBat && profile.currentBat.balls > 0
      ? ((profile.currentBat.runs / profile.currentBat.balls) * 100).toFixed(1)
      : '0.0';

  const curBoundaryRuns =
    profile.currentBat ? (profile.currentBat.fours || 0) * 4 + (profile.currentBat.sixes || 0) * 6 : 0;
  const curBoundaryPct =
    profile.currentBat && profile.currentBat.runs > 0
      ? Math.round((curBoundaryRuns / profile.currentBat.runs) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-950 border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden text-white max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Profile Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shrink-0">
              {profile.initials || <User size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">{playerName}</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-black uppercase">
                  {profile.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {teamName || `${currentMatch.team1} vs ${currentMatch.team2}`} • {profile.matchesPlayed}{' '}
                {lang === 'bn' ? 'ম্যাচ' : profile.matchesPlayed === 1 ? 'Match' : 'Matches'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onEditCurrentBatter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditCurrentBatter();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={12} />
                <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Current Match Performance */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Flame size={13} />
              <span>{lang === 'bn' ? 'চলতি ম্যাচ পারফরম্যান্স' : 'Current Match Performance'}</span>
            </div>

            {profile.currentBat && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-300">{lang === 'bn' ? 'ব্যাটিং' : 'Batting'}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    profile.currentBat.isOut
                      ? 'bg-rose-500/20 text-rose-300'
                      : profile.currentBat.yetToBat
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {profile.currentBat.isOut
                      ? profile.currentBat.wicketType || 'Out'
                      : profile.currentBat.yetToBat
                      ? 'Yet to bat'
                      : 'Not Out*'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-white">{profile.currentBat.runs}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Runs</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-slate-200">{profile.currentBat.balls}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Balls</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-sky-400">{profile.currentBat.fours}</div>
                    <div className="text-[9px] text-slate-400 uppercase">4s</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-purple-400">{profile.currentBat.sixes}</div>
                    <div className="text-[9px] text-slate-400 uppercase">6s</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-amber-300">{curBatSr}</div>
                    <div className="text-[9px] text-slate-400 uppercase">SR</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between px-1">
                  <span>{lang === 'bn' ? 'বাউন্ডারি রান:' : 'Boundary %:'} <strong className="text-emerald-400">{curBoundaryPct}%</strong></span>
                  <span>{curBoundaryRuns} {lang === 'bn' ? 'বাউন্ডারি রান' : 'boundary runs'}</span>
                </div>
              </div>
            )}

            {profile.currentBowl && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Target size={13} />
                  <span>{lang === 'bn' ? 'বোলিং' : 'Bowling'}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-white">{profile.currentBowl.overs || '0.0'}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Overs</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-slate-200">{profile.currentBowl.maidens ?? 0}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Mdn</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-slate-200">{profile.currentBowl.runs ?? 0}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Runs</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-emerald-400">{profile.currentBowl.wickets ?? 0}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Wkts</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-sm font-black font-mono text-amber-300">{profile.currentBowl.economy || profile.currentBowl.econ || '0.00'}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Econ</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Career Summary Across All App Matches */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Trophy size={13} />
              <span>{lang === 'bn' ? 'ক্যারিয়ার পরিসংখ্যান (সব ম্যাচ)' : 'Career Overview (App Matches)'}</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-white">{profile.totalRuns}</div>
                <div className="text-[9px] text-slate-400">Tot Runs</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-emerald-400">{profile.highScore}</div>
                <div className="text-[9px] text-slate-400">Best</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-amber-300">{profile.careerSr}</div>
                <div className="text-[9px] text-slate-400">Career SR</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-sky-300">{profile.careerAvg}</div>
                <div className="text-[9px] text-slate-400">Avg</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-cyan-400">{profile.totalWickets}</div>
                <div className="text-[9px] text-slate-400">Wickets</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-sm font-black font-mono text-indigo-300">{profile.careerEcon}</div>
                <div className="text-[9px] text-slate-400">Econ</div>
              </div>
            </div>
          </div>

          {/* Match History BarChart */}
          {profile.matchChartData.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[11px] font-black text-slate-300 flex items-center gap-1.5">
                <Award size={12} className="text-indigo-400" />
                <span>{lang === 'bn' ? 'সাম্প্রতিক ম্যাচ অনুযায়ী পারফরম্যান্স' : 'Match-by-Match Runs & Strike Rate'}</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profile.matchChartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="match" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: '#f8fafc'
                      }}
                    />
                    <Bar dataKey="runs" name="Runs" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
