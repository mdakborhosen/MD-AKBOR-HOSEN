import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, Download, Plus, Trash2, Copy, Check, Sparkles, 
  Eye, Trophy, Pencil, RefreshCw, X, FileText, Calendar, DollarSign,
  Clock, CheckCircle2, XCircle, Activity, AlertCircle, ChevronDown,
  Link2, Unlink, ExternalLink, Target, Zap, Search, Loader2, Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { BetSlipData, BetEvent, EventStatus, SavedSlipCard, BetRuleType } from '../types/betslip';
import { MatchState, getShortTeamName } from '../types';
import { Barcode } from './Barcode';
import { convertPdfToImageAndText } from '../lib/pdfParser';
import {
  DEFAULT_SLIP_1,
  INITIAL_SLIP_CARDS,
  formatSlipDateTimeOffset,
  parseEventDateTime,
  sortEventsChronologically,
  extractBetEventTeams,
  syncBetEventWithScorerMatch,
  recalculateBetSlipSummary,
  extractScorerMatchScoreState,
  resolveEventPeriodType,
  evaluateStandaloneBetEventOutcome,
  isSlipCardLost,
  isSlipCardSettled,
  isBetEventSettled,
  unwrapRedirectUrl,
  areTwoBetEventsSameMatch,
  ensureUniqueSlipEventIds,
  areLinkTeamsSwapped,
  buildMergedSlipMatchGroups,
  formatPickSelectionWithTeam
} from '../lib/betSlipScorerSync';

export { parseEventDateTime, sortEventsChronologically };

function formatCardAmountWithCurrency(rawAmount?: string, rawCurrency = 'BDT'): string {
  const cleanAmt = String(rawAmount || '0.00').replace(/\s*[A-Za-z]+$/, '').trim() || '0.00';
  return `${cleanAmt} ${rawCurrency}`;
}

interface BetSlipStudioProps {
  lang?: 'en' | 'bn';
  matches?: MatchState[];
  currentMatchId?: string;
  onSelectScorerMatch?: (matchId: string) => void;
  onAttachLinkToEvent?: (eventId: string, urlOrMatchId: string) => void;
  onSyncEventToScorerMatch?: (ev: BetEvent, changedFields: Partial<BetEvent>) => void;
  onRemoveScorerMatches?: (matchIds: string[]) => void;
  savedCards?: SavedSlipCard[];
  onUpdateSavedCards?: React.Dispatch<React.SetStateAction<SavedSlipCard[]>>;
  activeCardId?: string;
  onSelectActiveCardId?: (cardId: string) => void;
  compactMergedMode?: boolean;
  onOpenGoogleSearchTab?: (ev: BetEvent, query?: string) => void;
  generatedEventLinks?: Record<string, string>;
  onClearGeneratedEventLink?: (eventId: string) => void;
  onTriggerAutoDriveBackup?: (reason: string, fromUserGesture?: boolean, updatedCards?: SavedSlipCard[]) => void;
  onOpenDriveBackupModal?: () => void;
}

