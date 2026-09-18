import { Message } from '../types';

/**
 * Content script for ScriptMaster
 * Acts as a bridge between injected scripts and the background service worker
 */

// Listen for messages from background or injected scripts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
chrome.runtime.onMessage.addListener(
  (message: any, sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true;
  }
);

async function handleMessage(message: Message): Promise<any> {
  const { action, payload } = message;

  switch (action) {
    case 'EXECUTE_SCRIPT': {
      return executeScript(payload.code, payload.id);
    }

    default:
      return { error: `Unknown action in content script: ${action}` };
  }
}

/**
 * Execute a userscript in the page context
 */
function executeScript(code: string, scriptId: string) {
  try {
    // Create GM API object
    const GM = createGMAPI(scriptId);

    // Wrap and execute the script
    const wrappedCode = `
      (function(GM) {
        try {
          ${code}
        } catch (error) {
          console.error('[ScriptMaster] Error in script ${scriptId}:', error);
          throw error;
        }
      })(window.ScriptMasterGM)
    `;

    // Inject into page context via script tag
    const script = document.createElement('script');
    script.textContent = `
      window.ScriptMasterGM = ${JSON.stringify(GM)};
      ${wrappedCode}
      delete window.ScriptMasterGM;
    `;
    
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    return { success: true };
  } catch (error: any) {
    console.error('[ScriptMaster] Failed to execute script:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create the GM API object with all available methods
 */
function createGMAPI(scriptId: string) {
  return {
    info: {
      scriptId,
      scriptMetaStr: '',
    },

    log: (...args: any[]) => {
      console.log(`[ScriptMaster:${scriptId}]`, ...args);
    },

    getValue: (key: string, defaultValue?: any) => {
      return new Promise((resolve) => {
        chrome.storage.local.get([`script_${scriptId}_${key}`], (result) => {
          resolve(result[`script_${scriptId}_${key}`] ?? defaultValue);
        });
      });
    },

    setValue: (key: string, value: any) => {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [`script_${scriptId}_${key}`]: value }, () => resolve(undefined));
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
      return style;
    },

    notification: (text: string, onclick?: () => void) => {
      chrome.runtime.sendMessage({
        action: 'SHOW_NOTIFICATION',
        payload: { text, scriptId },
      });
      
      if (onclick) {
        chrome.notifications.onClicked.addListener((notificationId) => {
          onclick();
          chrome.notifications.clear(notificationId);
        });
      }
    },

    xmlHttpRequest: (details: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      data?: any;
      onload?: (response: any) => void;
      onerror?: (error: any) => void;
    }) => {
      const xhr = new XMLHttpRequest();
      xhr.open(details.method || 'GET', details.url, true);

      if (details.headers) {
        Object.entries(details.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.onload = () => {
        details.onload?.({
          finalUrl: xhr.responseURL || details.url,
          readyState: 4,
          responseHeaders: xhr.getAllResponseHeaders(),
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.response,
          responseText: xhr.responseText,
          responseXML: xhr.responseXML,
        });
      };

      xhr.onerror = () => {
        details.onerror?.({
          error: 'Network error',
        });
      };

      xhr.send(details.data || null);

      return {
        abort: () => xhr.abort(),
      };
    },

    setClipboard: (text: string) => {
      return navigator.clipboard.writeText(text);
    },

    openInTab: (url: string, options?: { active?: boolean }) => {
      chrome.runtime.sendMessage({
        action: 'OPEN_TAB',
        payload: { url, active: options?.active ?? true },
      });
    },

    registerMenuCommand: (caption: string, onClick: () => void) => {
      // Store menu commands for popup to access
      const menuCommands = (window as any)._scriptMasterMenuCommands || [];
      menuCommands.push({ caption, onClick, scriptId });
      (window as any)._scriptMasterMenuCommands = menuCommands;
    },

    getTab: () => {
      return new Promise((resolve) => {
        chrome.tabs.getCurrent((tab) => {
          resolve(tab);
        });
      });
    },

    saveTab: (_tabId: number) => {
      // Custom method to save tab reference
      return Promise.resolve(true);
    },
  };
}

// Signal that content script is ready
console.log('[ScriptMaster] Content script loaded');

// Notify background script
chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_LOADED' });
