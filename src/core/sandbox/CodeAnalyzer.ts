/**
 * 智能代码分析引擎
 * AST 静态分析 + 机器学习辅助检测危险代码
 */

import * as acorn from 'acorn';
import { simple } from 'acorn-walk';

export interface AnalysisResult {
  score: number;          // 安全分数 0-100
  risks: RiskItem[];
  suggestions: string[];
  dependencies: string[];
  complexity: {
    cyclomatic: number;
    lines: number;
    functions: number;
  };
}

export interface RiskItem {
  type: 'critical' | 'warning' | 'info';
  category: 'security' | 'performance' | 'privacy' | 'best-practice';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * 基于 AST 的静态代码分析器
 */
export class CodeAnalyzer {
  private riskPatterns: Map<string, RegExp> = new Map();
  private dangerousGlobals = [
    'eval', 'Function', 'constructor', '__proto__', 
    'document.write', 'innerHTML', 'outerHTML',
    'setTimeout(string)', 'setInterval(string)',
    'XMLHttpRequest', 'fetch', 'WebSocket'
  ];

  constructor() {
    this.initializeRiskPatterns();
  }

  /**
   * 分析代码安全性
   */
  analyze(code: string): AnalysisResult {
    const risks: RiskItem[] = [];
    const suggestions: string[] = [];
    const dependencies: string[] = [];
    
    let ast: any;
    try {
      ast = acorn.parse(code, { 
        ecmaVersion: 2022, 
        sourceType: 'module',
        locations: true
      });
    } catch (error) {
      return {
        score: 0,
        risks: [{
          type: 'critical',
          category: 'security',
          message: '代码无法解析，可能存在语法错误或恶意混淆',
        }],
        suggestions: ['检查代码语法'],
        dependencies: [],
        complexity: { cyclomatic: 0, lines: 0, functions: 0 }
      };
    }

    // AST 遍历分析
    this.traverseAST(ast, code, risks, suggestions, dependencies);
    
    // 正则模式匹配
    this.patternMatch(code, risks);
    
    // 计算复杂度
    const complexity = this.calculateComplexity(ast);
    
    // 计算安全分数
    const score = this.calculateScore(risks, complexity);

    return {
      score,
      risks,
      suggestions: [...new Set(suggestions)],
      dependencies,
      complexity
    };
  }

  /**
   * 遍历 AST 树
   */
  private traverseAST(
    ast: any, 
    code: string, 
    risks: RiskItem[], 
    suggestions: string[],
    dependencies: string[]
  ): void {
    simple(ast, {
      CallExpression: (node: any) => {
        this.analyzeCallExpression(node, code, risks);
      },
      MemberExpression: (node: any) => {
        this.analyzeMemberExpression(node, code, risks);
      },
      ImportDeclaration: (node: any) => {
        dependencies.push(node.source.value);
      },
      FunctionDeclaration: () => {},
      VariableDeclaration: (node: any) => {
        this.analyzeVariableDeclaration(node, code, risks);
      }
    });
  }

  /**
   * 分析函数调用
   */
  private analyzeCallExpression(node: any, code: string, risks: RiskItem[]): void {
    const callee = node.callee;
    
    // 检测 eval 调用
    if (callee.type === 'Identifier' && callee.name === 'eval') {
      risks.push({
        type: 'critical',
        category: 'security',
        message: '使用 eval() 执行动态代码，存在严重安全风险',
        line: node.loc?.start.line,
        column: node.loc?.start.column,
        code: this.extractCodeSnippet(code, node)
      });
    }

    // 检测 Function 构造器
    if (callee.type === 'Identifier' && callee.name === 'Function') {
      risks.push({
        type: 'critical',
        category: 'security',
        message: '使用 Function 构造器创建动态函数',
        line: node.loc?.start.line,
        column: node.loc?.start.column
      });
    }

    // 检测 setTimeout/setInterval 字符串参数
    if (callee.type === 'Identifier' && 
        ['setTimeout', 'setInterval'].includes(callee.name)) {
      const firstArg = node.arguments[0];
      if (firstArg?.type === 'Literal' && typeof firstArg.value === 'string') {
        risks.push({
          type: 'warning',
          category: 'security',
          message: `${callee.name} 使用字符串参数，等同于 eval`,
          line: node.loc?.start.line,
          column: node.loc?.start.column
        });
      }
    }
  }

