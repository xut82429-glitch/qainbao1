/**
 * AI 脚本助手
 * 基于本地规则 + 云端 LLM 的智能代码建议、自动生成、漏洞修复
 */

import { EventBus } from '../core/EventBus';
import { CodeAnalyzer, AnalysisResult } from '../core/sandbox/CodeAnalyzer';

export interface AIAssistantConfig {
  enableCloudLLM: boolean;
  localOnly: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface CodeSuggestion {
  type: 'optimization' | 'security' | 'bugfix' | 'feature';
  description: string;
  originalCode?: string;
  suggestedCode?: string;
  confidence: number;  // 0-1
}

export interface AutoGenerateRequest {
  prompt: string;
  context?: {
    website?: string;
    existingScripts?: string[];
    requirements?: string[];
  };
}

export interface DebugSession {
  scriptId: string;
  breakpoints: number[];
  variables: Map<string, any>;
  callStack: string[];
}

/**
 * AI 辅助编程引擎
 */
export class AIAssistant {
  private eventBus: EventBus;
  private analyzer: CodeAnalyzer;
  private config: AIAssistantConfig;
  private debugSessions: Map<string, DebugSession> = new Map();

  constructor(eventBus: EventBus, config: AIAssistantConfig) {
    this.eventBus = eventBus;
    this.analyzer = new CodeAnalyzer();
    this.config = config;
  }

  /**
   * 分析代码并提供智能建议
   */
  async analyzeAndSuggest(code: string): Promise<CodeSuggestion[]> {
    const analysis: AnalysisResult = this.analyzer.analyze(code);
    const suggestions: CodeSuggestion[] = [];

    // 基于安全分析生成建议
    analysis.risks.forEach(risk => {
      if (risk.type === 'critical') {
        suggestions.push({
          type: 'security',
          description: risk.message,
          confidence: 0.95,
          originalCode: risk.code
        });
      } else if (risk.type === 'warning') {
        suggestions.push({
          type: risk.category === 'security' ? 'security' : 'optimization',
          description: risk.message,
          confidence: 0.8,
          originalCode: risk.code
        });
      }
    });

    // 基于复杂度生成优化建议
    if (analysis.complexity.cyclomatic > 10) {
      suggestions.push({
        type: 'optimization',
        description: `函数复杂度过高 (${analysis.complexity.cyclomatic})，建议拆分为更小的函数`,
        confidence: 0.85
      });
    }

    // 如果有云端 LLM，获取更智能的建议
    if (!this.config.localOnly && this.config.enableCloudLLM) {
      const llmSuggestions = await this.getLLMSuggestions(code, analysis);
      suggestions.push(...llmSuggestions);
    }

    return suggestions;
  }

  /**
   * 自动生成脚本代码
   */
  async generateScript(request: AutoGenerateRequest): Promise<string> {
    const { prompt, context } = request;

    if (this.config.localOnly || !this.config.apiEndpoint) {
      // 使用本地模板生成
      return this.generateFromTemplate(prompt, context);
    }

    // 调用云端 LLM
    try {
      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: 'scriptmaster-coder-v1',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的用户脚本生成助手。根据用户需求生成符合 Tampermonkey/Greasemonkey 规范的 JavaScript 代码。'
            },
            {
              role: 'user',
              content: this.buildPrompt(prompt, context)
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM API error:', error);
      // 降级到本地模板
      return this.generateFromTemplate(prompt, context);
    }
  }

  /**
   * 智能调试会话
   */
  startDebugSession(scriptId: string, code: string): DebugSession {
    const session: DebugSession = {
      scriptId,
      breakpoints: [],
      variables: new Map(),
      callStack: []
    };

    this.debugSessions.set(scriptId, session);
    
    // 注入调试钩子
    const debugCode = this.injectDebugHooks(code, session);
    
    this.eventBus.emit('debug:session-started', { scriptId });
    
    return session;
  }

