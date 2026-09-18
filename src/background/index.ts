import { UserScript } from '../types';

/**
 * Background service worker for ScriptMaster
 * Handles script management, execution coordination, and cross-tab communication
 */

// Cache for active scripts per tab
const tabScripts: Map<number, string[]> = new Map();

// Initialize context menus
function initContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'scriptmaster-new-script',
      title: 'Create new script for this site',
      contexts: ['all'],
    });

    chrome.contextMenus.create({
      id: 'scriptmaster-run-scripts',
      title: 'Run scripts on this page',
      contexts: ['all'],
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scriptmaster-new-script') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html?action=new'),
    });
  } else if (info.menuItemId === 'scriptmaster-run-scripts') {
    if (tab?.id) {
      executeScriptsOnTab(tab.id);
    }
  }
});

// Handle messages from content scripts and popup/options pages
chrome.runtime.onMessage.addListener(
  (message: any, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Keep message channel open for async response
  }
);

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  const { action, payload, scriptId } = message;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _sender = sender; // Keep sender for potential future use

  switch (action) {
    case 'GET_SCRIPTS': {
      const result = await chrome.storage.local.get(['scripts']);
      return result.scripts || {};
    }

    case 'SAVE_SCRIPT': {
      const result = await chrome.storage.local.get(['scripts']);
      const scripts = result.scripts || {};
      scripts[payload.id] = payload;
      await chrome.storage.local.set({ scripts });
      updateBadge();
      return { success: true };
    }

    case 'DELETE_SCRIPT': {
      if (!scriptId) return { success: false, error: 'No script ID provided' };
      const result = await chrome.storage.local.get(['scripts']);
      const scripts = result.scripts || {};
      delete scripts[scriptId];
      await chrome.storage.local.set({ scripts });
      updateBadge();
      return { success: true };
    }

    case 'TOGGLE_SCRIPT': {
      if (!scriptId) return { success: false, error: 'No script ID provided' };
      const result = await chrome.storage.local.get(['scripts']);
      const scripts = result.scripts || {};
      if (scripts[scriptId]) {
        scripts[scriptId].enabled = !scripts[scriptId].enabled;
        scripts[scriptId].updatedAt = Date.now();
        await chrome.storage.local.set({ scripts });
        updateBadge();
      }
      return { success: true };
    }

    case 'GET_SETTINGS': {
      const result = await chrome.storage.local.get(['settings']);
      return result.settings || {};
    }

    case 'UPDATE_SETTINGS': {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};
      await chrome.storage.local.set({
        settings: { ...settings, ...payload },
      });
      return { success: true };
    }

    case 'CREATE_BACKUP': {
      const result = await chrome.storage.local.get(['scripts', 'settings', 'backups']);
      const backup = {
        id: `backup_${Date.now()}`,
        timestamp: Date.now(),
        scripts: Object.values(result.scripts || {}),
        settings: result.settings || {},
      };
      const backups = result.backups || [];
      backups.push(backup);
      await chrome.storage.local.set({ backups });
      return backup;
    }

    case 'RESTORE_BACKUP': {
      const result = await chrome.storage.local.get(['backups']);
      const backups = result.backups || [];
      const backup = backups.find((b: any) => b.id === payload);
      if (backup) {
        const scripts: Record<string, UserScript> = {};
        backup.scripts.forEach((s: UserScript) => {
          scripts[s.id] = s;
        });
        await chrome.storage.local.set({
          scripts,
          settings: backup.settings,
        });
        updateBadge();
        return { success: true };
      }
      return { success: false, error: 'Backup not found' };
    }

    case 'IMPORT_SCRIPT': {
      const result = await chrome.storage.local.get(['scripts']);
      const scripts = result.scripts || {};
      payload.forEach((script: UserScript) => {
        scripts[script.id] = script;
      });
      await chrome.storage.local.set({ scripts });
      updateBadge();
      return { success: true, count: payload.length };
    }

    case 'EXPORT_SCRIPT': {
      if (!scriptId) return { success: false, error: 'No script ID provided' };
      const result = await chrome.storage.local.get(['scripts']);
      const scripts = result.scripts || {};
      return scripts[scriptId] || null;
    }

    case 'CHECK_UPDATES': {
      // TODO: Implement update checking against updateUrl
      return { updates: [] };
    }

    default:
      return { error: `Unknown action: ${action}` };
  }
}

/**
 * Execute scripts on a specific tab
 */
