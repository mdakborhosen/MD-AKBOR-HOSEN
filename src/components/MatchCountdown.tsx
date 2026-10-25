import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Play, Calendar, Zap, AlertCircle, Edit3, X, Check, Timer, Target, CircleDot, Flag, Plus, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Bengali digit conversion
export const toBengaliDigits = (val: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
};

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMatchDateTimeDisplay(
  startTime?: string,
  isoTime?: string,
  lang: 'bn' | 'en' = 'bn',
  matchDate?: string
): {
  dateStr: string;
  timeStr: string;
  fullDateTimeStr: string;
  targetTimestamp: number | null;
  minutesRemaining: number | null;
} {
  const ts = parseMatchStartTimeToTimestamp(startTime, isoTime);
  if (ts && !isNaN(ts)) {
    const d = new Date(ts);
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthIdx = d.getMonth();
    const yearNum = d.getFullYear();

    const hours24 = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = String(hours24 % 12 || 12).padStart(2, '0');

    const dateStr = lang === 'bn'
      ? `${toBengaliDigits(dayNum)} ${BN_MONTHS[monthIdx]} ${toBengaliDigits(yearNum)}`
      : `${dayNum} ${EN_MONTHS[monthIdx]} ${yearNum}`;

    const timeStr = lang === 'bn'
      ? `${toBengaliDigits(hours12)}:${toBengaliDigits(mins)} ${ampm}`
      : `${hours12}:${mins} ${ampm}`;

    const minutesRemaining = Math.ceil((ts - Date.now()) / 60000);

    return {
      dateStr,
      timeStr,
      fullDateTimeStr: `${dateStr} • ${timeStr}`,
      targetTimestamp: ts,
      minutesRemaining
    };
  }

  // Fallback when no parseable timestamp is set yet: show current/match date and startTime text
  const rawStartClean = (startTime || '').trim();
  const parsedDateOnly = rawStartClean ? new Date(rawStartClean.replace(/•/g, ' ')) : (matchDate ? new Date(matchDate) : new Date());
  const validD = !isNaN(parsedDateOnly.getTime()) && parsedDateOnly.getFullYear() > 2020
    ? parsedDateOnly
    : (matchDate && !isNaN(new Date(matchDate).getTime()) ? new Date(matchDate) : new Date());
  const dayNum = String(validD.getDate()).padStart(2, '0');
  const monthIdx = validD.getMonth();
  const yearNum = validD.getFullYear();
  const dateStr = lang === 'bn'
    ? `${toBengaliDigits(dayNum)} ${BN_MONTHS[monthIdx]} ${toBengaliDigits(yearNum)}`
    : `${dayNum} ${EN_MONTHS[monthIdx]} ${yearNum}`;
  const hasExplicitClockInStart = /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:[AaPp][Mm]|টা)\b/i.test(rawStartClean);
  const timeStr = hasExplicitClockInStart
    ? rawStartClean
    : (lang === 'bn' ? 'সময় সেট করুন' : 'Set Time');

  return {
    dateStr,
    timeStr,
    fullDateTimeStr: `${dateStr} • ${timeStr}`,
    targetTimestamp: null,
    minutesRemaining: null
  };
}

