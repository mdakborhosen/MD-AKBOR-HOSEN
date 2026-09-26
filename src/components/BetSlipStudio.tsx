import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, Download, Plus, Trash2, Copy, Check, Sparkles, 
  Eye, Trophy, Pencil, RefreshCw, X, FileText, Calendar, DollarSign,
  Clock, CheckCircle2, XCircle, Activity, AlertCircle, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { BetSlipData, BetEvent, EventStatus } from '../types/betslip';
import { Barcode } from './Barcode';
import { convertPdfToImageAndText } from '../lib/pdfParser';

interface SavedSlipCard {
  id: string;
  amount: string;
  currency: string;
  countBadge?: number;
  colorScheme?: 'white' | 'blue';
  slipData: BetSlipData;
}

/**
 * Parses date & time string e.g. "21.04 15:30", "21.04.2026 15:30", "2026-09-18 20:30"
 * Returns millisecond timestamp for chronological sorting
 */
export function parseEventDateTime(dtStr?: string): number {
  if (!dtStr) return 0;
  const str = dtStr.trim();
  
  // Format: "DD.MM HH:mm" or "DD.MM.YYYY HH:mm" or "DD.MM HH:mm AM/PM"
  const m = str.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = m[3] ? parseInt(m[3], 10) : 2026;
    if (year < 100) year += 2000;
    let hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);
    const ampm = m[6]?.toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(year, month, day, hour, minute).getTime();
  }

  // Standard Date parse fallback
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return parsed;

  return 0;
}

/**
 * Sorts events:
 * 1. Ongoing/Pending events at the top, Completed events (Win, Lost, Cancel) at the bottom.
 * 2. Within each group, events are ordered chronologically by Date and Time.
 */
export function sortEventsChronologically(events: BetEvent[]): BetEvent[] {
  return [...events].sort((a, b) => {
    const isCompletedA = a.status === 'Win' || a.status === 'Lost' || a.status === 'Cancel';
    const isCompletedB = b.status === 'Win' || b.status === 'Lost' || b.status === 'Cancel';

    // Completed events go to bottom
    if (isCompletedA !== isCompletedB) {
      return isCompletedA ? 1 : -1;
    }

    // Sort by date & time
    const timeA = parseEventDateTime(a.dateTime);
    const timeB = parseEventDateTime(b.dateTime);

    if (timeA && timeB && timeA !== timeB) {
      return timeA - timeB;
    }

    return (a.dateTime || '').localeCompare(b.dateTime || '');
  });
}

const DEFAULT_SLIP_1: BetSlipData = {
  id: 'slip-80709130005',
  slipNumber: '80709130005',
  dateTime: '21.04 08:25 AM',
  betType: 'Accumulator',
  status: 'Pending',
  stake: '3316920.53',
  overallOdds: '5.82',
  wonOdds: '5.82',
  potentialWinnings: '19304477.48',
  wonPayout: '0.00',
  account: 'User #807091',
  events: [
    {
      id: 'ev-1',
      eventNumber: '1',
      dateTime: '21.04 15:30',
      sport: 'Football',
      league: 'Premier League',
      match: 'Arsenal - Chelsea',
      team1: 'Arsenal',
      team2: 'Chelsea',
      selection: 'W1',
      odds: '1.75',
      status: 'Pending',
      score1: '',
      score2: ''
    },
    {
      id: 'ev-2',
      eventNumber: '2',
      dateTime: '21.04 18:00',
      sport: 'Football',
      league: 'La Liga',
      match: 'Real Madrid - Barcelona',
      team1: 'Real Madrid',
      team2: 'Barcelona',
      selection: 'Total Over 2.5',
      odds: '1.82',
      status: 'Pending',
      score1: '',
      score2: ''
    },
    {
      id: 'ev-3',
      eventNumber: '3',
      dateTime: '20.04 20:45',
      sport: 'Football',
      league: 'Serie A',
      match: 'Inter - Juventus',
      team1: 'Inter',
      team2: 'Juventus',
      selection: 'BTTS - Yes',
      odds: '1.83',
      status: 'Win',
      score1: '2',
      score2: '1'
    }
  ]
};

