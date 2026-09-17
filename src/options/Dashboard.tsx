import React, { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { UserScript } from '../types';
import { parseMetadata, createUserScript, validateScript } from '../utils/scriptParser';

type ViewMode = 'list' | 'edit' | 'settings' | 'backup';

export default function Dashboard() {
  const [view, setView] = useState<ViewMode>('list');
  const [scripts, setScripts] = useState<Record<string, UserScript>>({});
  const [editingScript, setEditingScript] = useState<UserScript | null>(null);
  const [editorCode, setEditorCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadScripts();
    
    // Check URL params for action
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const scriptId = params.get('scriptId');

    if (action === 'new') {
      createNewScript();
    } else if (action === 'edit' && scriptId) {
      editScript(scriptId);
    }
  }, []);

  async function loadScripts() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_SCRIPTS' });
      setScripts(response || {});
    } catch (error) {
      console.error('Failed to load scripts:', error);
    } finally {
      setLoading(false);
    }
  }

  function createNewScript() {
    const template = `// ==UserScript==
// @name         New Script
// @namespace    http://scriptmaster.local
// @version      1.0
// @description  TODO: Describe your script
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Your code here
    console.log('Script loaded!');

})();
`;
    setEditingScript({
      id: 'new',
      name: 'New Script',
      version: '1.0',
      code: template,
      enabled: true,
      matches: ['*://*/*'],
      grant: ['none'],
      runAt: 'document-idle',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionCount: 0,
    });
    setEditorCode(template);
    setView('edit');
    setValidationErrors([]);
  }

  async function editScript(id: string) {
    const script = scripts[id];
    if (script) {
      setEditingScript({ ...script });
      setEditorCode(script.code);
      setView('edit');
      setValidationErrors([]);
    }
  }

  async function saveScript() {
    setSaveStatus('saving');
    setValidationErrors([]);

    const metadata = parseMetadata(editorCode);
    if (!metadata) {
      setValidationErrors(['Invalid or missing metadata block']);
      setSaveStatus('error');
      return;
    }

    const validation = validateScript(editorCode);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
    }

    let scriptToSave: UserScript;

    if (editingScript?.id === 'new') {
      const newScript = createUserScript(editorCode);
      if (!newScript) {
        setSaveStatus('error');
        return;
      }
      scriptToSave = newScript;
    } else if (editingScript) {
      scriptToSave = {
        ...editingScript,
        name: metadata.name,
        description: metadata.description,
        version: metadata.version,
        author: metadata.author,
        code: editorCode,
        matches: metadata.match,
        excludeMatches: metadata.excludeMatch,
        grant: metadata.grant,
        require: metadata.require,
        resource: metadata.resource?.map(r => ({ name: r.name, url: r.url })),
        runAt: metadata.runAt || 'document-idle',
        installUrl: metadata.installUrl,
        updateUrl: metadata.updateUrl,
        updatedAt: Date.now(),
      };
    } else {
      setSaveStatus('error');
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        action: 'SAVE_SCRIPT',
        payload: scriptToSave,
      });
      setSaveStatus('saved');
      setEditingScript(scriptToSave);
      
      // Reload scripts
      await loadScripts();

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save script:', error);
      setSaveStatus('error');
    }
  }

  async function deleteScript(id: string) {
    if (!confirm('Are you sure you want to delete this script?')) return;

    try {
      await chrome.runtime.sendMessage({ action: 'DELETE_SCRIPT', scriptId: id });
      await loadScripts();
      if (editingScript?.id === id) {
        setView('list');
        setEditingScript(null);
      }
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  }

  async function toggleScript(id: string) {
    try {
      await chrome.runtime.sendMessage({ action: 'TOGGLE_SCRIPT', scriptId: id });
      await loadScripts();
    } catch (error) {
      console.error('Failed to toggle script:', error);
    }
  }

  async function exportAllScripts() {
    try {
      const result = await chrome.runtime.sendMessage({ action: 'GET_SCRIPTS' });
      const scripts = Object.values(result || {});
      const exportData = JSON.stringify(scripts, null, 2);
      
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scriptmaster-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export scripts:', error);
    }
  }

  async function importScripts(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const scripts = JSON.parse(e.target?.result as string) as UserScript[];
        await chrome.runtime.sendMessage({
          action: 'IMPORT_SCRIPT',
          payload: scripts,
        });
        await loadScripts();
        alert(`Successfully imported ${scripts.length} scripts`);
      } catch (error) {
        console.error('Failed to import scripts:', error);
        alert('Failed to import scripts. Invalid file format.');
      }
    };
    reader.readAsText(file);
  }

  async function createBackup() {
    try {
      const backup = await chrome.runtime.sendMessage({ action: 'CREATE_BACKUP' });
      alert(`Backup created: ${backup.id}`);
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">ScriptMaster</h1>
              <nav className="flex space-x-2">
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    view === 'list'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Scripts ({Object.keys(scripts).length})
                </button>
                <button
                  onClick={createNewScript}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  + New Script
                </button>
                <button
                  onClick={() => setView('backup')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    view === 'backup'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Backup & Import
                </button>
              </nav>
            </div>
            <div className="text-sm text-gray-500">
              {Object.values(scripts).filter(s => s.enabled).length} enabled / {Object.keys(scripts).length} total
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.keys(scripts).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No scripts yet. Click "+ New Script" to create one.
                    </td>
                  </tr>
                ) : (
                  Object.values(scripts).map((script) => (
                    <tr key={script.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleScript(script.id)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            script.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {script.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{script.name}</div>
                        {script.description && (
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {script.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        v{script.version}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {script.matches.join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(script.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => editScript(script.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteScript(script.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === 'edit' && editingScript && (
          <div className="bg-white rounded-lg shadow">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {editingScript.id === 'new' ? 'Create New Script' : `Edit: ${editingScript.name}`}
                </h2>
                {validationErrors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    {validationErrors.map((err, i) => (
                      <div key={i}>⚠️ {err}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${
                  saveStatus === 'saved' ? 'text-green-600' :
                  saveStatus === 'error' ? 'text-red-600' :
                  'text-gray-400'
                }`}>
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && '✓ Saved!'}
                  {saveStatus === 'error' && '✗ Error'}
                </span>
                <button
                  onClick={() => {
                    setView('list');
                    setEditingScript(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={saveScript}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Save Script
                </button>
              </div>
            </div>
            <div className="h-[600px]">
              <MonacoEditor
                height="100%"
                language="javascript"
                theme="vs-dark"
                value={editorCode}
                onChange={(value) => {
                  setEditorCode(value || '');
                  setSaveStatus('idle');
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        )}

        {view === 'backup' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Backup & Import</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Export All Scripts</h3>
                <button
                  onClick={exportAllScripts}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Download Backup
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Import Scripts</h3>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importScripts(file);
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Create Snapshot Backup</h3>
                <button
                  onClick={createBackup}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Create Backup Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
