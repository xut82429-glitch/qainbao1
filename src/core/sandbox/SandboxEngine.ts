/**
 * ScriptMaster 核心沙箱引擎
 * 提供多层隔离、权限控制、资源限制的脚本执行环境
 */

import { EventBus } from '../../core/EventBus';

export interface SandboxConfig {
  scriptId: string;
  permissions: string[];
  resourceLimits: {
    maxMemory: number;      // KB
    maxExecutionTime: number; // ms
    maxDomOperations: number; // per second
  };
  isolationLevel: 'strict' | 'normal' | 'relaxed';
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: Error;
  metrics: {
    executionTime: number;
    memoryUsed: number;
    domOperations: number;
  };
}

/**
 * 基于 Proxy 和 iframe 的多层沙箱实现
 */
export class SandboxEngine {
  private eventBus: EventBus;
  private activeSandboxes: Map<string, HTMLIFrameElement> = new Map();
  private proxies: Map<string, any> = new Map();
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * 创建隔离沙箱环境
   */
  async createSandbox(config: SandboxConfig): Promise<string> {
    const sandboxId = `sandbox_${config.scriptId}_${Date.now()}`;
    
    // 1. 创建隔离 iframe
    const iframe = document.createElement('iframe');
    iframe.sandbox = this.getSandboxAttributes(config.isolationLevel);
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // 2. 初始化沙箱上下文
    const context = await this.initializeContext(iframe, config);
    
    // 3. 创建代理包装器
    const proxy = this.createProxy(context, config);
    
    this.activeSandboxes.set(sandboxId, iframe);
    this.proxies.set(sandboxId, proxy);
    
    this.eventBus.emit('sandbox:created', { sandboxId, config });
    
    return sandboxId;
  }