// Robust parser for match start time strings or ISO timestamps
export function parseMatchStartTimeToTimestamp(startTime?: string, isoTime?: string, matchDate?: string): number | null {
  if (isoTime) {
    const isoRaw = String(isoTime).trim();
    // Only accept isoTime directly if it includes a time component (T... or HH:mm)
    if (/T\d{2}:\d{2}|\b\d{1,2}:\d{2}\b/.test(isoRaw)) {
      const t = new Date(isoRaw).getTime();
      if (!isNaN(t)) return t;
    }
  }
  if (!startTime || typeof startTime !== 'string') {
    if (matchDate && /T\d{2}:\d{2}|\b\d{1,2}:\d{2}\b/.test(String(matchDate))) {
      const md = new Date(matchDate).getTime();
      if (!isNaN(md)) return md;
    }
    return null;
  }

  const raw = startTime.trim();
  if (!raw) {
    if (matchDate && /T\d{2}:\d{2}|\b\d{1,2}:\d{2}\b/.test(String(matchDate))) {
      const md = new Date(matchDate).getTime();
      if (!isNaN(md)) return md;
    }
    return null;
  }

  // Convert Bengali numerals to ASCII digits
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const normalized = raw.replace(/[০-৯]/g, (d) => bnToEnMap[d] || d);
  const hasExplicitTimeToken = /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:[AaPp][Mm]|টা)\b|T\d{2}:\d{2}/i.test(normalized);
  const isDayFirstNumericDate = /^\s*\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/.test(normalized);

  // Direct Date parse ONLY when the string contains a time of day AND is not a day-first DD.MM / DD/MM / DD-MM string
  if (hasExplicitTimeToken && !isDayFirstNumericDate) {
    const directDate = new Date(raw.replace(/•/g, ' '));
    if (!isNaN(directDate.getTime()) && directDate.getFullYear() > 2020) {
      return directDate.getTime();
    }
  }

  // Try direct Date parse after Bengali digit normalization & Bengali month replacement
  const bnMonthNormalized = normalized
    .replace(/জানু(?:য়ারি|য়ারি)?/g, 'Jan')
    .replace(/ফেব্রু(?:য়ারি|য়ারি)?/g, 'Feb')
    .replace(/মার্চ/g, 'Mar')
    .replace(/এপ্রিল/g, 'Apr')
    .replace(/মে/g, 'May')
    .replace(/জুন/g, 'Jun')
    .replace(/জুলাই/g, 'Jul')
    .replace(/আগস্ট/g, 'Aug')
    .replace(/সেপ্টে(?:ম্বর)?/g, 'Sep')
    .replace(/অক্টো(?:বর)?/g, 'Oct')
    .replace(/নভে(?:ম্বর)?/g, 'Nov')
    .replace(/ডিসে(?:ম্বর)?/g, 'Dec')
    .replace(/•/g, ' ');
  if (hasExplicitTimeToken && !isDayFirstNumericDate) {
    const normDirect = new Date(bnMonthNormalized);
    if (!isNaN(normDirect.getTime()) && normDirect.getFullYear() > 2020) {
      return normDirect.getTime();
    }
  }

  // 1. Relative: e.g. "starts in 30m", "in 2 hours", "বাকি ২ ঘণ্টা ১৫ মিনিট"
  const relMatch = normalized.match(/(?:\b(?:starts?\s+in|in)\s+|বাকি\s+)(?:(\d+)\s*(?:hours?|hrs?|h|ঘণ্টা))?\s*(?:(\d+)\s*(?:minutes?|mins?|m|মি\.?|মিনিট))?/i);
  if (relMatch && (relMatch[1] || relMatch[2])) {
    const hrs = parseInt(relMatch[1] || '0', 10);
    const mins = parseInt(relMatch[2] || '0', 10);
    if (hrs > 0 || mins > 0) {
      return Date.now() + (hrs * 3600 + mins * 60) * 1000;
    }
  }

  // Check specific date in string (e.g. "2026-09-24", "24-09-2026", "04 Oct 2026", "Oct 04, 2026", "04 Oct", "(Oct 5)", or "21.04 15:30")
  const dateMatch = normalized.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) || normalized.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  const dotDateMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?:\s*[,•]?\s*)\d{1,2}:\d{2}\b/);
  const monthTextMatch =
    bnMonthNormalized.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s,]+\s*(\d{4}))?\b/i) ||
    bnMonthNormalized.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:[\s,]+\s*(\d{4}))?\b/i);
  let specificYear: number | undefined;
  let specificMonth: number | undefined;
  let specificDay: number | undefined;

  if (monthTextMatch) {
    const firstIsDay = /^\d+$/.test(monthTextMatch[1]);
    const dayStr = firstIsDay ? monthTextMatch[1] : monthTextMatch[2];
    const monStr = firstIsDay ? monthTextMatch[2] : monthTextMatch[1];
    specificDay = parseInt(dayStr, 10);
    const mIdx = EN_MONTHS.findIndex(m => m.toLowerCase() === monStr.slice(0, 3).toLowerCase());
    if (mIdx !== -1) specificMonth = mIdx;
    if (monthTextMatch[3]) {
      specificYear = parseInt(monthTextMatch[3], 10);
    }
  } else if (dotDateMatch) {
    specificDay = parseInt(dotDateMatch[1], 10);
    specificMonth = parseInt(dotDateMatch[2], 10) - 1;
    if (dotDateMatch[3]) {
      const y = parseInt(dotDateMatch[3], 10);
      specificYear = y < 100 ? 2000 + y : y;
    }
  } else if (dateMatch) {
    if (dateMatch[1].length === 4) {
      specificYear = parseInt(dateMatch[1], 10);
      specificMonth = parseInt(dateMatch[2], 10) - 1;
      specificDay = parseInt(dateMatch[3], 10);
    } else {
      specificDay = parseInt(dateMatch[1], 10);
      specificMonth = parseInt(dateMatch[2], 10) - 1;
      specificYear = parseInt(dateMatch[3], 10);
    }
  } else if (matchDate) {
    const md = new Date(matchDate);
    if (!isNaN(md.getTime())) {
      specificYear = md.getFullYear();
      specificMonth = md.getMonth();
      specificDay = md.getDate();
    }
  }

  // 2. Time: requires a colon (HH:mm), 'টা', or AM/PM so plain score numbers (like "145/3" or "2 - 1") are never misparsed as hours
  const timeMatch = normalized.match(/\b(\d{1,2})(?::(\d{2})(?::(\d{2}))?\s*(?:টা)?\s*([AaPp][Mm])?|\s*টা\s*([AaPp][Mm])?|\s+([AaPp][Mm]))\b/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const ampm = (timeMatch[4] || timeMatch[5] || timeMatch[6])?.toUpperCase();

    if (hours <= 24 && minutes < 60 && seconds < 60) {
      const isEvening = /সন্ধ্যা|রাত|afternoon|evening|night|pm|বিকাল|দুপুর/i.test(raw);
      const isMorning = /সকাল|morning|am|ভোর/i.test(raw);

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      if (!ampm) {
        if (isEvening && hours < 12) hours += 12;
        if (isMorning && hours === 12) hours = 0;
      }

      const now = new Date();
      const candidateYear = specificYear ?? now.getFullYear();
      const candidateMonth = specificMonth ?? now.getMonth();
      const candidateDay = specificDay ?? now.getDate();
      const candidate = new Date(candidateYear, candidateMonth, candidateDay, hours, minutes, seconds);

      if (!specificYear && specificMonth === undefined && specificDay === undefined) {
        if (/tomorrow|কাল|আগামীকাল/i.test(raw)) {
          candidate.setDate(candidate.getDate() + 1);
        }
      }

      return candidate.getTime();
    }
  }

  // If only a future date (after today) was found without a clock time, set to noon of that future date; if today or past without time, return null so user/sync can set the exact time
  if (specificDay !== undefined && specificMonth !== undefined) {
    const now = new Date();
    const y = specificYear ?? now.getFullYear();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const candidateDayStart = new Date(y, specificMonth, specificDay, 0, 0, 0).getTime();
    if (!isNaN(candidateDayStart) && candidateDayStart > startOfToday) {
      return new Date(y, specificMonth, specificDay, 12, 0, 0).getTime();
    }
  }

  return null;
}