export const BetSlipStudio: React.FC<BetSlipStudioProps> = ({
  lang = 'bn',
  matches = [],
  currentMatchId,
  onSelectScorerMatch,
  onAttachLinkToEvent,
  onSyncEventToScorerMatch,
  onRemoveScorerMatches,
  savedCards: externalSavedCards,
  onUpdateSavedCards: setExternalSavedCards,
  activeCardId: externalActiveCardId,
  onSelectActiveCardId: setExternalActiveCardId,
  compactMergedMode = false,
  onOpenGoogleSearchTab,
  generatedEventLinks: externalGeneratedEventLinks,
  onClearGeneratedEventLink,
  onTriggerAutoDriveBackup,
  onOpenDriveBackupModal
}) => {
  const [internalSavedCards, setInternalSavedCards] = useState<SavedSlipCard[]>(() => {
    try {
      const saved = localStorage.getItem('cricket-saved-slip-cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensureUniqueSlipEventIds(parsed).cards;
        }
      }
    } catch {}
    return ensureUniqueSlipEventIds(INITIAL_SLIP_CARDS).cards;
  });

  const savedCards = externalSavedCards ?? internalSavedCards;
  const setSavedCards = setExternalSavedCards ?? setInternalSavedCards;

  const [internalActiveCardId, setInternalActiveCardId] = useState<string>('card-1');
  const activeCardId = externalActiveCardId ?? internalActiveCardId;
  const setActiveCardId = setExternalActiveCardId ?? setInternalActiveCardId;

  const [activeMode, setActiveMode] = useState<'preview' | 'edit'>('preview');
  const [addingLinkForEventId, setAddingLinkForEventId] = useState<string | null>(null);
  const [eventLinkInputVal, setEventLinkInputVal] = useState<string>('');
  const [searchingLinkEventIds, setSearchingLinkEventIds] = useState<Record<string, boolean>>({});
  const [internalGeneratedEventLinks, setInternalGeneratedEventLinks] = useState<Record<string, string>>({});
  const generatedEventLinks = externalGeneratedEventLinks ?? internalGeneratedEventLinks;

  const copyTextReliable = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {}
  };

  const handleOpenGoogleSearchForEvent = (ev: BetEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const [t1, t2] = extractBetEventTeams(ev);
    const combinedText = `${ev.match || ''} ${ev.league || ''} ${ev.selection || ''} ${t1} ${t2}`;
    const hasFootballClub = /\b(?:spor|belediyespor|fc|cf|sc|fk|sk|fsk|united|city|real\s+madrid|barcelona|arsenal|chelsea|liverpool|bayern|juventus|milan|inter|psg|karagumruk|istanbulspor|somaspor|alanya|kars|fatsa|galatasaray|fenerbahce|besiktas)\b/i.test(combinedText);
    const isCricketEvent = !hasFootballClub && /\b(?:cricket|crex|t20|odi|test|ipl|bpl|psl|bbl|cpl|wcl|wicket|over|runs?|innings|champions|legends|pakistan|sri\s*lanka|india|bangladesh|australia|england|west\s*indies|south\s*africa|new\s*zealand|zimbabwe|afghanistan|ireland|scotland|netherlands|nepal|oman|uae|namibia)\b/i.test(combinedText);
    const siteSuffix = isCricketEvent ? 'crex' : 'sofascore';
    const baseTeams = t1 && t2 ? `${t1} vs ${t2}` : (ev.match || 'live score');
    const searchQuery = /\b(?:crex|sofascore)\b/i.test(baseTeams) ? baseTeams : `${baseTeams} ${siteSuffix}`;
    if (onOpenGoogleSearchTab) {
      onOpenGoogleSearchTab(ev, searchQuery);
      return;
    }
    handleSearchOrCopyEventLink(ev, e);
  };

  const handleSearchOrCopyEventLink = async (ev: BetEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const existingUrl = generatedEventLinks[ev.id];
    if (existingUrl) {
      await copyTextReliable(existingUrl);
      if (addingLinkForEventId === ev.id) {
        setEventLinkInputVal(existingUrl);
      }
      if (onClearGeneratedEventLink) {
        onClearGeneratedEventLink(ev.id);
      } else {
        setInternalGeneratedEventLinks(prev => {
          const next = { ...prev };
          delete next[ev.id];
          return next;
        });
      }
      toast.success(
        lang === 'bn'
          ? '✅ লিংক কপি হয়েছে! এখন + আইকনে পেস্ট করতে পারেন'
          : '✅ Link copied to clipboard!'
      );
      return;
    }

    if (onOpenGoogleSearchTab) {
      handleOpenGoogleSearchForEvent(ev, e);
      return;
    }

    if (searchingLinkEventIds[ev.id]) return;
    setSearchingLinkEventIds(prev => ({ ...prev, [ev.id]: true }));
    try {
      const [t1, t2] = extractBetEventTeams(ev);
      const res = await fetch('/api/search-match-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1: t1,
          team2: t2,
          match: ev.match,
          dateTime: ev.dateTime,
          league: ev.league,
          selection: ev.selection
        })
      });
      const data = await res.json();
      if (data && data.success && data.url) {
        setInternalGeneratedEventLinks(prev => ({ ...prev, [ev.id]: data.url }));
        const srcName = data.sport === 'cricket' ? 'Crex' : 'Sofascore';
        toast.info(
          lang === 'bn'
            ? `🔍 ${srcName} লিংক জেনারেট হয়েছে! কপি করতে লিংক বাটনে ক্লিক করুন`
            : `🔍 ${srcName} link generated! Click the link button to copy`
        );
      } else {
        throw new Error(data?.error || 'Search failed');
      }
    } catch {
      const [t1, t2] = extractBetEventTeams(ev);
      const slug1 = String(t1 || 'team1').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const slug2 = String(t2 || 'team2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const isCric = /\b(?:cricket|t20|odi|test|pakistan|sri\s*lanka|india|bangladesh|australia|england|west\s*indies|south\s*africa|new\s*zealand|zimbabwe|afghanistan)\b/i.test(
        `${ev.match} ${ev.league || ''} ${ev.selection || ''}`
      );
      const directFallback = isCric
        ? `https://crex.com/cricket-live-score/${slug1}-vs-${slug2}-live-match-updates`
        : `https://www.sofascore.com/football/match/${slug1}-${slug2}/YTbsYUb`;
      const wrappedFallback = `https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=${directFallback}&ved=2ahUKEwjDnLbL56eXAxVs8DgGHT67M0oQFnoECCcQAQ&usg=AOvVaw1ts_gB_G8RBAuTu9WuiwuF`;
      setInternalGeneratedEventLinks(prev => ({ ...prev, [ev.id]: wrappedFallback }));
    } finally {
      setSearchingLinkEventIds(prev => ({ ...prev, [ev.id]: false }));
    }
  };

  const renderEventSearchLinkButton = (ev: BetEvent, lightTheme = false) => {
    const isSearching = Boolean(searchingLinkEventIds[ev.id]);
    const generatedUrl = generatedEventLinks[ev.id];
    const isCrex = generatedUrl ? generatedUrl.toLowerCase().includes('crex.com') : false;
    const linkedMatch = ev.linkedMatchId ? matches.find(m => m.id === ev.linkedMatchId) : undefined;
    const rawSourceUrl = (ev.liveMatchUrl || linkedMatch?.liveMatchUrl || '').trim();
    const resolvedSourceUrl = unwrapRedirectUrl(rawSourceUrl) || rawSourceUrl;

    return (
      <div className="inline-flex items-center gap-1 shrink-0">
        {resolvedSourceUrl && /^https?:\/\//i.test(resolvedSourceUrl) && (
          <a
            href={resolvedSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
              lightTheme
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border-emerald-400/50'
            }`}
            title={
              lang === 'bn'
                ? `সোর্স লিংক ওপেন করুন: ${resolvedSourceUrl}`
                : `Open source link: ${resolvedSourceUrl}`
            }
          >
            <ExternalLink size={11} />
          </a>
        )}
        {generatedUrl && (
          <button
            type="button"
            onClick={(e) => handleSearchOrCopyEventLink(ev, e)}
            className={`px-1.5 h-5 rounded-md text-[9px] font-black flex items-center gap-1 border transition-all cursor-pointer shrink-0 animate-pulse ${
              lightTheme
                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-500'
                : 'bg-emerald-500 text-slate-950 border-emerald-300 hover:bg-emerald-400 shadow-xs'
            }`}
            title={
              lang === 'bn'
                ? `ক্লিক করলেই কপি হবে: ${generatedUrl}`
                : `Click to copy link: ${generatedUrl}`
            }
          >
            <Copy size={10} />
            <span className="max-w-[95px] truncate">
              {isCrex ? 'Crex কপি' : 'Sofascore কপি'}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => handleOpenGoogleSearchForEvent(ev, e)}
          disabled={isSearching}
          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
            lightTheme
              ? 'bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 border-slate-300'
              : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border-cyan-400/50'
          }`}
          title={
            lang === 'bn'
              ? 'নতুন ট্যাবে দল দুটির নাম গুগলে সার্চ করুন'
              : 'Search both teams on Google in a new website tab'
          }
        >
          {isSearching ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
        </button>
      </div>
    );
  };

  const [showSettledInDashboard, setShowSettledInDashboard] = useState<boolean>(false);

  const visibleCarouselCards = useMemo(() => {
    if (showSettledInDashboard) return savedCards;
    return savedCards.filter(c => !isSlipCardSettled(c));
  }, [savedCards, showSettledInDashboard]);

  const hiddenSettledSlipCount = useMemo(() => {
    return savedCards.filter(c => isSlipCardSettled(c)).length;
  }, [savedCards]);

  const hiddenSettledEventCount = useMemo(() => {
    let count = 0;
    for (const c of savedCards) {
      for (const ev of c.slipData.events || []) {
        if (!ev.hidden && isBetEventSettled(ev)) count++;
      }
    }
    return count;
  }, [savedCards]);

  const activeCard = useMemo(() => {
    const pool = visibleCarouselCards.length > 0 ? visibleCarouselCards : savedCards;
    return pool.find(c => c.id === activeCardId) || pool[0];
  }, [visibleCarouselCards, savedCards, activeCardId]);

  useEffect(() => {
    if (!showSettledInDashboard && visibleCarouselCards.length > 0) {
      if (!visibleCarouselCards.some(c => c.id === activeCardId)) {
        setActiveCardId(visibleCarouselCards[0].id);
      }
    }
  }, [visibleCarouselCards, activeCardId, showSettledInDashboard]);

  const emptySlipFallback = useMemo<BetSlipData>(() => ({
    ...DEFAULT_SLIP_1,
    id: 'slip-empty',
    slipNumber: '—',
    stake: '0.00',
    overallOdds: '0.00',
    potentialWinnings: '0.00',
    events: []
  }), []);

  const slip = activeCard?.slipData || emptySlipFallback;

  const updateActiveSlip = (updater: (prev: BetSlipData) => BetSlipData) => {
    setSavedCards(prevCards => {
      if (prevCards.length === 0) {
        const newNum = Math.floor(80000000000 + Math.random() * 10000000000).toString();
        const baseSlip: BetSlipData = {
          ... emptySlipFallback,
          id: `slip-${Date.now()}`,
          slipNumber: newNum,
          stake: '500.00'
        };
        const updatedSlip = updater(baseSlip);
        const cleanStake = String(updatedSlip.stake || '0.00').replace(/\s*[A-Za-z]+$/, '').trim() || updatedSlip.stake;
        const createdCard: SavedSlipCard = {
          id: `card-${Date.now()}`,
          amount: cleanStake,
          currency: 'BDT',
          countBadge: updatedSlip.events.length || 1,
          colorScheme: 'white',
          slipData: {
            ...updatedSlip,
            stake: cleanStake
          }
        };
        setActiveCardId(createdCard.id);
        return [createdCard];
      }
      return prevCards.map(c => {
        if (c.id === (activeCard?.id || activeCardId)) {
          const updatedSlip = updater(c.slipData);
          const cleanStake = String(updatedSlip.stake || '0.00').replace(/\s*[A-Za-z]+$/, '').trim() || updatedSlip.stake;
          return {
            ...c,
            amount: cleanStake,
            slipData: {
              ...updatedSlip,
              stake: cleanStake
            }
          };
        }
        return c;
      });
    });
  };

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

  // Merged match groups for the selected Bet Slip (merges identical matches across slips, never merges different matches)
  // Hides Win/Lost events and slips from the Main Dashboard by default unless showSettledInDashboard is enabled
  const mergedMatchGroups = useMemo(() => {
    return buildMergedSlipMatchGroups(savedCards, matches, activeCard?.id, !showSettledInDashboard);
  }, [savedCards, matches, activeCard?.id, showSettledInDashboard]);

  const visibleMergedMatchGroups = useMemo(() => {
    return mergedMatchGroups;
  }, [mergedMatchGroups]);

  const isCurrentSlipLost = useMemo(() => {
    return isSlipCardLost(activeCard);
  }, [activeCard]);

  // Group events for the Edit view of the currently selected Bet Slip
  const pendingEvents = useMemo(() => {
    return sortedEvents.filter(e => e.status !== 'Win' && e.status !== 'Lost' && e.status !== 'Cancel');
  }, [sortedEvents]);

  const completedEvents = useMemo(() => {
    return sortedEvents.filter(e => e.status === 'Win' || e.status === 'Lost' || e.status === 'Cancel');
  }, [sortedEvents]);

  useEffect(() => {
    if (!externalSavedCards) {
      try {
        localStorage.setItem('cricket-saved-slip-cards', JSON.stringify(savedCards));
      } catch {}
    }
  }, [savedCards, externalSavedCards]);

  const handleSelectCard = (card: SavedSlipCard) => {
    setActiveCardId(card.id);
  };

  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetCard = savedCards.find(c => c.id === cardId);
    const filtered = savedCards.filter(c => c.id !== cardId);
    if (targetCard && onRemoveScorerMatches) {
      const remainingLinkedIds = new Set(
        filtered.flatMap(c => c.slipData.events.map(ev => ev.linkedMatchId).filter(Boolean) as string[])
      );
      const idsToRemove = targetCard.slipData.events
        .map(ev => ev.linkedMatchId)
        .filter((id): id is string => Boolean(id && !remainingLinkedIds.has(id)));
      if (idsToRemove.length > 0) {
        onRemoveScorerMatches(idsToRemove);
      }
    }
    setSavedCards(filtered);
    if (activeCardId === cardId) {
      setActiveCardId(filtered[0]?.id || '');
    }
    toast.info(lang === 'bn' ? 'স্লিপ কার্ড ও লিংকড ম্যাচ Scorer থেকে মোছা হয়েছে' : 'Slip card and linked Scorer matches removed');
  };

  const handleAddNewCard = () => {
    const nowTs = Date.now();
    const cardId = `card-${nowTs}`;
    const newNum = Math.floor(80000000000 + Math.random() * 10000000000).toString();
    const freshEvents: BetEvent[] = DEFAULT_SLIP_1.events.map((ev, idx) => ({
      ...ev,
      id: `ev-${cardId}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      linkedMatchId: undefined,
      linkedMilestoneId: undefined,
      liveMatchUrl: undefined
    }));
    const newCard: SavedSlipCard = {
      id: cardId,
      amount: '500.00',
      currency: 'BDT',
      countBadge: Math.floor(Math.random() * 30) + 1,
      colorScheme: savedCards.length % 2 === 0 ? 'white' : 'blue',
      slipData: {
        ...DEFAULT_SLIP_1,
        id: `slip-${nowTs}`,
        slipNumber: newNum,
        stake: '500.00',
        events: freshEvents
      }
    };
    setSavedCards(prev => [...prev, newCard]);
    setActiveCardId(newCard.id);
    toast.success(lang === 'bn' ? 'নতুন স্লিপ তৈরি হয়েছে' : 'New slip card created');
  };

  const handleCopyCardAmount = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(lang === 'bn' ? 'কপি হয়েছে!' : 'Copied to clipboard!');
  };

  const dateTimeParts = (slip.dateTime || '21.04 08:25 AM').split(' ');
  const dateStr = dateTimeParts[0] || '21.04';
  const timeStr = dateTimeParts.slice(1).join(' ') || '08:25 AM';

  // Handle Event updates across one or all merged slips (NEVER overwrite dateTime, match, team1, team2, odds, selection when syncing)
  const handleUpdateEvent = (id: string, updates: Partial<BetEvent>, propagateScoreToMergedMatches = true) => {
    let syncedEvForScorer: BetEvent | null = null;
    const targetOwnerCard = savedCards.find(c => c.slipData.events.some(e => e.id === id));
    const targetRefEv = targetOwnerCard?.slipData.events.find(e => e.id === id);
    const [refT1, refT2] = targetRefEv ? extractBetEventTeams(targetRefEv) : ['', ''];
    const isScoreUpdateOnly =
      propagateScoreToMergedMatches &&
      (updates.score1 !== undefined || updates.score2 !== undefined) &&
      updates.status === undefined &&
      updates.selection === undefined &&
      updates.odds === undefined &&
      updates.match === undefined;

    const nextCards = savedCards.map(c => {
      let cardChanged = false;
      const updatedEvents = c.slipData.events.map(e => {
        const isDirectTarget = e.id === id;
        // NEVER merge or propagate between different events in the SAME slip!
        const isMergedScoreTarget =
          !isDirectTarget &&
          isScoreUpdateOnly &&
          targetRefEv &&
          targetOwnerCard &&
          c.id !== targetOwnerCard.id
            ? areTwoBetEventsSameMatch(e, targetRefEv)
            : false;

        if (!isDirectTarget && !isMergedScoreTarget) return e;
        cardChanged = true;

        let effectiveUpdates: Partial<BetEvent> = updates;
        if (isMergedScoreTarget && targetRefEv) {
          const [eT1, eT2] = extractBetEventTeams(e);
          const swapped = areLinkTeamsSwapped(refT1, refT2, eT1, eT2);
          effectiveUpdates = {};
          if (updates.score1 !== undefined) {
            effectiveUpdates[swapped ? 'score2' : 'score1'] = updates.score1;
          }
          if (updates.score2 !== undefined) {
            effectiveUpdates[swapped ? 'score1' : 'score2'] = updates.score2;
          }
        }

        let nextEv: BetEvent = { ...e, ...effectiveUpdates };
        if (effectiveUpdates.selection !== undefined && effectiveUpdates.betRuleType === undefined) {
          nextEv.betRuleType = 'auto';
        }
        // If user manually updates score1 or score2, disable autoSyncScore so live sync doesn't overwrite their manual score
        if (effectiveUpdates.score1 !== undefined || effectiveUpdates.score2 !== undefined) {
          nextEv.autoSyncScore = false;
        }
        // If user manually updates status (Win, Pending, Lost), lock autoSettleResult = false so live sync doesn't overwrite it
        if (effectiveUpdates.status !== undefined && effectiveUpdates.autoSettleResult === undefined) {
          nextEv.autoSettleResult = effectiveUpdates.status === 'Live';
        }
        let syncedWithLiveMatch = false;
        if (
          nextEv.linkedMatchId &&
          nextEv.autoSyncScore !== false &&
          effectiveUpdates.score1 === undefined &&
          effectiveUpdates.score2 === undefined &&
          effectiveUpdates.status === undefined
        ) {
          const targetMatch = matches.find(m => m.id === nextEv.linkedMatchId);
          if (targetMatch) {
            nextEv = syncBetEventWithScorerMatch(nextEv, targetMatch);
            syncedWithLiveMatch = true;
          }
        }
        if (
          !syncedWithLiveMatch &&
          effectiveUpdates.status === undefined &&
          (effectiveUpdates.selection !== undefined ||
            effectiveUpdates.score1 !== undefined ||
            effectiveUpdates.score2 !== undefined)
        ) {
          const standaloneOutcome = evaluateStandaloneBetEventOutcome(nextEv);
          if (standaloneOutcome) {
            nextEv.status = standaloneOutcome;
          }
        }
        if (isDirectTarget) {
          syncedEvForScorer = nextEv;
        }
        return nextEv;
      });

      if (!cardChanged) return c;
      const nextSlip = recalculateBetSlipSummary({
        ...c.slipData,
        events: updatedEvents
      });
      const cleanStake = String(nextSlip.stake || '0.00').replace(/\s*[A-Za-z]+$/, '').trim() || nextSlip.stake;
      return {
        ...c,
        amount: cleanStake,
        slipData: {
          ...nextSlip,
          stake: cleanStake
        }
      };
    });

    setSavedCards(nextCards);
    if (syncedEvForScorer && onSyncEventToScorerMatch) {
      const evObj = syncedEvForScorer as BetEvent;
      if (evObj.linkedMatchId) {
        onSyncEventToScorerMatch(evObj, updates);
      }
    }
    if (
      onTriggerAutoDriveBackup &&
      (updates.status === 'Win' ||
        updates.status === 'Lost' ||
        (syncedEvForScorer &&
          ((syncedEvForScorer as BetEvent).status === 'Win' || (syncedEvForScorer as BetEvent).status === 'Lost')))
    ) {
      const evObj = (syncedEvForScorer as BetEvent | null) || targetRefEv;
      const stLabel = updates.status || evObj?.status || 'Settled';
      onTriggerAutoDriveBackup(`${evObj?.match || 'event'}-${stLabel}`, true, nextCards);
    }
  };

  // Toggle HT / FT on an event without changing its date, time, teams, or odds
  const handleToggleEventPeriodHTFT = (ev: BetEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const curPeriod = resolveEventPeriodType(ev);
    const nextPeriod: 'HT' | 'FT' = curPeriod === 'HT' ? 'FT' : 'HT';
    handleUpdateEvent(ev.id, {
      matchPeriodType: nextPeriod,
      betTargetOver: nextPeriod === 'HT' ? 45 : undefined,
      currentPeriodLabel: nextPeriod
    });
    toast.info(
      lang === 'bn'
        ? `${ev.match}: ${nextPeriod === 'HT' ? 'HT (১ম অর্ধ - ৪৫ মি.)' : 'FT (পূর্ণ সময় - ৯০ মি.)'} সেট করা হয়েছে`
        : `${ev.match} set to ${nextPeriod}`
    );
  };

  // Link an existing BetEvent to a Scorer Match or Live URL WITHOUT changing date, time, team names, or odds!
  // Unlinking removes the match from Scorer while preserving ev.liveMatchUrl on the slip event.
  const handleLinkEventToScorerMatch = (eventId: string, urlOrMatchId: string, milestoneId?: string) => {
    if (!urlOrMatchId) {
      if (onAttachLinkToEvent) {
        onAttachLinkToEvent(eventId, '');
      }
      handleUpdateEvent(eventId, {
        linkedMatchId: undefined,
        linkedMilestoneId: undefined,
        liveProgressText: undefined,
        autoSyncScore: false,
        autoSettleResult: false
      });
      setAddingLinkForEventId(null);
      setEventLinkInputVal('');
      toast.info(
        lang === 'bn'
          ? '🔗 ম্যাচটি আনলিংক হয়ে Scorer থেকে বাদ হয়েছে (লিংক সংরক্ষিত আছে)'
          : '🔗 Match unlinked & removed from Scorer (Link URL preserved)'
      );
      return;
    }

    if (onAttachLinkToEvent && !milestoneId) {
      onAttachLinkToEvent(eventId, urlOrMatchId);
      setAddingLinkForEventId(null);
      setEventLinkInputVal('');
      return;
    }

    const m = matches.find(x => x.id === urlOrMatchId);
    if (!m) return;

    updateActiveSlip(prev => {
      const updatedEvents = prev.events.map(ev => {
        if (ev.id !== eventId) return ev;
        // CRITICAL: Preserve ev.dateTime, ev.match, ev.team1, ev.team2, ev.odds, ev.selection!
        const draft: BetEvent = {
          ...ev,
          linkedMatchId: m.id,
          linkedMilestoneId: milestoneId,
          liveMatchUrl: m.liveMatchUrl || ev.liveMatchUrl,
          autoSyncScore: true,
          autoSettleResult: true
        };
        return syncBetEventWithScorerMatch(draft, m);
      });

      return recalculateBetSlipSummary({
        ...prev,
        events: updatedEvents
      });
    });

    setAddingLinkForEventId(null);
    setEventLinkInputVal('');
    toast.success(
      lang === 'bn'
        ? '🔗 লিংক যুক্ত হয়েছে! তারিখ, সময়, দলের নাম ও ওডস অপরিবর্তিত রেখে স্কোর অটো আপডেট হবে।'
        : '🔗 Link attached! Score will auto-update while keeping event details unchanged.'
    );
  };

  const handleAddEvent = () => {
    const newEv: BetEvent = {
      id: `ev-${Date.now()}`,
      eventNumber: (slip.events.length + 1).toString(),
      dateTime: formatSlipDateTimeOffset(60),
      sport: 'Football',
      league: 'Match',
      match: 'Team A - Team B',
      team1: 'Team A',
      team2: 'Team B',
      selection: 'W1',
      odds: '1.80',
      status: 'Pending',
      score1: '',
      score2: '',
      matchPeriodType: 'FT'
    };
    updateActiveSlip(prev =>
      recalculateBetSlipSummary({
        ...prev,
        events: [...prev.events, newEv]
      })
    );
    toast.info(lang === 'bn' ? 'নতুন ম্যাচ যোগ করা হয়েছে' : 'Event added');
  };

  const handleRemoveEvent = (id: string) => {
    const targetEv = slip.events.find(e => e.id === id);
    if (targetEv?.linkedMatchId && onRemoveScorerMatches) {
      onRemoveScorerMatches([targetEv.linkedMatchId]);
    }
    updateActiveSlip(prev =>
      recalculateBetSlipSummary({
        ...prev,
        events: prev.events.filter(e => e.id !== id)
      })
    );
    toast.info(
      lang === 'bn'
        ? 'ইভেন্ট স্লিপ ও Scorer থেকে মোছা হয়েছে'
        : 'Event removed from slip and Scorer'
    );
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
      const cleanParsedStake = parsed.stake
        ? String(parsed.stake).replace(/\s*[A-Za-z]+$/, '').trim()
        : undefined;
      const cleanParsedPot = parsed.potentialWinnings
        ? String(parsed.potentialWinnings).replace(/\s*[A-Za-z]+$/, '').trim()
        : undefined;

      const uploadBatchTs = Date.now();
      updateActiveSlip(prev => ({
        ...prev,
        slipNumber: parsed.slipNumber || prev.slipNumber,
        dateTime: parsed.dateTime || prev.dateTime,
        betType: parsed.betType || prev.betType,
        overallOdds: parsed.overallOdds || prev.overallOdds,
        stake: cleanParsedStake || prev.stake,
        potentialWinnings: cleanParsedPot || prev.potentialWinnings,
        status: (parsed.status as EventStatus) || prev.status,
        events:
          parsed.events && parsed.events.length > 0
            ? sortEventsChronologically(
                parsed.events.map((pev: BetEvent, idx: number) => {
                  const [t1, t2] = extractBetEventTeams(pev);
                  return {
                    ...pev,
                    id: `ev-${activeCard?.id || 'card'}-${uploadBatchTs}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
                    team1: t1,
                    team2: t2,
                    match: pev.match || `${t1} - ${t2}`,
                    matchPeriodType: resolveEventPeriodType(pev),
                    linkedMatchId: undefined,
                    linkedMilestoneId: undefined,
                    liveMatchUrl: undefined
                  };
                })
              )
            : prev.events
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
      sortedEvents.map(e => {
        const pType = resolveEventPeriodType(e);
        return `• [${e.status}] ${e.dateTime} | ${e.match} (${pType}) ${e.score1 || e.score2 ? `[${e.score1 || '0'}-${e.score2 || '0'}]` : ''} | Pick: ${e.selection} @ ${e.odds}`;
      }).join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(lang === 'bn' ? 'স্লিপ কপি হয়েছে!' : 'Summary copied!');
  };

  // Render a single event item in the editor
  const renderEditEventItem = (ev: BetEvent, index: number, groupTitle: string) => {
    const isCompleted = ev.status === 'Win' || ev.status === 'Lost' || ev.status === 'Cancel';
    const isLinked = Boolean(ev.linkedMatchId);
    const hasSavedUrl = Boolean(ev.liveMatchUrl && ev.liveMatchUrl.trim());
    const linkedScorerMatch = ev.linkedMatchId ? matches.find(m => m.id === ev.linkedMatchId) : undefined;
    const periodType = resolveEventPeriodType(ev);

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
        {/* Header: Event number, match title, HT/FT badge, + Link icon (only if not linked) & delete */}
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
              onChange={e => {
                const val = e.target.value;
                const [t1, t2] = extractBetEventTeams({ match: val, team1: ev.team1, team2: ev.team2 });
                handleUpdateEvent(ev.id, {
                  match: val,
                  team1: t1,
                  team2: t2
                });
              }}
              className="font-bold text-xs bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 outline-none w-full text-slate-900 dark:text-slate-100"
              placeholder="Belgium - France"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* HT / FT Indicator & Toggle */}
            <button
              type="button"
              onClick={(e) => handleToggleEventPeriodHTFT(ev, e)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border transition-all cursor-pointer ${
                periodType === 'HT'
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50'
                  : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/50'
              }`}
              title={lang === 'bn' ? 'ক্লিক করে HT / FT পরিবর্তন করুন' : 'Click to toggle HT / FT'}
            >
              {periodType}
            </button>

            {/* Search Icon -> Generate Crex/Sofascore Link -> Click to Copy & Reset */}
            {renderEventSearchLinkButton(ev)}

            {/* + Icon / Re-link to add link, or Unlink button when already linked */}
            {isLinked ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkEventToScorerMatch(ev.id, '');
                }}
                className="px-2 h-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                title={lang === 'bn' ? 'আনলিংক করলে Scorer থেকে বাদ হবে (লিংক সংরক্ষিত থাকবে)' : 'Unlink from Scorer (preserves saved URL)'}
              >
                <Unlink size={11} />
                <span>{lang === 'bn' ? 'আনলিংক' : 'Unlink'}</span>
              </button>
            ) : (
              <>
                {hasSavedUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ev.liveMatchUrl) {
                        handleLinkEventToScorerMatch(ev.id, ev.liveMatchUrl.trim());
                      }
                    }}
                    className="px-2 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    title={lang === 'bn' ? `সংরক্ষিত লিংক পুনরায় যুক্ত করুন: ${ev.liveMatchUrl}` : `Re-attach saved link: ${ev.liveMatchUrl}`}
                  >
                    <Link2 size={11} />
                    <span>{lang === 'bn' ? 'লিংক করুন' : 'Re-link'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAddingLinkForEventId(prev => prev === ev.id ? null : ev.id);
                    setEventLinkInputVal(ev.liveMatchUrl || '');
                  }}
                  className="w-6 h-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer"
                  title={lang === 'bn' ? 'ম্যাচের লাইভ লিংক যুক্ত বা এডিট করুন (+)' : 'Add or Edit Live Match Link (+)'}
                >
                  <Plus size={13} />
                </button>
              </>
            )}

            <button
              onClick={() => handleRemoveEvent(ev.id)}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
              title="Remove event"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Inline Link Input Box when + Icon is clicked (only shown while adding link) */}
        {addingLinkForEventId === ev.id && !isLinked && (
          <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-indigo-500/50 space-y-2">
            <div className="text-[10px] font-bold text-indigo-200 flex items-center justify-between">
              <span>{lang === 'bn' ? '🔗 লাইভ ম্যাচের লিংক পেস্ট করুন অথবা স্কোরার ম্যাচ সিলেক্ট করুন:' : '🔗 Paste Live Match URL or Select Scorer Match:'}</span>
              <button
                type="button"
                onClick={() => setAddingLinkForEventId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {renderEventSearchLinkButton(ev)}
              <input
                type="text"
                value={eventLinkInputVal}
                onChange={e => setEventLinkInputVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && eventLinkInputVal.trim()) {
                    handleLinkEventToScorerMatch(ev.id, eventLinkInputVal.trim());
                  }
                }}
                placeholder="https://www.sofascore.com/... বা https://crex.com/..."
                className="flex-1 h-7 px-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-400"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  if (eventLinkInputVal.trim()) {
                    handleLinkEventToScorerMatch(ev.id, eventLinkInputVal.trim());
                  }
                }}
                className="px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black shrink-0 cursor-pointer"
              >
                {lang === 'bn' ? 'যুক্ত করুন' : 'Link'}
              </button>
            </div>
            {matches.length > 0 && (
              <select
                value=""
                onChange={e => {
                  if (e.target.value) {
                    handleLinkEventToScorerMatch(ev.id, e.target.value);
                  }
                }}
                className="w-full h-7 px-2 text-[10px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
              >
                <option value="">{lang === 'bn' ? '-- অথবা স্কোরারের চলমান ম্যাচ থেকে সিলেক্ট করুন --' : '-- Or select from existing Scorer matches --'}</option>
                {matches.map((m, idx) => {
                  const st = extractScorerMatchScoreState(m);
                  return (
                    <option key={m.id} value={m.id}>
                      #{idx + 1} {st.team1Name} vs {st.team2Name} ({st.isUpcoming ? (lang === 'bn' ? 'আপকামিং' : 'Upcoming') : `${st.score1Display || '0'} - ${st.score2Display || '0'}`})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}

        {/* 1. STATUS SELECTION BAR (WIN, LOST, PENDING, LIVE) */}
        <div>
          <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center justify-between">
            <span>{lang === 'bn' ? 'ইভেন্ট স্ট্যাটাস' : 'Event Status'}</span>
            {ev.liveProgressText && (
              <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {ev.liveProgressText}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Pending', autoSettleResult: false })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Pending'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-amber-50'
              }`}
            >
              <Clock size={11} />
              <span>{lang === 'bn' ? 'পেন্ডিং' : 'Pending'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Win', autoSettleResult: false })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Win'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={11} />
              <span>{lang === 'bn' ? 'উইন' : 'Win'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Lost', autoSettleResult: false })}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                ev.status === 'Lost'
                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-50'
              }`}
            >
              <XCircle size={11} />
              <span>{lang === 'bn' ? 'লস' : 'Lost'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateEvent(ev.id, { status: 'Live', autoSettleResult: true })}
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
            <span>
              {linkedScorerMatch
                ? (lang === 'bn' ? `🔄 অটো স্কোর (${periodType})` : `🔄 Auto Score (${periodType})`)
                : isLinked
                ? (lang === 'bn' ? `🔒 সংরক্ষিত স্কোর (${periodType} • ম্যাচ ডিলিট হলেও অপরিবর্তিত)` : `🔒 Preserved Score (${periodType} • Unchanged after match deletion)`)
                : (lang === 'bn' ? `ম্যাচ স্কোর (${periodType})` : `Match Score (${periodType})`)}
            </span>
            {(ev.score1 || ev.score2) && (
              <span className="text-[9px] font-bold font-mono text-blue-600">
                {periodType}: {ev.score1 || '0'} - {ev.score2 || '0'}
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
                className="w-full h-7 px-2 text-center text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white text-slate-900 dark:text-slate-100"
              />
            </div>
            <span className="font-bold text-slate-400 text-xs">-</span>
            <div className="flex-1">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'টিম ২ স্কোর' : 'Team 2'}
                value={ev.score2 || ''}
                onChange={e => handleUpdateEvent(ev.id, { score2: e.target.value })}
                className="w-full h-7 px-2 text-center text-xs font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white text-slate-900 dark:text-slate-100"
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
              className="w-full h-7 px-1.5 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
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
              className="w-full h-7 px-1.5 text-[11px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full flex flex-col items-center gap-3 ${compactMergedMode ? 'p-2' : 'p-3 md:p-6 max-w-xl mx-auto'} font-sans`}>
      
      {/* 1. TOP HORIZONTAL CAROUSEL OF SLIPS / BALANCES */}
      <div className="w-full overflow-x-auto no-scrollbar pt-2 pb-1">
        <div className="flex items-center gap-3 min-w-max px-1">
          {visibleCarouselCards.map((card) => {
            const isActive = card.id === activeCardId;
            const isBlue = card.colorScheme === 'blue';
            const displayBalance = formatCardAmountWithCurrency(card.amount, card.currency);

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
                    {displayBalance}
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-white/90">
                    <button
                      onClick={(e) => handleCopyCardAmount(displayBalance, e)}
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
                  {card.countBadge !== undefined && (
                    <div className="absolute -top-2.5 -right-2 bg-[#1864e8] text-white font-bold text-[11px] px-2 py-0.5 rounded-full shadow-sm">
                      {card.countBadge}
                    </div>
                  )}

                  <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-800 dark:text-slate-100">
                    {displayBalance}
                  </span>

                  <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <button
                      onClick={(e) => handleCopyCardAmount(displayBalance, e)}
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

          {/* Hidden Win/Lost Archive Toggle Badge & Drive Backup Button */}
          {(hiddenSettledSlipCount > 0 || hiddenSettledEventCount > 0) && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !showSettledInDashboard;
                  setShowSettledInDashboard(nextVal);
                  if (nextVal) {
                    const settledCard =
                      savedCards.find(c => isSlipCardSettled(c)) ||
                      savedCards.find(c => c.slipData.events.some(e => isBetEventSettled(e)));
                    if (settledCard) {
                      setActiveCardId(settledCard.id);
                    }
                  }
                }}
                className={`px-3 py-2 rounded-2xl text-[11px] font-bold flex items-center gap-1.5 border shrink-0 transition-all cursor-pointer ${
                  showSettledInDashboard
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900/90 text-emerald-300 border-emerald-500/40 hover:bg-slate-800'
                }`}
                title={
                  lang === 'bn'
                    ? 'Win/Lost বেটস্লিপ ও ইভেন্ট দেখতে বা হাইড করতে ক্লিক করুন।'
                    : 'Click to view or hide settled Win/Lost slips & events.'
                }
              >
                <Eye size={13} />
                <span>
                  {showSettledInDashboard
                    ? (lang === 'bn' ? 'Win/Lost হাইড করুন' : 'Hide Win/Lost')
                    : (lang === 'bn'
                        ? `Win/Lost আর্কাইভ দেখুন (${hiddenSettledSlipCount} স্লিপ • ${hiddenSettledEventCount} ইভেন্ট)`
                        : `Show Win/Lost Archive (${hiddenSettledSlipCount} Slips • ${hiddenSettledEventCount} Events)`)}
                </span>
              </button>
              {onOpenDriveBackupModal && (
                <button
                  type="button"
                  onClick={() => onOpenDriveBackupModal()}
                  className="px-3 py-2 rounded-2xl text-[11px] font-bold flex items-center gap-1.5 border border-blue-500/40 bg-blue-950/90 hover:bg-blue-900 text-blue-200 shrink-0 transition-all cursor-pointer"
                  title={lang === 'bn' ? 'Google Drive ক্লাউড ব্যাকআপ খুলুন' : 'Open Google Drive Backups'}
                >
                  <Cloud size={13} />
                  <span>{lang === 'bn' ? 'ড্রাইভ ব্যাকআপ খুলুন' : 'Drive Backup'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1.5 AUTOMATIC MERGED BET SLIP MATCHES LIVE LINK-UP CARDS (Only shown in Standalone Bet Slip tab so it's not duplicated in Merged Mode) */}
      {!compactMergedMode && (
        <div className="w-full bg-slate-900/95 text-white rounded-2xl p-3 border border-indigo-500/40 shadow-md space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link2 size={14} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                {lang === 'bn'
                  ? `মার্জড বেট স্লিপ ম্যাচ লাইভ লিংকআপ (${visibleMergedMatchGroups.length}টি ম্যাচ)`
                  : `Merged Bet Slip Matches Live Link-Up (${visibleMergedMatchGroups.length} Matches)`}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[9px] font-bold">
                {lang === 'bn'
                  ? '🔀 বিভিন্ন স্লিপের একই ম্যাচ মার্জড • স্লিপ Lost হলে Live/Upcoming ম্যাচ অটো বাদ'
                  : '🔀 Same match merged across slips • Lost slip removes Live/Upcoming'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {visibleMergedMatchGroups.map(group => {
              const primaryPick = group.visiblePicks[0] || group.picks[0];
              if (!primaryPick) return null;
              const ev = primaryPick.event;
              const linkedScorerMatch =
                group.scorerMatch ||
                (group.linkedMatchId ? matches.find(m => m.id === group.linkedMatchId) : undefined);
              const isLinked = Boolean(linkedScorerMatch);
              const hasSavedUrl = Boolean(group.liveMatchUrl && group.liveMatchUrl.trim());
              const linkedSt = linkedScorerMatch ? extractScorerMatchScoreState(linkedScorerMatch) : null;
              const periodType = primaryPick.periodType;
              const isAddingThisLink = addingLinkForEventId === ev.id;
              const allWon = group.visiblePicks.length > 0 && group.visiblePicks.every(p => p.status === 'Win');
              const anyLost = group.visiblePicks.some(p => p.status === 'Lost');

              return (
                <div
                  key={group.groupKey}
                  onClick={() => {
                    if (linkedScorerMatch && onSelectScorerMatch) {
                      onSelectScorerMatch(linkedScorerMatch.id);
                    }
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all text-xs ${
                    allWon
                      ? 'bg-emerald-950/45 border-emerald-500/60 text-emerald-100'
                      : anyLost
                      ? 'bg-rose-950/45 border-rose-500/60 text-rose-100'
                      : 'bg-slate-950/85 border-slate-800 text-slate-100'
                  }`}
                >
                  {/* Top Row: Match Name + Merged Badge + HT/FT Badge + Scorer Section Badge + Link/Unlink Button + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {(() => {
                        const rawUrl = (group.liveMatchUrl || linkedScorerMatch?.liveMatchUrl || ev.liveMatchUrl || '').trim();
                        const directHref =
                          unwrapRedirectUrl(rawUrl) ||
                          (/^https?:\/\//i.test(rawUrl)
                            ? rawUrl
                            : `https://www.google.com/search?q=${encodeURIComponent(`${group.team1} vs ${group.team2} live score`)}`);
                        const isFb =
                          linkedScorerMatch?.sport === 'football' ||
                          String(ev.sport || '').toLowerCase() === 'football' ||
                          rawUrl.toLowerCase().includes('sofascore');
                        return (
                          <a
                            href={directHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={lang === 'bn' ? 'সোর্স লিংক ওপেন করুন' : 'Open Source Link'}
                            className="text-xs hover:scale-110 transition-transform cursor-pointer shrink-0"
                          >
                            {isFb ? '⚽' : '🏏'}
                          </a>
                        );
                      })()}
                      <span className="font-black text-white truncate">{group.matchTitle}</span>
                      {group.visiblePicks.length > 1 && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 text-[9px] font-black shrink-0">
                          {lang === 'bn' ? `🔀 ${group.visiblePicks.length} স্লিপ মার্জড` : `🔀 ${group.visiblePicks.length} Slips Merged`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleToggleEventPeriodHTFT(ev, e)}
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border shrink-0 cursor-pointer ${
                          periodType === 'HT'
                            ? 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                            : 'bg-indigo-500/25 text-indigo-300 border-indigo-400/50'
                        }`}
                        title={lang === 'bn' ? 'ক্লিক করে HT / FT পরিবর্তন করুন' : 'Click to toggle HT / FT'}
                      >
                        {periodType}
                      </button>
                      {linkedSt && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border shrink-0 ${
                            linkedSt.isFinished
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : linkedSt.isUpcoming
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                          title={lang === 'bn' ? 'স্কোরার সেকশনে এই ম্যাচের বর্তমান তালিকা' : 'Current list in Scorer section'}
                        >
                          {linkedSt.isFinished
                            ? (lang === 'bn' ? '🏁 ফিনিশ' : '🏁 Finished')
                            : linkedSt.isUpcoming
                            ? (lang === 'bn' ? '⏰ আপকামিং' : '⏰ Upcoming')
                            : (lang === 'bn' ? '🔴 লাইভ' : '🔴 Live')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Search Icon -> Generate Crex/Sofascore Link -> Click to Copy & Reset */}
                      {renderEventSearchLinkButton(ev)}

                      {/* + Icon / Re-link to add link, or Unlink button once link is added */}
                      {isLinked ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLinkEventToScorerMatch(ev.id, '');
                          }}
                          className="px-2 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-[10px] font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                          title={lang === 'bn' ? 'আনলিংক করলে Scorer থেকে বাদ হবে (লিংক সংরক্ষিত থাকবে)' : 'Unlink from Scorer (preserves saved URL)'}
                        >
                          <Unlink size={11} />
                          <span>{lang === 'bn' ? 'আনলিংক' : 'Unlink'}</span>
                        </button>
                      ) : (
                        <>
                          {hasSavedUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (group.liveMatchUrl) {
                                  handleLinkEventToScorerMatch(ev.id, group.liveMatchUrl.trim());
                                }
                              }}
                              className="px-2 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
                              title={lang === 'bn' ? `সংরক্ষিত লিংক পুনরায় যুক্ত করুন: ${group.liveMatchUrl}` : `Re-attach saved link: ${group.liveMatchUrl}`}
                            >
                              <Link2 size={11} />
                              <span>{lang === 'bn' ? 'লিংক করুন' : 'Re-link'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddingLinkForEventId(prev => prev === ev.id ? null : ev.id);
                              setEventLinkInputVal(group.liveMatchUrl || '');
                            }}
                            className="w-6 h-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer active:scale-95"
                            title={lang === 'bn' ? 'লিংক যুক্ত বা এডিট করুন (+)' : 'Add or Edit Link (+)'}
                          >
                            <Plus size={13} />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          for (const p of group.picks) {
                            handleRemoveEvent(p.eventId);
                          }
                        }}
                        className="w-6 h-6 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title={lang === 'bn' ? 'স্লিপ ও Scorer থেকে এই ইভেন্ট ডিলিট করুন' : 'Delete event from slip & Scorer'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Date/Time | Manual Score Inputs (synced across all merged slips for this match) */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
                  >
                    <span className="text-slate-300 text-[10px]">
                      {ev.liveProgressText || `📅 ${group.dateTime} • ${periodType}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 font-sans font-bold">
                        {lang === 'bn' ? 'স্কোর:' : 'Score:'}
                      </span>
                      <input
                        type="text"
                        value={ev.score1 || ''}
                        onChange={e => handleUpdateEvent(ev.id, { score1: e.target.value }, true)}
                        placeholder="0"
                        className="w-10 h-6 px-1 text-center text-[11px] font-mono font-bold rounded bg-slate-900 border border-slate-700 focus:border-amber-400 text-amber-300 outline-none"
                        title={lang === 'bn' ? 'টিম ১ ম্যানুয়াল স্কোর' : 'Team 1 Manual Score'}
                      />
                      <span className="text-slate-400 font-bold">-</span>
                      <input
                        type="text"
                        value={ev.score2 || ''}
                        onChange={e => handleUpdateEvent(ev.id, { score2: e.target.value }, true)}
                        placeholder="0"
                        className="w-10 h-6 px-1 text-center text-[11px] font-mono font-bold rounded bg-slate-900 border border-slate-700 focus:border-amber-400 text-amber-300 outline-none"
                        title={lang === 'bn' ? 'টিম ২ ম্যানুয়াল স্কোর' : 'Team 2 Manual Score'}
                      />
                      <span className="text-[9px] text-slate-400">({ev.currentPeriodLabel || periodType})</span>
                    </div>
                  </div>

                  {/* Per-Slip Selections & Odds + Manual Win / Pending / Lost Buttons */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex flex-col gap-1 pt-1 border-t border-white/5"
                  >
                    {group.visiblePicks.map(pick => (
                      <div
                        key={pick.eventId}
                        className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono bg-slate-900/70 px-2 py-1 rounded-lg border border-white/5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-[9px] font-black shrink-0">
                            {lang === 'bn' ? `স্লিপ #${pick.cardIndex}` : `Slip #${pick.cardIndex}`}
                          </span>
                          <span className="text-cyan-300 font-black">
                            {lang === 'bn' ? 'সিলেকশন:' : 'Pick:'} {pick.formattedSelection}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-[9px]">
                            @{pick.odds}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 font-sans">
                          <button
                            type="button"
                            onClick={() => handleUpdateEvent(pick.eventId, { status: 'Win', autoSettleResult: false }, false)}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border cursor-pointer transition-all ${
                              pick.status === 'Win'
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                                : 'bg-slate-900 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950'
                            }`}
                          >
                            ✓ Win
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateEvent(pick.eventId, { status: 'Pending', autoSettleResult: false }, false)}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border cursor-pointer transition-all ${
                              pick.status === 'Pending'
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                                : 'bg-slate-900 text-amber-300 border-amber-500/30 hover:bg-amber-950'
                            }`}
                          >
                            ⏳ Pending
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateEvent(pick.eventId, { status: 'Lost', autoSettleResult: false }, false)}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border cursor-pointer transition-all ${
                              pick.status === 'Lost'
                                ? 'bg-rose-500 text-white border-rose-400 shadow-xs'
                                : 'bg-slate-900 text-rose-300 border-rose-500/30 hover:bg-rose-950'
                            }`}
                          >
                            ✕ Lost
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inline Link Input Box when + icon is clicked */}
                  {isAddingThisLink && !isLinked && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="mt-1 pt-2 border-t border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        {renderEventSearchLinkButton(ev)}
                        <input
                          type="text"
                          value={eventLinkInputVal}
                          onChange={e => setEventLinkInputVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && eventLinkInputVal.trim()) {
                              handleLinkEventToScorerMatch(ev.id, eventLinkInputVal.trim());
                            }
                          }}
                          placeholder={lang === 'bn' ? 'ম্যাচের লাইভ লিংক পেস্ট করুন (Sofascore / CREX)...' : 'Paste Live Match URL (Sofascore / CREX)...'}
                          className="flex-1 h-7 px-2 text-[11px] rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-indigo-400"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (eventLinkInputVal.trim()) {
                              handleLinkEventToScorerMatch(ev.id, eventLinkInputVal.trim());
                            }
                          }}
                          className="px-2.5 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black shrink-0 cursor-pointer"
                        >
                          {lang === 'bn' ? 'লিংক' : 'Link'}
                        </button>
                      </div>
                      {matches.length > 0 && (
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value) {
                              handleLinkEventToScorerMatch(ev.id, e.target.value);
                            }
                          }}
                          className="w-full h-7 px-2 text-[10px] font-bold rounded-lg bg-slate-900 border border-slate-700 text-slate-300"
                        >
                          <option value="">{lang === 'bn' ? '-- অথবা স্কোরারের ম্যাচ সিলেক্ট করুন --' : '-- Or select a Scorer match --'}</option>
                          {matches.map((m, idx) => {
                            const st = extractScorerMatchScoreState(m);
                            return (
                              <option key={m.id} value={m.id}>
                                #{idx + 1} {st.team1Name} vs {st.team2Name} ({st.isUpcoming ? (lang === 'bn' ? 'আপকামিং' : 'Upcoming') : `${st.score1Display || '0'} - ${st.score2Display || '0'}`})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <span>{lang === 'bn' ? 'এডিট ও লিংকআপ' : 'Edit & Link-Up'}</span>
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
              {lang === 'bn' ? 'স্লিপ প্রিভিউ' : 'View Preview'}
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
                {sortedEvents.filter(e => !e.hidden && (showSettledInDashboard || !isBetEventSettled(e))).length === 0 &&
                sortedEvents.some(e => !e.hidden && isBetEventSettled(e)) ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center bg-slate-50">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {lang === 'bn'
                            ? 'এই স্লিপের Win/Lost ইভেন্টগুলো সরাসরি Google Drive-এ ব্যাকআপ হয়ে হাইড রয়েছে।'
                            : 'Win/Lost events of this slip are backed up to Google Drive and hidden.'}
                        </span>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowSettledInDashboard(true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>{lang === 'bn' ? 'হাইড করা Win/Lost দেখুন' : 'Show Hidden Win/Lost'}</span>
                          </button>
                          {onOpenDriveBackupModal && (
                            <button
                              type="button"
                              onClick={() => onOpenDriveBackupModal()}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Cloud size={13} />
                              <span>{lang === 'bn' ? 'ড্রাইভ ব্যাকআপ খুলুন' : 'Open Drive Backup'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {sortedEvents
                  .filter(e => !e.hidden && (showSettledInDashboard || !isBetEventSettled(e)))
                  .map((ev) => {
                  const periodType = resolveEventPeriodType(ev);
                  const displayPeriodTag = ev.currentPeriodLabel === 'HT' || periodType === 'HT' ? 'HT' : 'FT';

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
                        <div className="font-bold text-black flex items-center justify-between gap-1">
                          <span>{ev.match}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {renderEventSearchLinkButton(ev, true)}
                            <span
                              onClick={() => handleToggleEventPeriodHTFT(ev)}
                              className="text-[9px] font-black uppercase px-1 py-0.2 rounded border border-black/40 bg-slate-100 text-black shrink-0 cursor-pointer select-none"
                              title={lang === 'bn' ? 'HT / FT নির্দেশক (ক্লিক করে পরিবর্তন করুন)' : 'HT / FT Indicator (Click to toggle)'}
                            >
                              {displayPeriodTag}
                            </span>
                          </div>
                        </div>
                        {ev.league && (
                          <div className="text-[10px] text-slate-700">{ev.league}</div>
                        )}
                        {(ev.score1 || ev.score2) && (
                          <div className="text-[10px] font-black text-slate-900 mt-1 inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                            <span>{displayPeriodTag}:</span>
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
                <span className="font-mono font-bold">
                  {formatCardAmountWithCurrency(slip.stake, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-black/30">
                <span className="font-bold">Potential winnings:</span>
                <span className="font-mono font-bold text-sm text-black">
                  {formatCardAmountWithCurrency(slip.potentialWinnings, currencySymbol)}
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
                  onChange={e => updateActiveSlip(prev => ({ ...prev, slipNumber: e.target.value }))}
                  className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'তারিখ ও সময় (Date / Time)' : 'Date & Time'}
                </label>
                <input
                  type="text"
                  value={slip.dateTime}
                  onChange={e => updateActiveSlip(prev => ({ ...prev, dateTime: e.target.value }))}
                  placeholder="21.04 08:25 AM"
                  className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'বেট টাইপ (Bet Type)' : 'Bet Type'}
                </label>
                <input
                  type="text"
                  value={slip.betType}
                  onChange={e => updateActiveSlip(prev => ({ ...prev, betType: e.target.value }))}
                  className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  {lang === 'bn' ? 'কারেন্সি' : 'Currency'}
                </label>
                <select
                  value={currencySymbol}
                  onChange={e => setCurrencySymbol(e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    updateActiveSlip(prev => ({ ...prev, stake: val, potentialWinnings: isNaN(parseFloat(pot)) ? '0.00' : pot }));
                  }}
                  className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    updateActiveSlip(prev => ({ ...prev, overallOdds: val, potentialWinnings: pot }));
                  }}
                  className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    ? '+ আইকনে ক্লিক করে লিংক যুক্ত করলে অটো স্কোর ও জয়/হার আপডেট হবে' 
                    : 'Click + on any event to attach link for auto score & Win/Loss'}
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

            {/* SECTION 2: COMPLETED EVENTS (BOTTOM: WIN, LOST, CANCEL) - Hidden from main dashboard by default */}
            {completedEvents.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Cloud size={12} className="text-emerald-600" />
                    {lang === 'bn' 
                      ? `Win/Lost সম্পন্ন ইভেন্ট (${completedEvents.length}) • ড্রাইভে ব্যাকআপকৃত` 
                      : `Win/Lost Settled Events (${completedEvents.length}) • Backed up to Drive`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSettledInDashboard(prev => !prev)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    {showSettledInDashboard
                      ? (lang === 'bn' ? 'ড্যাশবোর্ড থেকে হাইড করুন' : 'Hide from Dashboard')
                      : (lang === 'bn' ? 'হাইড করা ইভেন্ট দেখুন' : 'Show Hidden Events')}
                  </button>
                </div>

                {showSettledInDashboard && (
                  <div className="flex flex-col gap-2.5">
                    {completedEvents.map((ev, index) => renderEditEventItem(ev, pendingEvents.length + index, 'completed'))}
                  </div>
                )}
              </div>
            )}
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
