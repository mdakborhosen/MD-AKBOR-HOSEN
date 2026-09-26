import React, { useState, useEffect } from 'react';
import { EventStatus } from '../types/betslip';

interface CountdownTimerProps {
  dateTime: string;
  status: EventStatus;
  className?: string;
  compact?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ dateTime, status, className, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPast, setIsPast] = useState<boolean>(false);

  useEffect(() => {
    const calculateTime = () => {
      if (!dateTime) {
        setTimeLeft('');
        return;
      }

      // Try parsing date string
      let targetDate = new Date(dateTime);
      if (isNaN(targetDate.getTime())) {
        // Try common formats like "18.09 10:00 PM" or "18/09/2026 22:00"
        const currentYear = new Date().getFullYear();
        const parts = dateTime.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\s+(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
        if (parts) {
          const day = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10) - 1;
          const year = parts[3] ? (parts[3].length === 2 ? 2000 + parseInt(parts[3], 10) : parseInt(parts[3], 10)) : currentYear;
          let hours = parseInt(parts[4], 10);
          const minutes = parseInt(parts[5], 10);
          const ampm = parts[6]?.toUpperCase();

          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;

          targetDate = new Date(year, month, day, hours, minutes);
        }
      }

      if (isNaN(targetDate.getTime())) {
        setTimeLeft(dateTime);
        return;
      }

      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;

      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft('Started');
      } else {
        setIsPast(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m ${seconds}s`);
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [dateTime]);

  if (status === 'Win') {
    return (
      <span className={`inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold ${className || ''}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Win
      </span>
    );
  }

  if (status === 'Lost') {
    return (
      <span className={`inline-flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded text-[10px] font-bold ${className || ''}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Lost
      </span>
    );
  }

  if (status === 'Cancel') {
    return (
      <span className={`inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold ${className || ''}`}>
        Void / Cancel
      </span>
    );
  }

  if (status === 'Live' || (isPast && status === 'Pending')) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${className || ''}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
        LIVE
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-medium font-mono ${className || ''}`}>
      {timeLeft || "Upcoming"}
    </span>
  );
};