export interface MatchCountdownState {
  targetTimestamp: number | null;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isStarted: boolean;
  isPast: boolean;
  formattedEn: string;
  formattedBn: string;
  digitalClock: string;
  digitalClockBn: string;
}

// Hook that ticks every 1 second and provides countdown data
export function useMatchCountdown(startTime?: string, isoTime?: string, fallbackMinutes = 30): MatchCountdownState {
  const [fallbackTarget] = useState(() => {
    // Round up to the next 30-minute boundary + 15m so upcoming matches without an explicit timestamp still show a live ticking countdown
    const slotMs = 30 * 60 * 1000;
    return Math.ceil(Date.now() / slotMs) * slotMs + fallbackMinutes * 60 * 1000;
  });

  const targetTimestamp = useMemo(() => {
    const parsed = parseMatchStartTimeToTimestamp(startTime, isoTime);
    if (parsed && parsed > Date.now() - 2 * 3600 * 1000) {
      return parsed;
    }
    return fallbackTarget;
  }, [startTime, isoTime, fallbackTarget]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTimestamp) return;

    // Immediately sync with current time
    setNow(Date.now());

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTimestamp]);

  return useMemo(() => {
    if (!targetTimestamp) {
      return {
        targetTimestamp: null,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isStarted: false,
        isPast: false,
        formattedEn: '',
        formattedBn: '',
        digitalClock: '00:00:00',
        digitalClockBn: '০০:০০:০০'
      };
    }

    const diffMs = targetTimestamp - now;
    const totalSeconds = Math.floor(diffMs / 1000);
    const isStarted = totalSeconds <= 0;
    const isPast = totalSeconds < -120; // more than 2 minutes ago

    if (isStarted) {
      return {
        targetTimestamp,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isStarted: true,
        isPast,
        formattedEn: 'Match starting now',
        formattedBn: 'ম্যাচ এখনই শুরু হচ্ছে',
        digitalClock: '00:00:00',
        digitalClockBn: '০০:০০:০০'
      };
    }

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    const padBn = (n: number) => toBengaliDigits(pad(n));

    const partsEn: string[] = [];
    if (days > 0) partsEn.push(`${days}d`);
    if (hours > 0 || days > 0) partsEn.push(`${hours}h`);
    partsEn.push(`${minutes}m`);
    partsEn.push(`${seconds}s`);

    const partsBn: string[] = [];
    if (days > 0) partsBn.push(`${toBengaliDigits(days)}দিন`);
    if (hours > 0 || days > 0) partsBn.push(`${toBengaliDigits(hours)}ঘণ্টা`);
    partsBn.push(`${toBengaliDigits(minutes)}মি.`);
    partsBn.push(`${toBengaliDigits(seconds)}সে.`);

    const digitalClock = days > 0 
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    const digitalClockBn = days > 0
      ? `${toBengaliDigits(days)}দিন ${padBn(hours)}:${padBn(minutes)}:${padBn(seconds)}`
      : `${padBn(hours)}:${padBn(minutes)}:${padBn(seconds)}`;

    return {
      targetTimestamp,
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isStarted: false,
      isPast: false,
      formattedEn: partsEn.join(' '),
      formattedBn: partsBn.join(' '),
      digitalClock,
      digitalClockBn
    };
  }, [targetTimestamp, now]);
}