  /**
   * 添加断点
   */
  addBreakpoint(scriptId: string, lineNumber: number): void {
    const session = this.debugSessions.get(scriptId);
    if (session) {
      session.breakpoints.push(lineNumber);
      session.breakpoints.sort((a, b) => a - b);
      this.eventBus.emit('debug:breakpoint-added', { scriptId, lineNumber });
    }
  }

  /**
   * 移除断点
   */
  removeBreakpoint(scriptId: string, lineNumber: number): void {
    const session = this.debugSessions.get(scriptId);
    if (session) {
      session.breakpoints = session.breakpoints.filter(l => l !== lineNumber);
      this.eventBus.emit('debug:breakpoint-removed', { scriptId, lineNumber });
    }
  }

  /**
   * 获取变量快照
   */
  getVariableSnapshot(scriptId: string): Map<string, any> {
    const session = this.debugSessions.get(scriptId);
    return session?.variables || new Map();
  }

  /**
   * 自动修复安全问题
   */
  async autoFixSecurityIssues(code: string): Promise<{ fixed: boolean; result: string }> {
    const analysis = this.analyzer.analyze(code);
    let fixedCode = code;

    const criticalRisks = analysis.risks.filter(r => r.type === 'critical');
    
    if (criticalRisks.length === 0) {
      return { fixed: false, result: code };
    }

    for (const risk of criticalRisks) {
      fixedCode = await this.applyFix(fixedCode, risk);
    }

    return { fixed: true, result: fixedCode };
  }

  /**
   * 应用修复
   */
  private async applyFix(code: string, risk: any): Promise<string> {
    // 简单的自动修复规则
    if (risk.message.includes('eval')) {
      // 提示用户，不自动修复 eval
      console.warn('发现 eval 使用，请手动审查');
      return code;
    }

    if (risk.message.includes('innerHTML')) {
      // 替换 innerHTML 为 textContent（简单情况）
      return code.replace(/\.innerHTML\s*=/g, '.textContent =');
    }

    if (risk.message.includes('document.write')) {
      // 移除 document.write
      return code.replace(/document\.write\s*\([^)]*\)/g, '// Removed dangerous document.write');
    }

    return code;
  }

  /**
   * 从模板生成代码
   */
  private generateFromTemplate(prompt: string, context?: any): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // 匹配常见场景
    if (lowerPrompt.includes('广告') || lowerPrompt.includes('ads')) {
      return this.generateAdBlockerTemplate(context?.website);
    }
    
    if (lowerPrompt.includes('样式') || lowerPrompt.includes('css') || lowerPrompt.includes('dark')) {
      return this.generateStyleModifierTemplate(context?.website, 'dark');
    }
    
    if (lowerPrompt.includes('下载') || lowerPrompt.includes('download')) {
      return this.generateDownloadHelperTemplate();
    }

