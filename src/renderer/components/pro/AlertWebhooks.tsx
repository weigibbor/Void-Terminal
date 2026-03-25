import { useState, useEffect } from 'react';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
}

export function AlertWebhooks({ onClose }: { onClose: () => void }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(() => {
    try { return JSON.parse(localStorage.getItem('void-webhooks') || '[]'); } catch { return []; }
  });
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set(['error', 'disconnect']));
  const [adding, setAdding] = useState(false);
  const [testResult, setTestResult] = useState('');

  const save = (wh: Webhook[]) => { setWebhooks(wh); localStorage.setItem('void-webhooks', JSON.stringify(wh)); };

  const addWebhook = () => {
    if (!newUrl.trim()) return;
    const wh: Webhook = { id: Date.now().toString(), url: newUrl.trim(), events: Array.from(newEvents), enabled: true };
    save([...webhooks, wh]);
    setNewUrl(''); setAdding(false); setNewEvents(new Set(['error', 'disconnect']));
  };

  const removeWebhook = (id: string) => save(webhooks.filter(w => w.id !== id));
  const toggleWebhook = (id: string) => save(webhooks.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));

  const testWebhook = async (url: string) => {
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', message: 'Void Terminal webhook test', timestamp: Date.now() }) });
      setTestResult('Sent!');
    } catch { setTestResult('Failed'); }
    setTimeout(() => setTestResult(''), 2000);
  };

  const EVENT_TYPES = ['error', 'disconnect', 'reconnect', 'watch-alert', 'command-done'];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '500px', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Alert Webhooks</div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(!adding)} className="text-[10px] text-accent bg-transparent border-none cursor-pointer font-mono">+ Add</button>
            <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
          </div>
        </div>
        <div className="px-5 py-4 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {adding && (
            <div className="p-3 mb-3 rounded-[8px] bg-void-surface space-y-2" style={{ border: '0.5px solid #2A2A30' }}>
              <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.slack.com/..." className="w-full px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none" style={{ border: '0.5px solid #2A2A30' }} />
              <div className="flex flex-wrap gap-1">
                {EVENT_TYPES.map(ev => (
                  <button key={ev} onClick={() => { const n = new Set(newEvents); n.has(ev) ? n.delete(ev) : n.add(ev); setNewEvents(n); }}
                    className={`px-2 py-[2px] rounded-[3px] text-[9px] font-mono cursor-pointer ${newEvents.has(ev) ? 'text-accent' : 'text-void-text-ghost'}`}
                    style={{ border: `0.5px solid ${newEvents.has(ev) ? 'rgba(249,115,22,0.3)' : '#2A2A30'}` }}>{ev}</button>
                ))}
              </div>
              <button onClick={addWebhook} className="text-[10px] bg-accent text-void-base px-3 py-1 rounded-[4px] font-semibold cursor-pointer border-none">Add webhook</button>
            </div>
          )}
          {webhooks.map(wh => (
            <div key={wh.id} className="group flex items-center gap-2 p-3 mb-2 rounded-[8px] bg-void-surface" style={{ border: '0.5px solid #2A2A30', opacity: wh.enabled ? 1 : 0.4 }}>
              <span className={`w-[6px] h-[6px] rounded-full ${wh.enabled ? 'bg-status-online' : 'bg-void-text-ghost'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-void-text font-mono truncate">{wh.url}</div>
                <div className="text-[9px] text-void-text-ghost mt-[1px]">{wh.events.join(', ')}</div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => testWebhook(wh.url)} className="text-[9px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">test</button>
                <button onClick={() => toggleWebhook(wh.id)} className="text-[9px] text-void-text-ghost hover:text-status-warning bg-transparent border-none cursor-pointer font-mono">{wh.enabled ? 'off' : 'on'}</button>
                <button onClick={() => removeWebhook(wh.id)} className="text-[9px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer font-mono">✕</button>
              </div>
            </div>
          ))}
          {webhooks.length === 0 && !adding && (
            <div className="text-[11px] text-void-text-ghost font-mono text-center py-6">No webhooks configured. Send alerts to Slack, Discord, or any URL.</div>
          )}
          {testResult && <div className="text-[10px] text-accent font-mono mt-2">{testResult}</div>}
        </div>
      </div>
    </div>
  );
}
