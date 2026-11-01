import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Lock, 
  Unlock, 
  Radio, 
  Calendar, 
  Clock, 
  Trophy, 
  Globe, 
  RefreshCw, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Save,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MatchState } from '../types';

export interface AdminSeriesItem {
  id: string;
  name: string;
  sport: 'cricket' | 'football';
  format?: string;
  year?: string;
  teams: string[];
  status?: 'Active' | 'Upcoming' | 'Completed';
  isDefaultSeries: boolean;
  isSystemLocked?: boolean;
  createdRole?: 'admin';
}

interface AdminAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  currentMatches: MatchState[];
  onAddMatchToApp: (matchData: any) => void;
  onRemoveMatchFromApp: (matchId: string) => void;
  onSelectMatch: (matchId: string) => void;
  onRefreshDefaultsFromServer: () => Promise<void>;
}

export const AdminAppModal: React.FC<AdminAppModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentMatches,
  onAddMatchToApp,
  onRemoveMatchFromApp,
  onSelectMatch,
  onRefreshDefaultsFromServer
}) => {
  // Authentication state (Default PIN: admin123)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cricket-admin-authed') === 'true';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'matches' | 'series' | 'promote' | 'settings'>('matches');

  // Server-loaded admin default matches & series
  const [adminMatches, setAdminMatches] = useState<any[]>([]);
  const [adminSeries, setAdminSeries] = useState<AdminSeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form states for adding default match
  const [sport, setSport] = useState<'cricket' | 'football'>('cricket');
  const [matchName, setMatchName] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [matchFormat, setMatchFormat] = useState('20');
  const [maxOvers, setMaxOvers] = useState('20');
  const [section, setSection] = useState<'live' | 'upcoming' | 'finished'>('upcoming');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [venue, setVenue] = useState('');
  const [dateTimeStr, setDateTimeStr] = useState('আজ সন্ধ্যা ৭:৩০ মি.');
  const [liveUrl, setLiveUrl] = useState('');

  // Form states for adding default series
  const [seriesName, setSeriesName] = useState('');
  const [seriesSport, setSeriesSport] = useState<'cricket' | 'football'>('cricket');
  const [seriesFormat, setSeriesFormat] = useState('T20');
  const [seriesYear, setSeriesYear] = useState('2026');
  const [seriesTeamsInput, setSeriesTeamsInput] = useState('');
  const [seriesStatus, setSeriesStatus] = useState<'Active' | 'Upcoming' | 'Completed'>('Active');

  // Load defaults from server
  const fetchDefaults = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/defaults');
      const data = await res.json();
      if (data && data.success) {
        setAdminMatches(Array.isArray(data.matches) ? data.matches : []);
        setAdminSeries(Array.isArray(data.series) ? data.series : []);
      }
    } catch (e) {
      console.error('Failed to load admin defaults', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDefaults();
    }
  }, [isOpen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === 'admin123' || pinInput.trim() === '1234') {
      setIsAuthenticated(true);
      try {
        localStorage.setItem('cricket-admin-authed', 'true');
      } catch {}
      setPinError(false);
      setPinInput('');
      toast.success(lang === 'bn' ? 'অ্যাডমিন অ্যাপ আনলক হয়েছে!' : 'Admin Console Unlocked!');
    } else {
      setPinError(true);
      toast.error(lang === 'bn' ? 'ভুল পিন নম্বর! (ডিফল্ট: admin123)' : 'Invalid PIN! (Default: admin123)');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('cricket-admin-authed');
    } catch {}
    toast.info(lang === 'bn' ? 'অ্যাডমিন লক করা হয়েছে' : 'Admin locked');
  };

  // Add new default match
  const handleSaveDefaultMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team1.trim() || !team2.trim()) {
      toast.error(lang === 'bn' ? 'উভয় দলের নাম পূরণ করুন' : 'Both team names are required');
      return;
    }

    setIsSaving(true);
    const resolvedSeries = adminSeries.find(s => s.id === selectedSeriesId);
    const resolvedName = matchName.trim() || `${team1.trim()} vs ${team2.trim()}`;
    const nextMatchId = `default-${sport}-${Date.now()}`;

    const newDefaultMatch = {
      id: nextMatchId,
      name: resolvedName,
      sport,
      team1: team1.trim(),
      team2: team2.trim(),
      format: sport === 'football' ? '90' : matchFormat,
      maxOvers: sport === 'football' ? undefined : (parseInt(maxOvers, 10) || 20),
      score: 0,
      wickets: 0,
      balls: 0,
      footballScore1: 0,
      footballScore2: 0,
      isUpcoming: section === 'upcoming',
      isFinished: section === 'finished',
      sectionOverride: section,
      seriesId: selectedSeriesId || undefined,
      seriesName: resolvedSeries?.name || undefined,
      venue: venue.trim() || undefined,
      matchStartTime: dateTimeStr.trim() || undefined,
      matchStartTimeIso: new Date().toISOString(),
      liveMatchUrl: liveUrl.trim() || (sport === 'football' ? 'sofascore://real-madrid-vs-barcelona' : 'demo://ban-vs-ind'),
      isDefaultMatch: true,
      isSystemLocked: true,
      createdRole: 'admin'
    };

    try {
      const res = await fetch('/api/admin/default-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: newDefaultMatch })
      });
      const data = await res.json();
      if (data && data.success) {
        toast.success(
          lang === 'bn' 
            ? `✅ "${resolvedName}" ডিফল্ট ম্যাচ হিসেবে যুক্ত হয়েছে! সাধারণ ইউজাররা এটি ডিলিট করতে পারবে না।` 
            : `✅ "${resolvedName}" saved as Default Match! Regular users cannot delete it.`
        );
        // Clear fields
        setMatchName('');
        setTeam1('');
        setTeam2('');
        setVenue('');
        setLiveUrl('');
        // Reload list and notify parent app
        await fetchDefaults();
        await onRefreshDefaultsFromServer();
      } else {
        throw new Error(data?.error || 'Save failed');
      }
    } catch (err: any) {
      toast.error(lang === 'bn' ? 'সংরক্ষণ ব্যর্থ হয়েছে: ' + err.message : 'Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete default match (Only Admin can delete!)
  const handleDeleteDefaultMatch = async (matchId: string, matchTitle: string) => {
    if (!window.confirm(lang === 'bn' ? `আপনি কি নিশ্চিতভাবে "${matchTitle}" ডিফল্ট ম্যাচটি বাদ দিতে চান?` : `Are you sure you want to remove default match "${matchTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/default-matches/${matchId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data && data.success) {
        toast.success(lang === 'bn' ? `ডিফল্ট ম্যাচটি সফলভাবে বাদ দেওয়া হয়েছে` : `Default match removed successfully`);
        onRemoveMatchFromApp(matchId);
        await fetchDefaults();
        await onRefreshDefaultsFromServer();
      }
    } catch (err: any) {
      toast.error(lang === 'bn' ? 'ডিলিট করতে সমস্যা হয়েছে' : 'Failed to delete default match');
    }
  };

  // Add new default series
  const handleSaveDefaultSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesName.trim()) {
      toast.error(lang === 'bn' ? 'সিরিজের নাম লিখুন' : 'Series name is required');
      return;
    }

    setIsSaving(true);
    const teams = seriesTeamsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newSeries: AdminSeriesItem = {
      id: `series-${Date.now()}`,
      name: seriesName.trim(),
      sport: seriesSport,
      format: seriesFormat,
      year: seriesYear,
      teams: teams.length > 0 ? teams : ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
      status: seriesStatus,
      isDefaultSeries: true,
      isSystemLocked: true,
      createdRole: 'admin'
    };

    try {
      const res = await fetch('/api/admin/default-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series: newSeries })
      });
      const data = await res.json();
      if (data && data.success) {
        toast.success(
          lang === 'bn' 
            ? `✅ "${newSeries.name}" ডিফল্ট সিরিজ হিসেবে যুক্ত হয়েছে!` 
            : `✅ "${newSeries.name}" saved as Default Series!`
        );
        setSeriesName('');
        setSeriesTeamsInput('');
        await fetchDefaults();
        await onRefreshDefaultsFromServer();
      }
    } catch (err: any) {
      toast.error(lang === 'bn' ? 'সিরিজ সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save series');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete default series
  const handleDeleteDefaultSeries = async (seriesId: string, name: string) => {
    if (!window.confirm(lang === 'bn' ? `আপনি কি "${name}" সিরিজটি বাদ দিতে চান?` : `Remove series "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/default-series/${seriesId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data && data.success) {
        toast.success(lang === 'bn' ? 'সিরিজ বাদ দেওয়া হয়েছে' : 'Series removed');
        await fetchDefaults();
        await onRefreshDefaultsFromServer();
      }
    } catch {
      toast.error(lang === 'bn' ? 'সিরিজ ডিলিট ব্যর্থ' : 'Failed to delete series');
    }
  };

  // Promote any currently active custom match into a permanent default match
  const handlePromoteCustomMatch = async (m: MatchState) => {
    setIsSaving(true);
    try {
      const promoted = {
        ...m,
        isDefaultMatch: true,
        isSystemLocked: true,
        createdRole: 'admin'
      };
      const res = await fetch('/api/admin/default-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match: promoted })
      });
      const data = await res.json();
      if (data && data.success) {
        toast.success(
          lang === 'bn' 
            ? `✅ "${m.name || m.team1 + ' vs ' + m.team2}" এখন স্থায়ী ডিফল্ট ম্যাচ! সাধারণ ইউজার এটি ডিলিট করতে পারবে না।` 
            : `✅ "${m.name || m.team1 + ' vs ' + m.team2}" is now a permanent default match!`
        );
        await fetchDefaults();
        await onRefreshDefaultsFromServer();
      }
    } catch {
      toast.error(lang === 'bn' ? 'ডিফল্ট করতে ব্যর্থ হয়েছে' : 'Failed to promote match');
    } finally {
      setIsSaving(false);
    }
  };

  // Restore seed defaults
  const handleRestoreSeeds = async () => {
    if (!window.confirm(lang === 'bn' ? 'সকল অফিসিয়াল ডিফল্ট ম্যাচ ও সিরিজ পুনরায় সেট করবেন?' : 'Restore all official default matches and series?')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/seed-defaults', { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        toast.success(lang === 'bn' ? 'ডিফল্ট ডাটা পুনরুদ্ধার হয়েছে!' : 'Defaults restored!');
        await fetchDefaults();
        await onRefreshDefaultsFromServer();
      }
    } catch {
      toast.error('Failed to restore defaults');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090e1a] border border-amber-500/40 shadow-2xl text-slate-100 overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>{lang === 'bn' ? 'অ্যাডমিন অ্যাপ ও ডিফল্ট কনসোল' : 'Admin Console & Default Manager'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    PROTECTED
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'bn' 
                  ? 'এখানে অ্যাডমিন ডিফল্ট হিসেবে ম্যাচ ও সিরিজ যুক্ত/বাদ করতে পারেন যা সাধারণ ইউজাররা ডিলিট করতে পারবে না।' 
                  : 'Manage protected default matches & series that regular users cannot delete.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
                title={lang === 'bn' ? 'অ্যাডমিন লক করুন' : 'Lock Admin'}
              >
                <Lock size={12} className="text-amber-400" />
                <span>{lang === 'bn' ? 'লক করুন' : 'Lock'}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isAuthenticated ? (
          /* Password Protection Gate */
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-1">
              {lang === 'bn' ? 'অ্যাডমিন অ্যাক্সেস আবশ্যক' : 'Admin Authentication Required'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              {lang === 'bn' 
                ? 'ডিফল্ট ম্যাচ এবং সিরিজ পরিবর্তন করতে অ্যাডমিন পিন কোড প্রবেশ করান। (ডিফল্ট পিন: admin123)' 
                : 'Enter your admin PIN to manage protected defaults. (Default PIN: admin123)'}
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder={lang === 'bn' ? 'অ্যাডমিন পিন লিখুন (admin123)' : 'Enter Admin PIN (admin123)'}
                  autoFocus
                  className={cn(
                    "w-full px-4 py-2.5 rounded-2xl bg-slate-900 border text-center font-mono font-bold text-sm tracking-widest text-amber-300 outline-none transition-all",
                    pinError ? "border-rose-500 shadow-rose-900/40 ring-1 ring-rose-500" : "border-amber-500/40 focus:border-amber-400"
                  )}
                />
                {pinError && (
                  <p className="text-[11px] text-rose-400 mt-1 font-semibold">
                    {lang === 'bn' ? 'ভুল পিন নম্বর! (ডিফল্ট: admin123)' : 'Incorrect PIN! (Default: admin123)'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/50 cursor-pointer active:scale-95 transition-all"
              >
                {lang === 'bn' ? 'আনলক করুন' : 'Unlock Admin'}
              </button>

              <p className="text-[10px] text-slate-500">
                {lang === 'bn' ? '🔑 কুইক ডেমো পিন: admin123 বা 1234' : '🔑 Quick Demo PIN: admin123 or 1234'}
              </p>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Dashboard */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tab Navigation Strip */}
            <div className="flex items-center gap-1.5 px-4 pt-2 pb-2 bg-slate-950/80 border-b border-white/5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('matches')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer",
                  activeTab === 'matches'
                    ? "bg-amber-500/25 text-amber-300 border border-amber-400/60 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                )}
              >
                <Trophy size={13} />
                <span>{lang === 'bn' ? `ডিফল্ট ম্যাচ (${adminMatches.length})` : `Default Matches (${adminMatches.length})`}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('series')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer",
                  activeTab === 'series'
                    ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                )}
              >
                <Layers size={13} />
                <span>{lang === 'bn' ? `ডিফল্ট সিরিজ (${adminSeries.length})` : `Default Series (${adminSeries.length})`}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('promote')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer",
                  activeTab === 'promote'
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                )}
              >
                <Sparkles size={13} />
                <span>{lang === 'bn' ? 'চলমান ম্যাচ ডিফল্ট করুন' : 'Promote Live Match'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer",
                  activeTab === 'settings'
                    ? "bg-indigo-500/25 text-indigo-300 border border-indigo-400/60 shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                )}
              >
                <Lock size={13} />
                <span>{lang === 'bn' ? 'লক ও পারমিশন' : 'Security & Rules'}</span>
              </button>

              <div className="ml-auto shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={fetchDefaults}
                  disabled={isLoading}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
                  title={lang === 'bn' ? 'রিফ্রেশ করুন' : 'Refresh'}
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin text-amber-400' : ''} />
                </button>
              </div>
            </div>

            {/* Scrollable Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* TAB 1: DEFAULT MATCHES (ডিফল্ট ম্যাচ ব্যবস্থাপনা) */}
              {activeTab === 'matches' && (
                <div className="space-y-6">
                  {/* Card 1: Add New Default Match Form */}
                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                          +
                        </div>
                        <h4 className="font-black text-sm text-white">
                          {lang === 'bn' ? 'নতুন ডিফল্ট ম্যাচ যুক্ত করুন' : 'Add New Default Match'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                        {lang === 'bn' ? '🛡️ ব্যবহারকারী মুছতে পারবে না' : '🛡️ User Cannot Delete'}
                      </span>
                    </div>

                    <form onSubmit={handleSaveDefaultMatch} className="space-y-3.5">
                      {/* Sport & Section Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'খেলা নির্বাচন:' : 'Sport:'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSport('cricket')}
                              className={cn(
                                "py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                                sport === 'cricket'
                                  ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/70"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              )}
                            >
                              <span>🏏</span>
                              <span>{lang === 'bn' ? 'ক্রিকেট' : 'Cricket'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSport('football')}
                              className={cn(
                                "py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all",
                                sport === 'football'
                                  ? "bg-blue-500/25 text-blue-300 border-blue-400/70"
                                  : "bg-slate-950 text-slate-400 border-slate-800"
                              )}
                            >
                              <span>⚽</span>
                              <span>{lang === 'bn' ? 'ফুটবল' : 'Football'}</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'ম্যাচ স্ট্যাটাস / সেকশন:' : 'Status / Section:'}
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['upcoming', 'live', 'finished'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSection(s)}
                                className={cn(
                                  "py-2 px-2 rounded-xl text-[11px] font-bold border capitalize cursor-pointer transition-all text-center",
                                  section === s
                                    ? s === 'live'
                                      ? 'bg-rose-500/25 text-rose-300 border-rose-400/70'
                                      : s === 'upcoming'
                                      ? 'bg-amber-500/25 text-amber-300 border-amber-400/70'
                                      : 'bg-emerald-500/25 text-emerald-300 border-emerald-400/70'
                                    : 'bg-slate-950 text-slate-400 border-slate-800'
                                )}
                              >
                                {s === 'live' ? '🔴 Live' : s === 'upcoming' ? '⏰ Upc' : '🏁 Fin'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Teams Input */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'দল ১ (Team 1):' : 'Team 1:'}
                          </label>
                          <input
                            type="text"
                            value={team1}
                            onChange={(e) => setTeam1(e.target.value)}
                            placeholder={sport === 'cricket' ? 'যেমন: Bangladesh' : 'যেমন: Real Madrid'}
                            required
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'দল ২ (Team 2):' : 'Team 2:'}
                          </label>
                          <input
                            type="text"
                            value={team2}
                            onChange={(e) => setTeam2(e.target.value)}
                            placeholder={sport === 'cricket' ? 'যেমন: India' : 'যেমন: Barcelona'}
                            required
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Match Name & Series Association */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'সিরিজ / টুর্নামেন্ট নির্বাচন:' : 'Link to Series / Tournament:'}
                          </label>
                          <select
                            value={selectedSeriesId}
                            onChange={(e) => setSelectedSeriesId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs text-slate-200 outline-none"
                          >
                            <option value="">{lang === 'bn' ? '-- কোনো সিরিজ নেই / একক ম্যাচ --' : '-- No Series / Standalone --'}</option>
                            {adminSeries
                              .filter(s => s.sport === sport)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  🏆 {s.name} ({s.year || '2026'})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'ম্যাচ টাইটেল (ঐচ্ছিক):' : 'Match Title (Optional):'}
                          </label>
                          <input
                            type="text"
                            value={matchName}
                            onChange={(e) => setMatchName(e.target.value)}
                            placeholder={team1 && team2 ? `${team1} vs ${team2}` : 'যেমন: BPL Final 2026'}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Format & Venue */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {sport === 'cricket' && (
                          <div>
                            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                              {lang === 'bn' ? 'ফরম্যাট ও ওভার:' : 'Format & Overs:'}
                            </label>
                            <select
                              value={matchFormat}
                              onChange={(e) => {
                                setMatchFormat(e.target.value);
                                setMaxOvers(e.target.value === '10' ? '10' : e.target.value === '50' ? '50' : '20');
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                            >
                              <option value="20">T20 (20 Overs)</option>
                              <option value="10">T10 (10 Overs)</option>
                              <option value="50">ODI (50 Overs)</option>
                              <option value="100">100 Ball</option>
                              <option value="test">Test Match</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'তারিখ ও সময়:' : 'Date & Time:'}
                          </label>
                          <input
                            type="text"
                            value={dateTimeStr}
                            onChange={(e) => setDateTimeStr(e.target.value)}
                            placeholder="যেমন: আজ সন্ধ্যা ৭:৩০ মি."
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'ভেন্যু / স্টেডিয়াম:' : 'Venue / Stadium:'}
                          </label>
                          <input
                            type="text"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            placeholder={sport === 'cricket' ? 'Mirpur Stadium' : 'Santiago Bernabéu'}
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Live Sync URL */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                          {lang === 'bn' ? 'লাইভ সিঙ্ক লিংক (Crex / Sofascore):' : 'Live Sync URL (Crex / Sofascore):'}
                        </label>
                        <input
                          type="text"
                          value={liveUrl}
                          onChange={(e) => setLiveUrl(e.target.value)}
                          placeholder={sport === 'cricket' ? 'https://crex.live/... বা demo://ban-vs-ind' : 'https://www.sofascore.com/... বা sofascore://real-madrid-vs-barcelona'}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono outline-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95 transition-all"
                      >
                        <Save size={14} />
                        <span>
                          {isSaving 
                            ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving Default...') 
                            : (lang === 'bn' ? 'ডিফল্ট ম্যাচ হিসেবে যুক্ত করুন (সংরক্ষিত)' : 'Save as Protected Default Match')}
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Card 2: Active Default Matches List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Shield size={14} className="text-amber-400" />
                        <span>{lang === 'bn' ? `বর্তমান ডিফল্ট ম্যাচসমূহ (${adminMatches.length})` : `Active Default Matches (${adminMatches.length})`}</span>
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {lang === 'bn' ? 'সাধারণ ব্যবহারকারীরা এগুলো ডিলিট করতে পারবে না' : 'Protected from user deletion'}
                      </span>
                    </div>

                    {adminMatches.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                        {lang === 'bn' ? 'বর্তমানে কোনো ডিফল্ট ম্যাচ নেই। উপরের ফর্ম থেকে যুক্ত করুন।' : 'No default matches currently configured.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {adminMatches.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/25 hover:border-amber-400/50 flex flex-col justify-between gap-2.5 transition-all"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs">
                                    {m.sport === 'football' ? '⚽' : '🏏'}
                                  </span>
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    🛡️ Default
                                  </span>
                                  {m.seriesName && (
                                    <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40 truncate max-w-[150px]">
                                      🏆 {m.seriesName}
                                    </span>
                                  )}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                                  m.isUpcoming ? "bg-amber-500/20 text-amber-300" : m.isFinished ? "bg-slate-700 text-slate-300" : "bg-emerald-500/20 text-emerald-300"
                                )}>
                                  {m.isUpcoming ? 'Upcoming' : m.isFinished ? 'Finished' : 'Live'}
                                </span>
                              </div>

                              <div className="font-black text-sm text-white">
                                {m.team1} vs {m.team2}
                              </div>
                              {m.name && m.name !== `${m.team1} vs ${m.team2}` && (
                                <div className="text-[11px] text-slate-400">{m.name}</div>
                              )}

                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                                {m.matchStartTime && <span>⏰ {m.matchStartTime}</span>}
                                {m.venue && <span>📍 {m.venue}</span>}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectMatch(m.id);
                                  onClose();
                                }}
                                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <span>{lang === 'bn' ? 'স্কোরারে দেখুন' : 'View in Scorer'}</span>
                                <ArrowRight size={11} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDefaultMatch(m.id, m.name || `${m.team1} vs ${m.team2}`)}
                                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 border border-rose-500/30 cursor-pointer transition-colors"
                                title={lang === 'bn' ? 'অ্যাডমিন হিসেবে ডিফল্ট ম্যাচটি বাদ দিন' : 'Remove Default Match'}
                              >
                                <Trash2 size={11} />
                                <span>{lang === 'bn' ? 'বাদ দিন' : 'Remove'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DEFAULT SERIES (ডিফল্ট সিরিজ / টুর্নামেন্ট ব্যবস্থাপনা) */}
              {activeTab === 'series' && (
                <div className="space-y-6">
                  {/* Add Series Form */}
                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                          🏆
                        </div>
                        <h4 className="font-black text-sm text-white">
                          {lang === 'bn' ? 'নতুন ডিফল্ট সিরিজ / টুর্নামেন্ট যুক্ত করুন' : 'Add New Default Series'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                        {lang === 'bn' ? '🛡️ ডিফল্ট সিরিজ' : '🛡️ Default Series'}
                      </span>
                    </div>

                    <form onSubmit={handleSaveDefaultSeries} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'সিরিজের নাম:' : 'Series Name:'}
                          </label>
                          <input
                            type="text"
                            value={seriesName}
                            onChange={(e) => setSeriesName(e.target.value)}
                            placeholder="যেমন: Bangladesh Premier League (BPL) 2026"
                            required
                            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                            {lang === 'bn' ? 'খেলা ও বছর:' : 'Sport & Year:'}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={seriesSport}
                              onChange={(e) => setSeriesSport(e.target.value as any)}
                              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                            >
                              <option value="cricket">🏏 Cricket</option>
                              <option value="football">⚽ Football</option>
                            </select>
                            <input
                              type="text"
                              value={seriesYear}
                              onChange={(e) => setSeriesYear(e.target.value)}
                              placeholder="2026"
                              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none text-center font-mono"
                            >
                            </input>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                          {lang === 'bn' ? 'অংশগ্রহণকারী দলসমূহ (কমা দিয়ে লিখুন):' : 'Participating Teams (comma-separated):'}
                        </label>
                        <textarea
                          rows={2}
                          value={seriesTeamsInput}
                          onChange={(e) => setSeriesTeamsInput(e.target.value)}
                          placeholder="Fortune Barishal, Comilla Victorians, Rangpur Riders, Sylhet Strikers"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/40 cursor-pointer active:scale-95 transition-all"
                      >
                        <FolderPlus size={14} />
                        <span>{lang === 'bn' ? 'ডিফল্ট সিরিজ সেভ করুন' : 'Save Default Series'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Series List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers size={14} className="text-cyan-400" />
                      <span>{lang === 'bn' ? `বর্তমান ডিফল্ট সিরিজসমূহ (${adminSeries.length})` : `Active Default Series (${adminSeries.length})`}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {adminSeries.map((s) => {
                        const matchCount = adminMatches.filter(m => m.seriesId === s.id).length;
                        return (
                          <div
                            key={s.id}
                            className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/25 flex flex-col justify-between gap-2.5"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                  {s.sport === 'football' ? '⚽ Football' : '🏏 Cricket'} • {s.year || '2026'}
                                </span>
                                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                  {matchCount} {lang === 'bn' ? 'ম্যাচ যুক্ত' : 'matches linked'}
                                </span>
                              </div>
                              <div className="font-black text-sm text-white">
                                {s.name}
                              </div>
                              {Array.isArray(s.teams) && s.teams.length > 0 && (
                                <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                  <strong>{lang === 'bn' ? 'দলসমূহ:' : 'Teams:'}</strong> {s.teams.join(', ')}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSeriesId(s.id);
                                  setActiveTab('matches');
                                  toast.info(lang === 'bn' ? `"${s.name}" এ ম্যাচ যুক্ত করতে ফর্ম পূরণ করুন` : `Fill form to add match to "${s.name}"`);
                                }}
                                className="text-cyan-300 hover:underline font-bold text-[11px] cursor-pointer"
                              >
                                + {lang === 'bn' ? 'এই সিরিজে ম্যাচ যোগ' : 'Add match to series'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteDefaultSeries(s.id, s.name)}
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 cursor-pointer"
                                title={lang === 'bn' ? 'সিরিজ বাদ দিন' : 'Remove Series'}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROMOTE ACTIVE MATCHES (চলমান ম্যাচ ডিফল্ট করুন) */}
              {activeTab === 'promote' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                    <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                      <Sparkles size={15} className="text-emerald-400" />
                      <span>{lang === 'bn' ? 'স্কোরারের চলমান ম্যাচকে ১-ক্লিকে ডিফল্ট করুন' : '1-Click Promote Scorer Match to Protected Default'}</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      {lang === 'bn' 
                        ? 'আপনি বা ইউজার লাইভ স্কোরারে যে ম্যাচ তৈরি করেছেন তা এখান থেকে ১-ক্লিকে "অ্যাডমিন ডিফল্ট" হিসেবে লক করে রাখতে পারেন। ফলে সাধারণ ইউজাররা আর এটি ডিলিট করতে পারবে না।' 
                        : 'Promote any active custom match into a permanent default match protected from regular user deletion.'}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {currentMatches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                        {lang === 'bn' ? 'স্কোরারে বর্তমানে কোনো ম্যাচ খোলা নেই।' : 'No matches currently open in Scorer.'}
                      </div>
                    ) : (
                      currentMatches.map((m) => {
                        const isAlreadyDefault = adminMatches.some(dm => dm.id === m.id) || m.isDefaultMatch || m.isSystemLocked;
                        return (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 flex-wrap"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base">{m.sport === 'football' ? '⚽' : '🏏'}</span>
                              <div>
                                <div className="font-bold text-xs sm:text-sm text-white truncate">
                                  {m.team1} vs {m.team2}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ID: {m.id} • {m.isUpcoming ? 'Upcoming' : m.isFinished ? 'Finished' : 'Live'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isAlreadyDefault ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                                  <CheckCircle2 size={12} />
                                  <span>{lang === 'bn' ? 'ইতিমধ্যে ডিফল্ট' : 'Already Default'}</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePromoteCustomMatch(m)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                                >
                                  <Shield size={12} />
                                  <span>{lang === 'bn' ? 'ডিফল্ট হিসেবে লক করুন' : 'Lock as Default'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: SECURITY & USER PERMISSIONS */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-indigo-500/30 space-y-3">
                    <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                      <Lock size={15} className="text-indigo-400" />
                      <span>{lang === 'bn' ? 'নিরাপত্তা ও ইউজার ডিলিট প্রটেকশন নীতি' : 'Security & User Deletion Rules'}</span>
                    </h4>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">{lang === 'bn' ? 'ডিফল্ট ম্যাচ প্রটেকশন সক্রিয়:' : 'Default Match Protection Active:'}</strong>
                          <p className="text-slate-400 text-[11px]">
                            {lang === 'bn' 
                              ? 'যেসব ম্যাচ অ্যাডমিন ডিফল্ট হিসেবে যুক্ত করবেন, সাধারণ ইউজাররা সেগুলোর পাশে ডিলিট বোতাম দেখতে পাবে না এবং মুছে ফেলতে পারবে না।' 
                              : 'Matches added by Admin as defaults cannot be deleted by regular users.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">{lang === 'bn' ? 'ক্লাউড পারসিস্টেন্স সক্রিয়:' : 'Cloud Persistence Active:'}</strong>
                          <p className="text-slate-400 text-[11px]">
                            {lang === 'bn' 
                              ? 'ব্রাউজার ক্যাশ বা পেজ রিফ্রেশ করলেও সার্ভার থেকে ডিফল্ট ম্যাচ এবং সিরিজগুলো সবসময় স্বয়ংক্রিয়ভাবে সংরক্ষিত ও প্রদর্শিত হবে।' 
                              : 'Defaults are stored on the server file system and reload automatically on page refresh.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleRestoreSeeds}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw size={13} />
                        <span>{lang === 'bn' ? 'অফিসিয়াল ডিফল্ট ম্যাচ ও সিরিজ রিস্টোর করুন' : 'Restore Official Default Seeds'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
