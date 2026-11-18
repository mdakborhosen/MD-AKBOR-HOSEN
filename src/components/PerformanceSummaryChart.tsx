import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { BarChart3, Award, Target, User, X } from 'lucide-react';
import { MatchState, PlayerStats, BowlerStats } from '../types';

interface PerformanceSummaryChartProps {
  match: MatchState;
  lang?: string;
  onSelectPlayer?: (playerName: string, teamName?: string) => void;
  onClose?: () => void;
}

interface BatterChartRow {
  name: string;
  shortName: string;
  team: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

interface BowlerChartRow {
  name: string;
  shortName: string;
  team: string;
  overs: string;
  oversFloat: number;
  runs: number;
  wickets: number;
  maidens: number;
  economy: number;
}

function parseOversToFloat(oversStr: string | number | undefined, ballsPerOver = 6): number {
  if (typeof oversStr === 'number') return Number.isFinite(oversStr) ? oversStr : 0;
  const raw = String(oversStr || '0').trim();
  const parts = raw.split('.');
  const ov = parseInt(parts[0] || '0', 10) || 0;
  const rem = parseInt(parts[1] || '0', 10) || 0;
  return ov + rem / ballsPerOver;
}

function shortenPlayerName(name: string, max = 12): string {
  const clean = (name || '').trim();
  if (clean.length <= max) return clean;
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const candidate = `${parts[0][0]}. ${parts[parts.length - 1]}`;
    return candidate.length <= max + 2 ? candidate : candidate.slice(0, max + 1) + '…';
  }
  return clean.slice(0, max) + '…';
}

const BATTER_COLORS = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899'];
const BOWLER_COLORS = ['#10b981', '#06b6d4', '#8b5cf6'];