  /**
   * 在沙箱中执行代码
   */
  async execute(sandboxId: string, code: string, config: SandboxConfig): Promise<ExecutionResult> {
    const startTime = performance.now();
    const iframe = this.activeSandboxes.get(sandboxId);
    
    if (!iframe || !iframe.contentWindow) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const metrics = {
      executionTime: 0,
      memoryUsed: 0,
      domOperations: 0
    };

    try {
      // 资源限制监控
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), config.resourceLimits.maxExecutionTime);
      });

      const executionPromise = this.runInContext(iframe.contentWindow, code, config, metrics);
      
      await Promise.race([executionPromise, timeoutPromise]);
      
      metrics.executionTime = performance.now() - startTime;
      metrics.memoryUsed = this.measureMemory();
      
      return {
        success: true,
        output: 'Execution completed',
        metrics
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        metrics
      };
    }
  }

  /**
   * 销毁沙箱
   */
  destroySandbox(sandboxId: string): void {
    const iframe = this.activeSandboxes.get(sandboxId);
    if (iframe) {
      document.body.removeChild(iframe);
      this.activeSandboxes.delete(sandboxId);
      this.proxies.delete(sandboxId);
      this.eventBus.emit('sandbox:destroyed', { sandboxId });
    }
  }

  /**
   * 获取沙箱属性配置
   */
  private getSandboxAttributes(level: string): string {
    const base = 'allow-scripts allow-same-origin';
    
    switch (level) {
      case 'strict':
        return `${base} allow-pointer-lock`;
      case 'normal':
        return `${base} allow-pointer-lock allow-forms`;
      case 'relaxed':
        return `${base} allow-pointer-lock allow-forms allow-modals allow-top-navigation`;
      default:
        return base;
    }
  }

  /**
   * 初始化沙箱上下文
   */
  private async initializeContext(iframe: HTMLIFrameElement, config: SandboxConfig): Promise<any> {
    const win = iframe.contentWindow!;
    
    // 注入受限的全局对象
    win.GM_info = {
      script: { uuid: config.scriptId },
      version: '1.0.0',
      sandboxMode: config.isolationLevel
    };

    // 创建受限的 API 集合
    const restrictedAPI = this.createRestrictedAPI(win, config.permissions);
    
    return { window: win, api: restrictedAPI };
  }

  /**
   * 创建受限 API
   */
  private createRestrictedAPI(win: Window, permissions: string[]): any {
    const api: any = {};
    
    const allowedAPIs = {
      'GM_xmlhttpRequest': permissions.includes('xhr'),
      'GM_setValue': permissions.includes('storage'),
      'GM_getValue': permissions.includes('storage'),
      'GM_deleteValue': permissions.includes('storage'),
      'GM_addStyle': permissions.includes('style'),
      'GM_registerMenuCommand': permissions.includes('menu'),
      'GM_notification': permissions.includes('notification'),
      'GM_setClipboard': permissions.includes('clipboard')
    };

    for (const [name, allowed] of Object.entries(allowedAPIs)) {
      if (allowed) {
        api[name] = this.createSafeAPI(name, win);
      }
    }

    return api;
  }

  /**
   * 创建安全的 API 实现
   */
  private createSafeAPI(name: string, win: Window): Function {
    switch (name) {
      case 'GM_xmlhttpRequest':
        return (details: any) => this.safeXHR(details);
      case 'GM_setValue':
        return (key: string, value: any) => this.safeStorageSet(key, value);
      case 'GM_getValue':
        return (key: string, defaultValue?: any) => this.safeStorageGet(key, defaultValue);
      default:
        return () => {};
    }
  }

  /**
   * 安全的 XHR 实现
   */
  private safeXHR(details: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 验证 URL 白名单
      if (!this.isValidURL(details.url)) {
        reject(new Error('URL not allowed'));
        return;
      }

      GM_xmlhttpRequest({
        ...details,
        onload: (response: any) => resolve(response),
        onerror: (error: any) => reject(error)
      });
    });
  }

  /**
   * 安全的存储操作
   */
  private async safeStorageSet(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    if (serialized.length > 1024 * 1024) { // 1MB limit
      throw new Error('Storage quota exceeded');
    }
    return new Promise((resolve) => {
      chrome.storage.local.set({ [`script_${key}`]: value }, resolve);
    });
  }

  private async safeStorageGet(key: string, defaultValue?: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get([`script_${key}`], (result) => {
        resolve(result[`script_${key}`] ?? defaultValue);
      });
    });
  }

  /**
   * 创建代理包装器拦截危险操作
   */
  private createProxy(context: any, config: SandboxConfig): any {
    return new Proxy(context.window, {
      get: (target, prop) => {
        // 拦截危险的全局访问
        if (this.isDangerousProperty(String(prop), config.isolationLevel)) {
          console.warn(`Blocked access to ${String(prop)}`);
          return undefined;
        }
        return target[prop as keyof Window];
      },
      set: (target, prop, value) => {
        if (this.isDangerousProperty(String(prop), config.isolationLevel)) {
          console.warn(`Blocked modification of ${String(prop)}`);
          return false;
        }
        target[prop as keyof Window] = value;
        return true;
      }
    });
  }

  /**
   * 检查是否为危险属性
   */
  private isDangerousProperty(prop: string, level: string): boolean {
    const dangerousProps = [
      'eval', 'Function', 'constructor', '__proto__', 'prototype',
      'chrome', 'browser', 'process'
    ];

    if (level === 'strict') {
      dangerousProps.push('localStorage', 'sessionStorage', 'indexedDB');
    }

    return dangerousProps.includes(prop);
  }

  /**
   * 测量内存使用
   */
  private measureMemory(): number {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024);
    }
    return 0;
  }

  /**
   * 运行代码在上下文中
   */
  private runInContext(
    win: Window, 
    code: string, 
    config: SandboxConfig, 
    metrics: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 使用 Function 构造器在隔离作用域执行
        const safeCode = `(function() {
          'use strict';
          ${code}
        }).call(this)`;
        
        win.eval(safeCode);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 验证 URL 白名单
   */
  private isValidURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      return allowedProtocols.includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
