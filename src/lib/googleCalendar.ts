import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App lazily or safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const WORKSPACE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

const AUTH_CACHE_STORAGE_KEY = 'google_workspace_auth_cache_v1';
const PREFER_GSI_STORAGE_KEY = 'google_workspace_prefer_gsi_v1';

interface CachedGoogleAuth {
  accessToken: string;
  expiresAt: number;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedFallbackUser: User | null = null;

const loadCachedAuthFromStorage = (): CachedGoogleAuth | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGoogleAuth;
    if (!parsed?.accessToken || !parsed?.expiresAt || Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(AUTH_CACHE_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveCachedAuthToStorage = (user: Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'>, accessToken: string, expiresInSec = 3300) => {
  cachedAccessToken = accessToken;
  cachedFallbackUser = user as User;
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedGoogleAuth = {
      accessToken,
      expiresAt: Date.now() + Math.max(300, expiresInSec - 120) * 1000,
      user: {
        uid: user.uid || 'google-user',
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
      },
    };
    localStorage.setItem(AUTH_CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
  cachedFallbackUser = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_CACHE_STORAGE_KEY);
    } catch {}
  }
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const stored = loadCachedAuthFromStorage();
  if (stored?.accessToken) {
    cachedAccessToken = stored.accessToken;
    cachedFallbackUser = stored.user as unknown as User;
    return stored.accessToken;
  }
  return null;
};

const ensureGsiScriptLoaded = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if ((window as any).google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]') as HTMLScriptElement | null;
    if (existing) {
      let checks = 0;
      const timer = setInterval(() => {
        checks++;
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(timer);
          resolve();
        } else if (checks > 40) {
          clearInterval(timer);
          reject(new Error('Google Identity Services script timed out'));
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
};

const signInWithGoogleGsi = async (): Promise<{ user: User; accessToken: string }> => {
  const clientId = (firebaseConfig as any).oAuthClientId;
  if (!clientId) {
    throw new Error('OAuth Client ID is not configured in firebase-applet-config.json');
  }
  await ensureGsiScriptLoaded();
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google OAuth2 client unavailable');
  }

  return new Promise<{ user: User; accessToken: string }>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: WORKSPACE_SCOPES.join(' '),
      prompt: 'select_account',
      callback: async (tokenResponse: any) => {
        if (tokenResponse?.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google OAuth failed'));
          return;
        }
        const accessToken = tokenResponse?.access_token;
        if (!accessToken) {
          reject(new Error('No access token returned from Google OAuth'));
          return;
        }

        const expiresIn = Number(tokenResponse?.expires_in) || 3599;
        let resolvedUser: User | null = auth.currentUser;

        try {
          const cred = GoogleAuthProvider.credential(null, accessToken);
          const firebaseRes = await signInWithCredential(auth, cred);
          resolvedUser = firebaseRes.user;
        } catch {
          // If Firebase Identity Toolkit signInWithCredential fails, fetch profile directly from Google UserInfo API
        }

        if (!resolvedUser) {
          try {
            const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (infoRes.ok) {
              const profile = await infoRes.json();
              resolvedUser = {
                uid: profile.sub || 'google-user',
                displayName: profile.name || profile.given_name || profile.email || 'Google User',
                email: profile.email || null,
                photoURL: profile.picture || null,
              } as unknown as User;
            }
          } catch {
            // fallback minimal user
          }
        }

        if (!resolvedUser) {
          resolvedUser = {
            uid: 'google-user',
            displayName: 'Google User',
            email: null,
            photoURL: null,
          } as unknown as User;
        }

        saveCachedAuthToStorage(resolvedUser, accessToken, expiresIn);
        resolve({ user: resolvedUser, accessToken });
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || err?.type || 'Google Sign-In popup closed or blocked'));
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};

export const initGoogleAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  const stored = loadCachedAuthFromStorage();
  if (stored?.accessToken) {
    cachedAccessToken = stored.accessToken;
    cachedFallbackUser = stored.user as unknown as User;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    const activeToken = getCachedAccessToken();
    if (user && activeToken) {
      saveCachedAuthToStorage(user, activeToken);
      onAuthSuccess(user, activeToken);
    } else if (activeToken && cachedFallbackUser) {
      onAuthSuccess(cachedFallbackUser, activeToken);
    } else if (!isSigningIn) {
      onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const preferGsi =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(PREFER_GSI_STORAGE_KEY) === 'true' &&
      Boolean((firebaseConfig as any).oAuthClientId);

    if (preferGsi) {
      return await signInWithGoogleGsi();
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to obtain access token from Google Auth.');
      }
      saveCachedAuthToStorage(result.user, credential.accessToken);
      return { user: result.user, accessToken: credential.accessToken };
    } catch (popupError: any) {
      const code = String(popupError?.code || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw popupError;
      }
      console.warn('Firebase signInWithPopup failed, falling back to Google Identity Services OAuth:', popupError);
      if (typeof window !== 'undefined' && (firebaseConfig as any).oAuthClientId) {
        try {
          sessionStorage.setItem(PREFER_GSI_STORAGE_KEY, 'true');
        } catch {}
        return await signInWithGoogleGsi();
      }
      throw popupError;
    }
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogle = async (): Promise<void> => {
  clearCachedAccessToken();
  try {
    await signOut(auth);
  } catch {}
};

// Google Calendar API Helper Types
export interface GCalEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

export interface GCalCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

// Fetch user's calendars
export const fetchUserCalendars = async (accessToken: string): Promise<GCalCalendar[]> => {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || 'Failed to fetch user calendars');
  }

  const data = await response.json();
  return data.items || [];
};

// List events from primary calendar or specified calendarId
export const fetchCalendarEvents = async (
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
): Promise<GCalEvent[]> => {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || 'Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.items || [];
};

// Create a new event on Google Calendar
export const createGoogleCalendarEvent = async (
  accessToken: string,
  event: GCalEvent,
  calendarId: string = 'primary'
): Promise<GCalEvent> => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || 'Failed to create calendar event');
  }

  return await response.json();
};

// Delete an event from Google Calendar (mutating/destructive operation)
export const deleteGoogleCalendarEvent = async (
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to delete calendar event');
  }
};
