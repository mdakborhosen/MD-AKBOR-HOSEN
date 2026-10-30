import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  LogOut, 
  Clock, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  Database,
  ArrowDownToLine,
  FolderArchive,
  Layers,
  Calendar,
  Sparkles,
  ArrowLeft,
  Home,
  Download,
  Upload
} from 'lucide-react';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MatchState, ScheduleEvent, TournamentFolder } from '../types';
import { 
  initGoogleAuth, 
  signInWithGoogle, 
  logoutGoogle, 
  getCachedAccessToken,
  clearCachedAccessToken
} from '../lib/googleCalendar';
import { 
  uploadBackupToGoogleDrive, 
  listBackupsFromGoogleDrive, 
  downloadBackupFromGoogleDrive, 
  deleteBackupFromGoogleDrive,
  getDailyBackupFileName,
  DriveBackupFile,
  CricketAppStateBackup
} from '../lib/googleDrive';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  matches: MatchState[];
  currentMatchId?: string;
  schedule: ScheduleEvent[];
  tournaments: TournamentFolder[];
  displayConfigs?: any;
  savedSlipCards?: any[];
  activeSlipCardId?: string;
  onRestoreState: (restoredData: CricketAppStateBackup) => void;
  lang: 'en' | 'bn';
  lastAutoBackupTime?: number;
  hourlyIntervalMs?: number;
  todayBackupFileName?: string;
  onTriggerHourlyBackupNow?: () => void;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  matches,
  currentMatchId,
  schedule,
  tournaments,
  displayConfigs,
  savedSlipCards = [],
  activeSlipCardId,
  onRestoreState,
  lang,
  lastAutoBackupTime = 0,
  hourlyIntervalMs = 60 * 60 * 1000,
  todayBackupFileName,
  onTriggerHourlyBackupNow,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [serverDailyBackups, setServerDailyBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [customBackupName, setCustomBackupName] = useState('');
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<DriveBackupFile | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveBackupFile | null>(null);

  const activeDailyFileName = todayBackupFileName || getDailyBackupFileName();

  // Live countdown ticker for next 1-hour auto backup
  useEffect(() => {
    if (!isOpen) return;
    setNowTick(Date.now());
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  const loadServerDailyBackups = async () => {
    try {
      const res = await fetch('/api/backup/daily-list');
      const json = await res.json();
      if (json?.success && Array.isArray(json.files)) {
        setServerDailyBackups(json.files);
      }
    } catch {}
  };

  // Initialize Auth state
  useEffect(() => {
    if (!isOpen) return;

    loadServerDailyBackups();

    const unsubscribe = initGoogleAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsLoadingAuth(false);
        loadBackups(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoadingAuth(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const loadBackups = async (token: string) => {
    setIsLoadingBackups(true);
    try {
      const files = await listBackupsFromGoogleDrive(token);
      setBackups(files);
    } catch (err: any) {
      console.error('Error loading backups from Drive:', err);
      const msg = String(err?.message || '');
      if (msg.includes('401') || msg.toLowerCase().includes('invalid credentials') || msg.toLowerCase().includes('unauthenticated')) {
        clearCachedAccessToken();
        setUser(null);
        setAccessToken(null);
        return;
      }
      toast.error(lang === 'bn' ? 'ড্রাইভ থেকে ব্যাকআপ লিস্ট আনতে সমস্যা হয়েছে' : 'Failed to load backups from Google Drive');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleDownloadLocalBackup = () => {
    try {
      const backupPayload: CricketAppStateBackup = {
        appName: 'Cricket Score Master',
        version: '2.0',
        exportDate: new Date().toISOString(),
        backupTrigger: 'Manual Local JSON Backup',
        matches,
        currentMatchId,
        schedule,
        tournaments,
        displayConfigs,
        savedSlipCards,
        activeSlipCardId,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `cricket-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success(
        lang === 'bn'
          ? 'সম্পূর্ণ ব্যাকআপ ফাইল (.json) সফলভাবে ডাউনলোড হয়েছে!'
          : 'Complete backup file (.json) downloaded successfully!'
      );
    } catch (err: any) {
      toast.error(lang === 'bn' ? 'ডাউনলোড করতে ব্যর্থ হয়েছে' : 'Download failed');
    }
  };

  const handleUploadLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const restored: CricketAppStateBackup = JSON.parse(content);
        if (
          !restored ||
          (!Array.isArray(restored.matches) &&
            !Array.isArray(restored.schedule) &&
            !Array.isArray(restored.savedSlipCards))
        ) {
          throw new Error(lang === 'bn' ? 'অকার্যকর ব্যাকআপ ফাইল' : 'Invalid backup file structure');
        }

        onRestoreState(restored);
        toast.success(
          lang === 'bn'
            ? 'লোকাল ব্যাকআপ ফাইল থেকে সফলভাবে সমস্ত ডেটা রিস্টোর হয়েছে!'
            : 'Application state restored successfully from file!'
        );
        onClose();
      } catch (err: any) {
        toast.error(lang === 'bn' ? 'ব্যাকআপ ফাইলটি সঠিক নয়' : (err?.message || 'Invalid backup file'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        toast.success(
          lang === 'bn' 
            ? `গুগল একাউন্টে সফলভাবে সাইন ইন হয়েছে (${result.user.displayName || result.user.email || 'Google'})` 
            : `Signed in as ${result.user.displayName || result.user.email || 'Google User'}`
        );
        loadBackups(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      toast.error(
        lang === 'bn'
          ? 'গুগল সাইন-ইন সম্পন্ন হয়নি (পপআপ ব্লক বা ক্লাউড অরিজিন সীমাবদ্ধতা)। আপনি সরাসরি নিচের "ডাউনলোড ব্যাকআপ (JSON)" বাটন দিয়ে ব্যাকআপ সংরক্ষণ করতে পারেন।'
          : (err?.message || 'Google sign-in failed. You can use direct JSON backup below.')
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setAccessToken(null);
      setBackups([]);
      toast.info(lang === 'bn' ? 'গুগল থেকে সাইন আউট সম্পন্ন' : 'Signed out from Google account');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Create & Upload Backup (Automatically signs in if not yet connected)
  const handleCreateBackup = async () => {
    let activeToken = accessToken || getCachedAccessToken();
    if (!activeToken || !user) {
      setIsSigningIn(true);
      try {
        const result = await signInWithGoogle();
        setUser(result.user);
        setAccessToken(result.accessToken);
        activeToken = result.accessToken;
      } catch (err: any) {
        console.error('Sign in before backup failed:', err);
        toast.error(
          lang === 'bn'
            ? 'ব্যাকআপ করার জন্য গুগল একাউন্টে সাইন ইন সম্পন্ন করুন'
            : (err?.message || 'Please complete Google sign-in to backup to Google Drive')
        );
        return;
      } finally {
        setIsSigningIn(false);
      }
    }

    setIsUploading(true);
    try {
      const backupPayload: CricketAppStateBackup = {
        appName: 'Cricket Score Master',
        version: '2.0',
        exportDate: new Date().toISOString(),
        backupTrigger: 'Manual Daily Backup',
        matches,
        currentMatchId,
        schedule,
        tournaments,
        displayConfigs,
        savedSlipCards,
        activeSlipCardId,
      };

      // Also update server daily backup file
      try {
        await fetch('/api/backup/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupPayload),
        });
        loadServerDailyBackups();
      } catch {}

      const result = await uploadBackupToGoogleDrive(
        activeToken, 
        backupPayload,
        customBackupName.trim() ? `${customBackupName.trim().replace(/\.json$/i, '')}.json` : undefined
      );

      toast.success(
        lang === 'bn'
          ? result.updatedExisting
            ? `আজকের ব্যাকআপ ফাইল (${result.name}) গুগল ড্রাইভে সফলভাবে আপডেট হয়েছে!`
            : `আজকের নতুন ব্যাকআপ ফাইল (${result.name}) গুগল ড্রাইভে তৈরি ও সেভ হয়েছে!`
          : result.updatedExisting
          ? `Today's daily backup file (${result.name}) updated on Google Drive!`
          : `Today's daily backup file (${result.name}) created on Google Drive!`
      );

      setCustomBackupName('');
      await loadBackups(activeToken);
    } catch (err: any) {
      console.error('Failed to backup to Drive:', err);
      const msg = String(err?.message || '');
      if (msg.includes('401') || msg.toLowerCase().includes('invalid credentials')) {
        clearCachedAccessToken();
        setUser(null);
        setAccessToken(null);
        toast.error(
          lang === 'bn'
            ? 'সেশন মেয়াদোত্তীর্ণ হয়েছে, পুনরায় সাইন ইন করে ব্যাকআপ দিন'
            : 'Session expired. Please click Backup again to sign in.'
        );
      } else {
        toast.error(lang === 'bn' ? 'ব্যাকআপ তৈরিতে সমস্যা হয়েছে' : (err?.message || 'Failed to upload backup'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Restore Backup
  const executeRestore = async (file: DriveBackupFile) => {
    const activeToken = accessToken || getCachedAccessToken();
    if (!activeToken) return;
    setIsRestoringId(file.id);
    setConfirmRestoreFile(null);

    try {
      const restored = await downloadBackupFromGoogleDrive(activeToken, file.id);

      if (
        !restored ||
        (!Array.isArray(restored.matches) &&
          !Array.isArray(restored.schedule) &&
          !Array.isArray(restored.savedSlipCards))
      ) {
        throw new Error(lang === 'bn' ? 'অকার্যকর ব্যাকআপ ফাইল' : 'Invalid backup file structure');
      }

      onRestoreState(restored);
      toast.success(
        lang === 'bn'
          ? `গুগল ড্রাইভ থেকে সফলভাবে সমস্ত ডেটা রিস্টোর হয়েছে!`
          : `Application state restored successfully from Google Drive!`
      );
      onClose();
    } catch (err: any) {
      console.error('Failed to restore from Drive:', err);
      toast.error(lang === 'bn' ? 'রিস্টোর করতে সমস্যা হয়েছে' : (err?.message || 'Failed to restore backup'));
    } finally {
      setIsRestoringId(null);
    }
  };

  // Delete Backup from Drive
  const executeDelete = async (file: DriveBackupFile) => {
    if (!accessToken) return;
    setConfirmDeleteFile(null);

    try {
      await deleteBackupFromGoogleDrive(accessToken, file.id);
      toast.success(lang === 'bn' ? 'ড্রাইভ থেকে ব্যাকআপ মুছে ফেলা হয়েছে' : 'Backup deleted from Google Drive');
      setBackups(prev => prev.filter(b => b.id !== file.id));
    } catch (err: any) {
      console.error('Failed to delete file from Drive:', err);
      toast.error(lang === 'bn' ? 'ফাইল মুছতে ব্যর্থ হয়েছে' : 'Failed to delete backup file');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-[#0b101b] flex flex-col overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full h-full bg-slate-950 flex flex-col overflow-hidden"
      >
        {/* Header with Back & Home Buttons */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <ArrowLeft size={14} />
              <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
              <Cloud size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-black text-white tracking-wide truncate">
                  {lang === 'bn' ? 'গুগল ড্রাইভ ব্যাকআপ ও রিস্টোর' : 'Google Drive Backup & Restore'}
                </h3>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-bold hidden sm:inline-flex">
                  JSON Cloud Sync
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {lang === 'bn' 
                  ? 'ম্যাচ, শিডিউল ও টুর্নামেন্টের সম্পূর্ণ ডেটা ক্লাউডে সুরক্ষিত রাখুন' 
                  : 'Backup and restore all matches, schedules, and tournaments'}
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 max-w-4xl w-full mx-auto">
          {/* 1-Hour Automatic Backup & 1 File Per Day Policy Banner */}
          {(() => {
            const nextBackupAt = lastAutoBackupTime > 0 ? lastAutoBackupTime + hourlyIntervalMs : 0;
            const remainingMs = nextBackupAt > nowTick ? nextBackupAt - nowTick : 0;
            const remMinutes = Math.floor(remainingMs / 60000);
            const remSeconds = Math.floor((remainingMs % 60000) / 1000);
            const lastBackupStr =
              lastAutoBackupTime > 0
                ? new Date(lastAutoBackupTime).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : lang === 'bn'
                ? 'শীঘ্রই শুরু হবে'
                : 'Starting soon';

            return (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/60 border border-emerald-500/40 shadow-lg space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Clock size={18} className="animate-spin" style={{ animationDuration: '10s' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black text-white">
                          {lang === 'bn'
                            ? 'প্রতি ১ ঘন্টা পর পর অটোমেটিক ডাটা ব্যাকআপ চালু'
                            : '1-Hour Automatic Data Backup Active'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                          {lang === 'bn' ? '১ দিনে ১টি ফাইল' : '1 File / Day'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {lang === 'bn'
                          ? 'পুরো ১ দিনের জন্য শুধুমাত্র ১টি করে ব্যাকআপ ফাইল তৈরী হয় এবং প্রতি ১ ঘন্টা পর পর সেই একই ফাইলে ডাটা অটোমেটিক আপডেট হয়।'
                          : 'Strictly 1 backup file is created for each full day and automatically updated every 1 hour.'}
                      </p>
                    </div>
                  </div>

                  {onTriggerHourlyBackupNow && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onTriggerHourlyBackupNow();
                        setTimeout(() => {
                          loadServerDailyBackups();
                          if (accessToken) loadBackups(accessToken);
                        }, 1500);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl h-8 px-3 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                      <RefreshCw size={12} />
                      <span>{lang === 'bn' ? 'এখনই আজকের ফাইল আপডেট করুন' : "Update Today's File Now"}</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400">
                      {lang === 'bn' ? 'আজকের নির্ধারিত ১টি ব্যাকআপ ফাইল:' : "Today's Single Backup File:"}
                    </span>
                    <span className="font-mono font-bold text-emerald-300 truncate" title={activeDailyFileName}>
                      {activeDailyFileName}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400">
                      {lang === 'bn' ? 'সর্বশেষ অটো ব্যাকআপ সময়:' : 'Last Auto-Backup Time:'}
                    </span>
                    <span className="font-mono font-bold text-blue-300">{lastBackupStr}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-400">
                      {lang === 'bn' ? 'পরবর্তী ১ ঘন্টার অটো ব্যাকআপ:' : 'Next 1-Hour Auto-Backup:'}
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {remainingMs > 0
                        ? `${remMinutes}m ${String(remSeconds).padStart(2, '0')}s`
                        : lang === 'bn'
                        ? 'প্রস্তুত (১ ঘন্টা পর পর)'
                        : 'Ready (Every 1h)'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 100% Reliable Local File Backup & Restore (Zero Login Required) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-cyan-950/70 border border-indigo-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <Download size={20} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <span>{lang === 'bn' ? 'ডাইরেক্ট লোকাল ফাইল ব্যাকআপ (লগইন ছাড়াই ১০০% কার্যকর)' : 'Direct Local File Backup (No Login Required)'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-black">
                      OFFLINE
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {lang === 'bn'
                      ? 'গুগল অ্যাকাউন্টে সাইন-ইন সংক্রান্ত কোনো ত্রুটি ছাড়াই সরাসরি আপনার ডিভাইসে সম্পূর্ণ ব্যাকআপ ফাইল (.json) সেভ এবং যেকোনো সময় রিস্টোর করুন।'
                      : 'Save and restore complete JSON backup files directly on your device without any Google login dependency.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={handleDownloadLocalBackup}
                className="w-full sm:flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 transition-all"
              >
                <Download size={15} />
                <span>{lang === 'bn' ? 'ডাউনলোড ব্যাকআপ (.json)' : 'Download Backup (.json)'}</span>
              </Button>

              <label className="w-full sm:flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
                <Upload size={15} className="text-cyan-400" />
                <span>{lang === 'bn' ? 'ফাইল থেকে রিস্টোর করুন' : 'Restore from File'}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleUploadLocalBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* User Auth Banner */}
          {!user ? (
            <Card className="bg-slate-950/70 border-slate-800 p-5 text-center flex flex-col items-center justify-center gap-3.5 shadow-inner">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <CloudUpload size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  {lang === 'bn' ? 'গুগল ড্রাইভে কানেক্ট করুন' : 'Connect with Google Drive'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {lang === 'bn'
                    ? 'আপনার অনুমতি নিয়ে সরাসরি আপনার পার্সোনাল গুগল ড্রাইভে সুরক্ষিত ব্যাকআপ সংরক্ষণ এবং রিস্টোর করা হবে।'
                    : 'Access and save your backup files directly to your personal Google Drive with permission.'}
                </p>
              </div>

              {/* Official Google Sign-in Styled Button as per guidelines */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="mt-1 flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>
                  {isSigningIn 
                    ? (lang === 'bn' ? 'সাইন ইন হচ্ছে...' : 'Signing in...') 
                    : (lang === 'bn' ? 'গুগল দিয়ে সাইন ইন করুন' : 'Sign in with Google')}
                </span>
              </button>
            </Card>
          ) : (
            <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 px-3.5 py-2.5 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-blue-400/40" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck size={11} />
                    {lang === 'bn' ? 'গুগল ড্রাইভ অথোরাইজড' : 'Google Drive Authorized'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-7 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 gap-1"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">{lang === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
              </Button>
            </div>
          )}

          {/* Current State Summary Pill */}
          <div className="grid grid-cols-4 gap-2 bg-slate-800/40 border border-slate-700/60 p-2.5 rounded-xl text-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400">{lang === 'bn' ? 'মোট ম্যাচ' : 'Matches'}</span>
              <span className="text-sm font-black text-indigo-400 font-mono">{matches.length}</span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-700/60">
              <span className="text-[10px] text-slate-400">{lang === 'bn' ? 'বেটস্লিপ' : 'Bet Slips'}</span>
              <span className="text-sm font-black text-cyan-400 font-mono">{savedSlipCards.length}</span>
            </div>
            <div className="flex flex-col items-center border-x border-slate-700/60">
              <span className="text-[10px] text-slate-400">{lang === 'bn' ? 'শিডিউল' : 'Schedules'}</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{schedule.length}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400">{lang === 'bn' ? 'টুর্নামেন্ট' : 'Tournaments'}</span>
              <span className="text-sm font-black text-amber-400 font-mono">{tournaments.length}</span>
            </div>
          </div>

          {/* Backup Action Section */}
          <Card className="bg-slate-950/50 border-slate-800 p-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <CloudUpload size={14} className="text-blue-400" />
              {lang === 'bn'
                ? 'আজকের ডেইলি ব্যাকআপ ফাইল সেভ / আপডেট করুন (১ দিনে ১টি ফাইল)'
                : "Save / Update Today's Daily Backup File (1 File Per Day)"}
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder={
                  lang === 'bn'
                    ? `খালি রাখলে আজকের ফাইল (${activeDailyFileName}) আপডেট হবে`
                    : `Leave empty to update today's single file (${activeDailyFileName})`
                }
                value={customBackupName}
                onChange={(e) => setCustomBackupName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs text-white placeholder:text-slate-500 h-9"
              />
              <Button
                type="button"
                onClick={handleCreateBackup}
                disabled={isUploading || isSigningIn}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 gap-1.5 shrink-0 active:scale-95 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading || isSigningIn ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>
                      {isSigningIn
                        ? (lang === 'bn' ? 'সাইন ইন হচ্ছে...' : 'Signing in...')
                        : (lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...')}
                    </span>
                  </>
                ) : (
                  <>
                    <CloudUpload size={14} />
                    <span>{lang === 'bn' ? 'আজকের ব্যাকআপ আপডেট করুন' : "Update Today's Backup"}</span>
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Daily Cloud Auto-Backup Files (1 File Per Day - Available even before Google Sign-In) */}
          {serverDailyBackups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-400" />
                  {lang === 'bn'
                    ? 'দৈনিক অটো-ব্যাকআপ ফাইলসমূহ (প্রতি ১ দিনের জন্য ১টি ফাইল)'
                    : 'Daily Auto-Backup Files (1 File Per Day)'}
                  <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1.5">
                    {serverDailyBackups.length}
                  </Badge>
                </h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {serverDailyBackups.map((file) => {
                  const isTodayFile = file.name === activeDailyFileName;
                  return (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-white truncate" title={file.name}>
                              {file.name}
                            </p>
                            {isTodayFile && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[9px] font-black">
                                {lang === 'bn' ? 'আজকের ফাইল (১ ঘন্টা পর পর আপডেট)' : "Today's File (1h Auto-Update)"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock size={10} className="text-emerald-400" />
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : ''}
                            </span>
                            {file.size && (
                              <span className="text-slate-400">
                                • {(parseInt(file.size, 10) / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/backup/load?file=${encodeURIComponent(file.name)}`);
                            const json = await res.json();
                            if (json?.success && json.data) {
                              onRestoreState(json.data);
                              toast.success(
                                lang === 'bn'
                                  ? `${file.name} থেকে সফলভাবে ডাটা রিস্টোর হয়েছে!`
                                  : `Data restored from ${file.name}!`
                              );
                              onClose();
                            }
                          } catch {
                            toast.error(lang === 'bn' ? 'রিস্টোর ব্যর্থ হয়েছে' : 'Restore failed');
                          }
                        }}
                        className="h-7 px-2.5 text-[11px] font-bold border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-200 gap-1 cursor-pointer shrink-0"
                      >
                        <ArrowDownToLine size={12} />
                        <span>{lang === 'bn' ? 'রিস্টোর' : 'Restore'}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Existing Drive Backups List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Database size={14} className="text-emerald-400" />
                {lang === 'bn' ? 'গুগল ড্রাইভে বিদ্যমান ব্যাকআপ সমূহ' : 'Existing Backups in Google Drive'}
                {backups.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono h-4 px-1.5">
                    {backups.length}
                  </Badge>
                )}
              </h4>
              {user && (
                <button
                  onClick={() => loadBackups(accessToken!)}
                  disabled={isLoadingBackups}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw size={11} className={isLoadingBackups ? "animate-spin" : ""} />
                  <span>{lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
                </button>
              )}
            </div>

            {!user ? (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/30 text-center text-xs text-slate-500">
                {lang === 'bn' 
                  ? 'গুগল ড্রাইভের ব্যাকআপ দেখতে ও রিস্টোর করতে উপরে সাইন ইন করুন' 
                  : 'Sign in above to view and restore backups from Google Drive'}
              </div>
            ) : isLoadingBackups ? (
              <div className="p-8 rounded-xl border border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin text-blue-400" />
                <span className="text-xs text-slate-400 font-medium">
                  {lang === 'bn' ? 'গুগল ড্রাইভ ফাইল স্ক্যান হচ্ছে...' : 'Scanning Google Drive for backups...'}
                </span>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-center">
                <FolderArchive size={28} className="mx-auto text-slate-600 mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-400">
                  {lang === 'bn' ? 'কোনো ব্যাকআপ ফাইল পাওয়া যায়নি' : 'No backup files found in Google Drive'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {lang === 'bn' 
                    ? 'উপরের "ড্রাইভে ব্যাকআপ রাখুন" বাটনে ক্লিক করে প্রথম ব্যাকআপ তৈরি করুন।' 
                    : 'Click "Backup to Google Drive" above to create your first backup.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {backups.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl border border-slate-800/90 bg-slate-950/60 hover:bg-slate-950/90 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0 flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock size={10} className="text-slate-500" />
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'Unknown date'}
                          </span>
                          {file.size && (
                            <span className="text-slate-500">
                              • {(parseInt(file.size, 10) / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Restore Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRestoreFile(file)}
                        disabled={isRestoringId === file.id}
                        className="h-7 text-xs font-bold gap-1 border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50 hover:border-emerald-400 active:scale-95 transition-all"
                        title={lang === 'bn' ? 'এই ব্যাকআপ থেকে রিস্টোর করুন' : 'Restore from this backup'}
                      >
                        {isRestoringId === file.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <ArrowDownToLine size={12} />
                        )}
                        <span>{lang === 'bn' ? 'রিস্টোর' : 'Restore'}</span>
                      </Button>

                      {/* Delete File Button (Destructive with dialog) */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteFile(file)}
                        className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        title={lang === 'bn' ? 'ড্রাইভ থেকে ফাইল মুছুন' : 'Delete file from Google Drive'}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>{lang === 'bn' ? 'নিরাপদ গুগল ক্লাউড স্টোরেজ' : 'Encrypted Google Cloud Storage'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      </motion.div>

      {/* Confirmation Dialog: Restore Data (Destructive Action - Overwrites app state) */}
      <AnimatePresence>
        {confirmRestoreFile && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {lang === 'bn' ? 'ডেটা রিস্টোর নিশ্চিতকরণ' : 'Confirm Restore from Drive'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {lang === 'bn' ? (
                      <>
                        আপনি কি নিশ্চিত যে আপনি <span className="font-bold text-amber-300 font-mono">"{confirmRestoreFile.name}"</span> থেকে ডেটা রিস্টোর করতে চান? এটি বর্তমানের সমস্ত ম্যাচ, শিডিউল ও টুর্নামেন্টকে প্রতিস্থাপন (Overwrite) করবে।
                      </>
                    ) : (
                      <>
                        Are you sure you want to restore from <span className="font-bold text-amber-300 font-mono">"{confirmRestoreFile.name}"</span>? This will overwrite your current matches, schedules, and tournaments with the backup data.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRestoreFile(null)}
                  className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => executeRestore(confirmRestoreFile)}
                  className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white gap-1"
                >
                  <ArrowDownToLine size={13} />
                  <span>{lang === 'bn' ? 'হ্যাঁ, রিস্টোর করুন' : 'Confirm Restore'}</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog: Delete from Drive (Destructive Google Workspace API action) */}
      <AnimatePresence>
        {confirmDeleteFile && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {lang === 'bn' ? 'ড্রাইভ থেকে ব্যাকআপ ডিলিট নিশ্চিতকরণ' : 'Delete Backup from Google Drive'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {lang === 'bn' ? (
                      <>
                        আপনি কি নিশ্চিত যে গুগল ড্রাইভ থেকে <span className="font-bold text-rose-300 font-mono">"{confirmDeleteFile.name}"</span> ফাইলটি স্থায়ীভাবে মুছে ফেলতে চান?
                      </>
                    ) : (
                      <>
                        Are you sure you want to permanently delete <span className="font-bold text-rose-300 font-mono">"{confirmDeleteFile.name}"</span> from your Google Drive? This action cannot be undone.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDeleteFile(null)}
                  className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => executeDelete(confirmDeleteFile)}
                  className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white gap-1"
                >
                  <Trash2 size={13} />
                  <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete from Drive'}</span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
