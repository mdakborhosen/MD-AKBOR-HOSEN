import React, { useState, useEffect } from 'react';
import { Target, Flag, Clock, Plus, Trash2, Check, X, Sparkles, AlertCircle, Edit3, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TargetMilestone } from '../types';
import { toBengaliDigits } from './MatchCountdown';

interface TargetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  lang: 'en' | 'bn';
  maxOvers: number;
  format?: string;
  target?: number;
  targetMilestones?: TargetMilestone[];
  currentInnings?: 1 | 2;
  initialFocus?: 'over' | 'target' | 'multiple';
  onSave: (data: {
    maxOvers: number;
    target?: number;
    targetMilestones: TargetMilestone[];
  }) => void;
}

export const TargetManagerModal: React.FC<TargetManagerModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  lang = 'bn',
  maxOvers,
  format = '20',
  target,
  targetMilestones = [],
  currentInnings,
  initialFocus = 'over',
  onSave
}) => {
  const defaultInnings: 1 | 2 = currentInnings || (target && target > 0 ? 2 : 1);
  const [oversInput, setOversInput] = useState<string>(String(maxOvers || 20));
  const [targetInput, setTargetInput] = useState<string>(target ? String(target) : '');
  const [milestonesList, setMilestonesList] = useState<TargetMilestone[]>([]);
  const [selectedInningsTab, setSelectedInningsTab] = useState<'all' | 1 | 2>('all');
  const [newMilestoneInnings, setNewMilestoneInnings] = useState<1 | 2>(defaultInnings);
  const [newMilestoneCondition, setNewMilestoneCondition] = useState<'more' | 'lessOrEqual'>('more');

  // New target milestone form inputs
  const [newMilestoneOver, setNewMilestoneOver] = useState<string>('');
  const [newMilestoneRuns, setNewMilestoneRuns] = useState<string>('');
  const [addError, setAddError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const activeInn: 1 | 2 = currentInnings || (target && target > 0 ? 2 : 1);
      setOversInput(String(maxOvers || 20));
      setTargetInput(target ? String(target) : '');
      setMilestonesList(targetMilestones ? [...targetMilestones] : []);
      setNewMilestoneInnings(activeInn);
      setSelectedInningsTab('all');
      setNewMilestoneOver('');
      setNewMilestoneRuns('');
      setAddError('');
    }
  }, [isOpen, maxOvers, target, targetMilestones, currentInnings]);

  if (!isOpen) return null;

  const handleAddMilestone = () => {
    const ov = parseFloat(newMilestoneOver);
    const r = parseInt(newMilestoneRuns, 10);

    if (isNaN(ov) || ov <= 0) {
      setAddError(lang === 'bn' ? 'সঠিক ওভার সংখ্যা লিখুন (যেমন: ৬, ১০, ১৫)' : 'Enter a valid over (e.g. 6, 10, 15)');
      return;
    }
    if (isNaN(r) || r < 0) {
      setAddError(lang === 'bn' ? 'সঠিক টার্গেট রান লিখুন (যেমন: ৫০, ৮৫, ১২০)' : 'Enter valid target runs');
      return;
    }

    const newM: TargetMilestone = {
      id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      over: ov,
      runs: r,
      condition: newMilestoneCondition,
      innings: newMilestoneInnings,
      entries: [{ odd: 1.8, stake: 100 }]
    };

    // Sort by innings then over ascending
    const updated = [...milestonesList, newM].sort(
      (a, b) => (Number(a.innings || 1) - Number(b.innings || 1)) || (Number(a.over) - Number(b.over)) || (Number(a.runs) - Number(b.runs))
    );
    setMilestonesList(updated);
    setNewMilestoneOver('');
    setNewMilestoneRuns('');
    setAddError('');
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestonesList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleToggleMilestoneInnings = (idx: number) => {
    setMilestonesList(prev =>
      prev.map((m, i) => (i === idx ? { ...m, innings: (m.innings || defaultInnings) === 1 ? 2 : 1 } : m))
    );
  };

  const handleClearAll = () => {
    setTargetInput('');
    setMilestonesList([]);
    onSave({
      maxOvers: parseInt(oversInput, 10) || 20,
      target: undefined,
      targetMilestones: []
    });
    onClose();
  };

  const handleSaveAll = () => {
    const parsedOvers = Math.max(1, parseInt(oversInput, 10) || 20);
    const parsedTarget = targetInput.trim() !== '' ? Math.max(0, parseInt(targetInput, 10) || 0) : undefined;

    let updatedMilestones = [...milestonesList];

    // If user typed a new milestone in the inputs and clicked Save directly without clicking "Add to list", include it automatically!
    const pendingOv = parseFloat(newMilestoneOver);
    const pendingRuns = parseInt(newMilestoneRuns, 10);
    if (!isNaN(pendingOv) && pendingOv > 0 && !isNaN(pendingRuns) && pendingRuns >= 0) {
      updatedMilestones.push({
        id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        over: pendingOv,
        runs: pendingRuns,
        condition: newMilestoneCondition,
        innings: newMilestoneInnings,
        entries: [{ odd: 1.8, stake: 100 }]
      });
    }

    // If main 2nd-innings target is set, ensure it exists in milestones or update default
    if (parsedTarget !== undefined && parsedTarget > 0) {
      const existingMain = updatedMilestones.findIndex(
        m => Number(m.over) === parsedOvers && (m.innings === 2 || !m.innings)
      );
      if (existingMain >= 0) {
        updatedMilestones[existingMain] = { ...updatedMilestones[existingMain], runs: parsedTarget, innings: 2 };
      } else {
        updatedMilestones.push({
          id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          over: parsedOvers,
          runs: parsedTarget,
          condition: 'more',
          innings: 2,
          entries: [{ odd: 1.8, stake: 100 }]
        });
      }
    }

    // Sort milestones
    updatedMilestones.sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs));

    onSave({
      maxOvers: parsedOvers,
      target: parsedTarget,
      targetMilestones: updatedMilestones
    });
    onClose();
  };

  const quickOvers = [
    { label: 'T20 (20)', val: 20 },
    { label: 'T10 (10)', val: 10 },
    { label: '15 Ov', val: 15 },
    { label: 'ODI (50)', val: 50 },
    { label: '6 Ov', val: 6 },
    { label: '12 Ov', val: 12 },
    { label: '8 Ov', val: 8 },
    { label: '100 Balls', val: 20 }
  ];

  const quickPresets = [
    { labelBn: 'পাওয়ারপ্লে (৬ ওভ : ৫০ রান)', labelEn: 'Powerplay (6 ov: 50r)', over: 6, runs: 50 },
    { labelBn: 'মাঝের ওভার (১০ ওভ : ৮৫ রান)', labelEn: 'Middle (10 ov: 85r)', over: 10, runs: 85 },
    { labelBn: '১৫ ওভার : ১২৫ রান', labelEn: '15 ov: 125 runs', over: 15, runs: 125 },
    { labelBn: 'ডেথ ওভার (২০ ওভ : ১৭৫ রান)', labelEn: 'Death (20 ov: 175r)', over: 20, runs: 175 }
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-[#0b101b] flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div 
        className="w-full h-full bg-slate-950 flex flex-col overflow-hidden"
      >
        {/* Header with Back & Home Buttons */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <ArrowLeft size={14} />
              <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
            </button>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-black text-white flex items-center gap-2 truncate">
                {lang === 'bn' ? 'টার্গেট ওভার ও রান সেটিংস' : 'Target Overs & Runs Settings'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {lang === 'bn' 
                  ? '৩ (টার্গেট ওভার) ও ৪ (টার্গেট রান) এডিট করুন এবং আরও টার্গেট যুক্ত করুন' 
                  : 'Edit 3 (Target Overs) & 4 (Target Runs), plus add multiple targets'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoHome || onClose}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-md shadow-indigo-600/20"
          >
            <Home size={14} />
            <span>{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-200 text-sm flex-1 max-w-3xl w-full mx-auto">
          
          {/* Section 1: টার্গেট ওভার (Target Overs) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Clock size={13} />
                <span>{lang === 'bn' ? 'টার্গেট ওভার (Target Overs)' : 'Target Overs'}</span>
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {lang === 'bn' ? `বর্তমান: ${toBengaliDigits(oversInput)} ওভার` : `Current: ${oversInput} Ov`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                value={oversInput}
                onChange={(e) => setOversInput(e.target.value)}
                autoFocus={initialFocus === 'over'}
                placeholder="20"
                className="bg-slate-900 border-slate-700 text-white font-mono font-bold text-base h-10 rounded-xl"
              />
              <span className="text-xs font-bold text-slate-400 shrink-0">
                {lang === 'bn' ? 'ওভার' : 'Overs'}
              </span>
            </div>

            {/* Quick Over Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickOvers.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setOversInput(String(item.val))}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                    String(item.val) === oversInput
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: টার্গেট রান (Target Runs) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Flag size={13} />
                <span>{lang === 'bn' ? 'টার্গেট রান (Target Runs)' : 'Target Runs'}</span>
              </label>
              {targetInput.trim() !== '' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {lang === 'bn' ? `টার্গেট: ${toBengaliDigits(targetInput)} রান` : `Target: ${targetInput}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="999"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                autoFocus={initialFocus === 'target'}
                placeholder={lang === 'bn' ? 'যেমন: ১৬৫ (খালি রাখলে ১ম ইনিংস)' : 'e.g. 165 (empty for 1st inn)'}
                className="bg-slate-900 border-slate-700 text-white font-mono font-bold text-base h-10 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTargetInput('')}
                className="h-10 text-xs font-bold border-red-500/30 bg-red-950/30 text-red-300 hover:bg-red-900/50 rounded-xl shrink-0 cursor-pointer flex items-center gap-1"
                title={lang === 'bn' ? 'টার্গেট রান ফাঁকা রাখুন' : 'Clear target runs'}
              >
                <X size={12} />
                <span>{lang === 'bn' ? 'ফাঁকা রাখুন' : 'Blank'}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTargetInput('')}
                className="h-10 text-xs font-bold border-slate-700 bg-slate-900 text-slate-400 hover:text-white rounded-xl shrink-0 cursor-pointer"
              >
                {lang === 'bn' ? '১ম ইনিংস' : '1st Inn'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'bn' 
                ? '২য় ইনিংসে জয়ের জন্য প্রয়োজনীয় লক্ষ্য রান লিখুন। ১ম ইনিংসে বা প্রয়োজন না থাকলে ফাঁকা রাখুন।' 
                : 'Enter target runs for 2nd innings chase. Leave blank for 1st innings or if not applicable.'}
            </p>
          </div>

          {/* Section 3: ১ম ইনিংস এবং ২য় ইনিংস উভয় ইনিংসে মাল্টিপল মাইলস্টোন যুক্ত করুন */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>
                  {lang === 'bn'
                    ? '১ম ও ২য় ইনিংসে মাল্টিপল মাইলস্টোন (Multiple Milestones)'
                    : '1st & 2nd Innings Multiple Milestones'}
                </span>
              </label>
              <div className="flex items-center gap-2">
                {milestonesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMilestonesList([])}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer"
                    title={lang === 'bn' ? 'সব মাইলস্টোন ফাঁকা করুন' : 'Clear all milestones'}
                  >
                    <Trash2 size={11} />
                    <span>{lang === 'bn' ? 'সব ফাঁকা করুন' : 'Clear all'}</span>
                  </button>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {lang === 'bn' ? `${toBengaliDigits(milestonesList.length)} টি মাইলস্টোন` : `${milestonesList.length} Milestones`}
                </span>
              </div>
            </div>

            {/* Innings Filter & Quick Switcher Tabs (১ম ইনিংস | ২য় ইনিংস | সব) */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => {
                  setSelectedInningsTab(1);
                  setNewMilestoneInnings(1);
                }}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  selectedInningsTab === 1
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <span>🏏 {lang === 'bn' ? '১ম ইনিংস' : '1st Innings'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                  {milestonesList.filter(m => (m.innings || 1) === 1).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedInningsTab(2);
                  setNewMilestoneInnings(2);
                }}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  selectedInningsTab === 2
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <span>🎯 {lang === 'bn' ? '২য় ইনিংস' : '2nd Innings'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                  {milestonesList.filter(m => m.innings === 2).length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInningsTab('all')}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  selectedInningsTab === 'all'
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <span>📋 {lang === 'bn' ? 'উভয় ইনিংস' : 'Both Innings'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                  {milestonesList.length}
                </span>
              </button>
            </div>

            {/* List of defined milestones */}
            {(() => {
              const filteredItems = milestonesList
                .map((m, originalIdx) => ({ m, originalIdx }))
                .filter(({ m }) =>
                  selectedInningsTab === 'all'
                    ? true
                    : selectedInningsTab === 1
                      ? (m.innings || 1) === 1
                      : m.innings === 2
                );

              return filteredItems.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {filteredItems.map(({ m, originalIdx }, displayIdx) => {
                    const mInn = m.innings || 1;
                    return (
                      <div
                        key={m.id || originalIdx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono font-bold"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black shrink-0">
                            {displayIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleMilestoneInnings(originalIdx)}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-sans font-black border cursor-pointer transition-all",
                              mInn === 2
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            )}
                            title={lang === 'bn' ? 'ক্লিক করে ইনিংস (১ম ⇄ ২য়) পরিবর্তন করুন' : 'Click to toggle 1st / 2nd Innings'}
                          >
                            {mInn === 2 ? (lang === 'bn' ? '২য় ইনিংস' : '2nd Inn') : (lang === 'bn' ? '১ম ইনিংস' : '1st Inn')}
                          </button>
                          <span className="text-slate-300">
                            {lang === 'bn' ? `${toBengaliDigits(m.over)} ওভার` : `${m.over} Overs`}
                          </span>
                          <span className="text-slate-500">➔</span>
                          <span className="text-amber-400 font-black">
                            {lang === 'bn' ? `${toBengaliDigits(m.runs)} রান` : `${m.runs} Runs`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({m.condition === 'lessOrEqual' ? '≤' : '>'})
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setNewMilestoneInnings(m.innings || 1);
                              setNewMilestoneCondition(m.condition || 'more');
                              setNewMilestoneOver(String(m.over));
                              setNewMilestoneRuns(String(m.runs));
                              handleRemoveMilestone(originalIdx);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                            title={lang === 'bn' ? 'এডিট' : 'Edit'}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(originalIdx)}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title={lang === 'bn' ? 'মুছুন' : 'Delete'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 px-2 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                  {lang === 'bn' 
                    ? 'এই ইনিংসে এখনও মাইলস্টোন যোগ করা হয়নি। নিচে ১ম বা ২য় ইনিংস সিলেক্ট করে একাধিক মাইলস্টোন যুক্ত করুন।' 
                    : 'No milestones added for this view yet. Select 1st or 2nd Innings below and add multiple milestones.'}
                </div>
              );
            })()}

            {/* Quick Presets */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">
                {lang === 'bn'
                  ? `দ্রুত প্রিসেট মাইলস্টোন যোগ করুন (${newMilestoneInnings === 2 ? '২য় ইনিংস' : '১ম ইনিংস'}):`
                  : `Quick Presets (Add to ${newMilestoneInnings === 2 ? '2nd Innings' : '1st Innings'}):`}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const newM: TargetMilestone = {
                        id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        over: preset.over,
                        runs: preset.runs,
                        condition: newMilestoneCondition,
                        innings: newMilestoneInnings,
                        entries: [{ odd: 1.8, stake: 100 }]
                      };
                      if (!milestonesList.some(m => (m.innings || 1) === newMilestoneInnings && Number(m.over) === preset.over && Number(m.runs) === preset.runs)) {
                        setMilestonesList(prev => [...prev, newM].sort((a, b) => Number(a.over) - Number(b.over)));
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-mono bg-slate-900 hover:bg-indigo-950/70 text-slate-300 hover:text-indigo-300 border border-slate-700/80 cursor-pointer transition-colors"
                  >
                    + {lang === 'bn' ? preset.labelBn : preset.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Add New Milestone Form (Supports both 1st Innings & 2nd Innings) */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                  <Plus size={12} className="text-cyan-400" />
                  {lang === 'bn' ? 'নতুন মাইলস্টোন যুক্ত করুন:' : 'Add New Milestone:'}
                </span>

                {/* Target Innings Selector for New Milestone */}
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setNewMilestoneInnings(1)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer",
                      newMilestoneInnings === 1
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {lang === 'bn' ? '১ম ইনিংস' : '1st Innings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMilestoneInnings(2)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer",
                      newMilestoneInnings === 2
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {lang === 'bn' ? '২য় ইনিংস' : '2nd Innings'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {lang === 'bn' ? 'ওভার (যেমন: ১০)' : 'Overs (e.g. 10)'}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={newMilestoneOver}
                    onChange={(e) => setNewMilestoneOver(e.target.value)}
                    placeholder="10"
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs h-8 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {lang === 'bn' ? 'টার্গেট রান (যেমন: ৮৫)' : 'Target Runs (e.g. 85)'}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    value={newMilestoneRuns}
                    onChange={(e) => setNewMilestoneRuns(e.target.value)}
                    placeholder="85"
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs h-8 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {lang === 'bn' ? 'শর্ত (বেশি/কম)' : 'Condition'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewMilestoneCondition(prev => prev === 'more' ? 'lessOrEqual' : 'more')}
                    className={cn(
                      "w-full h-8 rounded-lg text-[11px] font-black border flex items-center justify-center gap-1 cursor-pointer transition-all",
                      newMilestoneCondition === 'more'
                        ? "bg-indigo-950/80 text-indigo-300 border-indigo-500/50"
                        : "bg-rose-950/80 text-rose-300 border-rose-500/50"
                    )}
                  >
                    <span>{newMilestoneCondition === 'more' ? (lang === 'bn' ? 'বেশি (>)' : 'More (>)') : (lang === 'bn' ? 'কম/সমান (≤)' : 'Less (≤)')}</span>
                  </button>
                </div>
              </div>

              {addError && (
                <div className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                  <AlertCircle size={12} />
                  <span>{addError}</span>
                </div>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleAddMilestone}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold h-8 cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus size={13} />
                {lang === 'bn'
                  ? `${newMilestoneInnings === 2 ? '২য় ইনিংস' : '১ম ইনিংস'} তালিকায় যুক্ত করুন`
                  : `Add to ${newMilestoneInnings === 2 ? '2nd Innings' : '1st Innings'} List`}
              </Button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/50 hover:text-white h-9 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
            title={lang === 'bn' ? 'সব টার্গেট ও মাইলস্টোন ফাঁকা রাখুন' : 'Clear all targets and milestones'}
          >
            <Trash2 size={13} />
            <span>{lang === 'bn' ? 'সব ফাঁকা রাখুন' : 'Clear All / Blank'}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 h-9 rounded-xl text-xs font-bold cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-xl text-xs font-bold px-5 shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} />
              {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save & Apply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
