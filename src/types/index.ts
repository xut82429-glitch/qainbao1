/**
 * ScriptMaster Enterprise - Core Type Definitions
 * Enterprise-grade browser script manager with AI, P2P ecosystem and advanced security
 */

// Script metadata following GM/TM standards
export interface ScriptMetadata {
  name: string;
  namespace?: string;
  version: string;
  description?: string;
  author?: string;
  match: string[];
  exclude?: string[];
  require?: string[];
  resource?: Record<string, string>;
  grant: GM_Grant[];
  connect?: string[];
  runAt?: 'document-start' | 'document-end' | 'document-idle';
  noFrame?: boolean;
  unwrap?: boolean;
  downloadMode?: 'native' | 'disabled';
  updateURL?: string;
  supportURL?: string;
  homepage?: string;
  icon?: string;
  defaultInclude?: string;
}

export interface GM_Grant {
  permission: string;
  scope?: 'global' | 'page';
}

// Script states and lifecycle
export enum ScriptStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  PENDING = 'pending',
}

export interface ScriptExecutionStats {
  runCount: number;
  lastRun?: number;
  avgExecutionTime: number;
  errorCount: number;
  lastError?: ScriptError;
}

export interface ScriptError {
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
}

// Complete script object
export interface UserScript {
  id: string;
  uuid: string;
  metadata: ScriptMetadata;
  code: string;
  status: ScriptStatus;
  createdAt: number;
  updatedAt: number;
  lastModified: number;
  stats: ScriptExecutionStats;
  tags: string[];
  isLibrary: boolean;
  dependencies: string[];
  checksum: string;
  signature?: string; // For verified scripts
  authorVerified?: boolean;
}

// Security analysis results
export interface SecurityAnalysis {
  score: number; // 0-100
  level: 'safe' | 'caution' | 'dangerous' | 'critical';
  issues: SecurityIssue[];
  permissions: string[];
  externalConnections: string[];
  dangerousPatterns: DangerousPattern[];
  recommendations: string[];
  analyzedAt: number;
}

export interface SecurityIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  rule: string;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface DangerousPattern {
  type: 'eval' | 'innerHTML' | 'document.write' | 'fetch' | 'websocket' | 'storage' | 'cookie';
  location: { line: number; column: number };
  context: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Sandbox execution environment
export interface SandboxConfig {
  isolationLevel: 'strict' | 'moderate' | 'relaxed';
  timeout: number;
  memoryLimit: number;
  networkAccess: boolean;
  storageAccess: 'none' | 'isolated' | 'full';
  domAccess: 'none' | 'restricted' | 'full';
  allowedGlobals: string[];
  blockedGlobals: string[];
}

export interface SandboxResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ScriptError;
  executionTime: number;
  memoryUsed: number;
}

// P2P Ecosystem types
export interface PeerInfo {
  peerId: string;
  publicKey: string;
  reputation: number;
  scriptsShared: number;
  scriptsDownloaded: number;
  verified: boolean;
  lastSeen: number;
}

export interface ScriptShare {
  scriptId: string;
  shareId: string;
  owner: string;
  metadata: ScriptMetadata;
  checksum: string;
  signature: string;
  license: string;
  sharedAt: number;
  downloads: number;
  rating: number;
  reviews: ScriptReview[];
}

export interface ScriptReview {
  reviewer: string;
  rating: number;
  comment: string;
  timestamp: number;
  helpful: number;
}

export interface MarketplaceListing {
  scriptId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price?: number; // For premium scripts
  currency?: string;
  author: PeerInfo;
  downloads: number;
  rating: number;
  featured: boolean;
  verified: boolean;
}

// AI Assistant types
export interface AIAnalysis {
  suggestions: CodeSuggestion[];
  vulnerabilities: VulnerabilityReport[];
  optimizations: OptimizationTip[];
  documentation: DocumentationSnippet[];
  confidence: number;
}