  /**
   * 分析成员表达式
   */
  private analyzeMemberExpression(node: any, code: string, risks: RiskItem[]): void {
    const prop = node.property?.name;
    
    if (['innerHTML', 'outerHTML'].includes(prop)) {
      risks.push({
        type: 'warning',
        category: 'security',
        message: `直接操作 ${prop} 可能导致 XSS 攻击`,
        line: node.loc?.start.line,
        column: node.loc?.start.column
      });
    }

    if (prop === 'write' && node.object?.type === 'Identifier' && node.object.name === 'document') {
      risks.push({
        type: 'critical',
        category: 'security',
        message: 'document.write() 会覆盖整个文档，危险操作',
        line: node.loc?.start.line,
        column: node.loc?.start.column
      });
    }
  }

  /**
   * 分析变量声明
   */
  private analyzeVariableDeclaration(node: any, code: string, risks: RiskItem[]): void {
    // 检测全局变量污染
    if (node.kind === 'var') {
      node.declarations.forEach((decl: any) => {
        if (decl.id.type === 'Identifier') {
          // suggestions.push(`考虑使用 let/const 代替 var 声明 "${decl.id.name}"`);
        }
      });
    }
  }

  /**
   * 正则模式匹配
   */
  private patternMatch(code: string, risks: RiskItem[]): void {
    for (const [name, pattern] of this.riskPatterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        const line = code.substring(0, match.index).split('\n').length;
        risks.push({
          type: 'warning',
          category: 'security',
          message: `检测到潜在危险模式：${name}`,
          line,
          code: match[0]
        });
      }
    }
  }

  /**
   * 计算代码复杂度
   */
  private calculateComplexity(ast: any): { cyclomatic: number; lines: number; functions: number } {
    let functions = 0;
    let branches = 0;

    simple(ast, {
      FunctionDeclaration: () => functions++,
      FunctionExpression: () => functions++,
      ArrowFunctionExpression: () => functions++,
      IfStatement: () => branches++,
      ForStatement: () => branches++,
      WhileStatement: () => branches++,
      DoWhileStatement: () => branches++,
      SwitchCase: () => branches++,
      LogicalExpression: (node: any) => {
        if (['&&', '||'].includes(node.operator)) branches++;
      },
      ConditionalExpression: () => branches++
    });

    const cyclomatic = branches - functions + 2;
    const lines = ast.loc?.end.line || 0;

    return { cyclomatic, lines, functions };
  }

  /**
   * 计算安全分数
   */
  private calculateScore(risks: RiskItem[], complexity: any): number {
    let score = 100;

    risks.forEach(risk => {
      switch (risk.type) {
        case 'critical':
          score -= 25;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 2;
          break;
      }
    });

    // 复杂度惩罚
    if (complexity.cyclomatic > 10) {
      score -= Math.min(20, (complexity.cyclomatic - 10) * 2);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 提取代码片段
   */
  private extractCodeSnippet(code: string, node: any, length = 100): string {
    const start = node.start;
    const end = Math.min(start + length, code.length);
    return code.substring(start, end).replace(/\n/g, ' ').trim();
  }

  /**
   * 初始化风险模式
   */
  private initializeRiskPatterns(): void {
    this.riskPatterns.set('Base64 解码执行', /atob\s*\(\s*['"`][^)]+['"`]\s*\)/g);
    this.riskPatterns.set('Unicode 转义混淆', /\\u[0-9a-fA-F]{4}/g);
    this.riskPatterns.set('十六进制编码', /\\x[0-9a-fA-F]{2}/g);
    this.riskPatterns.set('JSONP 回调', /callback\s*=\s*['"`]/g);
    this.riskPatterns.set('动态脚本加载', /createElement\s*\(\s*['"`]script['"`]\s*\)/g);
    this.riskPatterns.set('Cookie 读取', /document\.cookie/g);
    this.riskPatterns.set('LocalStorage 访问', /localStorage\./g);
    this.riskPatterns.set('键盘记录', /keydown|keyup|keypress/g);
    this.riskPatterns.set('表单劫持', /querySelector.*form|getElementById.*form/g);
  }
}
