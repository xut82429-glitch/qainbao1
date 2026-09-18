import { UserScript, ScriptMetadata } from '../types';

/**
 * Parse userscript metadata from code
 * Supports standard Tampermonkey/Greasemonkey metadata blocks
 */
export function parseMetadata(code: string): ScriptMetadata | null {
  const metaMatch = code.match(/\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  
  if (!metaMatch) {
    return null;
  }

  const metadata: Partial<ScriptMetadata> = {};
  const lines = metaMatch[1].split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;

    const key = parts[0].replace('@', '');
    const value = parts.slice(1).join(' ');

    switch (key) {
      case 'name':
        metadata.name = value;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'version':
        metadata.version = value;
        break;
      case 'author':
        metadata.author = value;
        break;
      case 'match':
        if (!metadata.match) metadata.match = [];
        metadata.match.push(value);
        break;
      case 'excludeMatch':
        if (!metadata.excludeMatch) metadata.excludeMatch = [];
        metadata.excludeMatch.push(value);
        break;
      case 'grant':
        if (!metadata.grant) metadata.grant = [];
        metadata.grant.push(value);
        break;
      case 'require':
        if (!metadata.require) metadata.require = [];
        metadata.require.push(value);
        break;
      case 'resource':
        if (!metadata.resource) metadata.resource = [];
        const [resName, resUrl] = value.split(/\s+/);
        metadata.resource.push({ name: resName, url: resUrl });
        break;
      case 'run-at':
        metadata.runAt = value as any;
        break;
      case 'installURL':
      case 'installUrl':
        metadata.installUrl = value;
        break;
      case 'updateURL':
      case 'updateUrl':
        metadata.updateUrl = value;
        break;
    }
  }

  // Validate required fields
  if (!metadata.name || !metadata.version) {
    return null;
  }

  // Default values
  if (!metadata.match) metadata.match = ['*'];
  if (!metadata.grant) metadata.grant = ['none'];
  if (!metadata.runAt) metadata.runAt = 'document-idle';

  return metadata as ScriptMetadata;
}

/**
 * Generate unique ID for scripts
 */
export function generateScriptId(): string {
  return `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate script code for security issues
 */
export function validateScript(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for metadata block
  if (!code.includes('// ==UserScript==')) {
    errors.push('Missing UserScript metadata block');
  }

  // Check for potentially dangerous patterns (in safe mode)
  const dangerousPatterns = [
    /eval\s*\(/,
    /new\s+Function\s*\(/,
    /document\.write\s*\(/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(`Potentially dangerous code pattern detected: ${pattern.source}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a UserScript object from code and metadata
 */
export function createUserScript(code: string): UserScript | null {
  const metadata = parseMetadata(code);
  
  if (!metadata) {
    return null;
  }

  const validation = validateScript(code);
  if (!validation.valid) {
    console.warn('Script validation warnings:', validation.errors);
  }

  const now = Date.now();
  
  return {
    id: generateScriptId(),
    name: metadata.name,
    description: metadata.description,
    version: metadata.version,
    author: metadata.author,
    code,
    enabled: true,
    matches: metadata.match,
    excludeMatches: metadata.excludeMatch,
    runAt: metadata.runAt || 'document-idle',
    grant: metadata.grant,
    require: metadata.require,
    resource: metadata.resource?.map(r => ({ name: r.name, url: r.url })),
    installUrl: metadata.installUrl,
    updateUrl: metadata.updateUrl,
    createdAt: now,
    updatedAt: now,
    executionCount: 0,
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Download file helper
 */
export function downloadFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