const DEFAULT_SLIP_2: BetSlipData = {
  id: 'slip-000bdt',
  slipNumber: '91823719284',
  dateTime: '21.04 10:15 AM',
  betType: 'Single',
  status: 'Pending',
  stake: '0.00',
  overallOdds: '1.85',
  wonOdds: '1.85',
  potentialWinnings: '0.00',
  wonPayout: '0.00',
  account: 'User #000',
  events: [
    {
      id: 'ev-sub-1',
      eventNumber: '1',
      dateTime: '21.04 21:00',
      sport: 'Football',
      league: 'Champions League',
      match: 'Bayern Munich - PSG',
      team1: 'Bayern Munich',
      team2: 'PSG',
      selection: 'W1',
      odds: '1.85',
      status: 'Pending',
      score1: '',
      score2: ''
    }
  ]
};

const INITIAL_CARDS: SavedSlipCard[] = [
  {
    id: 'card-1',
    amount: '3316920.53',
    currency: 'BDT',
    countBadge: 29,
    colorScheme: 'white',
    slipData: DEFAULT_SLIP_1
  },
  {
    id: 'card-2',
    amount: '0.00',
    currency: 'BDT',
    colorScheme: 'blue',
    slipData: DEFAULT_SLIP_2
  }
];

interface BetSlipStudioProps {
  lang?: 'en' | 'bn';
}