export interface CodeSuggestion {
  type: 'refactor' | 'optimize' | 'fix' | 'enhance';
  original: string;
  suggested: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export interface VulnerabilityReport {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: { line: number; column: number; endLine: number; endColumn: number };
  description: string;
  fix: string;
  cwe?: string;
}

export interface OptimizationTip {
  category: 'performance' | 'memory' | 'readability' | 'security';
  suggestion: string;
  before: string;
  after: string;
  estimatedImprovement: string;
}

export interface DocumentationSnippet {
  function: string;
  params: ParamDoc[];
  returns: string;
  examples: string[];
  links: string[];
}

export interface ParamDoc {
  name: string;
  type: string;
  description: string;
  optional: boolean;
}

// Storage and persistence
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface BackupData {
  version: string;
  timestamp: number;
  scripts: UserScript[];
  settings: UserSettings;
  bookmarks: Bookmark[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  scriptName: string;
  reason: string;
  line?: number;
}

// User settings and preferences
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  editor: EditorSettings;
  security: SecuritySettings;
  sync: SyncSettings;
  notifications: NotificationSettings;
  advanced: AdvancedSettings;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  suggestOnTriggerCharacters: boolean;
  quickSuggestions: boolean;
}

export interface SecuritySettings {
  autoAnalyze: boolean;
  blockDangerousScripts: boolean;
  warnOnExternalConnections: boolean;
  sandboxLevel: 'strict' | 'moderate' | 'relaxed';
  allowEval: boolean;
  logExecution: boolean;
}

export interface SyncSettings {
  enabled: boolean;
  provider: 'local' | 'webdav' | 'git';
  endpoint?: string;
  credentials?: EncryptedCredentials;
  autoSync: boolean;
  syncInterval: number;
}

export interface EncryptedCredentials {
  username: string;
  encryptedPassword: string;
  salt: string;
}

export interface NotificationSettings {
  scriptUpdates: boolean;
  securityAlerts: boolean;
  syncErrors: boolean;
  marketplaceNotifications: boolean;
}

export interface AdvancedSettings {
  debugMode: boolean;
  verboseLogging: boolean;
  customGMAPIs: Record<string, unknown>;
  experimentalFeatures: string[];
}

// Bookmarks and collections
export interface Bookmark {
  id: string;
  scriptId: string;
  folder?: string;
  notes?: string;
  createdAt: number;
  tags: string[];
}

export interface ScriptCollection {
  id: string;
  name: string;
  description: string;
  scriptIds: string[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

// Performance profiling
export interface PerformanceProfile {
  scriptId: string;
  totalExecutionTime: number;
  avgExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  memoryProfile: MemoryProfile;
  callStack: CallStackEntry[];
  bottlenecks: Bottleneck[];
}

export interface MemoryProfile {
  peakUsage: number;
  avgUsage: number;
  leaks: MemoryLeak[];
}

export interface MemoryLeak {
  type: string;
  size: number;
  location: string;
  recommendation: string;
}

export interface CallStackEntry {
  function: string;
  file: string;
  line: number;
  column: number;
  duration: number;
  calls: number;
}

export interface Bottleneck {
  location: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

// Event system
export type EventType =
  | 'script:created'
  | 'script:updated'
  | 'script:deleted'
  | 'script:enabled'
  | 'script:disabled'
  | 'script:error'
  | 'script:executed'
  | 'security:analysis'
  | 'security:alert'
  | 'p2p:peer-connected'
  | 'p2p:peer-disconnected'
  | 'p2p:script-shared'
  | 'p2p:script-downloaded'
  | 'ai:analysis-complete'
  | 'sync:start'
  | 'sync:complete'
  | 'sync:error'
  | 'settings:changed';

export interface ScriptMasterEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: number;
  source: 'user' | 'system' | 'external';
}

// Chrome extension messaging
export interface MessageRequest {
  action: MessageAction;
  payload?: unknown;
  scriptId?: string;
}

export type MessageAction =
  | 'getScripts'
  | 'getScript'
  | 'saveScript'
  | 'deleteScript'
  | 'toggleScript'
  | 'analyzeScript'
  | 'executeScript'
  | 'getStats'
  | 'backup'
  | 'restore'
  | 'share'
  | 'download'
  | 'search'
  | 'getSettings'
  | 'updateSettings';

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
