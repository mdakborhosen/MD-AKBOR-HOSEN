import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  Clock, 
  MapPin, 
  Trophy, 
  AlertTriangle,
  Send,
  CalendarCheck,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Home
} from 'lucide-react';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScheduleEvent, MatchState } from '../types';
import { 
  initGoogleAuth, 
  signInWithGoogle, 
  logoutGoogle, 
  fetchCalendarEvents, 
  createGoogleCalendarEvent, 
  deleteGoogleCalendarEvent,
  GCalEvent 
} from '../lib/googleCalendar';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  schedules?: ScheduleEvent[];
  schedule?: ScheduleEvent[];
  activeMatch?: MatchState;
  currentMatch?: MatchState;
  lang?: 'en' | 'bn';
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  schedules: propSchedules,
  schedule: altSchedule,
  activeMatch: propActiveMatch,
  currentMatch: altMatch,
  lang = 'en',
}) => {
  const schedules = propSchedules || altSchedule || [];
  const activeMatch = propActiveMatch || altMatch;
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  // Custom Event Form State
  const [summary, setSummary] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('15:00');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal State (Mandatory for destructive/mutating actions)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmSyncAll, setConfirmSyncAll] = useState(false);
  const [syncingMatchId, setSyncingMatchId] = useState<string | null>(null);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsLoadingAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch events when authenticated
  const loadEvents = async () => {
    if (!accessToken) return;
    setIsLoadingEvents(true);
    try {
      const now = new Date();
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const future60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
      
      const fetched = await fetchCalendarEvents(accessToken, 'primary', past30Days, future60Days);
      setEvents(fetched);
    } catch (err: any) {
      console.error('Failed to load events', err);
      toast.error(err.message || 'Failed to fetch Google Calendar events');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (accessToken && isOpen) {
      loadEvents();
    }
  }, [accessToken, isOpen]);

  const handleSignIn = async () => {
    try {
      setIsLoadingAuth(true);
      const res = await signInWithGoogle();
      setUser(res.user);
      setAccessToken(res.accessToken);
      toast.success(`Signed in as ${res.user.displayName || res.user.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setAccessToken(null);
      setEvents([]);
      toast.info('Signed out of Google Account');
    } catch (err: any) {
      toast.error('Sign out failed');
    }
  };

  // Sync a single schedule event to Google Calendar
  const handleSyncSchedule = async (schedule: ScheduleEvent) => {
    if (!accessToken) {
      toast.error('Please sign in to Google first');
      return;
    }

    try {
      setSyncingMatchId(schedule.id);
      const startDateTime = new Date(`${schedule.date}T${schedule.time || '10:00'}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours duration

      const gCalEvent: GCalEvent = {
        summary: `🏏 ${schedule.team1} vs ${schedule.team2}`,
        description: `Cricket Match Schedule\nGroup: ${schedule.group || 'N/A'}\nTeams: ${schedule.team1} vs ${schedule.team2}\nCreated via Cricket Score Master.`,
        location: schedule.venue || 'Cricket Ground',
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      };

      const created = await createGoogleCalendarEvent(accessToken, gCalEvent);
      toast.success(`Synced "${schedule.team1} vs ${schedule.team2}" to Google Calendar!`);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync schedule to Google Calendar');
    } finally {
      setSyncingMatchId(null);
    }
  };

  // Sync active match summary
  const handleSyncActiveMatch = async () => {
    if (!accessToken || !activeMatch) return;
    try {
      setIsSubmitting(true);
      const now = new Date();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const summaryText = `🏏 Match Result: ${activeMatch.team1} vs ${activeMatch.team2}`;
      const desc = `Match Highlights:\nBatting Team: ${activeMatch.battingTeam}\nScore: ${activeMatch.score}/${activeMatch.wickets} (${(activeMatch.balls / 6).toFixed(1)} ov)\nTotal Overs: ${activeMatch.maxOvers}\nRecorded in Cricket Score Master.`;

      const created = await createGoogleCalendarEvent(accessToken, {
        summary: summaryText,
        description: desc,
        start: { dateTime: now.toISOString() },
        end: { dateTime: end.toISOString() },
      });

      toast.success('Active match score exported to Google Calendar!');
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync active match');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create custom event
  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!summary.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    try {
      setIsSubmitting(true);
      const startDT = new Date(`${eventDate}T${eventTime}:00`);
      const endDT = new Date(startDT.getTime() + 2 * 60 * 60 * 1000);

      await createGoogleCalendarEvent(accessToken, {
        summary: `🏏 ${summary}`,
        description: description || 'Cricket event scheduled via Cricket Score Master.',
        location: venue,
        start: { dateTime: startDT.toISOString() },
        end: { dateTime: endDT.toISOString() },
      });

      toast.success('Event added to Google Calendar!');
      setSummary('');
      setVenue('');
      setDescription('');
      loadEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm & Delete event (Destructive Action with mandatory confirmation)
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId || !accessToken) return;
    try {
      await deleteGoogleCalendarEvent(accessToken, confirmDeleteId);
      toast.success('Event removed from Google Calendar');
      setEvents(events.filter((ev) => ev.id !== confirmDeleteId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete calendar event');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Bulk sync all schedule events with confirmation
  const handleBulkSyncAll = async () => {
    if (!accessToken || schedules.length === 0) return;
    setConfirmSyncAll(false);
    let count = 0;
    toast.info(`Syncing ${schedules.length} match schedules...`);
    
    for (const sched of schedules) {
      try {
        const startDateTime = new Date(`${sched.date}T${sched.time || '10:00'}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);

        await createGoogleCalendarEvent(accessToken, {
          summary: `🏏 ${sched.team1} vs ${sched.team2}`,
          description: `Tournament Match\nGroup: ${sched.group}\nVenue: ${sched.venue || 'TBD'}`,
          location: sched.venue || 'Cricket Ground',
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime.toISOString() },
        });
        count++;
      } catch (err) {
        console.error('Error syncing item', sched.id, err);
      }
    }
    toast.success(`Successfully added ${count} match events to your Google Calendar!`);
    loadEvents();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] bg-[#0b101b] flex flex-col overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-card w-full h-full overflow-hidden flex flex-col"
        >
          {/* Header with Back & Home Buttons */}
          <div className="p-4 sm:p-5 border-b border-border bg-muted/40 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'পিছনে' : 'Back'}</span>
              </button>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2 truncate">
                  <span>Google Calendar Sync</span>
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 hidden sm:inline-flex">
                    Workspace API
                  </Badge>
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Sync tournament schedules, match reminders, and fixture results directly to Google Calendar.
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

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 max-w-4xl w-full mx-auto">
            {/* Account Sign-In / User Banner */}
            {!user ? (
              <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-primary/20">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-base font-semibold flex items-center justify-center sm:justify-start gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Connect your Google Account
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Sign in to enable 2-way sync for tournament fixtures, match reminders, and game summaries with permission from your account.
                    </p>
                  </div>
                  <button
                    onClick={handleSignIn}
                    disabled={isLoadingAuth}
                    className="gsi-material-button hover:shadow-md transition-shadow inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <div className="w-5 h-5">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span>{isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {user.displayName || 'Google User'}
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Connected
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadEvents} disabled={isLoadingEvents} className="gap-1.5 text-xs">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs">
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Actions if authenticated */}
            {user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Active Match Sync Card */}
                {activeMatch && (
                  <Card className="border-border">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Export Active Match Log
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {activeMatch.team1} vs {activeMatch.team2} ({activeMatch.score}/{activeMatch.wickets})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <Button
                        size="sm"
                        onClick={handleSyncActiveMatch}
                        disabled={isSubmitting}
                        className="w-full gap-2 text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Save Match Summary to Google Calendar
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Bulk Tournament Schedule Sync */}
                <Card className="border-border">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-primary" />
                      Bulk Sync Tournament Schedule
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {schedules.length} match fixture(s) available in schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmSyncAll(true)}
                      disabled={schedules.length === 0}
                      className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Sync All {schedules.length} Fixtures
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tournament Matches Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Trophy className="w-4 h-4 text-primary" />
                Tournament Match Schedule
              </h3>
              {schedules.length === 0 ? (
                <div className="p-6 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                  No match schedules created yet. Add fixtures in the Tournament Schedule tab!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {schedules.map((sched) => (
                    <div
                      key={sched.id}
                      className="p-3 bg-card border border-border rounded-xl flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-xs flex items-center gap-2 truncate">
                          <span>{sched.team1}</span>
                          <span className="text-muted-foreground font-normal">vs</span>
                          <span>{sched.team2}</span>
                          {sched.group && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                              {sched.group}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {sched.date} @ {sched.time || '10:00'}
                          </span>
                          {sched.venue && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {sched.venue}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!user || syncingMatchId === sched.id}
                        onClick={() => handleSyncSchedule(sched)}
                        className="shrink-0 gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                      >
                        {syncingMatchId === sched.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CalendarIcon className="w-3.5 h-3.5" />
                        )}
                        Sync to GCal
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Custom Cricket Event */}
            {user && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Plus className="w-4 h-4 text-primary" />
                  Add Custom Event to Google Calendar
                </h3>
                <form onSubmit={handleCreateCustomEvent} className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Title / Match</label>
                      <Input
                        placeholder="e.g. Final Practice Match"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Date</label>
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Time</label>
                      <Input
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Venue (Location)</label>
                      <Input
                        placeholder="Stadium / Ground Name"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Notes / Description</label>
                      <Input
                        placeholder="Optional notes or squad info"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2 text-xs">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Add to Google Calendar
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Existing Google Calendar Events */}
            {user && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <CalendarCheck className="w-4 h-4 text-emerald-500" />
                    Upcoming Events on Google Calendar ({events.length})
                  </h3>
                </div>

                {isLoadingEvents ? (
                  <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    Fetching events from Google Calendar...
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-6 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                    No upcoming cricket events found on your Google Calendar. Sync a fixture above!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-card border border-border rounded-xl flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{ev.summary}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>
                              {ev.start.dateTime
                                ? new Date(ev.start.dateTime).toLocaleString([], {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : ev.start.date}
                            </span>
                            {ev.location && (
                              <span className="truncate flex items-center gap-1">
                                • <MapPin className="w-3 h-3" /> {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
                              title="Open in Google Calendar"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDeleteId(ev.id || null)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Powered by Google Workspace Calendar API
            </span>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Mandatory User Confirmation Dialog for Deletion */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Calendar Event?</h3>
                <p className="text-xs text-muted-foreground">
                  Are you sure you want to delete this event from your Google Calendar? This will modify your personal Google Calendar events.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)} className="text-xs">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleConfirmDelete} className="text-xs gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Confirm Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Bulk Sync */}
      {confirmSyncAll && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Bulk Sync Fixtures</h3>
                <p className="text-xs text-muted-foreground">
                  This will create {schedules.length} match event(s) in your primary Google Calendar. Do you wish to proceed?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmSyncAll(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleBulkSyncAll} className="text-xs gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Confirm Bulk Sync
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
