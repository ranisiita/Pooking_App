import { Platform } from 'react-native';

const memoryStorage: Record<string, string> = {};

export async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key) ?? memoryStorage[key] ?? null;
    } catch {
      return memoryStorage[key] ?? null;
    }
  }
  return memoryStorage[key] ?? null;
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  memoryStorage[key] = value;
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  delete memoryStorage[key];
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
