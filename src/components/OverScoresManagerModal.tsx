import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Check, Clock, ArrowLeft, Home } from 'lucide-react';
import { toBengaliDigits } from './MatchCountdown';

interface OverScoresManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  lang: 'en' | 'bn';
  team1Name: string;
  totalRuns: string | number;
  onUpdateTotalRuns: (val: string) => void;
  overScores: Record<string, string>;
  onSaveOverScore: (overKey: string, scoreVal: string) => void;
  onDeleteOverScore: (overKey: string) => void;
}

export const OverScoresManagerModal: React.FC<OverScoresManagerModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  lang,
  team1Name,
  totalRuns,
  onUpdateTotalRuns,
  overScores,
  onSaveOverScore,
  onDeleteOverScore,
}) => {
  const [editingTotal, setEditingTotal] = useState(String(totalRuns || 198));
  const [newOver, setNewOver] = useState('');
  const [newScore, setNewScore] = useState('');
  const [inlineEdits, setInlineEdits] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  // Merge default known match milestones with any custom user saved entries
  const baseEntries: Record<string, string> = {
    '2.2': '25/0',
    '3.3': '24/0',
    '16.0': '123/7',
    '18.0': '141/8',
    '20.0': String(totalRuns || '198'),
    ...overScores,
  };

  const sortedKeys = Object.keys(baseEntries).sort((a, b) => {
    const aParts = a.split('.');
    const bParts = b.split('.');
    const aBalls = (parseInt(aParts[0], 10) || 0) * 6 + (parseInt(aParts[1], 10) || 0);
    const bBalls = (parseInt(bParts[0], 10) || 0) * 6 + (parseInt(bParts[1], 10) || 0);
    return aBalls - bBalls;
  });

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOver.trim() || !newScore.trim()) return;
    onSaveOverScore(newOver.trim(), newScore.trim());
    setNewOver('');
    setNewScore('');
  };

  const handleSaveTotal = () => {
    if (editingTotal.trim()) {
      onUpdateTotalRuns(editingTotal.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#0b101b] text-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Full-Page Navigation Bar with Back & Home Buttons */}
      <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <ArrowLeft size={14} />
            <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={18} className="text-amber-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-black text-amber-400 truncate">
              {lang === 'bn' ? `${team1Name} এর ওভার-বাই-ওভার রান তালিকা` : `${team1Name} Over-by-Over Score List`}
            </h3>
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl w-full mx-auto flex flex-col">
        <p className="text-xs text-slate-400 shrink-0">
          {lang === 'bn'
            ? 'যেকোনো ওভারে ১ম দলের নির্দিষ্ট স্কোর সেট করুন। ম্যাচ ঐ ওভারে থাকলে সরাসরি এই স্কোরটি প্রদর্শিত হবে।'
            : 'Set specific 1st team scores for each over. When the match reaches that over, this exact score is shown.'}
        </p>

        {/* Total Runs Editor Card */}
        <div className="bg-slate-800/80 p-3.5 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3 mt-3 shrink-0">
          <div>
            <span className="text-xs font-bold text-slate-300 block">
              {lang === 'bn' ? `${team1Name} সর্বমোট রান (১ম ইনিংস)` : `${team1Name} Total Runs (1st Innings)`}
            </span>
            <span className="text-[10px] text-amber-400/80">
              {lang === 'bn' ? 'যেমন: ১৯৮ বা ১৯৭' : 'e.g. 198 or 197'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              type="text"
              value={editingTotal}
              onChange={e => setEditingTotal(e.target.value)}
              onBlur={handleSaveTotal}
              onKeyDown={e => e.key === 'Enter' && handleSaveTotal()}
              className="w-20 bg-slate-950 border-amber-500/50 text-amber-300 font-mono font-black text-center h-8 text-sm"
              placeholder="198"
            />
            <Button size="sm" onClick={handleSaveTotal} className="h-8 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              <Check size={14} />
            </Button>
          </div>
        </div>

        {/* Add New Checkpoint Form */}
        <form onSubmit={handleAddCheckpoint} className="flex items-center gap-2 mt-3 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60 shrink-0">
          <div className="flex-1">
            <Input
              placeholder={lang === 'bn' ? 'ওভার (যেমন ৩.৩)' : 'Over (e.g. 3.3)'}
              value={newOver}
              onChange={e => setNewOver(e.target.value)}
              className="bg-slate-950 border-slate-700 text-xs font-mono h-8"
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder={lang === 'bn' ? 'স্কোর (যেমন ২৪/০)' : 'Score (e.g. 24/0)'}
              value={newScore}
              onChange={e => setNewScore(e.target.value)}
              className="bg-slate-950 border-slate-700 text-xs font-mono h-8"
            />
          </div>
          <Button type="submit" size="sm" className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0">
            <Plus size={14} className="mr-0.5" />
            {lang === 'bn' ? 'যোগ' : 'Add'}
          </Button>
        </form>

        {/* Over-by-Over Table List */}
        <div className="flex-1 space-y-1.5 mt-3">
          {sortedKeys.map(ovKey => {
            const currentVal = inlineEdits[ovKey] !== undefined ? inlineEdits[ovKey] : baseEntries[ovKey];
            const isUserSaved = overScores && overScores[ovKey] !== undefined;

            return (
              <div
                key={ovKey}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-16 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs text-center">
                    {lang === 'bn' ? toBengaliDigits(ovKey) : ovKey} ov
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'bn' ? 'এ সময় রান:' : 'At this over:'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Input
                    type="text"
                    value={currentVal}
                    onChange={e => setInlineEdits(prev => ({ ...prev, [ovKey]: e.target.value }))}
                    onBlur={() => {
                      if (inlineEdits[ovKey] && inlineEdits[ovKey].trim()) {
                        onSaveOverScore(ovKey, inlineEdits[ovKey].trim());
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && inlineEdits[ovKey]?.trim()) {
                        onSaveOverScore(ovKey, inlineEdits[ovKey].trim());
                      }
                    }}
                    className="w-20 bg-slate-950 border-slate-700 text-amber-300 font-mono font-black text-xs text-center h-7"
                  />

                  {isUserSaved && (
                    <button
                      type="button"
                      onClick={() => onDeleteOverScore(ovKey)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0 mt-4">
          <Button onClick={onClose} variant="outline" className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft size={14} />
            {lang === 'bn' ? 'পিছনে যান' : 'Go Back'}
          </Button>
          <Button onClick={onGoHome || onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-9 text-xs flex items-center gap-1.5">
            <Home size={14} />
            {lang === 'bn' ? 'হোমে ফিরুন' : 'Done / Home'}
          </Button>
        </div>
      </div>
    </div>
  );
};