    // 默认模板
    return this.generateDefaultTemplate(prompt);
  }

  /**
   * 广告拦截器模板
   */
  private generateAdBlockerTemplate(website?: string): string {
    const match = website ? `*://${website}/*` : '*://*/*';
    
    return `// ==UserScript==
// @name         广告拦截器
// @namespace    http://scriptmaster.local
// @version      1.0
// @description  自动拦截页面广告
// @author       ScriptMaster AI
// @match        ${match}
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // 常见广告选择器
  const adSelectors = [
    '[class*="ad"]',
    '[id*="ad"]',
    '.advertisement',
    '.adsbygoogle',
    '#google_ads',
    '[data-ad]'
  ];

  // 移除已存在的广告
  function removeAds() {
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
  }

  // 监听新元素
  const observer = new MutationObserver(removeAds);
  observer.observe(document.body, { childList: true, subtree: true });

  // 初始清理
  if (document.body) {
    removeAds();
  } else {
    document.addEventListener('DOMContentLoaded', removeAds);
  }

  console.log('ScriptMaster: 广告拦截器已激活');
})();`;
  }

  /**
   * 样式修改器模板
   */
  private generateStyleModifierTemplate(website?: string, mode: string = 'dark'): string {
    const match = website ? `*://${website}/*` : '*://*/*';
    
    const darkCSS = `
    /* 深色模式样式 */
    :root {
      --bg-color: #1a1a1a;
      --text-color: #e0e0e0;
      --link-color: #64b5f6;
    }
    
    body {
      background-color: var(--bg-color) !important;
      color: var(--text-color) !important;
    }
    
    a {
      color: var(--link-color) !important;
    }
    `;

    return `// ==UserScript==
// @name         深色模式
// @namespace    http://scriptmaster.local
// @version      1.0
// @description  为网站启用深色模式
// @author       ScriptMaster AI
// @match        ${match}
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  const css = \`${darkCSS}\`;
  
  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(css);
  } else {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  console.log('ScriptMaster: 深色模式已启用');
})();`;
  }

  /**
   * 下载助手模板
   */
  private generateDownloadHelperTemplate(): string {
    return `// ==UserScript==
// @name         下载助手
// @namespace    http://scriptmaster.local
// @version      1.0
// @description  增强下载功能
// @author       ScriptMaster AI
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  // 添加右键菜单
  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand('📋 复制所有链接', copyAllLinks);
    GM_registerMenuCommand('⬇️ 批量下载图片', downloadImages);
  }

  function copyAllLinks() {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href)
      .join('\\n');
    
    if (typeof GM_setClipboard !== 'undefined') {
      GM_setClipboard(links);
    } else {
      navigator.clipboard.writeText(links);
    }
    
    alert('已复制 ' + links.split('\\n').length + ' 个链接');
  }

  function downloadImages() {
    const images = document.querySelectorAll('img[src]');
    images.forEach((img, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = img.src;
        a.download = 'image_' + i;
        a.click();
      }, i * 200);
    });
    alert('开始下载 ' + images.length + ' 张图片');
  }

  console.log('ScriptMaster: 下载助手已激活');
})();`;
  }

  /**
   * 默认模板
   */
  private generateDefaultTemplate(prompt: string): string {
    return `// ==UserScript==
// @name         ${prompt}
// @namespace    http://scriptmaster.local
// @version      1.0
// @description  由 ScriptMaster AI 生成
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  // 在此处编写您的代码
  console.log('ScriptMaster: 脚本已加载');

})();`;
  }

  /**
   * 构建 LLM 提示
   */
  private buildPrompt(prompt: string, context?: any): string {
    let fullPrompt = `请为我生成一个用户脚本，需求如下：\n\n${prompt}`;
    
    if (context?.website) {
      fullPrompt += `\n目标网站：${context.website}`;
    }
    
    if (context?.requirements?.length) {
      fullPrompt += `\n具体要求：\n${context.requirements.join('\n')}`;
    }

    fullPrompt += `\n\n请返回完整的、可直接运行的用户脚本代码，包含标准的元数据头。`;
    
    return fullPrompt;
  }

  /**
   * 获取 LLM 建议
   */
  private async getLLMSuggestions(code: string, analysis: AnalysisResult): Promise<CodeSuggestion[]> {
    // 简化实现，实际应调用 LLM API
    return [];
  }

  /**
   * 注入调试钩子
   */
  private injectDebugHooks(code: string, session: DebugSession): string {
    // 在关键位置注入调试代码
    const debugCode = `
// ScriptMaster Debug Hooks
const __sm_debug = {
  log: (msg) => console.log('[SM Debug]', msg),
  breakpoint: (line) => {
    if (${JSON.stringify(session.breakpoints)}.includes(line)) {
      debugger;
    }
  },
  trackVar: (name, value) => {
    __sm_debug.variables.set(name, value);
  },
  variables: new Map()
};
`;
    return debugCode + code;
  }
}
