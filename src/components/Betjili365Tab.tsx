import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Search,
  Zap,
  Globe,
  Copy,
  Check,
  Radio,
  Code2,
  Link2,
  Plus,
  Activity,
  ShieldCheck,
  Clock,
  Receipt,
  UserCheck,
  LogOut,
  Wallet,
  Gift,
  Trophy,
  Gamepad2,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { toast } from 'sonner';

export interface BetjiliOddsPair {
  back: number;
  lay: number;
}

export interface BetjiliExtendedOutcome {
  id: string;
  label: string;
  odds: number;
  side: 'back' | 'lay';
  ruleType?: string;
  targetValue?: number;
}

export interface BetjiliExtendedMarket {
  key: string;
  titleBn: string;
  outcomes: BetjiliExtendedOutcome[];
}

export interface BetjiliFeedEvent {
  id: string;
  sport: 'cricket' | 'football';
  sportLabelBn: string;
  league: string;
  team1: string;
  team2: string;
  team1Full: string;
  team2Full: string;
  status: 'live' | 'upcoming' | 'finished';
  statusLabelBn: string;
  statusText: string;
  score1: string;
  score2: string;
  overs?: number;
  minute?: string;
  startTime: string;
  betjiliUrl: string;
  liveSyncUrl: string;
  markets: {
    matchOdds: {
      home: BetjiliOddsPair;
      draw?: BetjiliOddsPair;
      away: BetjiliOddsPair;
    };
    fancyMarket?: {
      titleBn: string;
      line: string;
      overOdds: number;
      underOdds: number;
    };
    extendedMarkets?: BetjiliExtendedMarket[];
  };
}

export interface BetjiliApiResponse {
  success: boolean;
  provider: string;
  sourceUrl: string;
  locale: string;
  currency: string;
  upstreamProbe?: {
    targetUrl: string;
    httpStatus: number;
    reachable: boolean;
    cloudflareProtected: boolean;
    pageTitle?: string;
    latencyMs?: number;
    checkedAt: string;
  };
  responseTimeMs?: number;
  lastUpdated?: string;
  summary?: {
    total: number;
    filtered: number;
    liveCount: number;
    upcomingCount: number;
    cricketCount: number;
    footballCount: number;
  };
  events: BetjiliFeedEvent[];
  error?: string;
}

interface BetjiliUserProfile {
  id: string;
  username: string;
  phone: string;
  displayName: string;
  balanceBdt: number;
  vipLevel: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  vipPoints: number;
  claimedBonuses: string[];
  totalWagered: number;
  totalWon: number;
  createdAt: string;
}

interface SlipSelection {
  uid: string;
  event: BetjiliFeedEvent;
  marketName: string;
  selectionLabel: string;
  odds: number;
  side: 'back' | 'lay';
  ruleType: string;
  targetValue?: number;
}

interface BetTicket {
  id: string;
  betType: 'single' | 'multi';
  selections: Array<{
    eventId: string;
    matchTitle: string;
    sport: string;
    marketName: string;
    selectionLabel: string;
    side: string;
    odds: number;
  }>;
  stake: number;
  combinedOdds: number;
  potentialPayout: number;
  cashoutOffer: number;
  status: 'open' | 'won' | 'lost' | 'cashed_out';
  payout: number;
  createdAt: string;
}

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  method: string;
  note: string;
  balanceAfter: number;
  createdAt: string;
}

interface Betjili365TabProps {
  lang?: 'bn' | 'en';
  openWebsiteNonce?: number;
  onSyncMatchToScorer: (ev: BetjiliFeedEvent) => void;
  onAddSelectionToBetSlip: (ev: BetjiliFeedEvent, selectionLabel: string, odds: number, betRuleType: string, targetValue?: number) => void;
  onSyncCustomUrl: (payload: { url: string; team1: string; team2: string; sport: 'cricket' | 'football' }) => void;
}

const TARGET_WEBSITE_URL = 'https://betjili365.com/bd/bn';
const STORAGE_TOKEN_KEY = 'betjili365_api_session_token_v1';