// Compact Pill Badge for headers, scoreboard chips, and cards
export const MatchCountdownBadge: React.FC<{
  startTime?: string;
  isoTime?: string;
  lang?: 'en' | 'bn';
  className?: string;
  showIcon?: boolean;
}> = ({ startTime, isoTime, lang = 'bn', className, showIcon = true }) => {
  const countdown = useMatchCountdown(startTime, isoTime);

  if (!countdown.targetTimestamp) {
    if (!startTime) return null;
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30",
        className
      )}>
        {showIcon && <Clock size={11} className="text-amber-400" />}
        <span>{startTime}</span>
      </span>
    );
  }

  if (countdown.isStarted) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse whitespace-nowrap",
        className
      )}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span>{lang === 'bn' ? 'খেলা শুরু হচ্ছে' : 'Starting Now'}</span>
      </span>
    );
  }

  const isUrgent = countdown.totalSeconds <= 600; // less than 10 mins

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border transition-all shadow-xs whitespace-nowrap",
      isUrgent
        ? "bg-red-500/20 text-red-300 border-red-500/50 animate-pulse"
        : "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25",
      className
    )}>
      {showIcon && <Timer size={11} className={cn("shrink-0", isUrgent ? "text-red-400 animate-spin" : "text-amber-400 animate-pulse")} />}
      <span className="tracking-wider">
        {lang === 'bn' ? countdown.digitalClockBn : countdown.digitalClock}
      </span>
    </span>
  );
};

