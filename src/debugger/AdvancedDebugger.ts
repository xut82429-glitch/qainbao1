/**
 * 高级调试器
 * 断点、变量监视、调用栈追踪、性能分析
 */

import { EventBus } from '../core/EventBus';

export interface Breakpoint {
  id: string;
  scriptId: string;
  lineNumber: number;
  columnNumber?: number;
  condition?: string;
  enabled: boolean;
  hitCount: number;
}

export interface VariableInfo {
  name: string;
  value: any;
  type: string;
  scope: 'local' | 'global' | 'closure';
  expandable: boolean;
}

export interface CallStackFrame {
  functionName: string;
  location: {
    scriptId: string;
    lineNumber: number;
    columnNumber: number;
  };
  scopeChain: VariableInfo[][];
}

export interface DebugState {
  isPaused: boolean;
  currentScript: string;
  currentLine: number;
  callStack: CallStackFrame[];
  variables: VariableInfo[];
  exception?: {
    message: string;
    lineNumber: number;
  };
}

/**
 * Chrome DevTools Protocol 调试器
 */
export class AdvancedDebugger {
  private eventBus: EventBus;
  private breakpoints: Map<string, Breakpoint> = new Map();
  private debuggeeAttached = false;
  private currentDebuggee: chrome.debugger.Debuggee | null = null;
  private pendingCommands: Array<{ cmd: string; args?: any }> = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupDebuggerListeners();
  }

  /**
   * 附加到目标标签页
   */
  async attachToTab(tabId: number): Promise<void> {
    const debuggee: chrome.debugger.Debuggee = { tabId };

    try {
      await chrome.debugger.attach(debuggee, '1.3');
      this.currentDebuggee = debuggee;
      this.debuggeeAttached = true;
      
      this.eventBus.emit('debugger:attached', { tabId });
      
      // 启用调试域
      await this.sendCommand('Debugger.enable');
    } catch (error) {
      console.error('Failed to attach debugger:', error);
      throw error;
    }
  }

  /**
   * 分离调试器
   */
  async detach(): Promise<void> {
    if (this.currentDebuggee && this.debuggeeAttached) {
      try {
        await this.sendCommand('Debugger.disable');
        await chrome.debugger.detach(this.currentDebuggee);
        this.debuggeeAttached = false;
        this.currentDebuggee = null;
        this.eventBus.emit('debugger:detached');
      } catch (error) {
        console.error('Failed to detach debugger:', error);
      }
    }
  }

  /**
   * 添加断点
   */
  async addBreakpoint(
    scriptId: string, 
    lineNumber: number, 
    condition?: string
  ): Promise<Breakpoint> {
    const breakpoint: Breakpoint = {
      id: `bp_${scriptId}_${lineNumber}_${Date.now()}`,
      scriptId,
      lineNumber,
      condition,
      enabled: true,
      hitCount: 0
    };

    this.breakpoints.set(breakpoint.id, breakpoint);

    if (this.debuggeeAttached) {
      try {
        await this.sendCommand('Debugger.setBreakpointByUrl', {
          lineNumber,
          urlRegex: '.*',
          condition
        });
      } catch (error) {
        console.error('Failed to set breakpoint:', error);
      }
    }

    this.eventBus.emit('debugger:breakpoint-added', breakpoint);
    return breakpoint;
  }

  /**
   * 移除断点
   */
  async removeBreakpoint(breakpointId: string): Promise<void> {
    const breakpoint = this.breakpoints.get(breakpointId);
    if (breakpoint) {
      this.breakpoints.delete(breakpointId);
      this.eventBus.emit('debugger:breakpoint-removed', breakpoint);
    }
  }

  /**
   * 继续执行
   */
  async resume(): Promise<void> {
    if (!this.debuggeeAttached) return;
    
    await this.sendCommand('Debugger.resume');
    this.eventBus.emit('debugger:resumed');
  }

  /**
   * 单步执行（Step Over）
   */
  async stepOver(): Promise<void> {
    if (!this.debuggeeAttached) return;
    
    await this.sendCommand('Debugger.stepOver');
    this.eventBus.emit('debugger:step-over');
  }

  /**
   * 单步进入（Step Into）
   */
  async stepInto(): Promise<void> {
    if (!this.debuggeeAttached) return;
    
    await this.sendCommand('Debugger.stepInto');
    this.eventBus.emit('debugger:step-into');
  }

  /**
   * 单步跳出（Step Out）
   */
  async stepOut(): Promise<void> {
    if (!this.debuggeeAttached) return;
    
    await this.sendCommand('Debugger.stepOut');
    this.eventBus.emit('debugger:step-out');
  }

  /**
   * 获取作用域变量
   */
  async getScopeVariables(executionContextId?: number): Promise<VariableInfo[]> {
    if (!this.debuggeeAttached) return [];

    try {
      const scopes = await this.sendCommand('Debugger.getRuntimeLocations', {
        executionContextId
      });

      const variables: VariableInfo[] = [];
      
      // 简化实现，实际应遍历作用域链
      for (let i = 0; i < 5; i++) {
        const props = await this.sendCommand('Runtime.getProperties', {
          objectId: `scope_${i}`,
          ownProperties: true
        });

        props.result.forEach((prop: any) => {
          variables.push({
            name: prop.name,
            value: prop.value?.value,
            type: this.getType(prop.value),
            scope: 'local',
            expandable: prop.value?.type === 'object'
          });
        });
      }

      return variables;
    } catch (error) {
      console.error('Failed to get scope variables:', error);
      return [];
    }
  }

  /**
   * 获取调用栈
   */
  async getCallStack(): Promise<CallStackFrame[]> {
    if (!this.debuggeeAttached) return [];

    try {
      const result = await this.sendCommand('Debugger.getStackTrace', {});
      
      return result.callFrames?.map((frame: any) => ({
        functionName: frame.functionName || '<anonymous>',
        location: {
          scriptId: frame.location.scriptId,
          lineNumber: frame.location.lineNumber,
          columnNumber: frame.location.columnNumber
        },
        scopeChain: []
      })) || [];
    } catch (error) {
      console.error('Failed to get call stack:', error);
      return [];
    }
  }

  /**
   * 评估表达式
   */
  async evaluate(expression: string): Promise<any> {
    if (!this.debuggeeAttached) return null;

    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });

      return result.result?.value;
    } catch (error) {
      console.error('Failed to evaluate expression:', error);
      return null;
    }
  }

  /**
   * 设置条件断点
   */
  async setConditionalBreakpoint(
    scriptId: string,
    lineNumber: number,
    condition: string
  ): Promise<Breakpoint> {
    return this.addBreakpoint(scriptId, lineNumber, condition);
  }

  /**
   * 获取调试状态
   */
  getDebugState(): DebugState {
    return {
      isPaused: false, // 实际应从内部状态获取
      currentScript: '',
      currentLine: 0,
      callStack: [],
      variables: []
    };
  }

  /**
   * 性能分析开始
   */
  async startProfiling(): Promise<void> {
    if (!this.debuggeeAttached) return;
    
    await this.sendCommand('Profiler.start');
    this.eventBus.emit('debugger:profiling-started');
  }

  /**
   * 性能分析停止
   */
  async stopProfiling(): Promise<any> {
    if (!this.debuggeeAttached) return null;

    try {
      const result = await this.sendCommand('Profiler.stop');
      this.eventBus.emit('debugger:profiling-stopped', result.profile);
      return result.profile;
    } catch (error) {
      console.error('Failed to stop profiling:', error);
      return null;
    }
  }

  /**
   * 监听调试器事件
   */
  private setupDebuggerListeners(): void {
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId !== this.currentDebuggee?.tabId) return;

      switch (method) {
        case 'Debugger.paused':
          this.handlePaused(params);
          break;
        case 'Debugger.resumed':
          this.eventBus.emit('debugger:resumed');
          break;
        case 'Debugger.breakpointResolved':
          this.handleBreakpointResolved(params);
          break;
        case 'Debugger.scriptParsed':
          this.handleScriptParsed(params);
          break;
      }
    });

    chrome.debugger.onDetach.addListener((source) => {
      if (source.tabId === this.currentDebuggee?.tabId) {
        this.debuggeeAttached = false;
        this.currentDebuggee = null;
        this.eventBus.emit('debugger:detached-unexpected');
      }
    });
  }

  /**
   * 处理暂停事件
   */
  private async handlePaused(params: any): Promise<void> {
    const callStack = await this.getCallStack();
    const variables = await this.getScopeVariables();

    const state: DebugState = {
      isPaused: true,
      currentScript: params.callFrames?.[0]?.location?.scriptId || '',
      currentLine: params.callFrames?.[0]?.location?.lineNumber || 0,
      callStack,
      variables,
      exception: params.reason === 'exception' ? {
        message: params.data?.description || 'Unknown error',
        lineNumber: params.callFrames?.[0]?.location?.lineNumber || 0
      } : undefined
    };

    // 更新断点击中计数
    if (params.hitBreakpoints) {
      params.hitBreakpoints.forEach((bpId: string) => {
        const bp = this.breakpoints.get(bpId);
        if (bp) {
          bp.hitCount++;
          this.eventBus.emit('debugger:breakpoint-hit', bp);
        }
      });
    }

    this.eventBus.emit('debugger:paused', state);
  }

  /**
   * 处理断点解析
   */
  private handleBreakpointResolved(params: any): void {
    this.eventBus.emit('debugger:breakpoint-resolved', {
      breakpointId: params.breakpointId,
      location: params.location
    });
  }

  /**
   * 处理脚本解析
   */
  private handleScriptParsed(params: any): void {
    this.eventBus.emit('debugger:script-parsed', {
      scriptId: params.scriptId,
      url: params.url,
      startLine: params.startLine,
      startColumn: params.startColumn
    });
  }

  /**
   * 发送调试命令
   */
  private async sendCommand(command: string, args?: any): Promise<any> {
    if (!this.currentDebuggee || !this.debuggeeAttached) {
      throw new Error('Debugger not attached');
    }

    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        this.currentDebuggee!,
        command,
        args,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  /**
   * 获取类型字符串
   */
  private getType(value: any): string {
    if (!value) return 'undefined';
    if (value.type === 'object' && value.subtype) {
      return value.subtype;
    }
    return value.type || 'unknown';
  }
}