export const PerformanceSummaryChart: React.FC<PerformanceSummaryChartProps> = ({
  match,
  lang = 'en',
  onSelectPlayer,
  onClose
}) => {
  const [sortBattersBy, setSortBattersBy] = useState<'runs' | 'sr'>('runs');
  const bpo = match.format === '100' ? 5 : 6;

  const { topBatters, topBowlers } = useMemo(() => {
    const t1 = match.team1 || 'Team 1';
    const t2 = match.team2 || 'Team 2';
    const battingTeamNow = match.battingTeam || t1;

    const batterMap = new Map<string, BatterChartRow>();
    const addBatterList = (list: PlayerStats[] | undefined, teamLabel: string) => {
      if (!Array.isArray(list)) return;
      for (const p of list) {
        const cleanName = (p.name || '').trim();
        if (!cleanName || p.yetToBat) continue;
        if ((p.balls || 0) <= 0 && (p.runs || 0) <= 0) continue;
        const key = cleanName.toLowerCase();
        const balls = Math.max(0, Number(p.balls) || 0);
        const runs = Math.max(0, Number(p.runs) || 0);
        const sr = balls > 0 ? Number(((runs / balls) * 100).toFixed(1)) : 0;
        const existing = batterMap.get(key);
        if (!existing || runs > existing.runs || balls > existing.balls) {
          batterMap.set(key, {
            name: cleanName,
            shortName: shortenPlayerName(cleanName),
            team: teamLabel,
            runs,
            balls,
            fours: p.fours || 0,
            sixes: p.sixes || 0,
            strikeRate: sr
          });
        }
      }
    };

    addBatterList(match.team1BattingStats, t1);
    addBatterList(match.team2BattingStats, t2);
    addBatterList(match.battingStats, battingTeamNow);

    const allBatters = Array.from(batterMap.values());
    allBatters.sort((a, b) =>
      sortBattersBy === 'sr'
        ? b.strikeRate - a.strikeRate || b.runs - a.runs
        : b.runs - a.runs || b.strikeRate - a.strikeRate
    );

    const bowlerMap = new Map<string, BowlerChartRow>();
    const addBowlerList = (list: BowlerStats[] | undefined, teamLabel: string) => {
      if (!Array.isArray(list)) return;
      for (const bw of list) {
        const cleanName = (bw.name || '').trim();
        if (!cleanName) continue;
        const ovFloat = parseOversToFloat(bw.overs, bpo);
        if (ovFloat <= 0 && (bw.balls || 0) <= 0 && (bw.runs || 0) <= 0) continue;
        const effectiveOvers = ovFloat > 0 ? ovFloat : (bw.balls || 0) / bpo;
        if (effectiveOvers <= 0) continue;
        const rawEcon = parseFloat(String(bw.economy || bw.econ || ''));
        const econ = Number.isFinite(rawEcon) && rawEcon > 0
          ? Number(rawEcon.toFixed(2))
          : Number(((Number(bw.runs) || 0) / effectiveOvers).toFixed(2));
        const key = cleanName.toLowerCase();
        const existing = bowlerMap.get(key);
        if (!existing || effectiveOvers >= existing.oversFloat) {
          bowlerMap.set(key, {
            name: cleanName,
            shortName: shortenPlayerName(cleanName),
            team: teamLabel,
            overs: bw.overs || effectiveOvers.toFixed(1),
            oversFloat: effectiveOvers,
            runs: bw.runs || 0,
            wickets: bw.wickets || 0,
            maidens: bw.maidens || 0,
            economy: econ
          });
        }
      }
    };

    // team1BowlingStats = bowlers who bowled against team1 (i.e. team2 bowlers)
    addBowlerList(match.team1BowlingStats, t2);
    addBowlerList(match.team2BowlingStats, t1);
    if (match.liveBowlerStats) {
      addBowlerList([match.liveBowlerStats], match.bowlingTeam || t2);
    }

    const allBowlers = Array.from(bowlerMap.values());
    allBowlers.sort((a, b) => a.economy - b.economy || b.wickets - a.wickets);

    return {
      topBatters: allBatters.slice(0, 5),
      topBowlers: allBowlers.slice(0, 3)
    };
  }, [match, bpo, sortBattersBy]);

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-slate-950/95 text-white p-3.5 sm:p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <BarChart3 size={16} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black tracking-wide text-white">
              {lang === 'bn' ? 'পারফরম্যান্স সামারি (Recharts)' : 'Performance Summary'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {lang === 'bn'
                ? 'শীর্ষ ৫ ব্যাটারের স্ট্রাইক রেট ও শীর্ষ ৩ বোলারের ইকোনমি রেট'
                : 'Top 5 Batters Strike Rate & Top 3 Bowlers Economy Rate'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSortBattersBy('runs')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
              sortBattersBy === 'runs'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {lang === 'bn' ? 'সর্বোচ্চ রান' : 'Top Runs'}
          </button>
          <button
            type="button"
            onClick={() => setSortBattersBy('sr')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
              sortBattersBy === 'sr'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {lang === 'bn' ? 'সর্বোচ্চ SR' : 'Top SR'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Dual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Batters Strike Rate Bar Chart */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Award size={13} className="text-amber-400" />
              <span>{lang === 'bn' ? 'শীর্ষ ৫ ব্যাটার — স্ট্রাইক রেট (SR)' : 'Top 5 Batters — Strike Rate (SR)'}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">{topBatters.length}/5</span>
          </div>

          {topBatters.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500">
              {lang === 'bn' ? 'ব্যাটিং ডাটা এখনো পাওয়া যায়নি' : 'No batter innings data available yet'}
            </div>
          ) : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBatters} margin={{ top: 10, right: 10, left: -12, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#f8fafc'
                      }}
                      formatter={(value: any) => [`${Number(value).toFixed(1)}`, 'Strike Rate']}
                      labelFormatter={(_label, payload) => {
                        const row = payload?.[0]?.payload as BatterChartRow | undefined;
                        return row ? `${row.name} (${row.team}) — ${row.runs} (${row.balls}b)` : '';
                      }}
                    />
                    <Bar dataKey="strikeRate" radius={[8, 8, 0, 0]} maxBarSize={42}>
                      {topBatters.map((_, index) => (
                        <Cell key={`bat-cell-${index}`} fill={BATTER_COLORS[index % BATTER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {onSelectPlayer && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {topBatters.map((b, i) => (
                    <button
                      key={`bat-chip-${b.name}-${i}`}
                      type="button"
                      onClick={() => onSelectPlayer(b.name, b.team)}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-indigo-600/25 border border-slate-800 hover:border-indigo-500/40 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <User size={10} className="text-indigo-400" />
                      <span>{b.shortName}:</span>
                      <span className="font-mono text-emerald-400">{b.runs}({b.balls})</span>
                      <span className="font-mono text-amber-300">SR {b.strikeRate}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Top 3 Bowlers Economy Rate Bar Chart */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Target size={13} className="text-emerald-400" />
              <span>{lang === 'bn' ? 'শীর্ষ ৩ বোলার — ইকোনমি রেট (ECON)' : 'Top 3 Bowlers — Economy Rate (ECON)'}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">{topBowlers.length}/3</span>
          </div>

          {topBowlers.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500">
              {lang === 'bn' ? 'বোলিং ডাটা এখনো পাওয়া যায়নি' : 'No bowler spell data available yet'}
            </div>
          ) : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBowlers} margin={{ top: 10, right: 10, left: -12, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#f8fafc'
                      }}
                      formatter={(value: any) => [`${Number(value).toFixed(2)}`, 'Economy']}
                      labelFormatter={(_label, payload) => {
                        const row = payload?.[0]?.payload as BowlerChartRow | undefined;
                        return row ? `${row.name} (${row.team}) — ${row.wickets}/${row.runs} (${row.overs} ov)` : '';
                      }}
                    />
                    <Bar dataKey="economy" radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {topBowlers.map((_, index) => (
                        <Cell key={`bw-cell-${index}`} fill={BOWLER_COLORS[index % BOWLER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {onSelectPlayer && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {topBowlers.map((bw, i) => (
                    <button
                      key={`bw-chip-${bw.name}-${i}`}
                      type="button"
                      onClick={() => onSelectPlayer(bw.name, bw.team)}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-cyan-600/25 border border-slate-800 hover:border-cyan-500/40 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <User size={10} className="text-cyan-400" />
                      <span>{bw.shortName}:</span>
                      <span className="font-mono text-emerald-400">{bw.wickets}/{bw.runs}</span>
                      <span className="font-mono text-amber-300">EC {bw.economy}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
