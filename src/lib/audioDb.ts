/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Offline IndexedDB Storage for Personalized Notification Melodies
const DB_NAME = 'ScheduleProAudioDB';
const STORE_NAME = 'custom_sounds';
const DB_VERSION = 1;

export interface CustomSoundMetadata {
  id: string; // 'start' | 'end' | 'reminder' | 'pomodoro' or custom id
  name: string;
  type: string;
  base64Data: string;
  duration?: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open.');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveCustomSound = async (
  id: string,
  name: string,
  type: string,
  file: File
): Promise<CustomSoundMetadata> => {
  // Validate file type
  const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
  const fileExt = name.split('.').pop()?.toLowerCase() || '';
  
  if (!allowedExtensions.includes(fileExt) && !type.startsWith('audio/')) {
    throw new Error('Неподдерживаемый формат аудио. Пожалуйста, используйте MP3, WAV, OGG или M4A.');
  }

  // Convert to Base64 to store in IndexedDB stably across older webviews and Safaris
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the pure base64 part
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const metadata: CustomSoundMetadata = {
    id,
    name,
    type: type || `audio/${fileExt}`,
    base64Data
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(metadata);

    request.onsuccess = () => resolve(metadata);
    request.onerror = () => reject(request.error);
  });
};

export const getCustomSound = async (id: string): Promise<CustomSoundMetadata | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, returning default null:', err);
    return null;
  }
};

export const deleteCustomSound = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const listAllCustomSounds = async (): Promise<CustomSoundMetadata[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not list IndexedDB entries, returning empty array:', err);
    return [];
  }
};

export const getSoundAudioUrl = (metadata: CustomSoundMetadata): string => {
  try {
    const binaryString = atob(metadata.base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: metadata.type });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error creating ObjectURL from base64:', err);
    return '';
  }
};
