import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, Copy, Check, Maximize2, Minimize2, Globe, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExternalLinkPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  lang?: 'bn' | 'en';
}

export const ExternalLinkPopupModal: React.FC<ExternalLinkPopupModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  lang = 'bn'
}) => {
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen || !url) return null;

  const isGoogleSearch = Boolean(url && /google\.[a-z.]+\/search/i.test(url));
  let googleSearchQuery = '';
  if (isGoogleSearch) {
    try {
      const u = new URL(url);
      googleSearchQuery = u.searchParams.get('q') || '';
    } catch {}
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(lang === 'bn' ? 'লিংক কপি হয়েছে!' : 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(lang === 'bn' ? 'কপি করতে ব্যর্থ' : 'Failed to copy');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const displayTitle = title || (
    isGoogleSearch
      ? (lang === 'bn' ? 'গুগল সার্চ' : 'Google Search')
      : url.includes('crex')
      ? 'CREX Live'
      : url.includes('sofascore')
      ? 'SofaScore'
      : 'External Link'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in external-modal-container">
      <div
        className={`bg-[#0d131f] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 text-white ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isGoogleSearch ? (
              <Search className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="font-bold text-xs sm:text-sm truncate text-white">{displayTitle}</span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 truncate max-w-[280px]">
              {url}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct Open in Browser button with data-allow-external="true" to bypass iframe hijacking */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              data-allow-external="true"
              className="p-1.5 px-2.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer no-underline"
              title={lang === 'bn' ? 'সরাসরি ব্রাউজারে খুলুন' : 'Open in Browser'}
            >
              <span>{lang === 'bn' ? 'ব্রাউজারে খুলুন' : 'Open'}</span>
              <ExternalLink size={13} />
            </a>

            {!isGoogleSearch && (
              <button
                onClick={handleRefresh}
                title={lang === 'bn' ? 'রিলোড করুন' : 'Reload'}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}

            <button
              onClick={handleCopy}
              title={lang === 'bn' ? 'লিংক কপি করুন' : 'Copy link'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? (lang === 'bn' ? 'ছোট করুন' : 'Minimize') : (lang === 'bn' ? 'বড় করুন' : 'Maximize')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              onClick={onClose}
              title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white transition cursor-pointer ml-1"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 bg-slate-950 w-full h-full overflow-hidden flex flex-col">
          {isGoogleSearch ? (
            /* Special Native In-App Google Search Viewer to avoid Google 403 iframe error */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow-xl">
                <Search size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {lang === 'bn' ? 'গুগল সার্চ কোয়েরি' : 'Google Search Query'}
                </h3>
                {googleSearchQuery && (
                  <p className="text-sm font-mono text-cyan-300 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 mt-2">
                    "{googleSearchQuery}"
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  {lang === 'bn'
                    ? 'গুগল তাদের সার্চ রেজাল্ট সরাসরি অন্য ওয়েবসাইটের আইফ্রেমে লোড করা ব্লক করে (Google 403 Error)। নিচে সরাসরি বাটনে চাপ দিয়ে ফলাফল ব্রাউজারে দেখুন।'
                    : 'Google blocks embedding search results in iframes (403 forbidden). Use the button below to view search results directly in your browser.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-allow-external="true"
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer no-underline active:scale-95"
                >
                  <Search size={15} />
                  <span>{lang === 'bn' ? 'গুগলে সার্চ রেজাল্ট দেখুন' : 'View Google Search Results'}</span>
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{lang === 'bn' ? 'লিংক কপি' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 z-10">
                  <RefreshCw size={24} className="animate-spin text-cyan-400" />
                  <span className="text-xs text-slate-400 font-mono">
                    {lang === 'bn' ? 'পেজ লোড হচ্ছে...' : 'Loading page in popup...'}
                  </span>
                </div>
              )}

              <iframe
                key={iframeKey}
                src={url}
                title={displayTitle}
                onLoad={() => setIsLoading(false)}
                className="w-full flex-1 border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />

              {/* Fallback footer if remote website blocks iframe embedding */}
              <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2 shrink-0">
                <span className="flex items-center gap-1.5 truncate">
                  <AlertCircle size={13} className="text-amber-400 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? 'সাইট আইফ্রেমে লোড না হলে সরাসরি ব্রাউজারে খুলুন:'
                      : 'If site blocks iframe embedding, open in browser:'}
                  </span>
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-allow-external="true"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-bold shrink-0 no-underline"
                >
                  <span>{lang === 'bn' ? 'বাইরের ট্যাবে খুলুন' : 'Open externally'}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
