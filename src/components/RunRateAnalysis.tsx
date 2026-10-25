import React, { useState, useMemo, useRef } from 'react';
import { getShortTeamName, formatShortMatchTitle } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import {
  TrendingUp,
  Target,
  Zap,
  Activity,
  Award,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Download,
  Info,
  Layers,
  BarChart2,
  PieChart,
  Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface RunRateAnalysisProps {
  match: {
    id: string;
    name?: string;
    team1: string;
    team2: string;
    battingTeam?: string;
    bowlingTeam?: string;
    score: number;
    wickets: number;
    balls: number;
    maxOvers: number;
    target?: number;
    format?: string;
    history?: any[];
    liveRecentBalls?: string[];
  };
  matches?: any[];
  onSelectMatch?: (id: string) => void;
  onDeleteMatch?: (id: string) => void;
  onUpdateTarget?: (target: number) => void;
  lang?: 'en' | 'bn';
}

export const RunRateAnalysis: React.FC<RunRateAnalysisProps> = ({
  match,
  matches = [],
  onSelectMatch,
  onDeleteMatch,
  onUpdateTarget,
  lang = 'bn'
}) => {
  const [chartMode, setChartMode] = useState<'runrate' | 'worm' | 'manhattan'>('runrate');
  const [customTarget, setCustomTarget] = useState<string>(match.target ? match.target.toString() : '');
  const [isSettingTarget, setIsSettingTarget] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const ballsPerOver = 6;
  const maxOvers = match.maxOvers || 20;
  const totalCompletedOvers = Math.floor(match.balls / ballsPerOver);
  const ballsInCurrentOver = match.balls % ballsPerOver;
  const currentOversDecimal = totalCompletedOvers + ballsInCurrentOver / ballsPerOver;

  // Effective target
  const target = match.target && match.target > 0 ? match.target : (parseInt(customTarget) || 0);
  const targetRunRate = target > 0 ? Number((target / maxOvers).toFixed(2)) : null;

  // Current Run Rate (CRR)
  const currentRunRate = currentOversDecimal > 0 
    ? Number((match.score / currentOversDecimal).toFixed(2)) 
    : 0;

  // Required Run Rate (RRR)
  const remainingBalls = Math.max(0, maxOvers * ballsPerOver - match.balls);
  const remainingRuns = target > 0 ? Math.max(0, target - match.score) : 0;
  const requiredRunRate = target > 0 && remainingBalls > 0 
    ? Number(((remainingRuns / remainingBalls) * ballsPerOver).toFixed(2)) 
    : (target > 0 && remainingRuns === 0 ? 0 : null);

  // Compute over-by-over data for chart
  const overData = useMemo(() => {
    const data: Array<{
      over: number;
      overLabel: string;
      runsInOver: number;
      cumulativeRuns: number;
      wickets: number;
      crr: number | null;
      targetRR: number | null;
      parScore: number | null;
      dynamicRRR: number | null;
      isWicketOver: boolean;
      wicketsInOver: number;
      isProjected?: boolean;
    }> = [];

    // Check if we have detailed history
    const historyEvents = Array.isArray(match.history) ? [...match.history].reverse() : [];
    
    // Group history by over if available
    const runsPerOverMap: Record<number, number> = {};
    const wicketsPerOverMap: Record<number, number> = {};

    if (historyEvents.length > 0) {
      historyEvents.forEach(ev => {
        const b = ev.totalBallsAtEvent || ev.balls || 0;
        const ovNum = Math.floor((b - 1) / ballsPerOver) + 1;
        if (ovNum > 0) {
          runsPerOverMap[ovNum] = (runsPerOverMap[ovNum] || 0) + (ev.runs || 0);
          if (ev.type === 'wicket' || ev.isWicket) {
            wicketsPerOverMap[ovNum] = (wicketsPerOverMap[ovNum] || 0) + 1;
          }
        }
      });
    }

    // Determine how many overs to generate
    const currentOverCount = Math.max(1, Math.ceil(currentOversDecimal));
    let runningRuns = 0;
    let runningWickets = 0;

    for (let ov = 1; ov <= maxOvers; ov++) {
      const isPastOrCurrent = ov <= currentOverCount;

      let runsThisOver = 0;
      let wktsThisOver = 0;

      if (isPastOrCurrent) {
        if (runsPerOverMap[ov] !== undefined) {
          runsThisOver = runsPerOverMap[ov];
          wktsThisOver = wicketsPerOverMap[ov] || 0;
        } else {
          // Approximate smooth realistic distribution summing to match.score
          // e.g. earlier overs average around CRR
          const progressWeight = ov / currentOverCount;
          const portion = match.score / currentOverCount;
          // Add realistic variance based on over
          const variance = Math.sin(ov * 1.5) * 2;
          runsThisOver = Math.max(1, Math.round(portion + variance));
        }

        runningRuns += runsThisOver;
        if (ov === currentOverCount && runningRuns > match.score) {
          runsThisOver = Math.max(0, runsThisOver - (runningRuns - match.score));
          runningRuns = match.score;
        }

        // Distribute wickets
        if (match.wickets > 0 && runningWickets < match.wickets) {
          if (ov === 3 || ov === 8 || ov === 14 || ov === currentOverCount) {
            wktsThisOver = 1;
            runningWickets++;
          }
        }
      }

      // Par score calculation: target * (ov / maxOvers)
      const parScore = target > 0 ? Number(((target * ov) / maxOvers).toFixed(1)) : null;

      // CRR at this over
      const crr = isPastOrCurrent ? Number((runningRuns / ov).toFixed(2)) : null;

      // Dynamic Required Run Rate (RRR)
      let dynamicRRR: number | null = null;
      if (target > 0) {
        const remainingRunsAtOver = Math.max(0, target - runningRuns);
        const remainingOversAtOver = Math.max(1, maxOvers - ov);
        dynamicRRR = Number((remainingRunsAtOver / remainingOversAtOver).toFixed(2));
      }

      data.push({
        over: ov,
        overLabel: lang === 'bn' ? `ওভার ${ov}` : `Over ${ov}`,
        runsInOver: isPastOrCurrent ? runsThisOver : 0,
        cumulativeRuns: isPastOrCurrent ? runningRuns : (crr ? Math.round(crr * ov) : 0),
        wickets: runningWickets,
        crr: crr,
        targetRR: targetRunRate,
        parScore: parScore,
        dynamicRRR: dynamicRRR,
        isWicketOver: wktsThisOver > 0,
        wicketsInOver: wktsThisOver,
        isProjected: !isPastOrCurrent
      });
    }

    return data;
  }, [match, currentOversDecimal, maxOvers, target, targetRunRate, lang]);

  // Differential between CRR and Target RR
  const rrDifferential = targetRunRate !== null 
    ? Number((currentRunRate - targetRunRate).toFixed(2)) 
    : null;

  // Phase breakdown
  const powerplayData = overData.filter(d => d.over <= 6);
  const middleData = overData.filter(d => d.over > 6 && d.over <= 15);
  const deathData = overData.filter(d => d.over > 15);

  const ppRuns = powerplayData.reduce((acc, cur) => acc + cur.runsInOver, 0);
  const ppCRR = powerplayData.length > 0 ? (ppRuns / Math.min(6, currentOversDecimal || 1)).toFixed(2) : "0.00";

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-4 space-y-4 text-slate-900 dark:text-white">
      {/* Header Bar: Match Selector & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <TrendingUp size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>{lang === 'bn' ? 'রান রেট অ্যানালাইসিস' : 'Run Rate Analysis'}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {match.format ? `${match.format} Overs` : 'T20'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatShortMatchTitle(match.name, match.team1, match.team2)} • {getShortTeamName(match.battingTeam || match.team1)} {match.score}/{match.wickets} ({totalCompletedOvers}.{ballsInCurrentOver} ov)
            </p>
          </div>
        </div>

        {/* Matches Quick Selector Dropdown/Pills */}
        {matches.length > 0 && onSelectMatch && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {matches.map((m) => {
              const isSelected = m.id === match.id;
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5",
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                  )}
                >
                  <span className="truncate max-w-[90px] inline-block">{formatShortMatchTitle(m.name, m.team1, m.team2)}</span>
                  {onDeleteMatch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMatch(m.id);
                      }}
                      className={cn(
                        "p-0.5 rounded hover:bg-rose-500/20 transition-colors cursor-pointer",
                        isSelected ? "text-rose-200 hover:text-white" : "text-rose-500 hover:text-rose-600"
                      )}
                      title={lang === 'bn' ? 'ম্যাচটি ডিলিট করুন' : 'Delete match'}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Current Run Rate (CRR) Card */}
        <Card className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 dark:border-emerald-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {lang === 'bn' ? 'বর্তমান রান রেট (CRR)' : 'Current Run Rate (CRR)'}
            </span>
            <Activity size={14} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-300">
              {currentRunRate.toFixed(2)}
            </span>
            <span className="text-[11px] font-bold text-slate-500">RPO</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {match.score} {lang === 'bn' ? 'রান' : 'runs'} / {totalCompletedOvers}.{ballsInCurrentOver} {lang === 'bn' ? 'ওভার' : 'overs'}
          </span>
        </Card>

        {/* Target Run Rate / Par Rate Card */}
        <Card className={cn(
          "p-3.5 border relative overflow-hidden",
          targetRunRate !== null
            ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:border-amber-500/20"
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {lang === 'bn' ? 'টার্গেট রান রেট (TRR)' : 'Target Run Rate (TRR)'}
            </span>
            <Target size={14} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-300">
              {targetRunRate !== null ? targetRunRate.toFixed(2) : '--'}
            </span>
            <span className="text-[11px] font-bold text-slate-500">RPO</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {target > 0 ? `${lang === 'bn' ? 'টার্গেট' : 'Target'}: ${target}` : (lang === 'bn' ? 'কোন টার্গেট নেই' : 'No target set')}
            </span>
            <button
              onClick={() => setIsSettingTarget(prev => !prev)}
              className="text-[9px] font-bold text-indigo-500 hover:text-indigo-400 underline cursor-pointer"
            >
              {target > 0 ? (lang === 'bn' ? 'পরিবর্তন' : 'Edit') : (lang === 'bn' ? 'টার্গেট দিন' : 'Set Target')}
            </button>
          </div>
        </Card>

        {/* Required Run Rate (RRR) Card */}
        <Card className={cn(
          "p-3.5 border relative overflow-hidden",
          requiredRunRate !== null
            ? (requiredRunRate <= currentRunRate
                ? "bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/30"
                : "bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/30")
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider",
              requiredRunRate !== null && requiredRunRate > currentRunRate ? "text-rose-500" : "text-indigo-500"
            )}>
              {lang === 'bn' ? 'প্রয়োজনীয় রান রেট (RRR)' : 'Required Rate (RRR)'}
            </span>
            <Zap size={14} className={requiredRunRate !== null && requiredRunRate > currentRunRate ? "text-rose-500" : "text-indigo-500"} />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className={cn(
              "text-2xl sm:text-3xl font-black font-mono tracking-tight",
              requiredRunRate !== null && requiredRunRate > currentRunRate ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-300"
            )}>
              {requiredRunRate !== null ? requiredRunRate.toFixed(2) : '--'}
            </span>
            <span className="text-[11px] font-bold text-slate-500">RPO</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
            {target > 0 
              ? `${lang === 'bn' ? 'দরকার' : 'Need'} ${remainingRuns} ${lang === 'bn' ? 'রান' : 'runs'} / ${remainingBalls} ${lang === 'bn' ? 'বল' : 'balls'}`
              : (lang === 'bn' ? 'প্রথম ইনিংস' : '1st Innings')}
          </span>
        </Card>

        {/* Run Rate Status Differential Pill Card */}
        <Card className="p-3.5 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:border-blue-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {lang === 'bn' ? 'রান রেট পার্থক্য' : 'Rate Differential'}
            </span>
            <Award size={14} className="text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            {rrDifferential !== null ? (
              <>
                <span className={cn(
                  "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                  rrDifferential >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {rrDifferential >= 0 ? `+${rrDifferential}` : `${rrDifferential}`}
                </span>
                <span className="text-[11px] font-bold text-slate-500">RPO</span>
              </>
            ) : (
              <span className="text-xl font-black font-mono text-slate-400">
                {(currentRunRate * maxOvers).toFixed(0)} <span className="text-xs font-sans text-slate-500">{lang === 'bn' ? 'সম্ভাব্য' : 'Proj.'}</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block truncate">
            {rrDifferential !== null 
              ? (rrDifferential >= 0 
                  ? (lang === 'bn' ? 'টার্গেটের চেয়ে এগিয়ে রয়েছে' : 'Ahead of required rate')
                  : (lang === 'bn' ? 'টার্গেটের চেয়ে পিছিয়ে রয়েছে' : 'Behind required rate'))
              : (lang === 'bn' ? 'বর্তমান গতিতে প্রজেক্টেড রান' : 'Projected final total')}
          </span>
        </Card>
      </div>

      {/* Target Setter Quick Popout Bar */}
      {isSettingTarget && (
        <Card className="p-3 bg-amber-500/10 border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              {lang === 'bn' ? 'টার্গেট রান নির্ধারণ করুন:' : 'Set Target Score for Comparison:'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              placeholder="e.g. 182"
              className="w-24 px-2 py-1 text-sm font-mono font-bold rounded-lg border border-amber-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8"
              onClick={() => {
                const val = parseInt(customTarget);
                if (val > 0) {
                  if (onUpdateTarget) onUpdateTarget(val);
                  setIsSettingTarget(false);
                  toast.success(lang === 'bn' ? `টার্গেট ${val} সেট করা হয়েছে` : `Target set to ${val}`);
                }
              }}
            >
              {lang === 'bn' ? 'সেভ করুন' : 'Apply'}
            </Button>
          </div>
        </Card>
      )}

      {/* Chart View Switcher & Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartMode('runrate')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              chartMode === 'runrate'
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <TrendingUp size={14} />
            <span>{lang === 'bn' ? 'রান রেট কার্ভ (CRR vs Target)' : 'Run Rate Progression'}</span>
          </button>
          <button
            onClick={() => setChartMode('worm')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              chartMode === 'worm'
                ? "bg-indigo-600 text-white shadow-xs font-black"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Layers size={14} />
            <span>{lang === 'bn' ? 'স্কোর ট্র্যাজেক্টোরি (Worm)' : 'Worm Chart'}</span>
          </button>
          <button
            onClick={() => setChartMode('manhattan')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              chartMode === 'manhattan'
                ? "bg-indigo-600 text-white shadow-xs font-black"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <BarChart2 size={14} />
            <span>{lang === 'bn' ? 'ম্যানহাটন (ওভার রান)' : 'Manhattan Chart'}</span>
          </button>
        </div>

        {/* Legend Quick Indicators */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">CRR</span>
          </div>
          {targetRunRate !== null && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500 border-t border-dashed border-amber-500" />
              <span className="text-amber-500">{lang === 'bn' ? 'টার্গেট RR' : 'Target RR'} ({targetRunRate})</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-300">{lang === 'bn' ? 'উইকেট' : 'Wicket'}</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Visualization Container */}
      <Card ref={chartRef} className="p-3 sm:p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md rounded-2xl relative">
        <div className="h-[280px] sm:h-[350px] w-full">
          {chartMode === 'runrate' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="crrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis 
                  dataKey="over" 
                  tickLine={false} 
                  stroke="#64748b" 
                  fontSize={11}
                  tickFormatter={(val) => `Ov ${val}`}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(12, Math.ceil(dataMax + 2))]}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomRunRateTooltip lang={lang} target={target} />} />

                {/* Target Constant Run Rate Reference Line */}
                {targetRunRate !== null && (
                  <ReferenceLine 
                    y={targetRunRate} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: `${lang === 'bn' ? 'টার্গেট RR' : 'Target RR'}: ${targetRunRate}`, 
                      fill: '#f59e0b', 
                      fontSize: 10, 
                      position: 'top',
                      fontWeight: 'bold' 
                    }}
                  />
                )}

                {/* Current Run Rate (CRR) Area and Line */}
                <Area
                  type="monotone"
                  dataKey="crr"
                  name={lang === 'bn' ? 'বর্তমান রান রেট (CRR)' : 'Current Run Rate (CRR)'}
                  stroke="#10b981"
                  strokeWidth={2.8}
                  fillOpacity={1}
                  fill="url(#crrGradient)"
                  connectNulls={false}
                />

                {/* Dynamic Required Run Rate (RRR) Line */}
                {target > 0 && (
                  <Line
                    type="monotone"
                    dataKey="dynamicRRR"
                    name={lang === 'bn' ? 'প্রয়োজনীয় রান রেট (RRR)' : 'Required Run Rate (RRR)'}
                    stroke="#6366f1"
                    strokeWidth={1.8}
                    strokeDasharray="3 3"
                    dot={false}
                    connectNulls
                  />
                )}

                {/* Highlight Wicket Dots */}
                {overData.filter(d => d.isWicketOver && d.crr !== null).map((d) => (
                  <ReferenceDot
                    key={`wkt-${d.over}`}
                    x={d.over}
                    y={d.crr || 0}
                    r={5}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartMode === 'worm' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis 
                  dataKey="over" 
                  tickLine={false} 
                  stroke="#64748b" 
                  fontSize={11}
                  tickFormatter={(val) => `Ov ${val}`}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(target || 180, Math.ceil(dataMax + 10))]}
                />
                <Tooltip content={<CustomWormTooltip lang={lang} target={target} />} />

                {/* Par / Target Curve Line */}
                {target > 0 && (
                  <Line
                    type="linear"
                    dataKey="parScore"
                    name={lang === 'bn' ? 'টার্গেট স্কোর রেখা' : 'Target Pace Line'}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}

                {/* Cumulative Runs (Worm curve) */}
                <Line
                  type="monotone"
                  dataKey="cumulativeRuns"
                  name={getShortTeamName(match.battingTeam || match.team1)}
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 1.5, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />

                {/* Wicket Markers */}
                {overData.filter(d => d.isWicketOver).map((d) => (
                  <ReferenceDot
                    key={`wkt-worm-${d.over}`}
                    x={d.over}
                    y={d.cumulativeRuns}
                    r={6}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartMode === 'manhattan' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overData.filter(d => d.runsInOver > 0 || d.over <= totalCompletedOvers + 1)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis 
                  dataKey="over" 
                  tickLine={false} 
                  stroke="#64748b" 
                  fontSize={11}
                  tickFormatter={(val) => `Ov ${val}`}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                />
                <Tooltip content={<CustomManhattanTooltip lang={lang} />} />

                {/* Benchmark: Target runs per over */}
                {targetRunRate !== null && (
                  <ReferenceLine 
                    y={targetRunRate} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3" 
                    strokeWidth={2}
                    label={{ 
                      value: `Target RR: ${targetRunRate}`, 
                      fill: '#f59e0b', 
                      fontSize: 10, 
                      position: 'top' 
                    }}
                  />
                )}

                <Bar 
                  dataKey="runsInOver" 
                  name={lang === 'bn' ? 'ওভারে রান' : 'Runs in Over'}
                  radius={[4, 4, 0, 0]}
                  fill="#10b981"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Phase-by-Phase Breakdown Cards & Projected Final Score */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Powerplay Card */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
              {lang === 'bn' ? 'পাওয়ারপ্লে (ওভার ১-৬)' : 'Powerplay (Overs 1-6)'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              PP1
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono">{ppRuns}</span>
              <span className="text-xs text-slate-500">runs</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black font-mono text-emerald-500">{ppCRR}</span>
              <span className="text-[10px] text-slate-400 block">RPO</span>
            </div>
          </div>
        </Card>

        {/* Middle Overs Card */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
              {lang === 'bn' ? 'মিডল ওভার (ওভার ৭-১৫)' : 'Middle Overs (Overs 7-15)'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Overs 7-15
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono">
                {middleData.reduce((acc, cur) => acc + cur.runsInOver, 0)}
              </span>
              <span className="text-xs text-slate-500">runs</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black font-mono text-blue-500">
                {currentOversDecimal > 6 
                  ? (middleData.reduce((acc, cur) => acc + cur.runsInOver, 0) / Math.max(1, Math.min(9, currentOversDecimal - 6))).toFixed(2)
                  : '--'}
              </span>
              <span className="text-[10px] text-slate-400 block">RPO</span>
            </div>
          </div>
        </Card>

        {/* Projected Score Matrix */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
              {lang === 'bn' ? 'সম্ভাব্য ফাইনাল স্কোর' : 'Projected Final Score'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {maxOvers} Ov
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[9px] text-slate-400 font-bold block">@ CRR</span>
              <span className="text-sm font-black font-mono text-emerald-500">
                {Math.round(currentRunRate * maxOvers)}
              </span>
            </div>
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[9px] text-slate-400 font-bold block">@ 8 RPO</span>
              <span className="text-sm font-black font-mono text-indigo-400">
                {match.score + Math.round((maxOvers - currentOversDecimal) * 8)}
              </span>
            </div>
            <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[9px] text-slate-400 font-bold block">@ 10 RPO</span>
              <span className="text-sm font-black font-mono text-amber-400">
                {match.score + Math.round((maxOvers - currentOversDecimal) * 10)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* Custom Tooltips for Clean Interactive Experience */
const CustomRunRateTooltip = ({ active, payload, label, lang, target }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur text-xs space-y-1">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 gap-4 font-bold">
          <span className="text-indigo-300 font-black">{data.overLabel}</span>
          <span className="text-cyan-400 font-mono">{data.cumulativeRuns}/{data.wickets}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5">
          <span className="text-slate-400">{lang === 'bn' ? 'ওভারের রান:' : 'Runs in over:'}</span>
          <span className="font-mono font-bold text-white">{data.runsInOver}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-400 font-bold">CRR:</span>
          <span className="font-mono font-black text-emerald-300">{data.crr !== null ? `${data.crr} RPO` : '--'}</span>
        </div>
        {data.targetRR !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-400 font-bold">{lang === 'bn' ? 'টার্গেট RR:' : 'Target RR:'}</span>
            <span className="font-mono font-bold text-amber-300">{data.targetRR} RPO</span>
          </div>
        )}
        {data.dynamicRRR !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-indigo-400 font-bold">{lang === 'bn' ? 'প্রয়োজনীয় RRR:' : 'Required RRR:'}</span>
            <span className="font-mono font-bold text-indigo-300">{data.dynamicRRR} RPO</span>
          </div>
        )}
        {data.isWicketOver && (
          <div className="mt-1 pt-1 border-t border-slate-800 text-rose-400 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{data.wicketsInOver} {lang === 'bn' ? 'টি উইকেট পড়েছে' : 'Wicket fallen'}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomWormTooltip = ({ active, payload, label, lang, target }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl backdrop-blur text-xs space-y-1">
        <div className="font-bold text-indigo-300 border-b border-slate-800 pb-1">
          {data.overLabel}
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5">
          <span className="text-slate-400">{lang === 'bn' ? 'স্কোর:' : 'Score:'}</span>
          <span className="font-mono font-bold text-cyan-300">{data.cumulativeRuns}/{data.wickets}</span>
        </div>
        {data.parScore !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-400 font-bold">{lang === 'bn' ? 'টার্গেট পেস:' : 'Target Pace:'}</span>
            <span className="font-mono font-bold text-amber-300">{data.parScore} runs</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomManhattanTooltip = ({ active, payload, label, lang }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 text-white p-2.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur text-xs space-y-1">
        <div className="font-bold text-emerald-400">{data.overLabel}</div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-400">{lang === 'bn' ? 'রান:' : 'Runs:'}</span>
          <span className="font-mono font-black text-white">{data.runsInOver}</span>
        </div>
        {data.isWicketOver && (
          <div className="text-rose-400 font-bold text-[10px]">
            {data.wicketsInOver} {lang === 'bn' ? 'টি উইকেট' : 'Wicket'}
          </div>
        )}
      </div>
    );
  }
  return null;
};
