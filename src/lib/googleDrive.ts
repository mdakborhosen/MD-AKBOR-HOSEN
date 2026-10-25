import { auth, signInWithGoogle, getCachedAccessToken, clearCachedAccessToken } from './googleCalendar';

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

export interface CricketAppStateBackup {
  appName: string;
  version: string;
  exportDate: string;
  backupTrigger?: string;
  matches: any[];
  currentMatchId?: string;
  schedule: any[];
  tournaments: any[];
  displayConfigs?: any;
  savedSlipCards?: any[];
  activeSlipCardId?: string;
}

const DAILY_FILE_ID_STORAGE_PREFIX = 'cricket_drive_daily_file_id_';

/**
 * Returns local calendar date string YYYY-MM-DD (so 1 entire day shares 1 date key)
 */
export const getTodayBackupDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDateKey = getTodayBackupDateKey;

export const getDailyBackupFileName = (dateKey: string = getTodayBackupDateKey()): string => {
  return `cricket-score-master-daily-backup-${dateKey}.json`;
};

const findExistingDailyBackupFileId = async (
  accessToken: string,
  dateKey: string
): Promise<string | null> => {
  const dailyFileName = getDailyBackupFileName(dateKey);
  const qRaw = `(name = '${dailyFileName}' or (appProperties has { key='backupApp' and value='cricket-score-master' } and appProperties has { key='backupDate' and value='${dateKey}' })) and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qRaw)}&fields=${encodeURIComponent('files(id,name,modifiedTime)')}&orderBy=modifiedTime desc&pageSize=5`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedAccessToken();
    }
    return null;
  }

  const data = await response.json().catch(() => ({}));
  const files: DriveBackupFile[] = Array.isArray(data?.files) ? data.files : [];
  return files[0]?.id || null;
};

/**
 * Upload or update the daily application state JSON file in Google Drive.
 * Strictly maintains 1 backup file per calendar day (updates existing file for today via PATCH,
 * or creates a new daily file via POST if none exists yet for today), unless a distinct manual customName is specified.
 */
export const uploadBackupToGoogleDrive = async (
  accessToken: string,
  backupData: CricketAppStateBackup,
  customName?: string
): Promise<{ id: string; name: string; updatedExisting?: boolean }> => {
  const dateKey = getTodayBackupDateKey();
  const trimmedCustom = customName ? customName.trim().replace(/\.json$/i, '') : '';
  const isDailyOrAuto =
    !trimmedCustom ||
    trimmedCustom.startsWith('cricket-score-master-auto-') ||
    trimmedCustom.startsWith('cricket-score-master-daily-backup-');

  const fileName = isDailyOrAuto
    ? getDailyBackupFileName(dateKey)
    : `${trimmedCustom}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `Cricket Score Master Daily Backup (${dateKey}) — Auto-updated every 1 hour`,
    appProperties: {
      backupApp: 'cricket-score-master',
      backupDate: dateKey,
    },
  };

  const boundary = '-------cricketscoreboundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    closeDelimiter;

  // If this is a daily/auto backup, check if today's single backup file already exists so we update it in-place
  let existingFileId: string | null = null;
  if (isDailyOrAuto) {
    try {
      existingFileId = localStorage.getItem(`${DAILY_FILE_ID_STORAGE_PREFIX}${dateKey}`);
    } catch {}
    if (!existingFileId) {
      existingFileId = await findExistingDailyBackupFileId(accessToken, dateKey);
    }
  }

  if (existingFileId) {
    const patchResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (patchResponse.ok) {
      const patchResult = await patchResponse.json();
      const resolvedId = patchResult.id || existingFileId;
      try {
        localStorage.setItem(`${DAILY_FILE_ID_STORAGE_PREFIX}${dateKey}`, resolvedId);
      } catch {}
      return {
        id: resolvedId,
        name: patchResult.name || fileName,
        updatedExisting: true,
      };
    }

    if (patchResponse.status === 401) {
      clearCachedAccessToken();
      const errorData = await patchResponse.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Failed to update daily backup in Google Drive (401)`);
    }

    // If 404 (file was deleted in Drive), clear cached ID and check Drive once before creating
    try {
      localStorage.removeItem(`${DAILY_FILE_ID_STORAGE_PREFIX}${dateKey}`);
    } catch {}
    const fallbackFoundId = await findExistingDailyBackupFileId(accessToken, dateKey);
    if (fallbackFoundId && fallbackFoundId !== existingFileId) {
      const retryPatch = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fallbackFoundId)}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );
      if (retryPatch.ok) {
        const retryResult = await retryPatch.json();
        try {
          localStorage.setItem(`${DAILY_FILE_ID_STORAGE_PREFIX}${dateKey}`, fallbackFoundId);
        } catch {}
        return {
          id: fallbackFoundId,
          name: retryResult.name || fileName,
          updatedExisting: true,
        };
      }
    }
  }

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedAccessToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to upload backup to Google Drive (${response.status})`);
  }

  const result = await response.json();
  if (isDailyOrAuto && result?.id) {
    try {
      localStorage.setItem(`${DAILY_FILE_ID_STORAGE_PREFIX}${dateKey}`, result.id);
    } catch {}
  }
  return { id: result.id, name: result.name || fileName, updatedExisting: false };
};

/**
 * List existing Cricket Score Master backup files from user's Google Drive
 */
export const listBackupsFromGoogleDrive = async (accessToken: string): Promise<DriveBackupFile[]> => {
  const query = encodeURIComponent(
    "(appProperties has { key='backupApp' and value='cricket-score-master' } or name contains 'cricket-score-master') and trashed = false"
  );
  const fields = encodeURIComponent("files(id, name, createdTime, modifiedTime, size)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=25`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedAccessToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list backup files from Google Drive (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Download a backup JSON file from Google Drive and return parsed app state
 */
export const downloadBackupFromGoogleDrive = async (
  accessToken: string,
  fileId: string
): Promise<CricketAppStateBackup> => {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to download file from Google Drive (${response.status})`);
  }

  const data = await response.json();
  return data;
};

/**
 * Delete a backup file from Google Drive (Mandatory user confirmation required prior to calling)
 */
export const deleteBackupFromGoogleDrive = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to delete file from Google Drive (${response.status})`);
  }
};
