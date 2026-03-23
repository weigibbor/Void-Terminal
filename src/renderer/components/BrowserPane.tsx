import { useState } from 'react';
import { useAppStore } from '../stores/app-store';
import type { Tab } from '../types';

export function BrowserPane({ tab }: { tab: Tab }) {
  const updateTab = useAppStore((s) => s.updateTab);
  const [urlInput, setUrlInput] = useState(tab.browserUrl || '');

  const navigate = (url: string) => {
    let normalized = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
      normalized = `https://${url}`;
    }
    updateTab(tab.id, { browserUrl: normalized });
    setUrlInput(normalized);
  };

  return (
    <div className="flex flex-col h-full bg-void-elevated">
      {/* Address bar */}
      <div className="flex items-center gap-2 h-10 px-3 bg-void-surface/50 border-b border-void-border/50 shrink-0">
        <button
          className="text-void-text-ghost hover:text-void-text-muted text-xs p-1"
          title="Back"
        >
          &#9664;
        </button>
        <button
          className="text-void-text-ghost hover:text-void-text-muted text-xs p-1"
          title="Forward"
        >
          &#9654;
        </button>
        <button
          className="text-void-text-ghost hover:text-void-text-muted text-xs p-1"
          onClick={() => navigate(urlInput)}
          title="Reload"
        >
          &#8635;
        </button>
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate(urlInput);
          }}
          placeholder="Enter URL..."
          className="flex-1 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-3 py-1 focus:border-accent/50 transition-colors"
        />
      </div>

      {/* Webview */}
      <div className="flex-1 min-h-0">
        {tab.browserUrl ? (
          <webview
            src={tab.browserUrl}
            className="w-full h-full"
            // @ts-expect-error webview is an Electron-specific element
            allowpopups="false"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-void-text-ghost text-sm">
            Enter a URL to browse
          </div>
        )}
      </div>
    </div>
  );
}
