import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, Plus, Trash2, Trophy, Target, ExternalLink, RefreshCw, CheckCircle2, Zap, ArrowLeft, Home } from 'lucide-react';
import { Match, TargetMilestone, getShortTeamName } from '../types';

export interface SuggestedMatchItem {
  id: string;
  sport: 'cricket' | 'football';
  team1: string;
  team2: string;
  name: string;
  isUpcoming?: boolean;
  matchStartTime?: string;
  matchStartTimeIso?: string;
  format?: string;
  score?: number;
  wickets?: number;
  overs?: number;
  footballScore1?: number;
  footballScore2?: number;
  footballMinute?: string;
  footballPeriod?: string;
  footballVenue?: string;
  liveMatchUrl?: string;
  source?: string;
  statusText?: string;
}

export interface AiActionPayload {
  type:
    | 'add_match'
    | 'delete_match'
    | 'add_milestone'
    | 'delete_milestone'
    | 'update_match'
    | 'switch_view_or_match'
    | 'suggest_latest_matches';
  args: Record<string, any>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  executedActions?: string[];
  suggestions?: SuggestedMatchItem[];
  groundingLinks?: Array<{ title: string; uri: string }>;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  lang: 'en' | 'bn';
  matches: Match[];
  currentMatchId: string;
  activeMatch: Match | undefined;
  onExecuteActions: (actions: AiActionPayload[]) => string[];
  onQuickAddSuggestedMatch: (item: SuggestedMatchItem) => void;
  onQuickDeleteMatch: (matchId: string) => void;
  onQuickAddMilestone: (over: number, runs: number, condition: 'more' | 'lessOrEqual') => void;
  onQuickDeleteMilestone: (milestoneId: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  lang,
  matches,
  currentMatchId,
  activeMatch,
  onExecuteActions,
  onQuickAddSuggestedMatch,
  onQuickDeleteMatch,
  onQuickAddMilestone,
  onQuickDeleteMilestone,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedMatchItem[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'suggestions' | 'manage'>('chat');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [newMilestoneOver, setNewMilestoneOver] = useState('10');
  const [newMilestoneRuns, setNewMilestoneRuns] = useState('85');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      text:
        lang === 'bn'
          ? 'আসসালামু আলাইকুম! আমি আপনার **AI Match & Milestone Assistant**। আপনি আমাকে যেকোনো কমান্ড দিতে পারেন:\n• "crex.com থেকে ক্রিকেটের বাংলাদেশ বনাম ভারতের পরবর্তী ম্যাচটি যুক্ত কর"\n• "Sofascore থেকে ফুটবলের বাংলাদেশ বনাম ভারতের পরবর্তী ম্যাচটি যুক্ত কর"\n• "এখানে থাকা ম্যাচটি ডিলিট কর"\n• "১০ ওভারে ৮৫ রানের নতুন মাইলস্টোন তৈরি কর" বা "মাইলস্টোন ডিলিট কর"\n• "আমাকে সর্বশেষ ম্যাচের তথ্য সাজেস্ট কর"'
          : 'Hello! I am your **AI Match & Milestone Assistant**. Tell me what you want to do:\n• "Add the next Bangladesh vs India cricket match from crex.com"\n• "Add the next Bangladesh vs India football match from Sofascore"\n• "Delete the current match"\n• "Create a milestone of 85 runs in 10 overs" or "Delete milestone"\n• "Suggest latest live and upcoming matches"',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch('/api/ai/suggestions');
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const quickPrompts =
    lang === 'bn'
      ? [
          'crex.com থেকে ক্রিকেটের বাংলাদেশ বনাম ভারতের পরবর্তী ম্যাচটি যুক্ত কর',
          'Sofascore থেকে ফুটবলের বাংলাদেশ বনাম ভারতের পরবর্তী ম্যাচটি যুক্ত কর',
          '১০ ওভারে ৮৫ রানের নতুন মাইলস্টোন তৈরি কর',
          'সর্বশেষ মাইলস্টোনটি ডিলিট কর',
          'বর্তমান ম্যাচটি ডিলিট কর',
          'আমাকে সর্বশেষ লাইভ ও পরবর্তী ম্যাচগুলোর তথ্য সাজেস্ট কর',
        ]
      : [
          'Add Bangladesh vs India next cricket match from crex.com',
          'Add Bangladesh vs India next football match from Sofascore',
          'Create a new milestone of 85 runs in 10 overs',
          'Delete the last milestone',
          'Delete current match',
          'Suggest the latest live & upcoming matches',
        ];

  const handleSend = async (promptOverride?: string) => {
    const textToSend = (promptOverride ?? input).trim();
    if (!textToSend || isLoading) return;

    if (!promptOverride) setInput('');
    setActiveTab('chat');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          currentMatches: matches,
          currentMatchId,
          lang,
        }),
      });
      const data = await res.json();

      let executedBadges: string[] = [];
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        executedBadges = onExecuteActions(data.actions);
      }
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }

      const showSuggestionsInMsg =
        /সাজেস্ট|সর্বশেষ|তথ্য|আপডেট|suggest|latest|info/i.test(textToSend) ||
        (Array.isArray(data.actions) && data.actions.some((a: any) => a.type === 'suggest_latest_matches'));

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text:
          data.reply ||
          (executedBadges.length > 0
            ? executedBadges.join('\n')
            : lang === 'bn'
            ? 'আপনার নির্দেশনা সম্পন্ন হয়েছে।'
            : 'Your request has been processed.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executedActions: executedBadges,
        suggestions: showSuggestionsInMsg ? (data.suggestions || suggestions).slice(0, 4) : undefined,
        groundingLinks: data.groundingLinks,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            lang === 'bn'
              ? 'কমান্ডটি প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
              : 'Failed to process command. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAddItem = (item: SuggestedMatchItem) => {
    onQuickAddSuggestedMatch(item);
    setAddedIds((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [item.id]: false }));
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#0b101b] flex flex-col overflow-hidden">
      <div className="w-full h-full bg-slate-950 flex flex-col overflow-hidden">
        {/* Header with Back & Home Buttons */}
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                  {lang === 'bn' ? 'AI Match & Milestone Assistant' : 'AI Match & Milestone Assistant'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> LIVE AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {lang === 'bn'
                  ? 'লিংক/দল থেকে ম্যাচ যুক্ত, ডিলিট, মাইলস্টোন তৈরি এবং সর্বশেষ তথ্যের সাজেশন'
                  : 'Add/delete matches from crex/sofascore, manage milestones & get live suggestions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoHome || onClose}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-md shadow-indigo-600/20"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'হোম' : 'Home'}</span>
          </button>
        </div>

        {/* Sub-navigation Tabs inside AI Assistant */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-slate-800/70 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'AI চ্যাট ও কমান্ড' : 'AI Chat & Commands'}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'suggestions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-slate-800/70 text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            {lang === 'bn' ? `সর্বশেষ সাজেশন (${suggestions.length})` : `Live Suggestions (${suggestions.length})`}
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'bg-slate-800/70 text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ম্যাচ ও মাইলস্টোন লিস্ট' : 'Matches & Milestones'}
          </button>
        </div>

        {/* Tab 1: Chat & Voice/Text Command Interface */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden max-w-4xl w-full mx-auto">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-none'
                    }`}
                  >
                    {msg.text}

                    {/* Executed Action Badges */}
                    {msg.executedActions && msg.executedActions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/80 space-y-1">
                        {msg.executedActions.map((actStr, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            <span>{actStr}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Suggestions if requested */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.suggestions.map((sug) => (
                          <div
                            key={sug.id}
                            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                                  {sug.sport === 'football' ? '⚽ Football' : '🏏 Cricket'}
                                </span>
                                <span className="text-xs font-bold text-white truncate" title={`${sug.team1} vs ${sug.team2}`}>
                                  {getShortTeamName(sug.team1)} vs {getShortTeamName(sug.team2)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {sug.statusText || sug.source}
                              </p>
                            </div>
                            <button
                              onClick={() => handleQuickAddItem(sug)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all ${
                                addedIds[sug.id]
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                            >
                              {addedIds[sug.id] ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {lang === 'bn' ? 'যুক্ত হয়েছে' : 'Added'}
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  {lang === 'bn' ? 'যুক্ত করুন' : 'Add'}
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Grounding Links */}
                    {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                        {msg.groundingLinks.slice(0, 3).map((gl, i) => (
                          <a
                            key={i}
                            href={gl.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline bg-sky-500/10 px-2 py-0.5 rounded"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {gl.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-indigo-300 bg-slate-800/70 px-3 py-2 rounded-xl w-fit border border-indigo-500/20">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>{lang === 'bn' ? 'AI Assistant কাজ করছে...' : 'AI Assistant is processing...'}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                {lang === 'bn' ? 'এক ক্লিকে কমান্ড দিন:' : 'Quick Commands:'}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-500/50 whitespace-nowrap transition-all shrink-0"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  lang === 'bn'
                    ? 'বলুন: বাংলাদেশ বনাম ভারতের পরবর্তী ম্যাচ যুক্ত কর / মাইলস্টোন তৈরি কর...'
                    : 'Ask AI: Add Bangladesh vs India next match / Create milestone / Delete match...'
                }
                className="flex-1 bg-slate-900 text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{lang === 'bn' ? 'পাঠান' : 'Send'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Live & Upcoming Match Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                {lang === 'bn'
                  ? '🔥 সর্বশেষ ক্রিকেট ও ফুটবল ম্যাচ সাজেশন (Crex & Sofascore)'
                  : '🔥 Latest Cricket & Football Match Suggestions'}
              </h3>
              <button
                onClick={fetchSuggestions}
                disabled={isLoadingSuggestions}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 border border-slate-700"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                {lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80 hover:border-indigo-500/40 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                          item.sport === 'football'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.sport === 'football' ? '⚽ Football' : '🏏 Cricket'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.isUpcoming
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.isUpcoming ? 'UPCOMING' : 'LIVE / TODAY'}
                      </span>
                      {item.source && (
                        <span className="text-[10px] text-slate-400 font-mono">{item.source}</span>
                      )}
                    </div>
                    <div className="text-sm font-black text-white mt-1" title={`${item.team1} vs ${item.team2}`}>
                      {getShortTeamName(item.team1)} vs {getShortTeamName(item.team2)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.statusText}</div>
                  </div>

                  <button
                    onClick={() => handleQuickAddItem(item)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                      addedIds[item.id]
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {addedIds[item.id] ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {lang === 'bn' ? 'যুক্ত হয়েছে' : 'Added'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {lang === 'bn' ? '+ যুক্ত করুন' : '+ Add Match'}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Direct Match & Milestone Manager */}
        {activeTab === 'manage' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 max-w-4xl w-full mx-auto">
            {/* Current Matches List */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                {lang === 'bn' ? `বর্তমান ম্যাচসমূহ (${matches.length})` : `Current Matches (${matches.length})`}
              </h3>
              <div className="space-y-2">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      m.id === currentMatchId
                        ? 'bg-indigo-950/40 border-indigo-500/50'
                        : 'bg-slate-800/60 border-slate-700/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate" title={`${m.team1} vs ${m.team2}`}>
                          {getShortTeamName(m.team1)} vs {getShortTeamName(m.team2)}
                        </span>
                        {m.id === currentMatchId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {m.sport === 'football'
                          ? `⚽ ${m.footballScore1 ?? 0} - ${m.footballScore2 ?? 0} (${m.footballMinute || 'Live'})`
                          : `🏏 ${m.score}/${m.wickets} (${Math.floor((m.balls || 0) / (m.format === '100' ? 5 : 6))}.${(m.balls || 0) % (m.format === '100' ? 5 : 6)} Ov)`}
                      </p>
                    </div>
                    <button
                      onClick={() => onQuickDeleteMatch(m.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {lang === 'bn' ? 'ডিলিট' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Match Milestones */}
            {activeMatch && (
              <div className="pt-3 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {lang === 'bn'
                    ? `${activeMatch.team1} vs ${activeMatch.team2} - মাইলস্টোন তৈরি ও ডিলিট`
                    : `${activeMatch.team1} vs ${activeMatch.team2} - Milestones`}
                </h3>

                {/* Quick Add Milestone Form */}
                <div className="flex items-center gap-2 mb-3 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block">
                      {lang === 'bn' ? 'ওভার (Over)' : 'Over'}
                    </label>
                    <input
                      type="number"
                      value={newMilestoneOver}
                      onChange={(e) => setNewMilestoneOver(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 block">
                      {lang === 'bn' ? 'টার্গেট রান (Runs)' : 'Target Runs'}
                    </label>
                    <input
                      type="number"
                      value={newMilestoneRuns}
                      onChange={(e) => setNewMilestoneRuns(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const ov = parseFloat(newMilestoneOver);
                      const rn = parseInt(newMilestoneRuns, 10);
                      if (ov > 0 && rn > 0) {
                        onQuickAddMilestone(ov, rn, 'more');
                      }
                    }}
                    className="mt-3.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {lang === 'bn' ? 'তৈরি করুন' : 'Create'}
                  </button>
                </div>

                {/* Milestone List */}
                <div className="space-y-1.5">
                  {(activeMatch.targetMilestones || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      {lang === 'bn' ? 'কোনো মাইলস্টোন নেই।' : 'No milestones set for this match.'}
                    </p>
                  ) : (
                    (activeMatch.targetMilestones || []).map((tm: TargetMilestone) => (
                      <div
                        key={tm.id}
                        className="p-2 rounded-lg bg-slate-800/70 border border-slate-700 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-200 font-semibold">
                          🎯 {tm.over} {lang === 'bn' ? 'ওভারে' : 'Overs'} — {tm.runs}{' '}
                          {lang === 'bn' ? 'রান' : 'Runs'} ({tm.condition === 'lessOrEqual' ? '≤' : '≥'})
                        </span>
                        <button
                          onClick={() => onQuickDeleteMilestone(tm.id)}
                          className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
