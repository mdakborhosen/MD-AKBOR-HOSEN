import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { MatchState } from '../types';

interface WinProbabilityBarProps {
  match: MatchState;
  lang?: string;
}

function computeBattingWinPct(params: {
  score: number;
  wickets: number;
  balls: number;
  maxOvers: number;
  maxWickets: number;
  ballsPerOver: number;
  target?: number;
  winCondition?: 'more' | 'lessOrEqual';
}): { battingPct: number; crr: number; rrr: number; isChase: boolean; benchmarkRate: number } {
  const { score, wickets, balls, maxOvers, maxWickets, ballsPerOver, target, winCondition } = params;
  const totalBalls = Math.max(ballsPerOver, (maxOvers || 20) * ballsPerOver);
  const oversPlayed = balls / ballsPerOver;
  const crr = oversPlayed > 0 ? score / oversPlayed : 0;

  const hasTarget = typeof target === 'number' && target > 0;
  const remainingBalls = Math.max(0, totalBalls - balls);
  const remainingOvers = remainingBalls / ballsPerOver;

  // Format-aware par benchmark when chasing target isn't active yet (1st innings)
  const parRpo =
    maxOvers <= 10 ? 10.2 : maxOvers <= 20 ? 8.5 : maxOvers >= 45 ? 6.0 : 8.5;

  let rrr = parRpo;
  if (hasTarget) {
    const runsNeeded = Math.max(0, target - score);
    if (runsNeeded <= 0) {
      return {
        battingPct: winCondition === 'lessOrEqual' ? 2 : 100,
        crr,
        rrr: 0,
        isChase: true,
        benchmarkRate: 0
      };
    }
    if (remainingBalls <= 0 || wickets >= maxWickets) {
      return {
        battingPct: winCondition === 'lessOrEqual' ? 98 : 0,
        crr,
        rrr: 99.9,
        isChase: true,
        benchmarkRate: 99.9
      };
    }
    rrr = remainingOvers > 0 ? runsNeeded / remainingOvers : runsNeeded;
  } else if (wickets >= maxWickets) {
    return {
      battingPct: 35,
      crr,
      rrr: parRpo,
      isChase: false,
      benchmarkRate: parRpo
    };
  }

  const benchmarkRate = hasTarget ? rrr : parRpo;
  const wicketsRemaining = Math.max(0, maxWickets - wickets);
  const wicketsFactor = (wicketsRemaining / Math.max(1, maxWickets)) * 1.4 - 0.65;
  const rateDiff = oversPlayed > 0 ? crr - benchmarkRate : 0;
  const progressWeight = hasTarget ? 0.45 + 0.55 * (balls / totalBalls) : 0.35 + 0.4 * (balls / totalBalls);

  // Logistic curve combining CRR vs Target/RRR + wickets in hand
  const logit = rateDiff * (0.42 + progressWeight * 0.38) + wicketsFactor * 0.75;
  let prob = (1 / (1 + Math.exp(-logit))) * 100;
  if (winCondition === 'lessOrEqual' && hasTarget) {
    prob = 100 - prob;
  }
  const battingPct = Math.round(Math.max(2, Math.min(98, prob)));

  return {
    battingPct,
    crr,
    rrr,
    isChase: hasTarget,
    benchmarkRate
  };
}