// Full Hero Display for upcoming match screens / keypad banner replacement
export const MatchCountdownHero: React.FC<{
  startTime?: string;
  isoTime?: string;
  statusText?: string;
  lang?: 'en' | 'bn';
  onStartMatchNow?: () => void;
  onEditStartTime?: () => void;
  onOpenSyncModal?: () => void;
  className?: string;
  maxOvers?: number;
  format?: string;
  overs?: number;
  ballsInOver?: number;
  ballsPerOver?: number;
  totalBalls?: number;
  target?: number;
  score?: number;
  wickets?: number;
  onEditTargetOver?: () => void;
  onEditTargetRuns?: () => void;
  onOpenTargetManager?: () => void;
}> = ({
  startTime,
  isoTime,
  statusText,
  lang = 'bn',
  onStartMatchNow,
  onEditStartTime,
  onOpenSyncModal,
  className,
  maxOvers = 20,
  format,
  overs = 0,
  ballsInOver = 0,
  ballsPerOver = 6,
  totalBalls = 0,
  target,
  score = 0,
  wickets = 0,
  onEditTargetOver,
  onEditTargetRuns,
  onOpenTargetManager
}) => {
  const countdown = useMatchCountdown(startTime, isoTime);
  const pad = (n: number) => String(n).padStart(2, '0');
  const padBn = (n: number) => toBengaliDigits(pad(n));

  const isUrgent = countdown.totalSeconds <= 900 && !countdown.isStarted; // <= 15m

  return (
    <div className={cn(
      "w-full max-w-2xl mx-auto rounded-3xl p-5 sm:p-7 border shadow-xl relative overflow-hidden transition-all",
      countdown.isStarted
        ? "bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-900 border-emerald-500/40"
        : isUrgent
        ? "bg-gradient-to-b from-slate-950 via-rose-950/30 to-slate-950 border-rose-500/40"
        : "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-amber-500/30",
      className
    )}>
      {/* Background ambient glow */}
      <div className={cn(
        "absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none",
        countdown.isStarted ? "bg-emerald-500" : isUrgent ? "bg-rose-500" : "bg-amber-500"
      )} />

      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        {/* Top Header Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-sm",
            countdown.isStarted
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse"
              : isUrgent
              ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          )}>
            {countdown.isStarted ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {lang === 'bn' ? 'ম্যাচ শুরু হয়েছে!' : 'MATCH STARTING!'}
              </>
            ) : (
              <>
                <Clock size={13} className="text-amber-400 animate-pulse" />
                {lang === 'bn' ? 'ম্যাচ শুরুর কাউন্টডাউন' : 'MATCH START COUNTDOWN'}
              </>
            )}
          </span>

          {startTime && (
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800/90 text-slate-300 border border-slate-700/80">
              {lang === 'bn' ? 'নির্ধারিত সময়: ' : 'Time: '}{startTime}
            </span>
          )}
        </div>

        {/* Big Digital Countdown Blocks */}
        {!countdown.isStarted ? (
          <div className="w-full py-2">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
              {[
                { 
                  labelBn: 'দিন', 
                  labelEn: 'DAYS', 
                  val: countdown.days, 
                  display: lang === 'bn' ? padBn(countdown.days) : pad(countdown.days) 
                },
                { 
                  labelBn: 'ঘণ্টা', 
                  labelEn: 'HOURS', 
                  val: countdown.hours, 
                  display: lang === 'bn' ? padBn(countdown.hours) : pad(countdown.hours) 
                },
                { 
                  labelBn: 'মিনিট', 
                  labelEn: 'MINUTES', 
                  val: countdown.minutes, 
                  display: lang === 'bn' ? padBn(countdown.minutes) : pad(countdown.minutes) 
                },
                { 
                  labelBn: 'সেকেন্ড', 
                  labelEn: 'SECONDS', 
                  val: countdown.seconds, 
                  display: lang === 'bn' ? padBn(countdown.seconds) : pad(countdown.seconds) 
                },
              ].map((slot, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border shadow-lg transition-all",
                    isUrgent
                      ? "bg-slate-900/90 border-rose-500/30 text-rose-100 shadow-rose-950/40"
                      : "bg-slate-900/90 border-amber-500/25 text-amber-100 shadow-amber-950/40"
                  )}
                >
                  <span className={cn(
                    "text-2xl sm:text-4xl font-black font-mono tracking-tight",
                    isUrgent ? "text-rose-400" : "text-amber-400"
                  )}>
                    {slot.display}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                    {lang === 'bn' ? slot.labelBn : slot.labelEn}
                  </span>
                </div>
              ))}
            </div>

            {/* Countdown textual summary */}
            <p className="mt-3 text-xs sm:text-sm font-mono font-bold text-amber-200/90">
              {lang === 'bn' ? (
                <>ম্যাচ শুরু হতে বাকি: <span className="text-amber-400 font-black">{countdown.formattedBn}</span></>
              ) : (
                <>Starts in: <span className="text-amber-400 font-black">{countdown.formattedEn}</span></>
              )}
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
              <Zap size={32} />
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-white">
              {lang === 'bn' ? 'ম্যাচ শুরু হয়ে গেছে!' : 'Match Has Started!'}
            </h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto font-medium">
              {lang === 'bn'
                ? 'এখন আপনি ম্যানুয়াল স্কোর ইনপুট দিতে পারেন বা লাইভ সিঙ্ক থেকে স্কোর যুক্ত করতে পারেন।'
                : 'You can now enter scores manually or sync live ball-by-ball score data.'}
            </p>
          </div>
        )}

        {/* Prominent Match Stats: ওভার, বল, টার্গেট ওভার */}
        <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 max-w-lg mx-auto">
          {/* 1. ওভার */}
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock size={10} className="text-emerald-400" />
              {lang === 'bn' ? 'ওভার' : 'Overs'}
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
              {lang === 'bn' ? toBengaliDigits(overs) : overs}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {lang === 'bn' ? `${toBengaliDigits(overs)} ওভার` : `${overs} ov`}
            </span>
          </div>

          {/* 2. বল */}
          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CircleDot size={10} className="text-cyan-400" />
              {lang === 'bn' ? 'বল' : 'Balls'}
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-cyan-400">
              {lang === 'bn' ? `${toBengaliDigits(ballsInOver)}/${toBengaliDigits(ballsPerOver)}` : `${ballsInOver}/${ballsPerOver}`}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {lang === 'bn' ? `মোট: ${toBengaliDigits(totalBalls)} বল` : `Total: ${totalBalls}`}
            </span>
          </div>

          {/* 3. টার্গেট ওভার (Editable) */}
          <div 
            onClick={onEditTargetOver || onOpenTargetManager}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shadow-md transition-all group",
              (onEditTargetOver || onOpenTargetManager) && "cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/90 active:scale-95"
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 group-hover:text-indigo-300">
              <Target size={10} className="text-indigo-400" />
              {lang === 'bn' ? 'টার্গেট ওভার' : 'Target Overs'}
              {(onEditTargetOver || onOpenTargetManager) && <Edit3 size={9} className="text-slate-400 group-hover:text-indigo-400 opacity-70 ml-0.5" />}
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-indigo-400 group-hover:scale-105 transition-transform">
              {format === '100'
                ? (lang === 'bn' ? '১০০ বল' : '100 Ball')
                : (lang === 'bn' ? `${toBengaliDigits(maxOvers)} ওভার` : `${maxOvers} Ov`)}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {format === '100' ? '100b' : (maxOvers === 20 ? 'T20' : maxOvers === 50 ? 'ODI' : `${maxOvers} Ov`)}
            </span>
          </div>

          {/* 4. টার্গেট রান (Editable) */}
          <div 
            onClick={onEditTargetRuns || onOpenTargetManager}
            className={cn(
              "col-span-3 sm:col-span-1 flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shadow-md transition-all group",
              (onEditTargetRuns || onOpenTargetManager) && "cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/90 active:scale-95"
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 group-hover:text-amber-300">
              <Flag size={10} className="text-amber-400" />
              {lang === 'bn' ? 'টার্গেট রান' : 'Target Runs'}
              {(onEditTargetRuns || onOpenTargetManager) && <Edit3 size={9} className="text-slate-400 group-hover:text-amber-400 opacity-70 ml-0.5" />}
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-400 group-hover:scale-105 transition-transform">
              {target ? (lang === 'bn' ? `${toBengaliDigits(target)}` : target) : (lang === 'bn' ? '১ম ইনিংস' : '1st Inn')}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              {target 
                ? (lang === 'bn' ? `বাকি: ${toBengaliDigits(Math.max(0, target - score))}` : `Need: ${Math.max(0, target - score)}`) 
                : (lang === 'bn' ? 'নেই' : 'None')}
            </span>
          </div>
        </div>

        {/* Quick Link to open multiple targets manager */}
        {onOpenTargetManager && (
          <button
            type="button"
            onClick={onOpenTargetManager}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 hover:bg-indigo-950/60 border border-indigo-900/40 transition-colors cursor-pointer"
          >
            <Plus size={12} />
            <span>{lang === 'bn' ? '৩, ৪ এডিট করুন ও আরও টার্গেট ওভার/রান যুক্ত করুন' : 'Edit 3, 4 & Add More Targets'}</span>
          </button>
        )}

        {/* Status text if present */}
        {statusText && (
          <div className="text-[11px] sm:text-xs text-slate-300 font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 max-w-md">
            {statusText}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 w-full">
          {onStartMatchNow && (
            <Button
              type="button"
              size="sm"
              onClick={onStartMatchNow}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 h-9 shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={13} />
              {lang === 'bn' ? 'এখনই ম্যাচ শুরু করুন' : 'Start Match Now'}
            </Button>
          )}

          {onEditStartTime && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEditStartTime}
              className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold px-3.5 h-9 flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 size={12} className="text-amber-400" />
              {lang === 'bn' ? 'শুরুর সময় পরিবর্তন' : 'Edit Start Time'}
            </Button>
          )}

          {onOpenSyncModal && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenSyncModal}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold px-3.5 h-9 flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar size={12} className="text-indigo-400" />
              {lang === 'bn' ? 'লাইভ সিঙ্ক সেটিংস' : 'Sync Settings'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal for setting/adjusting Match Start Time
export const MatchStartTimeEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  currentStartTime?: string;
  currentStartTimeIso?: string;
  currentIsoTime?: string;
  isUpcoming?: boolean;
  lang?: 'en' | 'bn';
  onSave: ((data: { startTime?: string; startTimeIso?: string; isUpcoming: boolean }) => void) | ((startTime?: string, isoTime?: string, isUpcoming?: boolean) => void);
  onClear?: () => void;
}> = ({
  isOpen,
  onClose,
  onGoHome,
  currentStartTime = '',
  currentStartTimeIso = '',
  currentIsoTime = '',
  isUpcoming = false,
  lang = 'bn',
  onSave,
  onClear
}) => {
  const toLocalDatetimeInputValue = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const formatDateAndTimeLabel = (d: Date) => {
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
  };

  const actualIso = currentStartTimeIso || currentIsoTime || '';
  const [dateInput, setDateInput] = useState(() => {
    const parsedTs = parseMatchStartTimeToTimestamp(currentStartTime, actualIso);
    if (parsedTs) {
      const d = new Date(parsedTs);
      if (!isNaN(d.getTime())) return toLocalDatetimeInputValue(d);
    }
    return '';
  });

  const [textInput, setTextInput] = useState(currentStartTime);
  const [upcomingToggle, setUpcomingToggle] = useState(isUpcoming || Boolean(currentStartTime));

  useEffect(() => {
    if (isOpen) {
      setTextInput(currentStartTime || '');
      setUpcomingToggle(isUpcoming || Boolean(currentStartTime));
      const parsedTs = parseMatchStartTimeToTimestamp(currentStartTime, currentStartTimeIso || currentIsoTime);
      if (parsedTs) {
        const d = new Date(parsedTs);
        if (!isNaN(d.getTime())) {
          setDateInput(toLocalDatetimeInputValue(d));
          return;
        }
      }
      setDateInput('');
    }
  }, [isOpen, currentStartTime, currentStartTimeIso, currentIsoTime, isUpcoming]);

  if (!isOpen) return null;

  // Preset setter
  const applyOffsetMinutes = (minutes: number) => {
    const target = new Date(Date.now() + minutes * 60000);
    setDateInput(toLocalDatetimeInputValue(target));
    setTextInput(formatDateAndTimeLabel(target));
    setUpcomingToggle(true);
  };

  const applyTodayTime = (hours: number, minutes: number) => {
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() < Date.now() - 3600000) {
      target.setDate(target.getDate() + 1);
    }
    setDateInput(toLocalDatetimeInputValue(target));
    setTextInput(formatDateAndTimeLabel(target));
    setUpcomingToggle(true);
  };

  const handleSave = () => {
    let finalIso = '';
    let finalLabel = textInput.trim();

    if (dateInput) {
      try {
        const d = new Date(dateInput);
        if (!isNaN(d.getTime())) {
          finalIso = d.toISOString();
          if (!finalLabel) {
            finalLabel = formatDateAndTimeLabel(d);
          }
        }
      } catch {}
    }

    const payload = {
      startTime: finalLabel || undefined,
      startTimeIso: finalIso || undefined,
      isUpcoming: upcomingToggle
    };

    if (onSave.length >= 2) {
      (onSave as any)(finalLabel || undefined, finalIso || undefined, upcomingToggle);
    } else {
      (onSave as any)(payload);
    }
    onClose();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      if (onSave.length >= 2) {
        (onSave as any)(undefined, undefined, false);
      } else {
        (onSave as any)({
          startTime: undefined,
          startTimeIso: undefined,
          isUpcoming: false
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#0b101b] flex flex-col overflow-hidden">
      {/* Top Full-Page Navigation Bar with Back & Home Buttons */}
      <div className="p-4 sm:p-5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <ArrowLeft size={14} />
            <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
          </button>
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider truncate">
              {lang === 'bn' ? 'ম্যাচ শুরুর সময় ও কাউন্টডাউন' : 'Match Start Time & Countdown'}
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {lang === 'bn' ? 'ম্যাচের শুরু হওয়ার নির্ধারিত সময় নির্ধারণ করুন' : 'Schedule or update match start countdown'}
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl w-full mx-auto space-y-5">

        {/* Upcoming Status Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-upcoming-match-checkbox"
              checked={upcomingToggle}
              onChange={e => setUpcomingToggle(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="is-upcoming-match-checkbox" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              {lang === 'bn' ? 'ম্যাচটি এখনও শুরু হয়নি (অপেক্ষমাণ ম্যাচ)' : 'Mark as Upcoming (Not started yet)'}
            </label>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
            {upcomingToggle ? (lang === 'bn' ? 'সক্রিয়' : 'ACTIVE') : (lang === 'bn' ? 'নিষ্ক্রিয়' : 'OFF')}
          </span>
        </div>

        {/* 1-Click Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Zap size={12} className="text-amber-500" />
            {lang === 'bn' ? 'দ্রুত সময় নির্বাচন (Quick Presets):' : 'Quick Presets:'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: lang === 'bn' ? '+১৫ মিনিট' : '+15 min', action: () => applyOffsetMinutes(15) },
              { label: lang === 'bn' ? '+৩০ মিনিট' : '+30 min', action: () => applyOffsetMinutes(30) },
              { label: lang === 'bn' ? '+১ ঘণ্টা' : '+1 hour', action: () => applyOffsetMinutes(60) },
              { label: lang === 'bn' ? '+২ ঘণ্টা' : '+2 hours', action: () => applyOffsetMinutes(120) },
              { label: lang === 'bn' ? 'আজ সন্ধ্যা ৭:৩০' : 'Tonight 7:30', action: () => applyTodayTime(19, 30) },
              { label: lang === 'bn' ? 'আজ রাত ৮:০০' : 'Tonight 8:00', action: () => applyTodayTime(20, 0) },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={p.action}
                className="px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-amber-400 hover:text-amber-500 transition-all text-center cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exact Date & Time Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>{lang === 'bn' ? 'তারিখ ও সময় (Date & Time):' : 'Date & Time:'}</span>
            <span className="text-[10px] text-slate-400">Local Time</span>
          </label>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={e => {
              const val = e.target.value;
              setDateInput(val);
              setUpcomingToggle(true);
              if (val) {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                  setTextInput(formatDateAndTimeLabel(d));
                }
              }
            }}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 font-mono font-bold outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        {/* Display Text / Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {lang === 'bn' ? 'প্রদর্শিত লেখার রূপ (কাস্টম টেক্সট):' : 'Display Label (Custom text):'}
          </label>
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder={lang === 'bn' ? 'যেমন: আজ সন্ধ্যা ৭:৩০ মি. (07:30 PM)' : 'e.g. Today, 7:30 PM'}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 font-sans outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
          >
            {lang === 'bn' ? 'কাউন্টডাউন মুছুন' : 'Clear Countdown'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl px-4"
            >
              <Check size={13} className="mr-1" />
              {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