async function executeScriptsOnTab(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    const result = await chrome.storage.local.get(['scripts', 'settings']);
    const scripts = Object.values(result.scripts || {}) as UserScript[];
    const settings = result.settings || {};

    // Filter scripts that match this URL and are enabled
    const matchingScripts = scripts.filter(
      (script) =>
        script.enabled &&
        script.matches.some((pattern) => matchPattern(pattern, tab.url!))
    );

    tabScripts.set(tabId, matchingScripts.map((s) => s.id));

    // Inject each script
    for (const script of matchingScripts) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: executeScriptCode,
          args: [script.code, script.id],
          injectImmediately: script.runAt === 'document-start',
        });

        // Update execution stats
        script.lastExecutedAt = Date.now();
        script.executionCount++;
      } catch (error) {
        console.error(`Failed to execute script ${script.name}:`, error);
        
        if (settings.enableNotifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Script Execution Failed',
            message: `Failed to execute: ${script.name}`,
          });
        }
      }
    }

    updateBadge();
  } catch (error) {
    console.error('Error executing scripts on tab:', error);
  }
}

/**
 * Function to be injected into pages
 * This runs in the content script context
 */
function executeScriptCode(code: string, scriptId: string) {
  try {
    // Create a safe execution environment with GM API
    const gmAPI = {
      info: {
        scriptId,
        scriptMetaStr: extractMetadata(code),
      },
      log: (...args: any[]) => console.log(`[ScriptMaster:${scriptId}]`, ...args),
      getValue: (key: string) => {
        return new Promise((resolve) => {
          chrome.storage.local.get([`script_${scriptId}_${key}`], (result) => {
            resolve(result[`script_${scriptId}_${key}`] || undefined);
          });
        });
      },
      setValue: (key: string, value: any) => {
        return new Promise((resolve) => {
          chrome.storage.local.set(
            { [`script_${scriptId}_${key}`]: value },
            () => resolve(undefined)
          );
        });
      },
      deleteValue: (key: string) => {
        return new Promise((resolve) => {
          chrome.storage.local.remove([`script_${scriptId}_${key}`], () => resolve(undefined));
        });
      },
      listValues: () => {
        return new Promise((resolve) => {
          chrome.storage.local.get(null, (result) => {
            const keys = Object.keys(result)
              .filter((k) => k.startsWith(`script_${scriptId}_`))
              .map((k) => k.replace(`script_${scriptId}_`, ''));
            resolve(keys);
          });
        });
      },
      addStyle: (css: string) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      },
      notification: (text: string) => {
        // Send notification to background
        chrome.runtime.sendMessage({
          action: 'SHOW_NOTIFICATION',
          payload: { text },
        });
      },
      xmlHttpRequest: (details: any) => {
        return new Promise((resolve, reject) => {
          fetch(details.url, {
            method: details.method || 'GET',
            headers: details.headers,
            body: details.data,
          })
            .then((response) => response.text())
            .then((text) => {
              details.onload &&
                details.onload({
                  finalUrl: details.url,
                  readyState: 4,
                  responseHeaders: '',
                  status: 200,
                  statusText: 'OK',
                  response: text,
                  responseText: text,
                });
              resolve(text);
            })
            .catch(reject);
        });
      },
    };

    // Create sandboxed execution
    const wrappedCode = `
      (function(GM) {
        try {
          ${code}
        } catch (error) {
          console.error('[ScriptMaster Error]', error);
          throw error;
        }
      })(gmAPI)
    `;

    // eslint-disable-next-line no-eval
    eval(wrappedCode);
    return { success: true };
  } catch (error: any) {
    console.error('[ScriptMaster Execution Error]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract metadata block from script code
 */
function extractMetadata(code: string): string {
  const match = code.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
  return match ? match[0] : '';
}

/**
 * Match URL pattern (simplified implementation)
 */
function matchPattern(pattern: string, url: string): boolean {
  try {
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

/**
 * Update extension badge with active script count
 */
async function updateBadge() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    const result = await chrome.storage.local.get(['scripts']);
    const scripts = Object.values(result.scripts || {}) as UserScript[];
    const url = tabs[0].url;

    if (url) {
      const count = scripts.filter(
        (s) =>
          s.enabled && s.matches.some((p) => matchPattern(p, url))
      ).length;

      if (count > 0) {
        chrome.action.setBadgeText({ text: count.toString(), tabId: tabs[0].id });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabs[0].id });
      } else {
        chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
      }
    }
  }
}

// Listen for tab updates to re-execute scripts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    executeScriptsOnTab(tabId);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateBadge();
  executeScriptsOnTab(tabId);
});

// Initialize on startup
initContextMenus();
updateBadge();
