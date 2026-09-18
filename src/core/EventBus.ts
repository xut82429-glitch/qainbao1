/**
 * 全局事件总线
 * 模块间解耦通信的核心枢纽
 */

export type EventCallback<T = any> = (data: T) => void;

export interface EventMap {
  // 沙箱事件
  'sandbox:created': { sandboxId: string; config: any };
  'sandbox:destroyed': { sandboxId: string };
  
  // P2P 事件
  'p2p:initialized': { nodeId: string };
  'p2p:connected': void;
  'p2p:disconnected': void;
  'p2p:script-received': any;
  'p2p:script-available': any;
  'p2p:peer-discovered': any;
  
  // 调试器事件
  'debugger:attached': { tabId: number };
  'debugger:detached': void;
  'debugger:detached-unexpected': void;
  'debugger:paused': any;
  'debugger:resumed': void;
  'debugger:breakpoint-added': any;
  'debugger:breakpoint-removed': any;
  'debugger:breakpoint-hit': any;
  'debugger:breakpoint-resolved': any;
  'debugger:script-parsed': any;
  'debugger:step-over': void;
  'debugger:step-into': void;
  'debugger:step-out': void;
  'debugger:profiling-started': void;
  'debugger:profiling-stopped': any;
  
  // AI 助手事件
  'debug:session-started': { scriptId: string };
  'debug:breakpoint-added': { scriptId: string; lineNumber: number };
  'debug:breakpoint-removed': { scriptId: string; lineNumber: number };
  
  // 脚本管理事件
  'script:created': any;
  'script:updated': any;
  'script:deleted': string;
  'script:enabled': string;
  'script:disabled': string;
  
  // 通用事件
  'error': { message: string; error?: Error };
  'log': { level: string; message: string };
}

export class EventBus {
  private listeners: Map<keyof EventMap, Set<EventCallback>> = new Map();

  /**
   * 订阅事件
   */
  on<T extends keyof EventMap>(event: T, callback: EventCallback<EventMap[T]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
  }

  /**
   * 取消订阅
   */
  off<T extends keyof EventMap>(event: T, callback: EventCallback<EventMap[T]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  /**
   * 触发事件
   */
  emit<T extends keyof EventMap>(event: T, data?: EventMap[T]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * 一次性订阅
   */
  once<T extends keyof EventMap>(event: T, callback: EventCallback<EventMap[T]>): void {
    const onceCallback = (data: EventMap[T]) => {
      this.off(event, onceCallback as EventCallback);
      callback(data);
    };
    this.on(event, onceCallback);
  }

  /**
   * 清空所有监听
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// 导出单例
export const eventBus = new EventBus();