export const Betjili365Tab: React.FC<Betjili365TabProps> = ({
  lang = 'bn',
  openWebsiteNonce = 0,
  onSyncMatchToScorer,
  onAddSelectionToBetSlip,
  onSyncCustomUrl
}) => {
  const [innerTab, setInnerTab] = useState<'website' | 'markets' | 'casino' | 'wallet' | 'history' | 'url-sync' | 'api'>('website');
  const [browserUrl, setBrowserUrl] = useState<string>(TARGET_WEBSITE_URL);
  const [browserFrameKey, setBrowserFrameKey] = useState<number>(1);
  const [sportFilter, setSportFilter] = useState<'all' | 'cricket' | 'football'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [feedData, setFeedData] = useState<BetjiliApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedMatchIds, setExpandedMatchIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (openWebsiteNonce > 0) {
      setInnerTab('website');
      setBrowserUrl(TARGET_WEBSITE_URL);
      setBrowserFrameKey((k) => k + 1);
    }
  }, [openWebsiteNonce]);

  // Auth & Account State
  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [user, setUser] = useState<BetjiliUserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  // Interactive API Bet Slip State
  const [slipSelections, setSlipSelections] = useState<SlipSelection[]>([]);
  const [slipBetType, setSlipBetType] = useState<'single' | 'multi'>('single');
  const [slipStake, setSlipStake] = useState<string>('100');
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Bets History & Wallet State
  const [myBets, setMyBets] = useState<BetTicket[]>([]);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [betFilterStatus, setBetFilterStatus] = useState<'all' | 'open' | 'won' | 'lost' | 'cashed_out'>('all');
  const [walletAmount, setWalletAmount] = useState('1000');
  const [walletMethod, setWalletMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [isWalletBusy, setIsWalletBusy] = useState(false);

  // Mini Casino State
  const [gameStake, setGameStake] = useState('100');
  const [aviatorTarget, setAviatorTarget] = useState('2.0');
  const [dicePick, setDicePick] = useState<'down' | '7' | 'up'>('up');
  const [coinPick, setCoinPick] = useState<'heads' | 'tails'>('heads');
  const [isGameBusy, setIsGameBusy] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<{ won: boolean; detail: string; payout: number; game: string } | null>(null);

  // URL Sync sub-tab state
  const [customUrlInput, setCustomUrlInput] = useState(TARGET_WEBSITE_URL);
  const [customTeam1, setCustomTeam1] = useState('');
  const [customTeam2, setCustomTeam2] = useState('');
  const [customSport, setCustomSport] = useState<'cricket' | 'football'>('cricket');
  const [isSyncingUrl, setIsSyncingUrl] = useState(false);
  const [syncedUrlResult, setSyncedUrlResult] = useState<any>(null);

  const persistToken = (newTok: string) => {
    setToken(newTok);
    try {
      if (newTok) localStorage.setItem(STORAGE_TOKEN_KEY, newTok);
      else localStorage.removeItem(STORAGE_TOKEN_KEY);
    } catch {}
  };

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (sportFilter !== 'all') params.set('sport', sportFilter);
      if (statusFilter !== 'all') params.set('filter', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/betjili365/feed?${params.toString()}`);
      const json: BetjiliApiResponse = await res.json();
      setFeedData(json);
    } catch {
      if (!silent) {
        toast.error(lang === 'bn' ? 'Betjili365 API লোড করতে ব্যর্থ হয়েছে' : 'Failed to load Betjili365 API');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [sportFilter, statusFilter, searchQuery, lang]);

  const fetchAccountData = useCallback(async (activeTok: string) => {
    if (!activeTok) return;
    try {
      const headers = { Authorization: `Bearer ${activeTok}` };
      const [meRes, betsRes, txRes] = await Promise.all([
        fetch('/api/betjili365/auth/me', { headers }),
        fetch('/api/betjili365/bets', { headers }),
        fetch('/api/betjili365/wallet/transactions', { headers })
      ]);

      if (meRes.status === 401) {
        persistToken('');
        setUser(null);
        return;
      }
      const meJson = await meRes.json();
      if (meJson.success && meJson.user) {
        setUser(meJson.user);
      }
      if (betsRes.ok) {
        const bJson = await betsRes.json();
        if (bJson.success) setMyBets(bJson.bets || []);
      }
      if (txRes.ok) {
        const tJson = await txRes.json();
        if (tJson.success) setWalletTxs(tJson.transactions || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  useEffect(() => {
    if (token) {
      fetchAccountData(token);
    }
  }, [token, fetchAccountData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      fetchFeed(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, fetchFeed]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(lang === 'bn' ? 'কপি সম্পন্ন হয়েছে!' : 'Copied!');
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error(lang === 'bn' ? 'কপি করা যায়নি' : 'Copy failed');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthBusy(true);
    try {
      const endpoint = authMode === 'register' ? '/api/betjili365/auth/register' : '/api/betjili365/auth/login';
      const body =
        authMode === 'register'
          ? {
              username: authUsername.trim(),
              phone: authPhone.trim(),
              displayName: authDisplayName.trim() || authUsername.trim(),
              password: authPassword
            }
          : {
              username: authUsername.trim(),
              password: authPassword
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'অথেনটিকেশন ব্যর্থ হয়েছে');
        return;
      }

      persistToken(json.token);
      setUser(json.user);
      setShowAuthModal(false);
      setAuthPassword('');
      toast.success(
        authMode === 'register'
          ? 'নতুন API অ্যাকাউন্ট তৈরি হয়েছে (৳৫,০০০ ভার্চুয়াল ব্যালেন্সসহ)!'
          : `স্বাগতম ${json.user.displayName}!`
      );
      fetchAccountData(json.token);
    } catch {
      toast.error('সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/betjili365/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    persistToken('');
    setUser(null);
    setMyBets([]);
    setWalletTxs([]);
    toast.success('লগআউট সম্পন্ন হয়েছে');
  };

  const addToApiSlip = (
    ev: BetjiliFeedEvent,
    marketName: string,
    selectionLabel: string,
    odds: number,
    side: 'back' | 'lay' = 'back',
    ruleType = 'auto',
    targetValue?: number
  ) => {
    const uid = `${ev.id}::${marketName}::${selectionLabel}`;
    setSlipSelections((prev) => {
      if (prev.some((s) => s.uid === uid)) {
        toast.info('এই অপশনটি ইতিমধ্যে স্লিপে রয়েছে');
        return prev;
      }
      const next = [...prev, { uid, event: ev, marketName, selectionLabel, odds, side, ruleType, targetValue }];
      if (next.length > 1) setSlipBetType('multi');
      return next;
    });
    setIsSlipOpen(true);
    toast.success(`${ev.team1} vs ${ev.team2}: ${selectionLabel} @ ${odds.toFixed(2)} যোগ হয়েছে`);
  };

  const handlePlaceApiBet = async () => {
    if (!token || !user) {
      setShowAuthModal(true);
      toast.info('বেট প্লেস করতে প্রথমে API অ্যাকাউন্টে লগইন বা রেজিস্টার করুন');
      return;
    }
    if (slipSelections.length === 0) return;

    const stakeNum = Number(slipStake);
    if (!Number.isFinite(stakeNum) || stakeNum < 10) {
      toast.error('সর্বনিম্ন বেট ৳১০');
      return;
    }

    setIsPlacingBet(true);
    try {
      const payload = {
        betType: slipSelections.length > 1 && slipBetType === 'multi' ? 'multi' : 'single',
        stake: stakeNum,
        selections: slipSelections.map((s) => ({
          eventId: s.event.id,
          matchTitle: `${s.event.team1} vs ${s.event.team2}`,
          sport: s.event.sport,
          marketName: s.marketName,
          selectionLabel: s.selectionLabel,
          side: s.side,
          odds: s.odds
        }))
      };

      const res = await fetch('/api/betjili365/bets/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'বেট প্লেস ব্যর্থ হয়েছে');
        return;
      }
      setUser(json.user);
      setSlipSelections([]);
      setIsSlipOpen(false);
      toast.success(`বেট প্লেস সম্পন্ন! টিকিট #${json.ticket.id} (সম্ভাব্য রিটার্ন: ৳${json.ticket.potentialPayout})`);
      fetchAccountData(token);
    } catch {
      toast.error('বেট API কল ব্যর্থ হয়েছে');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleWalletAction = async (action: 'deposit' | 'withdraw' | 'claim_bonus', bonusId?: string) => {
    if (!token || !user) {
      setShowAuthModal(true);
      return;
    }
    setIsWalletBusy(true);
    try {
      const res = await fetch('/api/betjili365/wallet/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          amount: Number(walletAmount),
          method: walletMethod,
          bonusId
        })
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'অ্যাকশন ব্যর্থ হয়েছে');
        return;
      }
      setUser(json.user);
      toast.success(json.message || 'সফল হয়েছে');
      fetchAccountData(token);
    } catch {
      toast.error('ওয়ালেট API সংযোগ ব্যর্থ');
    } finally {
      setIsWalletBusy(false);
    }
  };

  const handleBetAction = async (ticketId: string, action: 'cashout' | 'settle', outcome?: 'auto' | 'won' | 'lost') => {
    if (!token) return;
    try {
      const url = action === 'cashout' ? '/api/betjili365/bets/cashout' : '/api/betjili365/bets/settle';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ticketId, outcome })
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'অ্যাকশন ব্যর্থ হয়েছে');
        return;
      }
      setUser(json.user);
      toast.success(
        action === 'cashout'
          ? `ক্যাশআউট সম্পন্ন: +৳${json.ticket.payout}`
          : json.ticket.status === 'won'
          ? `অভিনন্দন! টিকিট ${ticketId} জিতেছেন (+৳${json.ticket.payout})`
          : `টিকিট ${ticketId} সেটল হয়েছে (Lost)`
      );
      fetchAccountData(token);
    } catch {
      toast.error('বেট আপডেট ব্যর্থ হয়েছে');
    }
  };

  const handlePlayMiniGame = async (game: 'aviator_crash' | 'dice_7up' | 'lucky_spin' | 'coin_toss') => {
    if (!token || !user) {
      setShowAuthModal(true);
      toast.info('গেম খেলতে প্রথমে API অ্যাকাউন্টে লগইন করুন');
      return;
    }
    setIsGameBusy(true);
    try {
      const res = await fetch('/api/betjili365/games/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          game,
          stake: Number(gameStake),
          targetMultiplier: Number(aviatorTarget),
          pick: game === 'dice_7up' ? dicePick : game === 'coin_toss' ? coinPick : undefined
        })
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'গেম খেলা যায়নি');
        return;
      }
      setUser(json.user);
      setLastGameResult({
        won: json.won,
        detail: json.resultDetail,
        payout: json.payout,
        game
      });
      if (json.payout > 0) {
        toast.success(`${json.resultDetail} — জিতেছেন ৳${json.payout}!`);
      } else {
        toast.error(`${json.resultDetail}`);
      }
      fetchAccountData(token);
    } catch {
      toast.error('গেম API ব্যর্থ হয়েছে');
    } finally {
      setIsGameBusy(false);
    }
  };

  const handleSyncCustomBetjiliUrl = async () => {
    const cleanUrl = customUrlInput.trim() || TARGET_WEBSITE_URL;
    setIsSyncingUrl(true);
    try {
      const res = await fetch('/api/betjili365/sync-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          team1: customTeam1.trim(),
          team2: customTeam2.trim(),
          sport: customSport
        })
      });
      const json = await res.json();
      setSyncedUrlResult(json);
      if (json.success) {
        toast.success(lang === 'bn' ? 'Betjili365 লিংক API থেকে তথ্য পাওয়া গেছে!' : 'Synced via Betjili365 API!');
      } else {
        toast.error(json.error || 'Sync failed');
      }
    } catch {
      toast.error(lang === 'bn' ? 'সার্ভারের সাথে সংযোগ ব্যর্থ' : 'Failed to reach API');
    } finally {
      setIsSyncingUrl(false);
    }
  };

  const apiOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const activeFeedEndpoint = `/api/betjili365/feed?sport=${sportFilter}&filter=${statusFilter}${searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''}`;
  const events = feedData?.events || [];

  const combinedSlipOdds = Number(
    slipSelections
      .reduce((acc, s) => (slipBetType === 'multi' ? acc * s.odds : Math.max(acc, s.odds)), slipBetType === 'multi' ? 1 : 0)
      .toFixed(2)
  );
  const effectiveOdds = slipSelections.length === 1 ? slipSelections[0].odds : slipBetType === 'multi' ? combinedSlipOdds : slipSelections[0]?.odds || 1;
  const potentialReturn = Number(((Number(slipStake) || 0) * effectiveOdds).toFixed(2));

  const openBetsCount = myBets.filter((b) => b.status === 'open').length;

  return (
    <div className="p-3 sm:p-5 max-w-6xl mx-auto w-full space-y-4 pb-24 md:pb-8">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 text-white shadow-2xl space-y-4">
        {/* Header Bar with Account Login / Balance */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-600/25 text-lg shrink-0">
              BJ
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-xl font-black tracking-wide text-white">
                  Betjili365 <span className="text-amber-400">BD/BN</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Full Sportsbook &amp; API</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                {TARGET_WEBSITE_URL}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Account Pill / Login Button */}
            {user ? (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-amber-500/40 rounded-2xl px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black">
                    {user.vipLevel}
                  </span>
                  <span className="text-xs font-black text-white">{user.displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInnerTab('wallet')}
                  className="text-xs font-mono font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer px-1"
                  title="ওয়ালেট ও ডিপোজিট"
                >
                  <Wallet size={13} />
                  <span>৳{user.balanceBdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 cursor-pointer"
                  title="লগআউট"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <UserCheck size={14} />
                <span>API লগইন / রেজিস্টার</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSlipOpen((p) => !p)}
              className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 cursor-pointer transition-all ${
                slipSelections.length > 0
                  ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Receipt size={13} />
              <span>বেট স্লিপ ({slipSelections.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoRefresh((p) => !p)}
              className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Radio size={12} className={autoRefresh ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{autoRefresh ? 'অটো ১৫স' : 'অফ'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchFeed(false)}
              disabled={isLoading}
              className="p-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 cursor-pointer"
              title="রিফ্রেশ"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-400' : ''} />
            </button>

            <a
              href={TARGET_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-allow-external="true"
              className="px-3 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 flex items-center gap-1.5 no-underline shadow-md"
            >
              <ExternalLink size={13} />
              <span>অফিশিয়াল সাইট</span>
            </a>
          </div>
        </div>

        {/* Transparent Scope Notice */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-[11px] text-amber-200 leading-relaxed">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300">API ও অ্যাকাউন্ট নির্দেশিকা:</strong>{' '}
            অফিশিয়াল <code className="text-white">betjili365.com</code> Cloudflare সুরক্ষিত এবং কোনো পাবলিক থার্ড-পার্টি লগইন/বেটিং API দেয় না। তাই এখানে আপনি আমাদের{' '}
            <strong>নিজস্ব Betjili365-স্টাইল API ও ভার্চুয়াল BDT ওয়ালেট (৳৫,০০০ ফ্রি বোনাসসহ)</strong> ব্যবহার করে লগইন, সমস্ত স্পোর্টস/এক্সচেঞ্জ অপশনে বেট, ক্যাশআউট ও মিনি-গেম খেলতে পারবেন।{' '}
            <span className="text-rose-300 font-bold">আপনার আসল betjili365.com পাসওয়ার্ড এখানে দিবেন না; আসল টাকায় খেলার জন্য উপরের &quot;অফিশিয়াল সাইট&quot; বাটন ব্যবহার করুন।</span>
          </div>
        </div>

        {/* Primary Feature Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3">
          {[
            { id: 'website', icon: <Globe size={14} />, label: 'সরাসরি ওয়েবসাইট', activeCls: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30' },
            { id: 'markets', icon: <Activity size={14} />, label: 'স্পোর্টস ও এক্সচেঞ্জ (সব অপশন)', activeCls: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' },
            { id: 'casino', icon: <Gamepad2 size={14} />, label: 'ক্যাসিনো ও মিনি গেমস', activeCls: 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30' },
            { id: 'wallet', icon: <Wallet size={14} />, label: 'ওয়ালেট ও প্রমোশন', activeCls: 'bg-amber-600 text-white shadow-md shadow-amber-600/30' },
            { id: 'history', icon: <Trophy size={14} />, label: `আমার বেট (${openBetsCount})`, activeCls: 'bg-sky-600 text-white shadow-md shadow-sky-600/30' },
            { id: 'url-sync', icon: <Link2 size={14} />, label: 'URL সিঙ্ক', activeCls: 'bg-teal-600 text-white shadow-md shadow-teal-600/30' },
            { id: 'api', icon: <Code2 size={14} />, label: 'API ও JSON', activeCls: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInnerTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                innerTab === tab.id ? tab.activeCls : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ================================================================
            TAB 0: IN-APP BETJILI365 WEBSITE PORTAL & BROWSER LAUNCHER
           ================================================================ */}
        {innerTab === 'website' && (
          <div className="rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 shadow-2xl flex flex-col">
            {/* Browser Chrome & Address Bar */}
            <div className="bg-slate-900 border-b border-slate-800 p-2.5 sm:p-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-black text-emerald-300 shrink-0">
                  <span>🎰</span>
                  <span>betjili365.com/bd/bn</span>
                </div>

                <div className="flex-1 min-w-[180px] flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5">
                  <Globe size={13} className="text-emerald-400 shrink-0" />
                  <input
                    type="url"
                    value={browserUrl}
                    onChange={(e) => setBrowserUrl(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-mono text-white outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(browserUrl || TARGET_WEBSITE_URL, 'portal-url')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 hover:text-white cursor-pointer shrink-0"
                  >
                    {copiedKey === 'portal-url' ? 'কপি হয়েছে' : 'কপি'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBrowserUrl(TARGET_WEBSITE_URL);
                      setBrowserFrameKey((k) => k + 1);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
                  >
                    হোম
                  </button>
                </div>

                <a
                  href={browserUrl || TARGET_WEBSITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-allow-external="true"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 no-underline shadow-md shrink-0"
                >
                  <ExternalLink size={13} />
                  <span>নতুন ট্যাবে খুলুন ↗</span>
                </a>
              </div>

              {/* Quick Section URL Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {[
                  { label: '🏠 হোম', url: 'https://betjili365.com/bd/bn' },
                  { label: '🏏 স্পোর্টস', url: 'https://betjili365.com/bd/bn/sports' },
                  { label: '🃏 লাইভ ক্যাসিনো', url: 'https://betjili365.com/bd/bn/casino' },
                  { label: '🎰 স্লট', url: 'https://betjili365.com/bd/bn/slot' },
                  { label: '✈️ ক্র্যাশ', url: 'https://betjili365.com/bd/bn/crash' },
                  { label: '🎁 প্রমোশন', url: 'https://betjili365.com/bd/bn/promotion' },
                  { label: '🔑 লগইন', url: 'https://betjili365.com/bd/bn/member/login' }
                ].map((sec) => (
                  <button
                    key={sec.url}
                    type="button"
                    onClick={() => {
                      setBrowserUrl(sec.url);
                      setBrowserFrameKey((k) => k + 1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-all ${
                      browserUrl === sec.url
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-emerald-500/40'
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            {feedData?.upstreamProbe?.reachable ? (
              <iframe
                key={`proxy-${browserFrameKey}`}
                title="Betjili365 BD/BN Live Website"
                src={`/api/betjili365/web-proxy?url=${encodeURIComponent(browserUrl || TARGET_WEBSITE_URL)}`}
                className="w-full h-[520px] sm:h-[620px] border-0 bg-slate-950"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="p-4 sm:p-6 bg-gradient-to-b from-emerald-950/60 via-slate-950 to-slate-950 space-y-5">
                {/* Main Launch Hero */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-center space-y-3 shadow-xl">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-black text-sm">
                    <span>🎰</span>
                    <span>BETJILI365 • BD/BN</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    সরাসরি Betjili365.com/bd/bn ওয়েবসাইট ওপেন করুন
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
                    <code className="text-amber-300">betjili365.com</code> তাদের সার্ভার থেকে{' '}
                    <code className="text-rose-300">X-Frame-Options: SAMEORIGIN</code> ও Cloudflare সুরক্ষা দিয়ে রাখে—তাই কোনো অ্যাপের ভেতর সরাসরি ফ্রেম (iframe) লোড করলে ব্রাউজার ব্লক করে। নিচের বাটনে ক্লিক করে সরাসরি নতুন ট্যাবে আসল সাইটটি ওপেন করুন অথবা নিচে আমাদের অ্যাপের নিজস্ব বেটিং ও মিনি-গেম ব্যবহার করুন:
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <a
                      href={browserUrl || TARGET_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-allow-external="true"
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-black flex items-center gap-2 no-underline shadow-lg shadow-emerald-600/30"
                    >
                      <ExternalLink size={16} />
                      <span>সরাসরি নতুন ট্যাবে খুলুন ↗</span>
                    </a>

                    <a
                      href="https://betjili365.com/bd/bn/member/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-allow-external="true"
                      className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black flex items-center gap-1.5 no-underline shadow-md"
                    >
                      <UserCheck size={15} />
                      <span>অফিশিয়াল লগইন / সাইনআপ ↗</span>
                    </a>
                  </div>
                </div>

                {/* Direct Website Section Cards (top-level external links) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { icon: '🏠', title: 'মূল হোমপেজ', sub: '/bd/bn', url: 'https://betjili365.com/bd/bn' },
                    { icon: '🏏', title: 'ক্রিকেট এক্সচেঞ্জ', sub: '/bd/bn/sports', url: 'https://betjili365.com/bd/bn/sports' },
                    { icon: '🃏', title: 'লাইভ ক্যাসিনো', sub: '/bd/bn/casino', url: 'https://betjili365.com/bd/bn/casino' },
                    { icon: '🎰', title: 'স্লট গেমস', sub: '/bd/bn/slot', url: 'https://betjili365.com/bd/bn/slot' },
                    { icon: '✈️', title: 'ক্র্যাশ / Aviator', sub: '/bd/bn/crash', url: 'https://betjili365.com/bd/bn/crash' },
                    { icon: '🎣', title: 'ফিশিং গেম', sub: '/bd/bn/fishing', url: 'https://betjili365.com/bd/bn/fishing' },
                    { icon: '🎁', title: 'প্রমোশন ও বোনাস', sub: '/bd/bn/promotion', url: 'https://betjili365.com/bd/bn/promotion' },
                    { icon: '👑', title: 'VIP ক্লাব', sub: '/bd/bn/vip', url: 'https://betjili365.com/bd/bn/vip' }
                  ].map((card) => (
                    <a
                      key={card.url}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-allow-external="true"
                      className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center justify-between gap-2 no-underline group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{card.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white group-hover:text-emerald-300 truncate">{card.title}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{card.sub}</div>
                        </div>
                      </div>
                      <ExternalLink size={13} className="text-amber-400 shrink-0" />
                    </a>
                  ))}
                </div>

                {/* Built-in Interactive App Features Switcher */}
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 font-bold">
                    অথবা এই অ্যাপের ভেতরেই লাইভ স্পোর্টস অডস, এক্সচেঞ্জ বেটিং ও গেম ব্যবহার করুন:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setInnerTab('markets')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Activity size={13} />
                      <span>স্পোর্টস ও এক্সচেঞ্জ ({events.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInnerTab('casino')}
                      className="px-3 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Gamepad2 size={13} />
                      <span>মিনি ক্যাসিনো ও Aviator</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 1: SPORTS & EXCHANGE (ALL BETTING OPTIONS)
           ================================================================ */}
        {innerTab === 'markets' && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'সব খেলা' },
                  { id: 'cricket', label: '🏏 ক্রিকেট' },
                  { id: 'football', label: '⚽ ফুটবল' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSportFilter(item.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      sportFilter === item.id ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <span className="text-slate-700 mx-0.5">|</span>

                {[
                  { id: 'all', label: 'সব স্ট্যাটাস' },
                  { id: 'live', label: '🔴 লাইভ' },
                  { id: 'upcoming', label: '⏰ আসন্ন' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id as any)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      statusFilter === st.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="দলের নাম বা লিগ খুঁজুন..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {isLoading && events.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={22} className="animate-spin text-emerald-400" />
                <span>Betjili365 লাইভ API থেকে ম্যাচ ও সব অডস লোড হচ্ছে...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                নির্বাচিত ফিল্টারে কোনো ম্যাচ পাওয়া যায়নি।
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {events.map((ev) => {
                  const odds = ev.markets.matchOdds;
                  const fancy = ev.markets.fancyMarket;
                  const extended = ev.markets.extendedMarkets || [];
                  const isExpanded = !!expandedMatchIds[ev.id];

                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/85 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-3"
                    >
                      {/* Top Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{ev.sport === 'cricket' ? '🏏' : '⚽'}</span>
                          <span className="text-[11px] font-bold text-amber-300 truncate max-w-[260px]">{ev.league}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              ev.status === 'live'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                : ev.status === 'upcoming'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {ev.statusLabelBn}
                          </span>
                        </div>
                      </div>

                      {/* Teams & Exchange Back/Lay */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-5 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-white truncate">{ev.team1Full || ev.team1}</span>
                            <span className="text-sm font-mono font-black text-emerald-400 shrink-0">{ev.score1}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-white truncate">{ev.team2Full || ev.team2}</span>
                            <span className="text-sm font-mono font-black text-cyan-400 shrink-0">{ev.score2}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={11} />
                            <span className="truncate">{ev.statusText}</span>
                          </div>
                        </div>

                        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {/* Home Back/Lay */}
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 truncate text-center">1 ({ev.team1}) Back/Lay</div>
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => addToApiSlip(ev, 'Match Odds', `Back ${ev.team1}`, odds.home.back, 'back', 'w1')}
                                className="py-1.5 px-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/40 border border-sky-500/40 text-sky-200 font-mono text-xs font-black cursor-pointer"
                              >
                                {odds.home.back.toFixed(2)}
                              </button>
                              <button
                                type="button"
                                onClick={() => addToApiSlip(ev, 'Match Odds', `Lay ${ev.team1}`, odds.home.lay, 'lay', 'w2')}
                                className="py-1.5 px-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/40 text-rose-200 font-mono text-xs font-black cursor-pointer"
                              >
                                {odds.home.lay.toFixed(2)}
                              </button>
                            </div>
                          </div>

                          {/* Draw if Football */}
                          {odds.draw && (
                            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                              <div className="text-[10px] font-bold text-slate-400 text-center">X (ড্র) Back/Lay</div>
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() => addToApiSlip(ev, 'Match Odds', 'Back Draw (X)', odds.draw!.back, 'back', 'draw')}
                                  className="py-1.5 px-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/40 border border-sky-500/40 text-sky-200 font-mono text-xs font-black cursor-pointer"
                                >
                                  {odds.draw.back.toFixed(2)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addToApiSlip(ev, 'Match Odds', 'Lay Draw (X)', odds.draw!.lay, 'lay', 'auto')}
                                  className="py-1.5 px-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/40 text-rose-200 font-mono text-xs font-black cursor-pointer"
                                >
                                  {odds.draw.lay.toFixed(2)}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Away Back/Lay */}
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 truncate text-center">2 ({ev.team2}) Back/Lay</div>
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => addToApiSlip(ev, 'Match Odds', `Back ${ev.team2}`, odds.away.back, 'back', 'w2')}
                                className="py-1.5 px-1 rounded-lg bg-sky-500/25 hover:bg-sky-500/40 border border-sky-500/40 text-sky-200 font-mono text-xs font-black cursor-pointer"
                              >
                                {odds.away.back.toFixed(2)}
                              </button>
                              <button
                                type="button"
                                onClick={() => addToApiSlip(ev, 'Match Odds', `Lay ${ev.team2}`, odds.away.lay, 'lay', 'w1')}
                                className="py-1.5 px-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/40 text-rose-200 font-mono text-xs font-black cursor-pointer"
                              >
                                {odds.away.lay.toFixed(2)}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Fancy + Expand All Options + Sync */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        {fancy ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400 font-semibold">{fancy.titleBn}:</span>
                            <button
                              type="button"
                              onClick={() => addToApiSlip(ev, fancy.titleBn, `Over ${fancy.line}`, fancy.overOdds, 'back', 'total_over', parseFloat(fancy.line))}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono font-bold cursor-pointer"
                            >
                              Over {fancy.line} @ {fancy.overOdds}
                            </button>
                            <button
                              type="button"
                              onClick={() => addToApiSlip(ev, fancy.titleBn, `Under ${fancy.line}`, fancy.underOdds, 'back', 'total_under', parseFloat(fancy.line))}
                              className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono font-bold cursor-pointer"
                            >
                              Under {fancy.line} @ {fancy.underOdds}
                            </button>
                          </div>
                        ) : (
                          <span />
                        )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedMatchIds((p) => ({ ...p, [ev.id]: !p[ev.id] }))}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <span>সমস্ত মার্কেট ({extended.length})</span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => onSyncMatchToScorer(ev)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Zap size={12} />
                            <span>স্কোরারে</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onAddSelectionToBetSlip(ev, `W1 (${ev.team1})`, odds.home.back, 'w1')}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="মূল .score Bet Slip-এ পাঠান"
                          >
                            <Receipt size={12} />
                            <span>অ্যাপ স্লিপ</span>
                          </button>
                        </div>
                      </div>

                      {/* Expanded All Markets Drawer */}
                      {isExpanded && extended.length > 0 && (
                        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {extended.map((mkt) => (
                            <div key={mkt.key} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                              <div className="text-[11px] font-black text-amber-300">{mkt.titleBn}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {mkt.outcomes.map((out) => (
                                  <button
                                    key={out.id}
                                    type="button"
                                    onClick={() =>
                                      addToApiSlip(
                                        ev,
                                        mkt.titleBn,
                                        out.label,
                                        out.odds,
                                        out.side,
                                        out.ruleType || 'auto',
                                        out.targetValue
                                      )
                                    }
                                    className="flex-1 min-w-[110px] px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-emerald-600/25 border border-slate-700 hover:border-emerald-500/50 text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                                  >
                                    <span className="text-[11px] text-slate-200 font-semibold truncate">{out.label}</span>
                                    <span className="text-xs font-mono font-black text-emerald-400 shrink-0">{out.odds.toFixed(2)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 2: CASINO & VIRTUAL MINI-GAMES
           ================================================================ */}
        {innerTab === 'casino' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-fuchsia-500/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-fuchsia-300 flex items-center gap-1.5">
                  <Sparkles size={15} />
                  <span>ক্যাসিনো ও ইনস্ট্যান্ট মিনি গেমস (ভার্চুয়াল BDT API)</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  আপনার API অ্যাকাউন্টের ভার্চুয়াল BDT ব্যালেন্স দিয়ে সার্ভার-সাইড RNG গেম খেলুন।
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">বেট স্টেক (৳):</span>
                <input
                  type="number"
                  min={10}
                  max={25000}
                  value={gameStake}
                  onChange={(e) => setGameStake(e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-black text-amber-300 outline-none"
                />
              </div>
            </div>

            {lastGameResult && (
              <div
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                  lastGameResult.payout > 0
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                }`}
              >
                <span>{lastGameResult.detail}</span>
                <span className="font-mono font-black">
                  {lastGameResult.payout > 0 ? `+৳${lastGameResult.payout}` : '৳0'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Aviator Crash */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-rose-400">✈️ Aviator / ক্র্যাশ মাল্টিপ্লায়ার</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300">Max 50x</span>
                </div>
                <p className="text-[11px] text-slate-400">টার্গেট মাল্টিপ্লায়ার দিন (যেমন ২.০০x)। ক্র্যাশ হওয়ার আগে থাকলে সাথে সাথে পেমেন্ট!</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300 font-bold">টার্গেট x:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.1"
                    max="20"
                    value={aviatorTarget}
                    onChange={(e) => setAviatorTarget(e.target.value)}
                    className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    disabled={isGameBusy}
                    onClick={() => handlePlayMiniGame('aviator_crash')}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                  >
                    ফ্লাই ও বেট (৳{gameStake})
                  </button>
                </div>
              </div>

              {/* 7 Up 7 Down */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-amber-400">🎲 7 Up / 7 Down ডাইস</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">Exact 7 = 5x</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'down', label: '৭ এর নিচে (1.95x)' },
                    { id: '7', label: 'ঠিক ৭ (5.00x)' },
                    { id: 'up', label: '৭ এর উপরে (1.95x)' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDicePick(opt.id as any)}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                        dicePick === opt.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={isGameBusy}
                  onClick={() => handlePlayMiniGame('dice_7up')}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer"
                >
                  ডাইস রোল করুন (৳{gameStake})
                </button>
              </div>

              {/* Lucky Spin Wheel */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-400">🎡 লাকি স্পিন হুইল</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">0.5x – 5x</span>
                </div>
                <p className="text-[11px] text-slate-400">হুইল ঘুরিয়ে জিতুন ১.৫x, ২x, ৩x বা ৫x পর্যন্ত মেগা রিটার্ন!</p>
                <button
                  type="button"
                  disabled={isGameBusy}
                  onClick={() => handlePlayMiniGame('lucky_spin')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                >
                  স্পিন ঘোরান (৳{gameStake})
                </button>
              </div>

              {/* Coin Toss */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-sky-400">🪙 কয়েন ফ্লিপ (Head / Tail)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">1.95x</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'heads', label: 'হেড (Heads)' },
                    { id: 'tails', label: 'টেইল (Tails)' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCoinPick(opt.id as any)}
                      className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                        coinPick === opt.id ? 'bg-sky-500 text-slate-950 border-sky-400' : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={isGameBusy}
                  onClick={() => handlePlayMiniGame('coin_toss')}
                  className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black cursor-pointer"
                >
                  টস করুন (৳{gameStake})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 3: WALLET, DEPOSIT/WITHDRAW & PROMOTIONS
           ================================================================ */}
        {innerTab === 'wallet' && (
          <div className="space-y-4">
            {!user ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Wallet size={28} className="mx-auto text-amber-400" />
                <div className="text-sm font-black text-white">ওয়ালেট ও বোনাস ব্যবহার করতে লগইন করুন</div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black cursor-pointer"
                >
                  লগইন / ফ্রি অ্যাকাউন্ট খুলুন (৳৫,০০০ বোনাস)
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Deposit / Withdraw Simulator */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                        <Wallet size={14} />
                        <span>ভার্চুয়াল BDT ওয়ালেট (স্যান্ডবক্স টপ-আপ / উইথড্র)</span>
                      </h3>
                      <span className="text-sm font-mono font-black text-white">৳{user.balanceBdt.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {(['bKash', 'Nagad', 'Rocket', 'Upay'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWalletMethod(m)}
                          className={`py-1.5 rounded-xl text-xs font-black border cursor-pointer ${
                            walletMethod === m ? 'bg-pink-600 text-white border-pink-400' : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {['500', '1000', '2000', '5000'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setWalletAmount(amt)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold text-amber-300 cursor-pointer"
                        >
                          ৳{amt}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                      placeholder="পরিমাণ (BDT)"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isWalletBusy}
                        onClick={() => handleWalletAction('deposit')}
                        className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowDownLeft size={14} />
                        <span>টপ-আপ (Deposit)</span>
                      </button>
                      <button
                        type="button"
                        disabled={isWalletBusy}
                        onClick={() => handleWalletAction('withdraw')}
                        className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowUpRight size={14} />
                        <span>উইথড্র (Withdraw)</span>
                      </button>
                    </div>
                  </div>

                  {/* Promotions & VIP Bonuses */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <h3 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Gift size={14} />
                      <span>প্রমোশন ও VIP বোনাস (VIP Points: {user.vipPoints})</span>
                    </h3>
                    {[
                      { id: 'daily_checkin', title: 'দৈনিক চেক-ইন বোনাস', amount: '+৳৫০০' },
                      { id: 'sports_cashback', title: 'ক্রিকেট ও ফুটবল ক্যাশব্যাক', amount: '+৳১,০০০' },
                      { id: 'vip_reload', title: 'VIP রিলোড বোনাস', amount: '+৳২,০০০' }
                    ].map((promo) => (
                      <div key={promo.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white">{promo.title}</div>
                          <div className="text-[11px] font-mono text-emerald-400 font-black">{promo.amount} BDT</div>
                        </div>
                        <button
                          type="button"
                          disabled={isWalletBusy}
                          onClick={() => handleWalletAction('claim_bonus', promo.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer"
                        >
                          ক্লেইম
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transaction Ledger */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-black text-slate-200">লেনদেনের ইতিহাস (Transaction Ledger)</div>
                  {walletTxs.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4 text-center">এখনো কোনো লেনদেন নেই।</div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {walletTxs.map((tx) => (
                        <div key={tx.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{tx.note}</div>
                            <div className="text-[10px] text-slate-400">{tx.method} • {new Date(tx.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`font-mono font-black ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.amount >= 0 ? `+৳${tx.amount}` : `-৳${Math.abs(tx.amount)}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">ব্যালেন্স: ৳{tx.balanceAfter}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 4: MY BETS & CASH OUT HISTORY
           ================================================================ */}
        {innerTab === 'history' && (
          <div className="space-y-3">
            {!user ? (
              <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                <Trophy size={28} className="mx-auto text-sky-400" />
                <div className="text-sm font-black text-white">আপনার বেট টিকিট দেখতে API লগইন করুন</div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black cursor-pointer"
                >
                  লগইন / রেজিস্টার
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'সব টিকিট' },
                    { id: 'open', label: 'চলমান (Open)' },
                    { id: 'won', label: 'জয়ী (Won)' },
                    { id: 'cashed_out', label: 'ক্যাশআউট' },
                    { id: 'lost', label: 'পরাজিত (Lost)' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBetFilterStatus(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        betFilterStatus === f.id ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {myBets.filter((b) => betFilterStatus === 'all' || b.status === betFilterStatus).length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                    এই ক্যাটাগরিতে কোনো বেট টিকিট পাওয়া যায়নি। স্পোর্টস ট্যাব থেকে বেট প্লেস করুন!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myBets
                      .filter((b) => betFilterStatus === 'all' || b.status === betFilterStatus)
                      .map((ticket) => (
                        <div key={ticket.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-black text-amber-300">#{ticket.id}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                                {ticket.betType} • {ticket.selections.length} বাছাই
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${
                                ticket.status === 'won'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : ticket.status === 'cashed_out'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : ticket.status === 'lost'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-sky-500/20 text-sky-300'
                              }`}
                            >
                              {ticket.status}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {ticket.selections.map((s, idx) => (
                              <div key={idx} className="text-xs flex items-center justify-between gap-2 bg-slate-900/70 px-2.5 py-1.5 rounded-lg">
                                <span className="text-slate-200 truncate">
                                  <strong>{s.matchTitle}</strong> — {s.marketName}: <span className="text-emerald-300">{s.selectionLabel}</span>
                                </span>
                                <span className="font-mono font-black text-amber-300 shrink-0">@{s.odds.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex flex-wrap gap-3 font-mono">
                              <span className="text-slate-400">স্টেক: <strong className="text-white">৳{ticket.stake}</strong></span>
                              <span className="text-slate-400">অডস: <strong className="text-amber-300">{ticket.combinedOdds}x</strong></span>
                              <span className="text-slate-400">
                                {ticket.status === 'open' ? 'সম্ভাব্য জয়:' : 'পেইড:'}{' '}
                                <strong className="text-emerald-400">
                                  ৳{ticket.status === 'open' ? ticket.potentialPayout : ticket.payout}
                                </strong>
                              </span>
                            </div>

                            {ticket.status === 'open' && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleBetAction(ticket.id, 'cashout')}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer"
                                >
                                  ক্যাশআউট (৳{ticket.cashoutOffer})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBetAction(ticket.id, 'settle', 'auto')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black cursor-pointer"
                                >
                                  রেজাল্ট সেটল
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 5: BETJILI365 URL SYNC
           ================================================================ */}
        {innerTab === 'url-sync' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Globe size={14} />
                <span>Betjili365.com/bd/bn ম্যাচ লিংক বা দলের নাম দিয়ে API সিঙ্ক করুন</span>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 font-bold">ওয়েবসাইট / ম্যাচ লিংক:</label>
                <div className="relative">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://betjili365.com/bd/bn/..."
                    className="w-full text-xs py-2.5 pl-3 pr-16 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const txt = await navigator.clipboard.readText();
                        if (txt) {
                          setCustomUrlInput(txt);
                          toast.success('পেস্ট সম্পন্ন');
                        }
                      } catch {}
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-amber-400 cursor-pointer"
                  >
                    পেস্ট
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={customTeam1}
                  onChange={(e) => setCustomTeam1(e.target.value)}
                  placeholder="দল ১ (ঐচ্ছিক, যেমন: BAN)"
                  className="text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={customTeam2}
                  onChange={(e) => setCustomTeam2(e.target.value)}
                  placeholder="দল ২ (ঐচ্ছিক, যেমন: IND)"
                  className="text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-emerald-500"
                />
                <select
                  value={customSport}
                  onChange={(e) => setCustomSport(e.target.value as any)}
                  className="text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                >
                  <option value="cricket">🏏 ক্রিকেট (Cricket)</option>
                  <option value="football">⚽ ফুটবল (Football)</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncCustomBetjiliUrl}
                  disabled={isSyncingUrl}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} className={isSyncingUrl ? 'animate-spin' : ''} />
                  <span>API থেকে তথ্য আনুন</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSyncCustomUrl({
                      url: customUrlInput.trim() || TARGET_WEBSITE_URL,
                      team1: customTeam1.trim() || syncedUrlResult?.team1 || 'BAN',
                      team2: customTeam2.trim() || syncedUrlResult?.team2 || 'IND',
                      sport: syncedUrlResult?.detectedSport || customSport
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>সরাসরি স্কোরার ম্যাচে যোগ করুন</span>
                </button>
              </div>
            </div>

            {syncedUrlResult && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
                <div className="font-black text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>API সিঙ্ক রেজাল্ট ({syncedUrlResult.team1} vs {syncedUrlResult.team2})</span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-72">
                  {JSON.stringify(syncedUrlResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 6: FULL API ENDPOINTS & LIVE JSON INSPECTOR
           ================================================================ */}
        {innerTab === 'api' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-indigo-300 flex items-center gap-1.5">
                  <Code2 size={15} />
                  <span>Betjili365 (/bd/bn) সম্পূর্ণ REST API এন্ডপয়েন্টসমূহ</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  নিচের সব এন্ডপয়েন্ট সরাসরি Bearer Token সহ Auth, Wallet, Sportsbook/Exchange Bet, Cashout ও Games এর জন্য ব্যবহার করা যাবে।
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { method: 'POST', path: '/api/betjili365/auth/register', desc: 'অ্যাকাউন্ট রেজিস্টার + ৳৫,০০০ ওয়েলকাম ভার্চুয়াল ব্যালেন্স ও Bearer টোকেন' },
                  { method: 'POST', path: '/api/betjili365/auth/login', desc: 'ইউজারনেম/ফোন ও পাসওয়ার্ড দিয়ে সরাসরি API লগইন' },
                  { method: 'GET', path: '/api/betjili365/auth/me', desc: 'Bearer টোকেন দিয়ে প্রোফাইল ও লাইভ ব্যালেন্স যাচাই' },
                  { method: 'POST', path: '/api/betjili365/wallet/action', desc: 'ডিপোজিট/উইথড্র সিমুলেশন ও প্রমোশন বোনাস ক্লেইম' },
                  { method: 'GET', path: activeFeedEndpoint, desc: 'লাইভ ও আসন্ন ক্রিকেট/ফুটবল + সমস্ত মার্কেট অডস (Extended Markets)' },
                  { method: 'POST', path: '/api/betjili365/bets/place', desc: 'একক/মাল্টি বেট প্লেস (Back/Lay, Bookmaker, Toss, Fancy, BTTS, Handicap)' },
                  { method: 'GET', path: '/api/betjili365/bets', desc: 'ওপেন ও সেটলড বেট টিকিট তালিকা' },
                  { method: 'POST', path: '/api/betjili365/bets/cashout', desc: 'চলমান বেট ইনস্ট্যান্ট ক্যাশআউট' },
                  { method: 'POST', path: '/api/betjili365/games/play', desc: 'Aviator ক্র্যাশ, 7Up ডাইস, লাকি স্পিন ও কয়েন টস মিনি গেম API' },
                  { method: 'POST', path: '/api/betjili365/sync-url', desc: 'Betjili365 ম্যাচ লিংক পার্স ও স্কোরার লাইভ সিঙ্ক' },
                  { method: 'GET', path: '/api/betjili365/status', desc: 'টার্গেট ওয়েবসাইট (betjili365.com/bd/bn) প্রোব ও API স্ট্যাটাস' }
                ].map((ep) => {
                  const fullUrl = `${apiOrigin}${ep.path}`;
                  return (
                    <div
                      key={ep.path}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                              ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {ep.method}
                          </span>
                          <code className="text-xs font-mono text-cyan-300 truncate">{ep.path}</code>
                        </div>
                        <p className="text-[11px] text-slate-400">{ep.desc}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(fullUrl, ep.path)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedKey === ep.path ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>কপি</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  <span>লাইভ JSON রেসপন্স (Live Feed)</span>
                  {feedData?.upstreamProbe && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Upstream HTTP {feedData.upstreamProbe.httpStatus || 'N/A'}
                      {feedData.upstreamProbe.cloudflareProtected ? ' • CF Protected' : ''}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(feedData || {}, null, 2), 'json-body')}
                  className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'json-body' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>JSON কপি</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-96">
                {JSON.stringify(feedData || { loading: true }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          FLOATING API BET SLIP DRAWER
         ================================================================ */}
      {isSlipOpen && (
        <div className="fixed bottom-16 md:bottom-5 right-3 sm:right-5 z-50 w-[calc(100vw-24px)] sm:w-96 bg-slate-950 border border-emerald-500/50 rounded-3xl shadow-2xl p-4 space-y-3 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-emerald-400" />
              <span className="text-sm font-black">Betjili365 API বেট স্লিপ ({slipSelections.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              {slipSelections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSlipSelections([])}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-600/25 text-slate-400 hover:text-rose-300 cursor-pointer"
                  title="সব মুছুন"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSlipOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {slipSelections.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              বেট প্লেস করতে যেকোনো ম্যাচের অডস বাটনে ক্লিক করুন।
            </div>
          ) : (
            <>
              {slipSelections.length > 1 && (
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl">
                  {(['single', 'multi'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSlipBetType(t)}
                      className={`py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                        slipBetType === t ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {t === 'single' ? 'একক বেট' : 'মাল্টি বেট (Parlay)'}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {slipSelections.map((sel) => (
                  <div key={sel.uid} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{sel.event.team1} vs {sel.event.team2}</div>
                      <div className="text-[11px] text-emerald-400 truncate">
                        {sel.marketName}: {sel.selectionLabel}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-black text-amber-300">@{sel.odds.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => setSlipSelections((p) => p.filter((x) => x.uid !== sel.uid))}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">মোট অডস:</span>
                  <span className="font-mono font-black text-amber-300">{effectiveOdds.toFixed(2)}x</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {['100', '500', '1000', '5000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSlipStake(amt)}
                      className="flex-1 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono font-bold text-slate-200 cursor-pointer"
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min={10}
                    value={slipStake}
                    onChange={(e) => setSlipStake(e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-black text-white outline-none"
                  />
                  <div className="text-right text-xs">
                    <div className="text-slate-400 text-[10px]">সম্ভাব্য রিটার্ন</div>
                    <div className="font-mono font-black text-emerald-400">৳{potentialReturn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPlacingBet}
                  onClick={handlePlaceApiBet}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black cursor-pointer shadow-lg"
                >
                  {isPlacingBet ? 'বেট প্লেস হচ্ছে...' : user ? `API দিয়ে বেট প্লেস করুন (৳${slipStake})` : 'লগইন করে বেট প্লেস করুন'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================
          API ACCOUNT LOGIN / REGISTER MODAL
         ================================================================ */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
                  BJ
                </div>
                <div>
                  <h3 className="text-sm font-black">Betjili365 API অ্যাকাউন্ট</h3>
                  <p className="text-[10px] text-amber-300">অ্যাপ স্যান্ডবক্স ওয়ালেট (৳৫,০০০ ফ্রি ভার্চুয়াল ব্যালেন্স)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 rounded-lg text-xs font-black cursor-pointer ${
                  authMode === 'login' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                লগইন (Login)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2 rounded-lg text-xs font-black cursor-pointer ${
                  authMode === 'register' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                নতুন অ্যাকাউন্ট (Register)
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {authMode === 'login' ? 'ইউজারনেম বা মোবাইল নম্বর' : 'ইউজারনেম (যেমন: rahim24)'}
                </label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="username / 017xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">প্রদর্শিত নাম (Display Name)</label>
                    <input
                      type="text"
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      placeholder="আপনার নাম"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  অ্যাপ API পাসওয়ার্ড <span className="text-rose-400">(অফিশিয়াল সাইটের পাসওয়ার্ড দিবেন না)</span>
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড দিন (কমপক্ষে ৪ অক্ষর)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthBusy}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black cursor-pointer"
              >
                {isAuthBusy
                  ? 'অপেক্ষা করুন...'
                  : authMode === 'register'
                  ? 'রেজিস্টার ও ৳৫,০০০ ফ্রি বোনাস নিন'
                  : 'লগইন করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
