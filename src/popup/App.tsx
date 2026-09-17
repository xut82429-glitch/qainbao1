import React, { useEffect, useState } from 'react';
import { UserScript } from '../types';

interface ScriptItemProps {
  script: UserScript;
  onToggle: (id: string) => void;
  onEdit: (script: UserScript) => void;
  onDelete: (id: string) => void;
}

const ScriptItem: React.FC<ScriptItemProps> = ({ script, onToggle, onEdit, onDelete }) => {
  return (
    <div className="script-item p-3 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{script.name}</h3>
          <p className="text-sm text-gray-500 truncate">v{script.version} {script.author && `by ${script.author}`}</p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onToggle(script.id)}
            className={`px-2 py-1 text-xs rounded ${
              script.enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {script.enabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => onEdit(script)}
            className="p-1 text-gray-500 hover:text-blue-600"
            title="Edit script"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(script.id)}
            className="p-1 text-gray-500 hover:text-red-600"
            title="Delete script"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {script.description && (
        <p className="mt-1 text-xs text-gray-400 truncate">{script.description}</p>
      )}
      <div className="mt-2 flex items-center text-xs text-gray-400">
        <span>Matches: {script.matches.join(', ')}</span>
      </div>
    </div>
  );
};

export default function App() {
  const [scripts, setScripts] = useState<Record<string, UserScript>>({});
  const [loading, setLoading] = useState(true);
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');

  useEffect(() => {
    loadScripts();
    getCurrentTabUrl();
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

  async function getCurrentTabUrl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setActiveTabUrl(tab.url);
      }
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  async function handleToggle(id: string) {
    try {
      await chrome.runtime.sendMessage({ action: 'TOGGLE_SCRIPT', scriptId: id });
      loadScripts();
    } catch (error) {
      console.error('Failed to toggle script:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this script?')) return;
    
    try {
      await chrome.runtime.sendMessage({ action: 'DELETE_SCRIPT', scriptId: id });
      loadScripts();
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  }

  function handleEdit(script: UserScript) {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?action=edit&scriptId=${script.id}`),
    });
  }

  function handleNewScript() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html?action=new'),
    });
  }

  function handleOpenDashboard() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html'),
    });
  }

  // Filter scripts for current tab
  const matchingScripts = activeTabUrl
    ? Object.values(scripts).filter(
        (script) =>
          script.enabled &&
          script.matches.some((pattern) => {
            const regex = new RegExp(
              pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')
            );
            return regex.test(activeTabUrl);
          })
      )
    : [];

  const enabledCount = Object.values(scripts).filter((s) => s.enabled).length;
  const totalCount = Object.keys(scripts).length;

  if (loading) {
    return (
      <div className="w-80 p-4 text-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-80 max-h-[500px] overflow-y-auto bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
        <h1 className="text-lg font-bold text-white">ScriptMaster</h1>
        <p className="text-xs text-blue-100 mt-1">
          {enabledCount} of {totalCount} scripts enabled
        </p>
      </div>

      {/* Current page scripts */}
      {matchingScripts.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="px-3 py-2 bg-green-50 text-xs font-medium text-green-700">
            Active on this page ({matchingScripts.length})
          </div>
          {matchingScripts.map((script) => (
            <ScriptItem
              key={script.id}
              script={script}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* All scripts */}
      <div>
        <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600 flex justify-between items-center">
          <span>All Scripts</span>
          <button
            onClick={handleNewScript}
            className="text-blue-600 hover:text-blue-800"
          >
            + New
          </button>
        </div>
        
        {totalCount === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No scripts yet. Click "+ New" to create one.
          </div>
        ) : (
          Object.values(scripts).map((script) => (
            <ScriptItem
              key={script.id}
              script={script}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleOpenDashboard}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Open Dashboard →
        </button>
      </div>
    </div>
  );
}
