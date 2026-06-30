import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { AppData } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add required Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.metadata');

// In-memory token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we have a user but no cached token, they might need to sign in again to obtain a fresh token
        // since Firebase Auth token != Google OAuth Access Token (stored in popup result).
        if (!isSigningIn && onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup to retrieve OAuth access token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token from authentication.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Get the current access token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Set token manually (e.g. on manual login)
export const setAccessToken = (token: string | null): void => {
  cachedAccessToken = token;
};

// --- GOOGLE DRIVE API FUNCTIONS ---

const BACKUP_FILE_NAME = 'hapania_association_backup.json';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

/**
 * Find the backup file in Google Drive
 */
export const findBackupFile = async (token: string): Promise<DriveFileInfo | null> => {
  try {
    const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Failed to search Google Drive: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0] as DriveFileInfo;
    }
    return null;
  } catch (err) {
    console.error('Error finding backup file:', err);
    throw err;
  }
};

/**
 * Download app data from Google Drive by file ID
 */
export const downloadBackupData = async (token: string, fileId: string): Promise<AppData> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download backup data: ${response.statusText}`);
    }

    const data = await response.json();
    return data as AppData;
  } catch (err) {
    console.error('Error downloading backup data:', err);
    throw err;
  }
};

/**
 * Save / Upload backup data to Google Drive
 * If file already exists, it will update the content (PATCH).
 * If not, it will create a new file (POST).
 */
export const saveBackupToDrive = async (token: string, appData: AppData): Promise<DriveFileInfo> => {
  try {
    // 1. Search if the file already exists
    const existingFile = await findBackupFile(token);
    const contentString = JSON.stringify(appData, null, 2);

    if (existingFile) {
      // 2. Update existing file content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const updateResponse = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: contentString
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update backup on Drive: ${updateResponse.statusText}`);
      }

      // Also let's fetch metadata to get updated modifiedTime
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${existingFile.id}?fields=id,name,modifiedTime`;
      const metaResponse = await fetch(metaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (metaResponse.ok) {
        return await metaResponse.json() as DriveFileInfo;
      }
      return existingFile;
    } else {
      // 3. Create a new file in two steps to be safe and simple
      // Step A: Create file metadata
      const createMetaUrl = 'https://www.googleapis.com/drive/v3/files';
      const metaResponse = await fetch(createMetaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: BACKUP_FILE_NAME,
          mimeType: 'application/json',
          description: 'Hapania Somiti Management System Backup File'
        })
      });

      if (!metaResponse.ok) {
        throw new Error(`Failed to create backup metadata: ${metaResponse.statusText}`);
      }

      const fileMetadata = await metaResponse.json();
      const fileId = fileMetadata.id;

      // Step B: Upload file content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const contentResponse = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: contentString
      });

      if (!contentResponse.ok) {
        throw new Error(`Failed to upload backup content: ${contentResponse.statusText}`);
      }

      // Fetch full file info back
      const finalMetaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime`;
      const finalResponse = await fetch(finalMetaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (finalResponse.ok) {
        return await finalResponse.json() as DriveFileInfo;
      }

      return {
        id: fileId,
        name: BACKUP_FILE_NAME,
        modifiedTime: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('Error saving backup to Drive:', err);
    throw err;
  }
};
