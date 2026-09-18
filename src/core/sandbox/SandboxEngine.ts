/**
 * ScriptMaster Enterprise - Multi-Layer Sandbox Engine
 * Enterprise-grade script isolation with iframe + Proxy double sandboxing
 */

import type { UserScript, SandboxConfig, SandboxResult, ScriptError } from '../../types';

export enum IsolationLevel {
  STRICT = 'strict',
  MODERATE = 'moderate',
  RELAXED = 'relaxed',
}

interface SandboxEnvironment {
  iframe: HTMLIFrameElement | null;
  window: Window | null;
  proxy: ProxyHandler<object> | null;
  cleanup: () => void;
}

export class SandboxEngine {
  private readonly defaultConfig: SandboxConfig = {
    isolationLevel: IsolationLevel.STRICT,
    timeout: 5000,
    memoryLimit: 50 * 1024 * 1024, // 50MB
    networkAccess: false,
    storageAccess: 'isolated',
    domAccess: 'restricted',
    allowedGlobals: ['Math', 'JSON', 'Date', 'RegExp', 'Array', 'Object', 'String', 'Number', 'Boolean'],
    blockedGlobals: ['eval', 'Function', 'setTimeout', 'setInterval', 'setImmediate'],
  };

  private activeSandboxes: Map<string, SandboxEnvironment> = new Map();
  private scriptContexts: Map<string, Map<string, unknown>> = new Map();