export const WinProbabilityBar: React.FC<WinProbabilityBarProps> = ({ match, lang = 'en' }) => {
  const [showEbbFlowChart, setShowEbbFlowChart] = useState(true);

  const bpo = match.format === '100' ? 5 : 6;
  const maxOvers = match.maxOvers || 20;
  const maxWickets = match.maxWickets || 10;

  const battingTeam = (match.battingTeam || match.team1 || 'Team 1').trim();
  const bowlingTeam =
    (match.bowlingTeam || (battingTeam.toLowerCase() === (match.team1 || '').toLowerCase() ? match.team2 : match.team1) || 'Team 2').trim();

  const currentStats = useMemo(
    () =>
      computeBattingWinPct({
        score: match.score || 0,
        wickets: match.wickets || 0,
        balls: match.balls || 0,
        maxOvers,
        maxWickets,
        ballsPerOver: bpo,
        target: match.target,
        winCondition: match.winCondition
      }),
    [match.score, match.wickets, match.balls, maxOvers, maxWickets, bpo, match.target, match.winCondition]
  );

  const bowlingPct = 100 - currentStats.battingPct;

  const stackedData = useMemo(
    () => [
      {
        name: 'WinProb',
        battingPct: currentStats.battingPct,
        bowlingPct
      }
    ],
    [currentStats.battingPct, bowlingPct]
  );

  // Build ball-by-ball / progression ebb-and-flow series from chronological match.history
  const ebbFlowSeries = useMemo(() => {
    const chrono = [...(match.history || [])].reverse();
    const points: Array<{ label: string; winPct: number; crr: number; targetRate: number }> = [
      {
        label: '0.0',
        winPct: 50,
        crr: 0,
        targetRate: Number(currentStats.benchmarkRate.toFixed(2))
      }
    ];

    if (chrono.length > 0) {
      const step = chrono.length > 28 ? Math.ceil(chrono.length / 28) : 1;
      chrono.forEach((ev, idx) => {
        if (idx % step !== 0 && idx !== chrono.length - 1) return;
        const bCount = Math.max(1, ev.balls || ev.totalBallsAtEvent || idx + 1);
        const snap = computeBattingWinPct({
          score: ev.score ?? 0,
          wickets: ev.wickets ?? 0,
          balls: bCount,
          maxOvers,
          maxWickets,
          ballsPerOver: bpo,
          target: match.target,
          winCondition: match.winCondition
        });
        points.push({
          label: `${Math.floor(bCount / bpo)}.${bCount % bpo}`,
          winPct: snap.battingPct,
          crr: Number(snap.crr.toFixed(2)),
          targetRate: Number(snap.benchmarkRate.toFixed(2))
        });
      });
    } else if ((match.balls || 0) > 0) {
      points.push({
        label: `${Math.floor((match.balls || 0) / bpo)}.${(match.balls || 0) % bpo}`,
        winPct: currentStats.battingPct,
        crr: Number(currentStats.crr.toFixed(2)),
        targetRate: Number(currentStats.benchmarkRate.toFixed(2))
      });
    }

    return points;
  }, [match.history, match.balls, match.target, match.winCondition, maxOvers, maxWickets, bpo, currentStats]);

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/95 text-white p-3 sm:p-3.5 shadow-lg space-y-2.5">
      {/* Top Info Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
            <TrendingUp size={13} />
          </span>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <span>{lang === 'bn' ? 'জয়ের সম্ভাবনা (Win Probability)' : 'Live Win Probability'}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-mono text-amber-300">
                CRR {currentStats.crr.toFixed(2)} vs {currentStats.isChase ? `RRR ${currentStats.rrr.toFixed(2)}` : `Par ${currentStats.benchmarkRate.toFixed(1)}`}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEbbFlowChart((p) => !p)}
          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
        >
          <Activity size={11} className="text-cyan-400" />
          <span>{lang === 'bn' ? 'গ্রাফ' : 'Ebb & Flow'}</span>
          {showEbbFlowChart ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Team Percentage Labels + Recharts Stacked Horizontal Probability Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-emerald-400 truncate">
            {battingTeam} {currentStats.battingPct}%
          </span>
          {currentStats.isChase && match.target && (
            <span className="text-[10px] font-mono text-slate-400">
              Target: {match.target}
            </span>
          )}
          <span className="text-cyan-400 truncate text-right">
            {bowlingPct}% {bowlingTeam}
          </span>
        </div>

        <div className="h-5 w-full rounded-full overflow-hidden bg-slate-900 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedData}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              barSize={20}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" hide />
              <Bar dataKey="battingPct" stackId="prob" fill="#10b981" isAnimationActive />
              <Bar dataKey="bowlingPct" stackId="prob" fill="#06b6d4" isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Match Ebb & Flow Area Chart (Win % across ball-by-ball progression) */}
      {showEbbFlowChart && (
        <div className="pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>{lang === 'bn' ? 'ম্যাচের মোমেন্টাম (ওভার অনুযায়ী)' : 'Match Ebb & Flow (CRR vs Target/Par)'}</span>
            <span className="font-mono text-emerald-400">50% Base</span>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ebbFlowSeries} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="winProbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    fontSize: '10px',
                    color: '#f8fafc'
                  }}
                  formatter={(value: any, name: any) =>
                    name === 'winPct' ? [`${value}%`, battingTeam] : [value, name]
                  }
                  labelFormatter={(ov) => `Over ${ov}`}
                />
                <Area
                  type="monotone"
                  dataKey="winPct"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#winProbGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
