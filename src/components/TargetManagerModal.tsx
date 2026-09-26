import React, { useState, useEffect } from 'react';
import { Target, Flag, Clock, Plus, Trash2, Check, X, Sparkles, AlertCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TargetMilestone } from '../types';
import { toBengaliDigits } from './MatchCountdown';

interface TargetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'bn';
  maxOvers: number;
  format?: string;
  target?: number;
  targetMilestones?: TargetMilestone[];
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
  lang = 'bn',
  maxOvers,
  format = '20',
  target,
  targetMilestones = [],
  initialFocus = 'over',
  onSave
}) => {
  const [oversInput, setOversInput] = useState<string>(String(maxOvers || 20));
  const [targetInput, setTargetInput] = useState<string>(target ? String(target) : '');
  const [milestonesList, setMilestonesList] = useState<TargetMilestone[]>([]);

  // New target milestone form inputs
  const [newMilestoneOver, setNewMilestoneOver] = useState<string>('');
  const [newMilestoneRuns, setNewMilestoneRuns] = useState<string>('');
  const [addError, setAddError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setOversInput(String(maxOvers || 20));
      setTargetInput(target ? String(target) : '');
      setMilestonesList(targetMilestones ? [...targetMilestones] : []);
      setNewMilestoneOver('');
      setNewMilestoneRuns('');
      setAddError('');
    }
  }, [isOpen, maxOvers, target, targetMilestones]);

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
      over: ov,
      runs: r,
      condition: 'more',
      entries: [{ odd: 1.8, stake: 0 }]
    };

    // Sort by over ascending
    const updated = [...milestonesList, newM].sort((a, b) => Number(a.over) - Number(b.over) || Number(a.runs) - Number(b.runs));
    setMilestonesList(updated);
    setNewMilestoneOver('');
    setNewMilestoneRuns('');
    setAddError('');
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestonesList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAll = () => {
    const parsedOvers = Math.max(1, parseInt(oversInput, 10) || 20);
    const parsedTarget = targetInput.trim() !== '' ? Math.max(0, parseInt(targetInput, 10) || 0) : undefined;

    // If main target is set, ensure it exists in milestones or update default
    let updatedMilestones = [...milestonesList];
    if (parsedTarget !== undefined && parsedTarget > 0) {
      const existingMain = updatedMilestones.findIndex(m => Number(m.over) === parsedOvers);
      if (existingMain >= 0) {
        updatedMilestones[existingMain] = { ...updatedMilestones[existingMain], runs: parsedTarget };
      } else {
        updatedMilestones.push({
          over: parsedOvers,
          runs: parsedTarget,
          condition: 'more',
          entries: [{ odd: 1.8, stake: 0 }]
        });
      }
    }

    // Sort milestones
    updatedMilestones.sort((a, b) => Number(a.over) - Number(b.over));

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {lang === 'bn' ? 'টার্গেট ওভার ও রান সেটিংস' : 'Target Overs & Runs Settings'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'bn' 
                  ? '৩ (টার্গেট ওভার) ও ৪ (টার্গেট রান) এডিট করুন এবং আরও টার্গেট যুক্ত করুন' 
                  : 'Edit 3 (Target Overs) & 4 (Target Runs), plus add multiple targets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-200 text-sm">
          
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
                className="h-10 text-xs font-bold border-slate-700 bg-slate-900 text-slate-400 hover:text-white rounded-xl shrink-0 cursor-pointer"
              >
                {lang === 'bn' ? '১ম ইনিংস' : '1st Inn'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              {lang === 'bn' 
                ? '২য় ইনিংসে জয়ের জন্য প্রয়োজনীয় লক্ষ্য রান লিখুন। ১ম ইনিংসে ফাঁকা রাখুন।' 
                : 'Enter target runs for 2nd innings chase. Leave empty for 1st innings.'}
            </p>
          </div>

          {/* Section 3: আরও কয়েকটি টার্গেট ওভার ও রান যুক্ত করুন (Multiple Targets) */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>{lang === 'bn' ? 'একাধিক টার্গেট তালিকা (Multiple Targets)' : 'Multiple Targets & Milestones'}</span>
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {lang === 'bn' ? `${toBengaliDigits(milestonesList.length)} টি টার্গেট` : `${milestonesList.length} Targets`}
              </span>
            </div>

            {/* List of defined milestones */}
            {milestonesList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {milestonesList.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300">
                        {lang === 'bn' ? `${toBengaliDigits(m.over)} ওভার` : `${m.over} Overs`}
                      </span>
                      <span className="text-slate-500">➔</span>
                      <span className="text-amber-400 font-black">
                        {lang === 'bn' ? `${toBengaliDigits(m.runs)} রান` : `${m.runs} Runs`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNewMilestoneOver(String(m.over));
                          setNewMilestoneRuns(String(m.runs));
                          handleRemoveMilestone(idx);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                        title={lang === 'bn' ? 'এডিট' : 'Edit'}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        title={lang === 'bn' ? 'মুছুন' : 'Delete'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 px-2 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                {lang === 'bn' 
                  ? 'এখনও অতিরিক্ত টার্গেট যোগ করা হয়নি। নিচে ওভার ও রান লিখে যুক্ত করুন।' 
                  : 'No extra targets added yet. Add over & runs below.'}
              </div>
            )}

            {/* Quick Presets */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">
                {lang === 'bn' ? 'দ্রুত প্রিসেট টার্গেট যোগ করুন:' : 'Quick Presets:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const newM: TargetMilestone = {
                        over: preset.over,
                        runs: preset.runs,
                        condition: 'more',
                        entries: [{ odd: 1.8, stake: 0 }]
                      };
                      if (!milestonesList.some(m => Number(m.over) === preset.over && Number(m.runs) === preset.runs)) {
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

            {/* Add New Milestone Form */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Plus size={12} className="text-cyan-400" />
                {lang === 'bn' ? 'নতুন টার্গেট যুক্ত করুন:' : 'Add New Target Milestone:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
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
                {lang === 'bn' ? 'তালিকায় যুক্ত করুন' : 'Add to Target List'}
              </Button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
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
  );
};