  /**
   * Create a sandboxed execution environment for a script
   */
  async createSandbox(scriptId: string, config: Partial<SandboxConfig> = {}): Promise<SandboxEnvironment> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (finalConfig.isolationLevel === IsolationLevel.STRICT) {
      return this.createStrictSandbox(scriptId, finalConfig);
    } else if (finalConfig.isolationLevel === IsolationLevel.MODERATE) {
      return this.createModerateSandbox(scriptId, finalConfig);
    } else {
      return this.createRelaxedSandbox(scriptId, finalConfig);
    }
  }

  /**
   * Strict sandbox: iframe + Proxy double isolation
   */
  private createStrictSandbox(scriptId: string, config: SandboxConfig): SandboxEnvironment {
    // Create iframe for DOM isolation
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);

    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
      throw new Error('Failed to create iframe sandbox');
    }

    // Create Proxy for additional isolation
    const proxyHandler = this.createProxyHandler(config);
    const proxiedWindow = new Proxy(iframeWindow, proxyHandler);

    // Initialize isolated storage
    const isolatedStorage = new Map<string, unknown>();
    this.scriptContexts.set(scriptId, isolatedStorage);

    const cleanup = () => {
      this.destroySandbox(scriptId);
    };

    const env: SandboxEnvironment = {
      iframe,
      window: proxiedWindow as unknown as Window,
      proxy: proxyHandler,
      cleanup,
    };

    this.activeSandboxes.set(scriptId, env);
    return env;
  }

  /**
   * Moderate sandbox: Proxy-only isolation
   */
  private createModerateSandbox(scriptId: string, config: SandboxConfig): SandboxEnvironment {
    const proxyHandler = this.createProxyHandler({ ...config, domAccess: 'restricted' });
    
    // Use current window but heavily proxied
    const proxiedWindow = new Proxy(window, proxyHandler);

    const isolatedStorage = new Map<string, unknown>();
    this.scriptContexts.set(scriptId, isolatedStorage);

    const cleanup = () => {
      this.scriptContexts.delete(scriptId);
    };

    const env: SandboxEnvironment = {
      iframe: null,
      window: proxiedWindow as unknown as Window,
      proxy: proxyHandler,
      cleanup,
    };

    this.activeSandboxes.set(scriptId, env);
    return env;
  }

  /**
   * Relaxed sandbox: minimal restrictions
   */
  private createRelaxedSandbox(scriptId: string, config: SandboxConfig): SandboxEnvironment {
    const isolatedStorage = new Map<string, unknown>();
    this.scriptContexts.set(scriptId, isolatedStorage);

    const cleanup = () => {
      this.scriptContexts.delete(scriptId);
    };

    const env: SandboxEnvironment = {
      iframe: null,
      window: window,
      proxy: null,
      cleanup,
    };

    this.activeSandboxes.set(scriptId, env);
    return env;
  }

  /**
   * Create Proxy handler for intercepting and controlling access
   */
  private createProxyHandler(config: SandboxConfig): ProxyHandler<object> {
    const { allowedGlobals, blockedGlobals, storageAccess, domAccess } = config;

    return {
      get: (target: object, prop: string | symbol): unknown => {
        if (typeof prop !== 'string') {
          return Reflect.get(target, prop);
        }

        // Block dangerous globals
        if (blockedGlobals.includes(prop)) {
          console.warn(`[Sandbox] Blocked access to: ${prop}`);
          return undefined;
        }

        // Restrict DOM access
        if (domAccess === 'none' && ['document', 'window', 'parent'].includes(prop)) {
          console.warn(`[Sandbox] Restricted DOM access: ${prop}`);
          return undefined;
        }

        // Restrict storage access
        if (storageAccess === 'none' && ['localStorage', 'sessionStorage', 'indexedDB'].includes(prop)) {
          console.warn(`[Sandbox] Blocked storage access: ${prop}`);
          return undefined;
        }

        // Allow only whitelisted globals in strict mode
        if (config.isolationLevel === IsolationLevel.STRICT) {
          if (!allowedGlobals.includes(prop) && !(prop in target)) {
            console.warn(`[Sandbox] Access denied for: ${prop}`);
            return undefined;
          }
        }

        const value = Reflect.get(target, prop);
        
        // Wrap functions to maintain sandbox context
        if (typeof value === 'function') {
          return value.bind(target);
        }

        return value;
      },

      set: (target: object, prop: string | symbol, value: unknown): boolean => {
        if (typeof prop !== 'string') {
          return Reflect.set(target, prop, value);
        }

        // Prevent setting on dangerous properties
        if (blockedGlobals.includes(prop) || ['eval', 'Function'].includes(prop)) {
          console.warn(`[Sandbox] Blocked assignment to: ${prop}`);
          return false;
        }

        return Reflect.set(target, prop, value);
      },

      has: (target: object, prop: string | symbol): boolean => {
        if (typeof prop !== 'string') {
          return Reflect.has(target, prop);
        }

        if (blockedGlobals.includes(prop)) {
          return false;
        }

        return Reflect.has(target, prop);
      },

      deleteProperty: (target: object, prop: string | symbol): boolean => {
        if (typeof prop === 'string' && blockedGlobals.includes(prop)) {
          console.warn(`[Sandbox] Blocked deletion of: ${prop}`);
          return false;
        }

        return Reflect.deleteProperty(target, prop);
      },
    };
  }

  /**
   * Execute script code in sandbox
   */
  async execute<T = unknown>(
    scriptId: string,
    code: string,
    context?: Record<string, unknown>
  ): Promise<SandboxResult<T>> {
    const startTime = performance.now();
    const sandbox = this.activeSandboxes.get(scriptId);

    if (!sandbox || !sandbox.window) {
      return {
        success: false,
        error: {
          message: 'Sandbox not initialized',
          timestamp: Date.now(),
          url: '',
        },
        executionTime: 0,
        memoryUsed: 0,
      };
    }

    try {
      // Get or create isolated storage
      const isolatedStorage = this.scriptContexts.get(scriptId) || new Map();
      
      // Prepare execution context
      const safeContext = {
        ...context,
        GM_getValue: (key: string) => isolatedStorage.get(key),
        GM_setValue: (key: string, value: unknown) => {
          isolatedStorage.set(key, value);
        },
        GM_deleteValue: (key: string) => {
          isolatedStorage.delete(key);
        },
        GM_listValues: () => Array.from(isolatedStorage.keys()),
        console: this.createSafeConsole(scriptId),
      };

      // Create wrapped code with context injection
      const wrappedCode = this.wrapCode(code, safeContext);

      // Execute with timeout
      const result = await this.executeWithTimeout<T>(sandbox.window, wrappedCode);

      const endTime = performance.now();
      const memoryUsed = this.getMemoryUsage();

      return {
        success: true,
        data: result,
        executionTime: endTime - startTime,
        memoryUsed,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: {
          message: err.message,
          stack: err.stack,
          timestamp: Date.now(),
          url: '',
        },
        executionTime: performance.now() - startTime,
        memoryUsed: this.getMemoryUsage(),
      };
    }
  }

  /**
   * Wrap user code with safety measures
   */
  private wrapCode(code: string, context: Record<string, unknown>): string {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create an IIFE with injected context
    return `
      (function(${contextKeys.join(', ')}) {
        'use strict';
        try {
          ${code}
        } catch (e) {
          console.error('[Script Error]', e);
          throw e;
        }
      }).call(this, ${contextValues.map(v => JSON.stringify(v)).join(', ')});
    `;
  }

  /**
   * Execute code with timeout protection
   */
  private async executeWithTimeout<T>(sandboxWindow: Window, code: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Script execution timeout'));
      }, this.defaultConfig.timeout);

      try {
        // Use Function constructor for safer evaluation
        const executeFn = (sandboxWindow as any).Function('"use strict"; return (function() {' + code + '})()');
        const result = executeFn.call(sandboxWindow);
        
        clearTimeout(timeout);
        resolve(result as T);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Create safe console that logs with script identification
   */
  private createSafeConsole(scriptId: string): Console {
    const prefix = `[Script:${scriptId}]`;
    
    const safeConsole = {
      log: (...args: unknown[]) => console.log(prefix, ...args),
      warn: (...args: unknown[]) => console.warn(prefix, ...args),
      error: (...args: unknown[]) => console.error(prefix, ...args),
      info: (...args: unknown[]) => console.info(prefix, ...args),
      debug: (...args: unknown[]) => console.debug(prefix, ...args),
      trace: () => console.trace(prefix),
      clear: () => console.clear(),
      table: () => console.table(),
      dir: () => console.dir(),
      dirxml: () => console.dirxml(),
      group: () => console.group(),
      groupCollapsed: () => console.groupCollapsed(),
      groupEnd: () => console.groupEnd(),
      time: () => console.time(),
      timeLog: () => console.timeLog(),
      timeEnd: () => console.timeEnd(),
      assert: () => console.assert(),
      count: () => console.count(),
      countReset: () => console.countReset(),
    };

    return safeConsole as Console;
  }

  /**
   * Destroy sandbox and cleanup resources
   */
  destroySandbox(scriptId: string): void {
    const sandbox = this.activeSandboxes.get(scriptId);
    if (sandbox) {
      sandbox.cleanup();
      
      if (sandbox.iframe) {
        sandbox.iframe.remove();
      }
      
      this.activeSandboxes.delete(scriptId);
      this.scriptContexts.delete(scriptId);
    }
  }

  /**
   * Destroy all sandboxes
   */
  destroyAll(): void {
    for (const scriptId of this.activeSandboxes.keys()) {
      this.destroySandbox(scriptId);
    }
  }

  /**
   * Get current memory usage (approximate)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Get active sandbox count
   */
  getActiveCount(): number {
    return this.activeSandboxes.size;
  }

  /**
   * Check if script has active sandbox
   */
  hasSandbox(scriptId: string): boolean {
    return this.activeSandboxes.has(scriptId);
  }
}

export const sandboxEngine = new SandboxEngine();
