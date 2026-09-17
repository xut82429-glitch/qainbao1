import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserScript, Settings, Backup } from '../types';
import { chromeStorageAdapter } from './customStorage';

interface ScriptStore {
  scripts: Record<string, UserScript>;
  settings: Settings;
  backups: Backup[];
  addScript: (script: UserScript) => void;
  updateScript: (id: string, updates: Partial<UserScript>) => void;
  deleteScript: (id: string) => void;
  toggleScript: (id: string) => void;
  getScript: (id: string) => UserScript | undefined;
  getEnabledScripts: () => UserScript[];
  getScriptsForUrl: (url: string) => UserScript[];
  updateSettings: (settings: Partial<Settings>) => void;
  createBackup: () => Backup;
  restoreBackup: (backupId: string) => void;
  importScripts: (scripts: UserScript[]) => void;
  exportScripts: () => UserScript[];
}

const defaultSettings: Settings = {
  autoUpdate: true,
  updateInterval: 24 * 60, // 24 hours
  showBadge: true,
  enableNotifications: true,
  syncAcrossDevices: false,
  safeMode: true,
};

export const useScriptStore = create<ScriptStore>()(
  persist(
    (set, get) => ({
      scripts: {},
      settings: defaultSettings,
      backups: [],

      addScript: (script) =>
        set((state) => ({
          scripts: { ...state.scripts, [script.id]: script },
        })),

      updateScript: (id, updates) =>
        set((state) => ({
          scripts: {
            ...state.scripts,
            [id]: { ...state.scripts[id], ...updates, updatedAt: Date.now() },
          },
        })),

      deleteScript: (id) =>
        set((state) => {
          const { [id]: removed, ...rest } = state.scripts;
          return { scripts: rest };
        }),

      toggleScript: (id) =>
        set((state) => ({
          scripts: {
            ...state.scripts,
            [id]: { ...state.scripts[id], enabled: !state.scripts[id].enabled },
          },
        })),

      getScript: (id) => get().scripts[id],

      getEnabledScripts: () =>
        Object.values(get().scripts).filter((s) => s.enabled),

      getScriptsForUrl: (url) => {
        const scripts = get().getEnabledScripts();
        return scripts.filter((script) =>
          script.matches.some((pattern) => matchPattern(pattern, url))
        );
      },

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      createBackup: () => {
        const state = get();
        const backup: Backup = {
          id: `backup_${Date.now()}`,
          timestamp: Date.now(),
          scripts: Object.values(state.scripts),
          settings: { ...state.settings },
        };
        set((state) => ({
          backups: [...state.backups, backup],
        }));
        return backup;
      },

      restoreBackup: (backupId) => {
        const backup = get().backups.find((b) => b.id === backupId);
        if (backup) {
          const scripts: Record<string, UserScript> = {};
          backup.scripts.forEach((s) => {
            scripts[s.id] = s;
          });
          set({ scripts, settings: { ...backup.settings } });
        }
      },

      importScripts: (scripts) => {
        const newScripts: Record<string, UserScript> = {};
        scripts.forEach((s) => {
          newScripts[s.id] = s;
        });
        set((state) => ({
          scripts: { ...state.scripts, ...newScripts },
        }));
      },

      exportScripts: () => Object.values(get().scripts),
    }),
    {
      name: 'scriptmaster-storage',
      storage: chromeStorageAdapter,
    }
  )
);

// Helper function to match URL patterns
function matchPattern(pattern: string, url: string): boolean {
  try {
    // Convert userscript pattern to RegExp
    let regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    if (regexStr.startsWith('^')) {
      regexStr = regexStr.slice(1);
    }
    if (!regexStr.endsWith('$')) {
      regexStr += '$';
    }
    
    const regex = new RegExp(regexStr);
    return regex.test(url);
  } catch {
    return false;
  }
}
