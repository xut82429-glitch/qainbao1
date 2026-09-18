// Chrome 扩展全局类型声明
declare const GM_xmlhttpRequest: any;

interface Window {
  GM_info?: any;
  GM_xmlhttpRequest?: any;
  eval: (code: string) => any;
}

interface Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}
