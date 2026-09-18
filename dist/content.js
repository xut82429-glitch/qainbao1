chrome.runtime.onMessage.addListener((n,r,e)=>(s(n).then(e),!0));async function s(n){const{action:r,payload:e}=n;switch(r){case"EXECUTE_SCRIPT":return a(e.code,e.id);default:return{error:`Unknown action in content script: ${r}`}}}function a(n,r){try{const e=c(r),t=`
      (function(GM) {
        try {
          ${n}
        } catch (error) {
          console.error('[ScriptMaster] Error in script ${r}:', error);
          throw error;
        }
      })(window.ScriptMasterGM)
    `,o=document.createElement("script");return o.textContent=`
      window.ScriptMasterGM = ${JSON.stringify(e)};
      ${t}
      delete window.ScriptMasterGM;
    `,(document.head||document.documentElement).appendChild(o),o.remove(),{success:!0}}catch(e){return console.error("[ScriptMaster] Failed to execute script:",e),{success:!1,error:e.message}}}function c(n){return{info:{scriptId:n,scriptMetaStr:""},log:(...r)=>{console.log(`[ScriptMaster:${n}]`,...r)},getValue:(r,e)=>new Promise(t=>{chrome.storage.local.get([`script_${n}_${r}`],o=>{t(o[`script_${n}_${r}`]??e)})}),setValue:(r,e)=>new Promise(t=>{chrome.storage.local.set({[`script_${n}_${r}`]:e},()=>t(void 0))}),deleteValue:r=>new Promise(e=>{chrome.storage.local.remove([`script_${n}_${r}`],()=>e(void 0))}),listValues:()=>new Promise(r=>{chrome.storage.local.get(null,e=>{const t=Object.keys(e).filter(o=>o.startsWith(`script_${n}_`)).map(o=>o.replace(`script_${n}_`,""));r(t)})}),addStyle:r=>{const e=document.createElement("style");return e.textContent=r,document.head.appendChild(e),e},notification:(r,e)=>{chrome.runtime.sendMessage({action:"SHOW_NOTIFICATION",payload:{text:r,scriptId:n}}),e&&chrome.notifications.onClicked.addListener(t=>{e(),chrome.notifications.clear(t)})},xmlHttpRequest:r=>{const e=new XMLHttpRequest;return e.open(r.method||"GET",r.url,!0),r.headers&&Object.entries(r.headers).forEach(([t,o])=>{e.setRequestHeader(t,o)}),e.onload=()=>{var t;(t=r.onload)==null||t.call(r,{finalUrl:e.responseURL||r.url,readyState:4,responseHeaders:e.getAllResponseHeaders(),status:e.status,statusText:e.statusText,response:e.response,responseText:e.responseText,responseXML:e.responseXML})},e.onerror=()=>{var t;(t=r.onerror)==null||t.call(r,{error:"Network error"})},e.send(r.data||null),{abort:()=>e.abort()}},setClipboard:r=>navigator.clipboard.writeText(r),openInTab:(r,e)=>{chrome.runtime.sendMessage({action:"OPEN_TAB",payload:{url:r,active:(e==null?void 0:e.active)??!0}})},registerMenuCommand:(r,e)=>{const t=window._scriptMasterMenuCommands||[];t.push({caption:r,onClick:e,scriptId:n}),window._scriptMasterMenuCommands=t},getTab:()=>new Promise(r=>{chrome.tabs.getCurrent(e=>{r(e)})}),saveTab:r=>Promise.resolve(!0)}}console.log("[ScriptMaster] Content script loaded");chrome.runtime.sendMessage({action:"CONTENT_SCRIPT_LOADED"});
