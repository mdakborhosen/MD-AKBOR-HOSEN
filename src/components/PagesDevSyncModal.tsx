import React, { useState } from 'react';
import { MatchState } from '../types';
import { buildPagesSyncUrl, decodeSyncBundle, downloadBackupJsonFile, encodeSyncBundle, TARGET_PAGES_URL } from '../lib/syncExportImport';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  RefreshCw, 
  Smartphone, 
  CloudLightning,
  AlertCircle,
  ClipboardPaste,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface PagesDevSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: MatchState[];
  currentMatchId: string;
  savedSlipCards: any[];
  onImportBundle: (bundle: { matches: MatchState[]; currentMatchId?: string; savedSlipCards?: any[] }) => void;
  lang?: 'bn' | 'en';
}

export const PagesDevSyncModal: React.FC<PagesDevSyncModalProps> = ({
  isOpen,
  onClose,
  matches,
  currentMatchId,
  savedSlipCards,
  onImportBundle,
  lang = 'bn'
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const bundle = {
    version: 1,
    timestamp: Date.now(),
    matches,
    currentMatchId,
    savedSlipCards,
    source: window.location.hostname
  };

  const syncUrl = buildPagesSyncUrl(bundle);
  const syncToken = encodeSyncBundle(bundle);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopiedLink(true);
      toast.success(lang === 'bn' ? 'Pages.dev সিঙ্ক লিংক কপি হয়েছে!' : 'Pages.dev sync link copied!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error(lang === 'bn' ? 'কপি করতে ব্যর্থ হয়েছে' : 'Failed to copy');
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(syncToken);
      setCopiedToken(true);
      toast.success(lang === 'bn' ? 'সিঙ্ক কোড কপি হয়েছে!' : 'Sync code copied!');
      setTimeout(() => setCopiedToken(false), 2500);
    } catch {
      toast.error(lang === 'bn' ? 'কপি করতে ব্যর্থ হয়েছে' : 'Failed to copy');
    }
  };

  const handleOpenSyncUrl = () => {
    window.open(syncUrl, '_blank');
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPasteInput(text.trim());
        processImport(text.trim());
      }
    } catch {
      toast.error(lang === 'bn' ? 'ক্লিপবোর্ড পড়ার অনুমতি দিন বা বক্সে পেস্ট করুন' : 'Allow clipboard access or paste in box');
    }
  };

  const processImport = (inputStr: string) => {
    setIsProcessing(true);
    try {
      let rawToken = inputStr.trim();
      if (rawToken.includes('#sync=')) {
        rawToken = rawToken.split('#sync=')[1].split('&')[0];
      }
      const decoded = decodeSyncBundle(rawToken);
      if (decoded && Array.isArray(decoded.matches) && decoded.matches.length > 0) {
        onImportBundle(decoded);
        toast.success(
          lang === 'bn'
            ? `সফলভাবে ${decoded.matches.length}টি ম্যাচ ইমপোর্ট ও সিঙ্ক হয়েছে!`
            : `Successfully imported & synced ${decoded.matches.length} matches!`
        );
        onClose();
      } else {
        toast.error(lang === 'bn' ? 'ভুল বা অকার্যকর সিঙ্ক কোড' : 'Invalid sync code');
      }
    } catch {
      toast.error(lang === 'bn' ? 'ইমপোর্ট প্রসেস করতে ব্যর্থ হয়েছে' : 'Failed to process import');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.matches)) {
          onImportBundle(parsed);
          toast.success(lang === 'bn' ? 'ফাইল থেকে সকল ম্যাচ সফলভাবে লোড হয়েছে!' : 'Matches loaded from file!');
          onClose();
        } else {
          toast.error(lang === 'bn' ? 'অকার্যকর ফাইল ফরম্যাট' : 'Invalid file format');
        }
      } catch {
        toast.error(lang === 'bn' ? 'ফাইল পড়তে ব্যর্থ হয়েছে' : 'Failed to read file');
      }
    };
    reader.readAsText(file);
  };

  const handleHardRefresh = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          reg.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
    toast.info(lang === 'bn' ? 'ক্যাশ ক্লিয়ার হচ্ছে... রিলোড নেওয়া হচ্ছে' : 'Clearing cache & reloading...');
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const isCurrentDomainPages = window.location.hostname.includes('pages.dev');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121824] border border-cyan-500/30 w-full max-w-lg rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CloudLightning className="text-cyan-400 w-5 h-5 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {lang === 'bn' ? 'Pages.dev সিঙ্ক ও ডাটা ট্রান্সফার' : 'Pages.dev Sync & Data Transfer'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Box explaining LocalStorage isolation */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs sm:text-sm text-amber-200/90 flex gap-2.5 items-start">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300">
              {lang === 'bn' ? 'কেন Pages.dev-এ পরিবর্তন মিলছিল না?' : 'Why was Pages.dev not matching?'}
            </span>
            <p className="mt-1 text-slate-300 text-xs">
              {lang === 'bn'
                ? 'ব্রাউজারের লোকাল স্টোরেজ (LocalStorage) প্রতিটি ডোমেনের জন্য আলাদা থাকে। AI Studio এবং Pages.dev দুটি সম্পূর্ণ আলাদা সাইট। GitHub-এ কোড পুশ করলে কেবল প্রোগ্রাম ফাইল আপডেট হয়, কিন্তু আপনার তৈরি করা ম্যাচগুলো (যেমন: Sharjah vs Emirates) ব্রাউজারের লোকাল মেমরিতে থাকে। নিচের ১-ক্লিক সিঙ্ক লিংক দিয়ে সহজেই এই ডাটা Pages.dev-এ নিয়ে যেতে পারেন!'
                : 'Browser localStorage is isolated per domain. Pushing code to GitHub updates the source code, but your active matches remain in this browser origin. Use the 1-click sync link below to instantly load your matches on Pages.dev!'}
            </p>
          </div>
        </div>

        {/* Section 1: Export to Pages.dev */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Smartphone size={14} />
              {lang === 'bn' ? '১-ক্লিকে Pages.dev এ পাঠান' : '1-Click Send to Pages.dev'}
            </div>
            <span className="text-[11px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800/50">
              {matches.length} {lang === 'bn' ? 'ম্যাচ প্রস্তুত' : 'matches ready'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {lang === 'bn'
              ? 'নিচের বাটনে চাপ দিয়ে সরাসরি আপনার ফোনের pages.dev সাইটে এই সমস্ত ম্যাচ তাৎক্ষণিক লোড করুন:'
              : 'Click below to directly open pages.dev and load all current matches automatically:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            <button
              onClick={handleOpenSyncUrl}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs sm:text-sm rounded-xl transition shadow-lg shadow-cyan-900/30"
            >
              <ExternalLink size={15} />
              <span>{lang === 'bn' ? 'Pages.dev এ সরাসরি খুলুন' : 'Open in Pages.dev'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-cyan-300 font-medium text-xs sm:text-sm rounded-xl transition"
            >
              {copiedLink ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              <span>{copiedLink ? (lang === 'bn' ? 'লিংক কপি হয়েছে!' : 'Link Copied!') : (lang === 'bn' ? 'সিঙ্ক লিংক কপি করুন' : 'Copy Sync Link')}</span>
            </button>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleCopyToken}
              className="text-[11px] text-slate-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
            >
              {copiedToken ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              {lang === 'bn' ? 'শুধু সিঙ্ক কোড (টেক্সট) কপি করুন' : 'Copy Sync Code text only'}
            </button>
          </div>
        </div>

        {/* Section 2: Import / Paste Sync Code */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ClipboardPaste size={14} />
            {lang === 'bn' ? 'সিঙ্ক কোড পেস্ট করে ম্যাচ আনুন' : 'Paste Sync Code / URL to Import'}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={lang === 'bn' ? 'সিঙ্ক কোড বা লিংক এখানে পেস্ট করুন...' : 'Paste sync code or URL here...'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handlePasteFromClipboard}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1 shrink-0 border border-slate-700"
            >
              <ClipboardPaste size={13} />
              <span>{lang === 'bn' ? 'পেস্ট' : 'Paste'}</span>
            </button>
            <button
              onClick={() => processImport(pasteInput)}
              disabled={!pasteInput.trim() || isProcessing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl flex items-center gap-1 shrink-0"
            >
              <Check size={13} />
              <span>{lang === 'bn' ? 'সিঙ্ক' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* Section 3: File Backup and Service Worker Cache Clear */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={() => downloadBackupJsonFile(bundle, `cricket_matches_${new Date().toISOString().slice(0, 10)}.json`)}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition"
          >
            <Download size={14} className="text-cyan-400" />
            <span>{lang === 'bn' ? 'ব্যাকআপ ফাইল (.json) ডাউনলোড' : 'Download .json Backup'}</span>
          </button>

          <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition cursor-pointer">
            <Upload size={14} className="text-emerald-400" />
            <span>{lang === 'bn' ? 'ফাইল আপলোড করে লোড' : 'Upload .json Backup'}</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Section 4: Force Cache Clear */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="text-xs text-rose-300">
            <span className="font-semibold block">{lang === 'bn' ? 'GitHub পুশের পর নতুন কোড দেখতে পাচ্ছেন না?' : 'Not seeing newly pushed code?'}</span>
            <span className="text-[11px] text-slate-400">
              {lang === 'bn' ? 'ব্রাউজার PWA ক্যাশ ক্লিয়ার করে সরাসরি সর্বশেষ ভার্সন লোড করতে চাপ দিন:' : 'Clear service worker cache and force hard reload:'}
            </span>
          </div>
          <button
            onClick={handleHardRefresh}
            className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition"
          >
            <RefreshCw size={13} />
            <span>{lang === 'bn' ? 'ক্যাশ ক্লিয়ার' : 'Clear Cache'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
