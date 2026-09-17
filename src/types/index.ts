// Core types for ScriptMaster

export interface UserScript {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  code: string;
  enabled: boolean;
  matches: string[];
  excludeMatches?: string[];
  runAt: 'document-start' | 'document-body' | 'document-end' | 'document-idle';
  grant: string[];
  require?: string[];
  resource?: Resource[];
  installUrl?: string;
  updateUrl?: string;
  createdAt: number;
  updatedAt: number;
  lastExecutedAt?: number;
  executionCount: number;
}

export interface Resource {
  name: string;
  url: string;
  content?: string;
  mimeType?: string;
}

export interface ScriptMetadata {
  name: string;
  description?: string;
  version: string;
  author?: string;
  match: string[];
  excludeMatch?: string[];
  grant: string[];
  require?: string[];
  resource?: { name: string; url: string }[];
  runAt?: 'document-start' | 'document-body' | 'document-end' | 'document-idle';
  installUrl?: string;
  updateUrl?: string;
}

export interface StorageData {
  scripts: Record<string, UserScript>;
  settings: Settings;
  backups: Backup[];
}

export interface Settings {
  autoUpdate: boolean;
  updateInterval: number; // minutes
  showBadge: boolean;
  enableNotifications: boolean;
  syncAcrossDevices: boolean;
  safeMode: boolean; // Sandboxed execution
}

export interface Backup {
  id: string;
  timestamp: number;
  scripts: UserScript[];
  settings: Settings;
}

export type MessageAction = 
  | 'GET_SCRIPTS'
  | 'SAVE_SCRIPT'
  | 'DELETE_SCRIPT'
  | 'TOGGLE_SCRIPT'
  | 'EXECUTE_SCRIPT'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'CREATE_BACKUP'
  | 'RESTORE_BACKUP'
  | 'IMPORT_SCRIPT'
  | 'EXPORT_SCRIPT'
  | 'CHECK_UPDATES';

export interface Message {
  action: MessageAction;
  payload?: any;
  scriptId?: string;
}

export interface ScriptExecutionResult {
  success: boolean;
  error?: string;
  logs?: string[];
}
