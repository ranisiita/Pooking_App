import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage: Record<string, string> = {};

export async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key) ?? memoryStorage[key] ?? null;
    } catch {
      return memoryStorage[key] ?? null;
    }
  }
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) return value;
  } catch (e) {}
  return memoryStorage[key] ?? null;
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  memoryStorage[key] = value;
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {}
}

export async function removeStorageItem(key: string): Promise<void> {
  delete memoryStorage[key];
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {}
}
