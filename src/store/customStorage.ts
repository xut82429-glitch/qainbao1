import { PersistStorage } from 'zustand/middleware';
import { UserScript, Settings, Backup } from '../types';

interface ScriptMasterStorage {
  scripts: Record<string, UserScript>;
  settings: Settings;
  backups: Backup[];
}

/**
 * Custom storage adapter for Chrome extension local storage
 * Compatible with zustand persist middleware
 */
export const chromeStorageAdapter: PersistStorage<ScriptMasterStorage> = {
  getItem: async (name) => {
    try {
      const result = await chrome.storage.local.get([name]);
      return result[name] || null;
    } catch (error) {
      console.error('Failed to get item from chrome storage:', error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await chrome.storage.local.set({ [name]: value });
    } catch (error) {
      console.error('Failed to set item in chrome storage:', error);
    }
  },
  removeItem: async (name) => {
    try {
      await chrome.storage.local.remove([name]);
    } catch (error) {
      console.error('Failed to remove item from chrome storage:', error);
    }
  },
};
