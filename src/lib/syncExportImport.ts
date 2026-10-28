/**
 * Cross-Domain Data Transfer & Sync Helper
 * Enables seamless 1-click sync between Google AI Studio preview and Cloudflare Pages (https://md-akbor-hosen.pages.dev)
 */

import { MatchState } from '../types';

export interface SyncDataBundle {
  version: number;
  timestamp: number;
  matches: MatchState[];
  currentMatchId?: string;
  savedSlipCards?: any[];
  source?: string;
}

export const TARGET_PAGES_URL = 'https://md-akbor-hosen.pages.dev';

/**
 * Encode bundle into a URL-safe compact string
 */
export function encodeSyncBundle(bundle: SyncDataBundle): string {
  try {
    const jsonStr = JSON.stringify(bundle);
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode sync bundle:', err);
    return '';
  }
}

/**
 * Decode bundle from URL-safe compact string
 */
export function decodeSyncBundle(token: string): SyncDataBundle | null {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.matches)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to decode sync bundle:', err);
  }
  return null;
}

/**
 * Build a 1-click URL that opens md-akbor-hosen.pages.dev with this data
 */
export function buildPagesSyncUrl(bundle: SyncDataBundle, customDomain?: string): string {
  const token = encodeSyncBundle(bundle);
  const base = (customDomain || TARGET_PAGES_URL).replace(/\/+$/, '');
  return `${base}/#sync=${token}`;
}

/**
 * Download bundle as JSON file
 */
export function downloadBackupJsonFile(bundle: SyncDataBundle, filename = 'cricket_matches_backup.json') {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