export const BetSlipStudio: React.FC<BetSlipStudioProps> = ({ lang = 'bn' }) => {
  const [savedCards, setSavedCards] = useState<SavedSlipCard[]>(() => {
    try {
      const saved = localStorage.getItem('cricket-saved-slip-cards');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CARDS;
  });

  const [activeCardId, setActiveCardId] = useState<string>('card-1');
  const [activeMode, setActiveMode] = useState<'preview' | 'edit'>('preview');

  const [slip, setSlip] = useState<BetSlipData>(() => {
    return savedCards[0]?.slipData || DEFAULT_SLIP_1;
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>('BDT');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const slipPrintRef = useRef<HTMLDivElement>(null);

  // Chronologically sorted events with completed at bottom
  const sortedEvents = useMemo(() => {
    return sortEventsChronologically(slip.events);
  }, [slip.events]);

  // Group events for the Edit view
  const pendingEvents = useMemo(() => {
    return sortedEvents.filter(e => e.status !== 'Win' && e.status !== 'Lost' && e.status !== 'Cancel');
  }, [sortedEvents]);

  const completedEvents = useMemo(() => {
    return sortedEvents.filter(e => e.status === 'Win' || e.status === 'Lost' || e.status === 'Cancel');
  }, [sortedEvents]);

  // Save cards to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cricket-saved-slip-cards', JSON.stringify(savedCards));
    } catch {}
  }, [savedCards]);

  // Keep active card slip data in sync
  useEffect(() => {
    setSavedCards(prev => prev.map(c => {
      if (c.id === activeCardId) {
        return {
          ...c,
          amount: slip.stake,
          slipData: slip
        };
      }
      return c;
    }));
  }, [slip, activeCardId]);

  // Select a card from top carousel
  const handleSelectCard = (card: SavedSlipCard) => {
    setActiveCardId(card.id);
    setSlip(card.slipData);
  };

  // Delete card
  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedCards.length <= 1) {
      toast.warning(lang === 'bn' ? 'কমপক্ষে একটি স্লিপ থাকতে হবে' : 'At least one slip card required');
      return;
    }
    const filtered = savedCards.filter(c => c.id !== cardId);
    setSavedCards(filtered);
    if (activeCardId === cardId) {
      setActiveCardId(filtered[0].id);
      setSlip(filtered[0].slipData);
    }
    toast.info(lang === 'bn' ? 'স্লিপ কার্ড মোছা হয়েছে' : 'Slip removed');
  };

  // Add new slip card
  const handleAddNewCard = () => {
    const newNum = Math.floor(80000000000 + Math.random() * 10000000000).toString();
    const newCard: SavedSlipCard = {
      id: `card-${Date.now()}`,
      amount: '500.00',
      currency: 'BDT',
      countBadge: Math.floor(Math.random() * 30) + 1,
      colorScheme: savedCards.length % 2 === 0 ? 'white' : 'blue',
      slipData: {
        ...DEFAULT_SLIP_1,
        id: `slip-${Date.now()}`,
        slipNumber: newNum,
        stake: '500.00'
      }
    };
    setSavedCards(prev => [...prev, newCard]);
    setActiveCardId(newCard.id);
    setSlip(newCard.slipData);
    toast.success(lang === 'bn' ? 'নতুন স্লিপ তৈরি হয়েছে' : 'New slip card created');
  };

  // Copy card amount
  const handleCopyCardAmount = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(lang === 'bn' ? 'কপি হয়েছে!' : 'Copied to clipboard!');
  };

  // Parse Date/Time string into parts
  const dateTimeParts = (slip.dateTime || '21.04 08:25 AM').split(' ');
  const dateStr = dateTimeParts[0] || '21.04';
  const timeStr = dateTimeParts.slice(1).join(' ') || '08:25 AM';

  // Handle Event updates (status, score, date, match, odds)
  const handleUpdateEvent = (id: string, updates: Partial<BetEvent>) => {
    setSlip(prev => {
      const updatedEvents = prev.events.map(e => e.id === id ? { ...e, ...updates } : e);
      
      let computedOdds = 1;
      let anyLost = false;
      let allWon = true;
      let anyLive = false;

      for (const ev of updatedEvents.filter(e => !e.hidden)) {
        computedOdds *= parseFloat(ev.odds) || 1;
        if (ev.status === 'Lost') anyLost = true;
        if (ev.status === 'Live') anyLive = true;
        if (ev.status !== 'Win') allWon = false;
      }

      const stakeNum = parseFloat(prev.stake) || 0;
      let newSlipStatus: EventStatus = prev.status;
      if (anyLost) newSlipStatus = 'Lost';
      else if (allWon && updatedEvents.length > 0) newSlipStatus = 'Win';
      else if (anyLive) newSlipStatus = 'Live';
      else if (updatedEvents.some(e => e.status === 'Pending')) newSlipStatus = 'Pending';

      return {
        ...prev,
        events: updatedEvents,
        overallOdds: computedOdds.toFixed(2),
        potentialWinnings: (stakeNum * computedOdds).toFixed(2),
        wonPayout: allWon ? (stakeNum * computedOdds).toFixed(2) : '0.00',
        status: newSlipStatus,
        betType: updatedEvents.length > 1 ? 'Accumulator' : 'Single'
      };
    });
  };

  const handleAddEvent = () => {
    const newEv: BetEvent = {
      id: `ev-${Date.now()}`,
      eventNumber: (slip.events.length + 1).toString(),
      dateTime: '21.04 22:00',
      sport: 'Football',
      league: 'Match',
      match: 'Team A - Team B',
      team1: 'Team A',
      team2: 'Team B',
      selection: 'W1',
      odds: '1.80',
      status: 'Pending',
      score1: '',
      score2: ''
    };
    setSlip(prev => {
      const newEvents = [...prev.events, newEv];
      let computedOdds = 1;
      for (const ev of newEvents.filter(e => !e.hidden)) {
        computedOdds *= parseFloat(ev.odds) || 1;
      }
      const stakeNum = parseFloat(prev.stake) || 0;
      return {
        ...prev,
        events: newEvents,
        overallOdds: computedOdds.toFixed(2),
        potentialWinnings: (stakeNum * computedOdds).toFixed(2),
        betType: newEvents.length > 1 ? 'Accumulator' : 'Single'
      };
    });
    toast.info(lang === 'bn' ? 'নতুন ম্যাচ যোগ করা হয়েছে' : 'Event added');
  };

  const handleRemoveEvent = (id: string) => {
    if (slip.events.length <= 1) {
      toast.warning(lang === 'bn' ? 'কমপক্ষে একটি ইভেন্ট প্রয়োজন' : 'At least 1 event required');
      return;
    }
    setSlip(prev => {
      const filtered = prev.events.filter(e => e.id !== id);
      let computedOdds = 1;
      for (const ev of filtered.filter(e => !e.hidden)) {
        computedOdds *= parseFloat(ev.odds) || 1;
      }
      const stakeNum = parseFloat(prev.stake) || 0;
      return {
        ...prev,
        events: filtered,
        overallOdds: computedOdds.toFixed(2),
        potentialWinnings: (stakeNum * computedOdds).toFixed(2),
        betType: filtered.length > 1 ? 'Accumulator' : 'Single'
      };
    });
  };

  // Upload & OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(lang === 'bn' ? 'ফাইল প্রসেস হচ্ছে...' : 'Processing file...');
    const toastId = toast.loading(lang === 'bn' ? 'AI দিয়ে স্লিপ বিশ্লেষণ হচ্ছে...' : 'AI parsing bet slip...');

    try {
      let imageBase64: string | null = null;
      let extractedText: string | null = null;

      if (file.type === 'application/pdf') {
        setUploadProgress(lang === 'bn' ? 'পিডিএফ কনভার্ট হচ্ছে...' : 'Converting PDF...');
        const pdfRes = await convertPdfToImageAndText(file);
        imageBase64 = pdfRes.imageBase64;
        extractedText = pdfRes.extractedText;
      } else if (file.type.startsWith('image/')) {
        setUploadProgress(lang === 'bn' ? 'ছবি রিড করা হচ্ছে...' : 'Reading image...');
        imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setUploadProgress(lang === 'bn' ? 'Gemini AI এক্সট্রাকশন...' : 'Extracting via Gemini AI...');
      const response = await fetch('/api/parse-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, extractedText })
      });

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || 'Could not parse slip');
      }

      const parsed = resData.data;
      setSlip(prev => ({
        ...prev,
        slipNumber: parsed.slipNumber || prev.slipNumber,
        dateTime: parsed.dateTime || prev.dateTime,
        betType: parsed.betType || prev.betType,
        overallOdds: parsed.overallOdds || prev.overallOdds,
        stake: parsed.stake || prev.stake,
        potentialWinnings: parsed.potentialWinnings || prev.potentialWinnings,
        status: (parsed.status as EventStatus) || prev.status,
        events: parsed.events && parsed.events.length > 0 ? parsed.events : prev.events
      }));

      toast.success(lang === 'bn' ? 'স্লিপ সফলভাবে লোড হয়েছে!' : 'Slip successfully parsed!', { id: toastId });
      setActiveMode('preview');
    } catch (err: any) {
      console.error('OCR error:', err);
      toast.error(lang === 'bn' ? 'স্লিপ লোডে ব্যর্থ হয়েছে' : 'Failed to parse slip', { id: toastId });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Download Image
  const handleDownloadImage = async () => {
    if (!slipPrintRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(lang === 'bn' ? 'স্লিপ ইমেজ প্রস্তুত হচ্ছে...' : 'Generating slip image...');

    try {
      const dataUrl = await toPng(slipPrintRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `BetSlip_1XBET_${slip.slipNumber || 'Ticket'}.png`;
      link.href = dataUrl;
      link.click();

      toast.success(lang === 'bn' ? 'স্লিপ ডাউনলোড সম্পন্ন হয়েছে!' : 'Slip downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(lang === 'bn' ? 'ডাউনলোডে সমস্যা হয়েছে' : 'Failed to generate image', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Summary
  const handleCopySummary = () => {
    const summary = `1XBET - Bet slip № ${slip.slipNumber}\nDate/Time: ${slip.dateTime}\nBet type: ${slip.betType}\nStake: ${slip.stake} ${currencySymbol}\nOdds: ${slip.overallOdds}\nPotential: ${slip.potentialWinnings} ${currencySymbol}\nStatus: ${slip.status}\n\nEvents:\n` +
      sortedEvents.map(e => `• [${e.status}] ${e.dateTime} | ${e.match} ${e.score1 || e.score2 ? `(${e.score1 || '0'}-${e.score2 || '0'})` : ''} | Pick: ${e.selection} @ ${e.odds}`).join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(lang === 'bn' ? 'স্লিপ কপি হয়েছে!' : 'Summary copied!');
  };

  // Render a single event item in the editor
  const renderEditEventItem = (ev: BetEvent, index: number, groupTitle: string) => {
    const isCompleted = ev.status === 'Win' || ev.status === 'Lost' || ev.status === 'Cancel';

    return (
      <div 
        key={ev.id}
        className={`border rounded-xl p-3 space-y-2.5 transition-all ${
          ev.status === 'Win'
            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
            : ev.status === 'Lost'
            ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
            : ev.status === 'Live'
            ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40'
        }`}
      >
        {/* Header: Event number, match title & delete */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {index + 1}
            </span>
            <input
              type="text"
              value={ev.match}
              onChange={e => handleUpdateEvent(ev.id, { match: e.target.value })}
              className="font-bold text-xs bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 outline-none w-full"
              placeholder="Arsenal - Chelsea"
            />
          </div>

          <button
            onClick={() => handleRemoveEvent(ev.id)}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
            title="Remove event"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* 1. STATUS SELECTION BAR (WIN, LOST, PENDING, LIVE) */}
        <div>
          <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>{lang === 'bn' ? 'ইভেন্ট স্ট্যাটাস' : 'Event Status'}</span>
            {isCompleted && (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                {lang === 'bn' ? '✓ সম্পন্ন (তালিকার নিচে)' : '✓ Completed (at bottom)'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {/* Pending Button */}
            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Pending' })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Pending'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              <Clock size={11} />
              <span>{lang === 'bn' ? 'পেন্ডিং' : 'Pending'}</span>
            </button>

            {/* Win Button */}
            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Win' })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Win'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={11} />
              <span>{lang === 'bn' ? 'উইন' : 'Win'}</span>
            </button>

            {/* Lost Button */}
            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Lost' })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Lost'
                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-50'
              }`}
            >
              <XCircle size={11} />
              <span>{lang === 'bn' ? 'লস' : 'Lost'}</span>
            </button>

            {/* Live Button */}
            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Live' })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Live'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-rose-50'
              }`}
            >
              <Activity size={11} />
              <span>{lang === 'bn' ? 'লাইভ' : 'Live'}</span>
            </button>
          </div>
        </div>

        {/* 2. SCORE UPDATE INPUTS */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>{lang === 'bn' ? 'ম্যাচ স্কোর আপডেট' : 'Live / Final Score'}</span>
            {(ev.score1 || ev.score2) && (
              <span className="text-[9px] font-bold font-mono text-blue-600">
                {ev.score1 || '0'} - {ev.score2 || '0'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'টিম ১ স্কোর' : 'Team 1'}
                value={ev.score1 || ''}
                onChange={e => handleUpdateEvent(ev.id, { score1: e.target.value })}
                className="w-full h-7 px-2 text-center text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white"
              />
            </div>
            <span className="font-bold text-slate-400 text-xs">-</span>
            <div className="flex-1">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'টিম ২ স্কোর' : 'Team 2'}
                value={ev.score2 || ''}
                onChange={e => handleUpdateEvent(ev.id, { score2: e.target.value })}
                className="w-full h-7 px-2 text-center text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white"
              />
            </div>
            {(ev.score1 || ev.score2) && (
              <button
                type="button"
                onClick={() => handleUpdateEvent(ev.id, { score1: '', score2: '' })}
                className="p-1 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                title="Clear score"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 3. DATE, SELECTION & ODDS */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[9px] font-bold text-slate-400 block">{lang === 'bn' ? 'তারিখ ও সময়' : 'Date/Time'}</span>
            <input
              type="text"
              value={ev.dateTime}
              onChange={e => handleUpdateEvent(ev.id, { dateTime: e.target.value })}
              placeholder="21.04 15:30"
              className="w-full h-7 px-1.5 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 block">{lang === 'bn' ? 'সিলেকশন' : 'Selection'}</span>
            <input
              type="text"
              value={ev.selection}
              onChange={e => handleUpdateEvent(ev.id, { selection: e.target.value })}
              className="w-full h-7 px-1.5 text-[11px] font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600"
            />
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 block">{lang === 'bn' ? 'অডস' : 'Odds'}</span>
            <input
              type="number"
              step="0.01"
              value={ev.odds}
              onChange={e => handleUpdateEvent(ev.id, { odds: e.target.value })}
              className="w-full h-7 px-1.5 text-[11px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 p-3 md:p-6 max-w-xl mx-auto font-sans">
      
      {/* 1. TOP HORIZONTAL CAROUSEL OF SLIPS / BALANCES */}
      <div className="w-full overflow-x-auto no-scrollbar pt-2 pb-1">
        <div className="flex items-center gap-3 min-w-max px-1">
          {savedCards.map((card) => {
            const isActive = card.id === activeCardId;
            const isBlue = card.colorScheme === 'blue';

            if (isBlue) {
              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className={`relative cursor-pointer transition-all rounded-2xl px-5 py-3 shadow-md flex items-center gap-3 select-none ${
                    isActive 
                      ? 'bg-[#1864e8] text-white ring-2 ring-[#1864e8]/50 ring-offset-2' 
                      : 'bg-[#1864e8] text-white opacity-95 hover:opacity-100'
                  }`}
                >
                  <span className="text-base sm:text-lg font-bold font-mono tracking-tight">
                    {card.amount} {card.currency}
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-white/90">
                    <button
                      onClick={(e) => handleCopyCardAmount(`${card.amount} ${card.currency}`, e)}
                      title="Copy amount"
                      className="p-1 hover:text-white transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      title="Delete card"
                      className="p-1 hover:text-red-200 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            }

            // White Card
            return (
              <div key={card.id} className="flex flex-col items-center">
                <div
                  onClick={() => handleSelectCard(card)}
                  className={`relative cursor-pointer transition-all rounded-2xl px-5 py-3 shadow-sm border bg-white dark:bg-slate-900 flex items-center gap-3 select-none ${
                    isActive 
                      ? 'border-slate-300 dark:border-slate-700 shadow-md ring-1 ring-slate-300 dark:ring-slate-700' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Floating count badge over top-right corner */}
                  {card.countBadge !== undefined && (
                    <div className="absolute -top-2.5 -right-2 bg-[#1864e8] text-white font-bold text-[11px] px-2 py-0.5 rounded-full shadow-sm">
                      {card.countBadge}
                    </div>
                  )}

                  <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-800 dark:text-slate-100">
                    {card.amount} {card.currency}
                  </span>

                  <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <button
                      onClick={(e) => handleCopyCardAmount(`${card.amount} ${card.currency}`, e)}
                      title="Copy amount"
                      className="p-1 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      title="Delete card"
                      className="p-1 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Subtle active indicator bar underneath card */}
                {isActive && (
                  <div className="w-16 h-1 bg-slate-400 dark:bg-slate-600 rounded-full mt-1.5" />
                )}
              </div>
            );
          })}

          {/* Add new slip button */}
          <button
            onClick={handleAddNewCard}
            title={lang === 'bn' ? 'নতুন স্লিপ যোগ করুন' : 'Add new slip'}
            className="w-10 h-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600 hover:border-slate-400 flex items-center justify-center shrink-0 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* 2. MODE SWITCHER CARD (EDIT DETAILS vs VIEW PREVIEW) */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-[28px] p-3 sm:p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center">
        <div className="w-full max-w-sm bg-[#EEF1F6] dark:bg-slate-800/80 p-1.5 rounded-2xl flex items-center justify-between gap-1">
          
          {/* Edit Details Button */}
          <button
            onClick={() => setActiveMode('edit')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all select-none ${
              activeMode === 'edit'
                ? 'bg-white dark:bg-slate-900 text-[#1864e8] shadow-md shadow-blue-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Pencil size={15} className={activeMode === 'edit' ? 'text-[#1864e8]' : 'text-slate-500'} />
            <span>Edit Details</span>
          </button>

          {/* View Preview Button */}
          <button
            onClick={() => setActiveMode('preview')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all select-none ${
              activeMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-[#1864e8] shadow-md shadow-blue-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Check size={16} strokeWidth={2.5} className="text-[#1864e8]" />
            <span className="leading-tight text-center">
              View Preview
            </span>
          </button>
        </div>
      </div>

      {/* 3. CONTENT AREA: VIEW PREVIEW vs EDIT DETAILS */}
      {activeMode === 'preview' ? (
        /* ================= AUTHENTIC 1XBET BET SLIP PREVIEW ================= */
        <div className="w-full flex flex-col items-center gap-3">
          
          {/* The Bet Slip Card (Target for image export) */}
          <div 
            ref={slipPrintRef}
            className="w-full bg-white rounded-[28px] border border-slate-200 shadow-xl p-5 sm:p-7 text-black select-text"
          >
            {/* 1XBET Logo Header */}
            <div className="flex justify-center mb-3">
              <span className="font-black italic tracking-tighter text-4xl sm:text-5xl text-black font-sans select-none">
                1XBET
              </span>
            </div>

            {/* Date & Time Right-Aligned */}
            <div className="text-right text-xs sm:text-sm font-bold text-black leading-tight mb-2">
              <div>{dateStr}</div>
              <div>{timeStr}</div>
            </div>

            {/* Bet Slip Number */}
            <div className="text-center font-bold text-base sm:text-lg text-black mb-1 tracking-tight">
              Bet slip № {slip.slipNumber || '80709130005'}
            </div>

            {/* Bet Type Right-Aligned */}
            <div className="text-right text-xs sm:text-sm font-bold text-black mb-3">
              Bet type: {slip.betType || 'Accumulator'}
            </div>

            {/* Crisp 1XBET Table with Black Grid Borders & Chronological Sorting */}
            <table className="w-full border-collapse border border-black text-black text-xs font-medium">
              <thead>
                <tr className="border-b border-black">
                  <th className="border-r border-black p-2 text-center font-bold w-[22%]">
                    Date/Time
                  </th>
                  <th className="border-r border-black p-2 text-center font-bold w-[38%]">
                    Event
                  </th>
                  <th className="border-r border-black p-2 text-center font-bold w-[24%] leading-tight">
                    Selectio<br />n
                  </th>
                  <th className="p-2 text-center font-bold w-[16%]">
                    Odds
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.filter(e => !e.hidden).map((ev) => {
                  const isCompleted = ev.status === 'Win' || ev.status === 'Lost' || ev.status === 'Cancel';

                  return (
                    <tr 
                      key={ev.id} 
                      className={`border-b border-black last:border-b-0 ${
                        ev.status === 'Win'
                          ? 'bg-emerald-50/20'
                          : ev.status === 'Lost'
                          ? 'bg-red-50/20'
                          : ''
                      }`}
                    >
                      <td className="border-r border-black p-2 text-center text-[11px] font-medium leading-tight align-middle">
                        <div>{ev.dateTime}</div>
                        
                        {/* Status badge in table */}
                        <div className="mt-1 flex justify-center">
                          {ev.status === 'Win' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                              ✓ Win
                            </span>
                          ) : ev.status === 'Lost' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-red-800 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
                              ✕ Lost
                            </span>
                          ) : ev.status === 'Live' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 animate-pulse">
                              ● Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="border-r border-black p-2 text-left text-[11px] font-medium leading-tight align-middle">
                        <div className="font-bold text-black">{ev.match}</div>
                        {ev.league && (
                          <div className="text-[10px] text-slate-700">{ev.league}</div>
                        )}
                        {(ev.score1 || ev.score2) && (
                          <div className="text-[10px] font-black text-slate-900 mt-1 inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                            <span>Score:</span>
                            <span className="font-mono">{ev.score1 || '0'} - {ev.score2 || '0'}</span>
                          </div>
                        )}
                      </td>

                      <td className="border-r border-black p-2 text-center text-[11px] font-bold leading-tight align-middle">
                        {ev.selection}
                      </td>

                      <td className="p-2 text-center text-[11px] font-bold font-mono align-middle">
                        {ev.odds}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary Details Below Table */}
            <div className="mt-4 pt-3 border-t border-black/80 flex flex-col gap-1.5 text-xs text-black font-semibold">
              <div className="flex items-center justify-between">
                <span>Overall odds:</span>
                <span className="font-mono font-bold text-sm">{slip.overallOdds}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Stake:</span>
                <span className="font-mono font-bold">{slip.stake} {currencySymbol}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-black/30">
                <span className="font-bold">Potential winnings:</span>
                <span className="font-mono font-bold text-sm text-black">
                  {slip.potentialWinnings} {currencySymbol}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-slate-700">Slip Status:</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                  slip.status === 'Win' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : slip.status === 'Lost' 
                    ? 'bg-red-100 text-red-800' 
                    : slip.status === 'Live'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {slip.status}
                </span>
              </div>
            </div>

            {/* Barcode representation at bottom */}
            <div className="mt-5 pt-3 border-t border-black flex flex-col items-center justify-center">
              <Barcode 
                value={slip.slipNumber || '80709130005'} 
                height={38}
                width={1.5}
                displayValue={true}
                className="max-w-full h-auto"
              />
            </div>
          </div>

          {/* Action Buttons Below Slip */}
          <div className="w-full flex items-center justify-center gap-2 pt-1">
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1864e8] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Download size={16} />
              <span>{lang === 'bn' ? 'স্লিপ ডাউনলোড করুন (PNG)' : 'Download Bet Slip Image'}</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
              title="Copy Summary"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              <span>{copied ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (lang === 'bn' ? 'কপি' : 'Copy')}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= EDIT DETAILS CONTROLS ================= */
        <div className="w-full flex flex-col gap-4">
          
          {/* AI Extract from Image / PDF */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                {lang === 'bn' ? 'AI দিয়ে স্লিপ অটো লোড (ছবি / PDF)' : 'AI OCR Auto-Parse Slip'}
              </span>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 dark:border-blue-900/60 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer bg-blue-50/30 dark:bg-blue-950/20 transition-all text-center"
            >
              <Upload size={20} className="text-blue-500 mb-1" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isUploading ? uploadProgress : (lang === 'bn' ? 'ছবি বা পিডিএফ আপলোড করতে ক্লিক করুন' : 'Click to upload slip image or PDF')}
              </p>
              <p className="text-[10px] text-slate-400">
                PNG, JPG, PDF (AI extracts events, odds & stakes automatically)
              </p>
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>

          {/* Basic Slip Info Inputs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
              {lang === 'bn' ? 'স্লিপের মূল তথ্য' : 'Slip Details'}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'স্লিপ নম্বর (Slip №)' : 'Slip Number'}
                </label>
                <input
                  type="text"
                  value={slip.slipNumber}
                  onChange={e => setSlip(prev => ({ ...prev, slipNumber: e.target.value }))}
                  className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'তারিখ ও সময় (Date / Time)' : 'Date & Time'}
                </label>
                <input
                  type="text"
                  value={slip.dateTime}
                  onChange={e => setSlip(prev => ({ ...prev, dateTime: e.target.value }))}
                  placeholder="21.04 08:25 AM"
                  className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'বেট টাইপ (Bet Type)' : 'Bet Type'}
                </label>
                <input
                  type="text"
                  value={slip.betType}
                  onChange={e => setSlip(prev => ({ ...prev, betType: e.target.value }))}
                  className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'কারেন্সি' : 'Currency'}
                </label>
                <select
                  value={currencySymbol}
                  onChange={e => setCurrencySymbol(e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="BDT">BDT (টাকা)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'স্টেক / বাজি (Stake)' : 'Stake'}
                </label>
                <input
                  type="text"
                  value={slip.stake}
                  onChange={e => {
                    const val = e.target.value;
                    const odds = parseFloat(slip.overallOdds) || 1;
                    const pot = (parseFloat(val) * odds).toFixed(2);
                    setSlip(prev => ({ ...prev, stake: val, potentialWinnings: isNaN(parseFloat(pot)) ? '0.00' : pot }));
                  }}
                  className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'মোট অডস (Overall Odds)' : 'Overall Odds'}
                </label>
                <input
                  type="text"
                  value={slip.overallOdds}
                  onChange={e => {
                    const val = e.target.value;
                    const stakeNum = parseFloat(slip.stake) || 0;
                    const pot = (stakeNum * (parseFloat(val) || 1)).toFixed(2);
                    setSlip(prev => ({ ...prev, overallOdds: val, potentialWinnings: pot }));
                  }}
                  className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Events Manager with Chronological Sort and Status/Score controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 block">
                  {lang === 'bn' ? `ম্যাচ তালিকা (${slip.events.length})` : `Events (${slip.events.length})`}
                </span>
                <span className="text-[10px] text-slate-400">
                  {lang === 'bn' 
                    ? 'তারিখ ও সময় অনুযায়ী সাজানো; সম্পন্ন ইভেন্ট নিচে' 
                    : 'Sorted chronologically; finished matches at bottom'}
                </span>
              </div>

              <button
                onClick={handleAddEvent}
                className="px-2.5 py-1.5 rounded-lg bg-[#1864e8] text-white font-bold text-xs flex items-center gap-1 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={13} />
                <span>{lang === 'bn' ? 'ম্যাচ যোগ' : 'Add Match'}</span>
              </button>
            </div>

            {/* SECTION 1: PENDING / UPCOMING EVENTS (TOP) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Clock size={12} />
                  {lang === 'bn' 
                    ? `চলমান ও পেন্ডিং ইভেন্ট (${pendingEvents.length})` 
                    : `Active & Pending Matches (${pendingEvents.length})`}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {lang === 'bn' ? 'আগে অনুষ্ঠিত হবে' : 'Chronological (Earliest First)'}
                </span>
              </div>

              {pendingEvents.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো পেন্ডিং ইভেন্ট নেই' : 'No pending events'}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pendingEvents.map((ev, index) => renderEditEventItem(ev, index, 'pending'))}
                </div>
              )}
            </div>

            {/* SECTION 2: COMPLETED EVENTS (BOTTOM: WIN, LOST, CANCEL) */}
            <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {lang === 'bn' 
                    ? `সম্পন্ন হওয়া ইভেন্ট (${completedEvents.length})` 
                    : `Completed Matches (${completedEvents.length})`}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {lang === 'bn' ? 'তালিকার নিচে স্থানান্তরিত' : 'Placed at bottom'}
                </span>
              </div>

              {completedEvents.length === 0 ? (
                <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো সম্পন্ন ইভেন্ট নেই (উইন বা লস মার্ক করলে এখানে আসবে)' : 'No finished events yet'}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {completedEvents.map((ev, index) => renderEditEventItem(ev, pendingEvents.length + index, 'completed'))}
                </div>
              )}
            </div>
          </div>

          {/* Switch back to Preview */}
          <button
            onClick={() => setActiveMode('preview')}
            className="w-full py-3 rounded-xl bg-[#1864e8] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:bg-blue-700 shadow-md transition-all"
          >
            <Check size={16} />
            <span>{lang === 'bn' ? 'প্রিভিউ দেখুন' : 'Done & View Preview'}</span>
          </button>
        </div>
      )}

    </div>
  );
};
