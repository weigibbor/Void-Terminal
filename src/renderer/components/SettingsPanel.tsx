import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { ProActivationFlow } from './ProActivationFlow';
import type { AIConfig } from '../types';

type SettingsSection = 'general' | 'connections' | 'ai' | 'shortcuts' | 'license' | 'watch' | 'tasks' | 'about';

export function SettingsPanel() {
  const storeSection = useAppStore((s) => s.settingsSection) as SettingsSection;
  const [section, setSection] = useState<SettingsSection>(storeSection || 'general');
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  const isPro = useAppStore((s) => s.isPro);

  const sections: { id: SettingsSection; label: string; pro?: boolean }[] = [
    { id: 'general', label: 'General' },
    { id: 'connections', label: 'Connections' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'license', label: 'License' },
    { id: 'ai', label: 'AI', pro: !isPro },
    { id: 'watch', label: 'Watch & Alert', pro: !isPro },
    { id: 'tasks', label: 'Scheduled Tasks', pro: !isPro },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="flex-1 flex min-h-0 bg-void-elevated">
      {/* Left nav */}
      <div className="w-48 bg-void-input border-r border-void-border p-3 space-y-1 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-void-text font-medium">Settings</h2>
          <button
            onClick={toggleSettings}
            className="text-void-text-ghost hover:text-void-text-muted text-sm"
          >
            x
          </button>
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`w-full text-left px-3 py-2 text-sm rounded-void transition-colors ${
              section === s.id
                ? s.id === 'ai' ? 'text-accent bg-accent-glow border-l-2 border-accent rounded-none' : 'bg-void-surface text-void-text'
                : 'text-void-text-muted hover:text-void-text hover:bg-void-surface/50'
            }`}
          >
            <span className="flex items-center gap-2">
              {s.label}
              {s.pro && (
                <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="#555" strokeWidth="1.5"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
              )}
            </span>
            {s.pro && <span className="text-[8px] text-void-text-ghost block mt-0.5">Requires Pro</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {section === 'general' && <GeneralSettings />}
        {section === 'connections' && <ConnectionSettings />}
        {section === 'ai' && <AISettings />}
        {section === 'shortcuts' && <ShortcutSettings />}
        {section === 'license' && <ProActivationFlow />}
        {section === 'watch' && <WatchAlertSettings />}
        {section === 'tasks' && <ScheduledTasksSettings />}
        {section === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  const terminalFontSize = useAppStore((s) => s.terminalFontSize);
  const uiScale = useAppStore((s) => s.uiScale);
  const setTerminalFontSize = useAppStore((s) => s.setTerminalFontSize);
  const setUIScale = useAppStore((s) => s.setUIScale);

  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg text-void-text font-medium">General</h3>
      <SettingRow label="Theme" description="Dark theme only for v1">
        <span className="text-sm text-void-text-ghost">Dark</span>
      </SettingRow>

      {/* Terminal Font Size */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div><div className="text-sm text-void-text">Terminal Font Size</div><div className="text-2xs text-void-text-ghost">Size of text in terminal panes · default 13px</div></div>
          <span className="text-[13px] text-void-text font-mono font-medium">{terminalFontSize}px</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-void-text-ghost font-mono">8</span>
          <input type="range" min="8" max="24" step="1" value={terminalFontSize}
            onChange={(e) => setTerminalFontSize(parseInt(e.target.value))}
            className="flex-1 h-1 bg-void-border rounded-full appearance-none cursor-pointer accent-accent"
            style={{ accentColor: '#F97316' }} />
          <span className="text-[9px] text-void-text-ghost font-mono">24</span>
        </div>
      </div>

      {/* UI Scale */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div><div className="text-sm text-void-text">UI Scale</div><div className="text-2xs text-void-text-ghost">Scale the entire app interface · default 100%</div></div>
          <span className="text-[13px] text-void-text font-mono font-medium">{uiScale}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-void-text-ghost font-mono">75%</span>
          <input type="range" min="75" max="150" step="5" value={uiScale}
            onChange={(e) => setUIScale(parseInt(e.target.value))}
            className="flex-1 h-1 bg-void-border rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#F97316' }} />
          <span className="text-[9px] text-void-text-ghost font-mono">150%</span>
        </div>
        <div className="flex gap-2 mt-2">
          {[80, 90, 100, 110, 120].map((s) => (
            <button key={s} onClick={() => setUIScale(s)}
              className={`px-2 py-[3px] rounded-[4px] text-[9px] font-mono ${uiScale === s ? 'text-accent bg-accent-glow border-accent-dim' : 'text-void-text-ghost'}`}
              style={{ border: `0.5px solid ${uiScale === s ? 'rgba(249,115,22,0.25)' : '#2A2A30'}` }}>
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* Restore defaults — subtle text, only when changed */}
      {(terminalFontSize !== 13 || uiScale !== 100) && (
        <div className="flex justify-end">
          <span
            onClick={() => { setTerminalFontSize(13); setUIScale(100); }}
            className="text-[9px] text-void-text-faint hover:text-accent cursor-pointer font-mono"
            style={{ transition: 'color 0.15s ease' }}
          >
            reset to defaults
          </span>
        </div>
      )}

      <SettingRow label="Cursor Style" description="Terminal cursor appearance">
        <select className="bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1">
          <option value="bar">Bar</option>
          <option value="block">Block</option>
          <option value="underline">Underline</option>
        </select>
      </SettingRow>
      <SettingRow label="Scrollback" description="Lines of scrollback history">
        <input
          type="number"
          defaultValue={10000}
          className="w-24 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        />
      </SettingRow>
    </div>
  );
}

function ConnectionSettings() {
  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg text-void-text font-medium">Connections</h3>
      <SettingRow label="Default Port" description="Default SSH port for new connections">
        <input
          type="number"
          defaultValue={22}
          className="w-20 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        />
      </SettingRow>
      <SettingRow label="Keep-alive Interval" description="Seconds between keep-alive packets">
        <input
          type="number"
          defaultValue={30}
          className="w-20 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        />
      </SettingRow>
      <SettingRow label="Max Reconnect Attempts" description="Auto-reconnect attempt limit">
        <input
          type="number"
          defaultValue={10}
          className="w-20 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        />
      </SettingRow>
    </div>
  );
}

function AISettings() {
  const isPro = useAppStore((s) => s.isPro);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [editingKey, setEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [choosingProvider, setChoosingProvider] = useState(false);

  useEffect(() => {
    window.void.ai.getConfig().then((c: any) => {
      setConfig(c);
      if (!c?.provider) setChoosingProvider(true);
    });
  }, []);

  if (!isPro) {
    return <div className="max-w-md"><ProActivationFlow initialScreen="license" /></div>;
  }

  if (!config) return null;

  const saveConfig = (updated: AIConfig) => {
    setConfig(updated);
    window.void.ai.setConfig(updated);
  };

  const FEATURES: { key: keyof AIConfig['features']; label: string; desc: string; color: string }[] = [
    { key: 'autoNotes', label: 'Auto-notes & memory', desc: 'AI watches output, takes notes, builds memory. Feeds AI chat and timeline.', color: '#F97316' },
    { key: 'errorExplainer', label: 'Error explainer', desc: 'Auto-explain errors inline with suggested fix commands.', color: '#28C840' },
    { key: 'dangerDetection', label: 'Danger detection', desc: 'Warn before destructive commands on production servers.', color: '#FF5F57' },
    { key: 'autocomplete', label: 'Command autocomplete', desc: 'Predict next command based on context + memory. Tab to accept.', color: '#5B9BD5' },
    { key: 'naturalLanguage', label: 'Natural language commands', desc: 'Type ? to convert English/Taglish into terminal commands.', color: '#C586C0' },
    { key: 'securityScanner', label: 'Security scanner', desc: 'Scan .env, configs, and ports for vulnerabilities on connect.', color: '#FEBC2E' },
    { key: 'anomalyDetection', label: 'Anomaly detection', desc: 'Learn normal server behavior, alert on deviations. Needs 1-2 weeks baseline.', color: '#FEBC2E' },
  ];

  const providerNames: Record<string, string> = {
    anthropic: 'Anthropic (Claude Sonnet 4)',
    openai: 'OpenAI (GPT-4o)',
    gemini: 'Google (Gemini 2.0 Flash)',
    ollama: 'Ollama (Local)',
  };

  const hasApiKey = !!config.apiKey || config.provider === 'ollama';
  const hasProvider = !!config.provider;

  return (
    <div className="max-w-md space-y-4">
      <div>
        <div className="text-[16px] text-void-text font-semibold font-sans mb-[3px]">AI configuration</div>
        <div className="text-[10px] text-void-text-dim mb-5">Manage your AI provider and toggle individual features.</div>
      </div>

      {/* Not configured warning */}
      {!hasApiKey && (
        <div className="p-4 rounded-[10px] text-center mb-2" style={{ background: 'rgba(254,188,46,0.04)', border: '0.5px solid rgba(254,188,46,0.12)' }}>
          <div className="w-11 h-11 rounded-[11px] mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(254,188,46,0.06)', border: '0.5px solid rgba(254,188,46,0.1)' }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#FEBC2E" strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="#FEBC2E" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.7" fill="#FEBC2E"/></svg>
          </div>
          <div className="text-[14px] text-void-text font-semibold mb-1">AI is not configured</div>
          <div className="text-[10px] text-void-text-muted leading-relaxed mb-1">You have Pro, but AI features need an API key to work.</div>
          <div className="text-[10px] text-void-text-dim">BYOK — bring your own key. Your data never leaves your machine.</div>
        </div>
      )}

      {/* Verified banner */}
      {hasApiKey && (
        <div className="flex items-center gap-2 p-[10px] rounded-[8px] mb-2" style={{ background: 'rgba(40,200,64,0.04)', border: '0.5px solid rgba(40,200,64,0.12)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.3"/><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[10px] text-status-online font-medium">API key verified</span>
          <span className="text-[10px] text-void-text-muted">— {providerNames[config.provider] || 'Provider'} connected</span>
        </div>
      )}

      {/* Provider selector */}
      {choosingProvider ? (
        <div className="space-y-2">
          <div className="text-[10px] text-void-text-muted uppercase tracking-wider mb-[6px]">Choose AI provider</div>
          {(['anthropic', 'openai', 'gemini', 'ollama'] as const).map((p) => (
            <button key={p} onClick={() => { saveConfig({ ...config, provider: p }); setChoosingProvider(false); if (p !== 'ollama') { setEditingKey(true); setKeyInput(''); } }}
              className="w-full flex items-center gap-3 p-3 bg-void-surface rounded-[8px] text-left transition-all hover:bg-void-elevated"
              style={{ border: `0.5px solid ${config.provider === p ? 'var(--accent-border)' : '#2A2A30'}` }}>
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: config.provider === p ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)' }}>
                <div className={`w-3 h-3 rounded-full border-[1.5px] ${config.provider === p ? 'border-accent bg-accent' : 'border-void-border'}`} />
              </div>
              <div>
                <div className="text-[12px] text-void-text font-medium">{providerNames[p]}</div>
                <div className="text-[9px] text-void-text-dim mt-[1px]">{p === 'ollama' ? 'Free · Fully offline' : 'BYOK · Pay your provider'}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-[10px] p-3 bg-void-surface rounded-[8px]" style={{ border: '0.5px solid #2A2A30' }}>
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.08)' }}>
            <div className="w-3 h-3 rounded-full border-[1.5px] border-accent bg-accent" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] text-void-text font-medium">{providerNames[config.provider] || 'Select a provider'}</div>
            <div className={`text-[9px] mt-[1px] ${hasApiKey ? 'text-status-online' : 'text-void-text-dim'}`}>{hasApiKey ? 'Connected' : 'Not configured'}</div>
          </div>
          <span className="text-[10px] text-accent cursor-pointer" onClick={() => setChoosingProvider(true)}>Change provider</span>
        </div>
      )}

      {/* API Key */}
      {config.provider !== 'ollama' && (
        <div>
          <div className="text-[10px] text-void-text-muted uppercase tracking-wider mb-[6px]">API key</div>
          {editingKey ? (
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={config.provider === 'anthropic' ? 'sk-ant-...' : config.provider === 'openai' ? 'sk-...' : 'AIza...'}
                className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none"
                style={{ border: '0.5px solid var(--accent-border)' }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && keyInput.trim()) {
                    saveConfig({ ...config, apiKey: keyInput.trim() });
                    setEditingKey(false);
                  }
                  if (e.key === 'Escape') { setEditingKey(false); setKeyInput(''); }
                }}
              />
              <button onClick={() => { if (keyInput.trim()) { saveConfig({ ...config, apiKey: keyInput.trim() }); setEditingKey(false); } }}
                className="px-[14px] py-2 rounded-[6px] text-[10px] text-void-base font-medium bg-accent"
                style={{ border: 'none' }}>Save</button>
              <button onClick={() => { setEditingKey(false); setKeyInput(''); }}
                className="px-[10px] py-2 rounded-[6px] text-[10px] text-void-text-dim"
                style={{ border: '0.5px solid #2A2A30' }}>✕</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text-dim font-mono" style={{ border: '0.5px solid #2A2A30' }}>
                {config.apiKey ? `${config.apiKey.substring(0, 8)}${'•'.repeat(16)}${config.apiKey.slice(-4)}` : 'No API key set'}
              </div>
              <button onClick={() => { setEditingKey(true); setKeyInput(config.apiKey || ''); }}
                className="px-[14px] py-2 rounded-[6px] text-[10px] text-void-text-muted hover:text-void-text transition-colors cursor-pointer"
                style={{ border: '0.5px solid #2A2A30' }}>Edit</button>
            </div>
          )}
        </div>
      )}

      {/* Rate limit */}
      <div className="flex items-center justify-between p-[10px] bg-void-surface rounded-[6px]">
        <span className="text-[10px] text-void-text-muted">AI calls this hour</span>
        <span className="text-[11px] text-void-text font-mono">0 / 30</span>
      </div>

      {/* Feature toggles */}
      <div className="text-[10px] text-void-text-muted uppercase tracking-wider mt-2 mb-[10px]">
        {hasApiKey ? 'Features — all enabled' : 'Features (activate after setup)'}
      </div>
      <div className="flex flex-col gap-[6px]" style={{ opacity: hasApiKey ? 1 : 0.35, pointerEvents: hasApiKey ? 'auto' : 'none' }}>
        {FEATURES.map((f) => (
          <div key={f.key} className="flex items-center justify-between p-[10px] bg-void-surface rounded-[6px]" style={{ border: '0.5px solid #1A1A1E' }}>
            <div className="flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: f.color }} />
              <div>
                <div className="text-[11px] text-void-text">{f.label}</div>
                <div className="text-[9px] text-void-text-dim mt-[1px]">{f.desc}</div>
              </div>
            </div>
            <button
              onClick={() => {
                saveConfig({ ...config, features: { ...config.features, [f.key]: !config.features[f.key] } });
              }}
              className={`relative w-8 h-[18px] rounded-[9px] shrink-0 ${config.features[f.key] ? 'bg-accent' : 'bg-void-border'}`}
              style={{ transition: 'background-color 200ms ease' }}
            >
              <span className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full ${config.features[f.key] ? 'right-[2px]' : 'left-[2px]'}`}
                style={{ transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Inline error suggestions toggle */}
      <div className="flex items-center justify-between p-[10px] bg-void-surface rounded-[6px]" style={{ border: '0.5px solid #1A1A1E' }}>
        <div>
          <div className="text-[11px] text-void-text">Show inline error suggestions</div>
          <div className="text-[9px] text-void-text-dim mt-[1px]">VOID AI cards that appear below the terminal when errors are detected</div>
        </div>
        <button
          onClick={() => {
            const current = localStorage.getItem('void-ai-error-suggestions') !== 'false';
            localStorage.setItem('void-ai-error-suggestions', current ? 'false' : 'true');
            saveConfig({ ...config });
          }}
          className={`relative w-8 h-[18px] rounded-[9px] shrink-0 ${localStorage.getItem('void-ai-error-suggestions') !== 'false' ? 'bg-accent' : 'bg-void-border'}`}
          style={{ transition: 'background-color 200ms ease' }}
        >
          <span className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full ${localStorage.getItem('void-ai-error-suggestions') !== 'false' ? 'right-[2px]' : 'left-[2px]'}`}
            style={{ transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
        </button>
      </div>

      {/* Security note */}
      <div className="p-[10px] rounded-[6px] text-[9px] text-void-text-muted" style={{ background: 'rgba(40,200,64,0.04)', border: '0.5px solid rgba(40,200,64,0.1)' }}>
        <strong className="text-status-online">All data stays local.</strong> AI memory stored at ~/.void/memory/. API key encrypted at ~/.void/. AI calls go directly to your provider — nothing is sent to Void Terminal servers.
      </div>
    </div>
  );
}

function ShortcutSettings() {
  const shortcuts = [
    { key: 'Cmd+T', action: 'New tab' },
    { key: 'Cmd+W', action: 'Close tab' },
    { key: 'Cmd+K', action: 'Command palette' },
    { key: 'Cmd+D', action: 'Split horizontal' },
    { key: 'Cmd+Shift+D', action: 'Split grid' },
    { key: 'Cmd+Shift+N', action: 'Toggle notes' },
    { key: 'Cmd+L', action: 'AI chat' },
    { key: 'Cmd+,', action: 'Settings' },
    { key: 'Cmd+1-9', action: 'Switch tab' },
    { key: 'Cmd+F', action: 'Search output' },
    { key: 'Shift+Enter', action: 'Multi-line input' },
    { key: 'Escape', action: 'Close overlay' },
  ];

  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg text-void-text font-medium">Keyboard Shortcuts</h3>
      <div className="space-y-1">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between py-2 border-b border-void-border/20">
            <span className="text-sm text-void-text-muted">{s.action}</span>
            <kbd className="text-2xs text-void-text-ghost bg-void-surface px-2 py-0.5 rounded font-mono">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

function LicenseSettings() {
  const isPro = useAppStore((s) => s.isPro);
  const loadLicense = useAppStore((s) => s.loadLicense);
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [needsRestart, setNeedsRestart] = useState(false);

  const handleActivate = async () => {
    if (!key || !email) { setStatus('Enter license key and email.'); return; }
    setLoading(true);
    const result = await window.void.license.activate(key, email);
    setLoading(false);
    if (result.success) {
      setStatus('License activated! Restart to enable Pro features.');
      await loadLicense();
      setNeedsRestart(true);
    } else {
      setStatus(result.error || 'Activation failed.');
    }
  };

  const handleDeactivate = async () => {
    await window.void.license.deactivate();
    // Immediately lock Pro features — no restart needed
    useAppStore.setState({ isPro: false, licenseInfo: null });
    await loadLicense();
    setStatus('License deactivated. Pro features disabled.');
  };

  const handleRestart = () => {
    window.void.app.relaunch();
  };

  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg text-void-text font-medium">License</h3>

      {/* Current status */}
      <div className="flex items-center gap-3 p-4 bg-void-input rounded-void-lg border-[0.5px] border-void-border">
        <div className={`w-3 h-3 rounded-full ${isPro ? 'bg-accent' : 'bg-void-text-ghost'}`} />
        <div>
          <div className="text-sm text-void-text font-medium">
            {isPro ? 'Void Terminal Pro' : 'Void Terminal Free'}
          </div>
          <div className="text-2xs text-void-text-ghost">
            {isPro ? 'All features unlocked' : 'Upgrade to unlock Pro features'}
          </div>
        </div>
        {isPro && (
          <span className="text-[9px] font-mono font-bold text-accent bg-accent-glow border-[0.5px] border-accent-dim px-2 py-0.5 rounded-[4px] ml-auto">
            PRO
          </span>
        )}
      </div>

      {!isPro ? (
        <>
          <div>
            <label className="block text-[10px] text-void-text-dim uppercase tracking-[0.8px] mb-[6px]">
              License Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="VOID-XXXX-XXXX-XXXX-XXXX"
              className="w-full px-[14px] py-[10px] bg-void-input border-[0.5px] border-void-border rounded-[6px] text-[13px] text-void-text-muted font-mono focus:border-accent/50 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-void-text-dim uppercase tracking-[0.8px] mb-[6px]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-[14px] py-[10px] bg-void-input border-[0.5px] border-void-border rounded-[6px] text-[13px] text-void-text-muted font-mono focus:border-accent/50 outline-none"
            />
          </div>
          <button
            onClick={handleActivate}
            disabled={loading}
            className="px-7 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors font-mono"
          >
            {loading ? 'Activating...' : 'Activate License'}
          </button>
        </>
      ) : (
        <button
          onClick={handleDeactivate}
          className="px-5 py-[10px] border-[0.5px] border-void-border rounded-[8px] text-[12px] text-void-text-dim font-mono hover:border-void-border-hover"
        >
          Deactivate License
        </button>
      )}

      {status && (
        <div className={`text-[11px] px-3 py-2 rounded-[6px] ${
          status.includes('activated!') || status.includes('Restart')
            ? 'text-status-online bg-status-online/10 border-[0.5px] border-status-online/20'
            : 'text-status-error bg-status-error/5 border-[0.5px] border-status-error/15'
        }`}>
          {status}
        </div>
      )}

      {needsRestart && (
        <button
          onClick={handleRestart}
          className="w-full px-7 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold hover:bg-accent-hover transition-colors font-mono"
        >
          Restart Void Terminal
        </button>
      )}

      {/* Pro features list */}
      <div className="border-t border-void-border pt-4">
        <h4 className="text-xs text-void-text-dim uppercase tracking-wider mb-3">Pro Features</h4>
        <div className="space-y-2 text-sm text-void-text-muted">
          {[
            'SSH Tunnel Manager', 'Broadcast Mode', 'Workspaces', 'Scheduled Tasks',
            'SFTP Sidebar', 'Watch & Alert', 'Env Inspector', 'Port Forwarding',
            'Audit Log', 'Pinned Notes', 'AI Memory System', 'AI Error Explainer',
            'AI Danger Detection', 'AI Autocomplete', 'NLP Commands',
            'AI Security Scanner', 'AI Anomaly Detection',
          ].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className={`text-[10px] ${isPro ? 'text-status-online' : 'text-void-text-ghost'}`}>
                {isPro ? '✓' : '○'}
              </span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  const isPro = useAppStore((s) => s.isPro);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const updateVersion = useAppStore((s) => s.updateVersion);
  const downloadProgress = useAppStore((s) => s.downloadProgress);
  const downloadSize = useAppStore((s) => s.downloadSize);
  const updateError = useAppStore((s) => s.updateError);
  const updateChangelog = useAppStore((s) => s.updateChangelog);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkForUpdates = async () => {
    setChecking(true);
    useAppStore.setState({ updateStatus: 'idle', updateError: null });
    try {
      const data = await (window as any).void.app.checkForUpdates('0.1.6');
      if (data.error) throw new Error(data.error);
      setLastChecked(new Date());
      if (data.update) {
        useAppStore.setState({
          updateStatus: 'available', updateVersion: data.version, updateChangelog: data.changelog || [],
          updateRequired: data.required || false, downloadSize: data.downloadSize || '', updateDismissed: false, updateError: null,
        });
      } else {
        useAppStore.setState({ updateStatus: 'idle', updateVersion: null, updateChangelog: [], updateError: null });
      }
    } catch {
      useAppStore.setState({ updateStatus: 'failed', updateError: 'Unable to reach update server. Check your internet connection.' });
    }
    setChecking(false);
  };

  const startDownload = () => {
    useAppStore.setState({ updateStatus: 'downloading', downloadProgress: 0 });
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) { p = 100; clearInterval(interval); useAppStore.setState({ updateStatus: 'ready', downloadProgress: 100 }); }
      useAppStore.setState({ downloadProgress: Math.min(100, Math.round(p)) });
    }, 500);
  };

  const features = updateChangelog.filter(c => c.type === 'feature').length;
  const improvements = updateChangelog.filter(c => c.type === 'improvement').length;
  const fixes = updateChangelog.filter(c => c.type === 'fix').length;

  return (
    <div className="max-w-lg space-y-5">
      {/* Logo + version */}
      <div className="flex items-center gap-4 pb-5" style={{ borderBottom: '0.5px solid #2A2A30' }}>
        <div className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0" style={{ border: '2.5px solid #F97316' }}>
          <div className="w-5 h-5 rounded-[5px] bg-accent" />
        </div>
        <div>
          <div className="text-[16px] text-void-text font-bold font-mono" style={{ letterSpacing: '-0.5px' }}>void terminal</div>
          <div className="flex items-center gap-2 mt-[2px] text-[12px] text-void-text-dim font-mono">
            v0.1.6
            {isPro && <span className="text-[8px] font-bold text-accent px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.15)' }}>PRO</span>}
            <span className="text-[8px] font-bold text-status-online px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(40,200,64,0.06)', border: '0.5px solid rgba(40,200,64,0.1)' }}>STABLE</span>
          </div>
        </div>
      </div>

      {/* System info */}
      <div>
        <div className="text-[10px] text-void-text-dim uppercase tracking-[0.8px] mb-2 font-mono">System</div>
        <table className="w-full text-[11px]">
          <tbody>
            {[
              ['Electron', 'v33.2.0'],
              ['Node.js', typeof process !== 'undefined' ? process.versions?.node || 'v20' : 'v20'],
              ['OS', typeof navigator !== 'undefined' ? navigator.platform : 'macOS'],
              ['License', isPro ? 'Pro · Active ✓' : 'Free'],
            ].map(([label, value], i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
                <td className="py-2 text-void-text-dim" style={{ width: '140px' }}>{label}</td>
                <td className="py-2 text-void-text-muted font-mono text-[10px]">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Update section */}
      <div className="p-4 rounded-[8px]" style={{
        background: 'var(--surface)',
        border: `0.5px solid ${updateStatus === 'available' ? 'rgba(249,115,22,0.15)' : updateStatus === 'ready' ? 'rgba(40,200,64,0.15)' : '#2A2A30'}`,
      }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-[12px] text-void-text font-semibold">Software update</div>
            <div className="text-[10px] text-void-text-dim flex items-center gap-[6px]">
              {checking ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="animate-spin" style={{ animationDuration: '1s' }}><circle cx="8" cy="8" r="5.5" stroke="#2A2A30" strokeWidth="1.5" /><path d="M8 2.5a5.5 5.5 0 014.5 2.5" stroke="#888" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Checking for updates...
                </>
              ) : updateStatus === 'available' ? 'A new version is available.'
                : updateStatus === 'downloading' ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="animate-spin" style={{ animationDuration: '1.2s' }}><circle cx="8" cy="8" r="5.5" stroke="#2A2A30" strokeWidth="1.5" /><path d="M8 2.5a5.5 5.5 0 014.5 2.5" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Downloading v{updateVersion}...
                  </>
                )
                : updateStatus === 'ready' ? `v${updateVersion} is ready to install.`
                : updateStatus === 'failed' ? "Couldn't check for updates."
                : 'Void Terminal is up to date.'}
            </div>
          </div>
          {/* Button */}
          {updateStatus === 'available' ? (
            <button onClick={startDownload} className="px-[18px] py-[8px] rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Download v{updateVersion}</button>
          ) : updateStatus === 'ready' ? (
            <button onClick={() => window.void.app.restart()} className="px-[18px] py-[8px] rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#28C840', color: 'var(--base)' }}>Restart now</button>
          ) : updateStatus === 'downloading' ? (
            <button className="text-[10px] text-status-error bg-transparent border-none cursor-pointer font-sans" onClick={() => useAppStore.setState({ updateStatus: 'available' })}>Cancel</button>
          ) : (
            <button onClick={checkForUpdates} disabled={checking}
              className="px-[18px] py-[8px] rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans flex items-center gap-[6px]"
              style={{ background: 'var(--elevated)', color: checking ? 'var(--ghost)' : 'var(--muted)', border: '0.5px solid #2A2A30', opacity: checking ? 0.6 : 1 }}>
              {checking ? 'Checking...' : updateStatus === 'failed' ? 'Retry' : 'Check for updates'}
            </button>
          )}
        </div>

        {/* Download progress */}
        {updateStatus === 'downloading' && (
          <div className="mt-[10px]">
            <div className="h-[4px] rounded-[2px] overflow-hidden" style={{ background: '#2A2A30' }}>
              <div className="h-full rounded-[2px]" style={{ width: `${downloadProgress}%`, background: '#F97316', transition: 'width 300ms ease' }} />
            </div>
            <div className="flex justify-between mt-[6px] text-[9px] font-mono">
              <span className="text-void-text-dim">{downloadSize}</span>
              <span className="text-accent">{downloadProgress}%</span>
            </div>
          </div>
        )}

        {/* Result boxes */}
        {updateStatus === 'idle' && lastChecked && (
          <div className="flex items-center gap-2 mt-3 p-[10px] rounded-[6px] text-[11px]" style={{ background: 'rgba(40,200,64,0.03)', border: '0.5px solid rgba(40,200,64,0.08)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.3" /><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-status-online font-medium">You're on the latest version</span>
            <span className="text-void-text-ghost ml-auto text-[9px] font-mono">Last checked: just now</span>
          </div>
        )}

        {updateStatus === 'available' && (
          <div className="flex items-center gap-2 mt-3 p-[10px] rounded-[6px] text-[11px]" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.15)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12h10" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-accent font-semibold font-mono text-[11px]">v{updateVersion}</span>
                <span className="text-void-text-dim text-[10px]">{features} features · {improvements} improvements · {fixes} fixes</span>
              </div>
              <div className="text-[10px] text-void-text-dim mt-[3px]">{downloadSize} · Released March 2026</div>
            </div>
            <button onClick={() => useAppStore.setState({ patchNotesOpen: true, patchNotesMode: 'preview' })}
              className="text-[10px] text-accent bg-transparent border-none cursor-pointer font-sans underline" style={{ textUnderlineOffset: '2px' }}>View patch notes</button>
          </div>
        )}

        {updateStatus === 'ready' && (
          <div className="mt-3">
            <div className="flex items-center gap-2 p-[10px] rounded-[6px] text-[11px]" style={{ background: 'rgba(40,200,64,0.03)', border: '0.5px solid rgba(40,200,64,0.08)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.3" /><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-status-online font-medium">Download complete — restart to apply</span>
            </div>
            <div className="text-[10px] text-void-text-dim mt-2 leading-relaxed">Your sessions will be saved and reconnected automatically after restart.</div>
          </div>
        )}

        {updateStatus === 'failed' && (
          <div className="flex items-center gap-2 mt-3 p-[10px] rounded-[6px] text-[11px]" style={{ background: 'rgba(255,95,87,0.03)', border: '0.5px solid rgba(255,95,87,0.08)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#FF5F57" strokeWidth="1.3" /><path d="M6 6l4 4M10 6l-4 4" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round" /></svg>
            <span className="text-status-error">{updateError || 'Unable to reach update server.'}</span>
          </div>
        )}
      </div>

      {/* Resources */}
      <div>
        <div className="text-[10px] text-void-text-dim uppercase tracking-[0.8px] mb-2 font-mono">Resources</div>
        <div className="flex flex-col">
          {[
            { label: 'Documentation', url: 'https://voidterminal.dev' },
            { label: 'Changelog', url: 'https://voidterminal.dev/#changelog' },
            { label: 'GitHub repository', url: 'https://github.com/weigibbor/Void-Terminal' },
            { label: 'Report a bug', url: 'https://github.com/weigibbor/Void-Terminal/issues' },
            { label: 'Privacy policy', url: 'https://voidterminal.dev' },
          ].map((link, i) => (
            <div key={i} onClick={() => window.open(link.url, '_blank')}
              className="flex items-center justify-between py-[10px] text-[11px] text-void-text-muted cursor-pointer hover:text-void-text transition-colors"
              style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
              <span>{link.label}</span>
              <span className="text-void-text-ghost text-[12px]">→</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div className="text-center text-[10px] text-void-text-ghost leading-relaxed pt-2">
        Built by <span className="text-void-text-muted">GE Labs</span> · Philippines 🇵🇭<br />
        <span className="font-mono text-[9px]">© 2026 GE Labs. MIT (core) + Proprietary (Pro).</span>
      </div>
    </div>
  );
}

// Persisted watch rules — shared with terminal for real-time matching
const WATCH_RULES_KEY = 'void-watch-rules';
const DEFAULT_RULES = [
  { id: '1', pattern: 'ERROR', action: 'notification' as const, enabled: true },
  { id: '2', pattern: 'deploy complete', action: 'notification' as const, enabled: true },
  { id: '3', pattern: 'OOM|Out of memory', action: 'notification' as const, enabled: true },
];

export function getWatchRules(): { id: string; pattern: string; action: string; enabled: boolean }[] {
  try {
    const saved = localStorage.getItem(WATCH_RULES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  } catch { return DEFAULT_RULES; }
}

function WatchAlertSettings() {
  const isPro = useAppStore((s) => s.isPro);
  const [rules, setRulesState] = useState(() => getWatchRules());
  const [newPattern, setNewPattern] = useState('');

  const setRules = (newRules: typeof rules) => {
    setRulesState(newRules);
    localStorage.setItem(WATCH_RULES_KEY, JSON.stringify(newRules));
  };

  if (!isPro) return <div className="max-w-md"><ProActivationFlow initialScreen="license" /></div>;

  const addRule = () => {
    if (!newPattern.trim()) return;
    setRules([...rules, { id: String(Date.now()), pattern: newPattern.trim(), action: 'notification', enabled: true }]);
    setNewPattern('');
  };

  const toggleRule = (id: string) => setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const deleteRule = (id: string) => setRules(rules.filter(r => r.id !== id));

  return (
    <div className="max-w-md space-y-4">
      <div>
        <div className="text-[16px] text-void-text font-semibold font-sans mb-[3px]">Watch & Alert</div>
        <div className="text-[11px] text-void-text-dim mb-4">Set keyword triggers on terminal output to get desktop notifications.</div>
      </div>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 p-[10px] bg-void-surface rounded-[6px]" style={{ border: '0.5px solid #1A1A1E' }}>
            <button onClick={() => toggleRule(rule.id)} className={`w-4 h-4 rounded-full border shrink-0 cursor-pointer ${rule.enabled ? 'bg-status-online border-status-online' : 'bg-transparent border-void-border'}`} />
            <code className="text-[11px] text-void-text-muted font-mono flex-1 truncate">{rule.pattern}</code>
            <span className="text-[10px] text-void-text-ghost">{rule.action}</span>
            <button onClick={() => deleteRule(rule.id)} className="text-[13px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newPattern} onChange={e => setNewPattern(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addRule(); }}
          placeholder="Enter pattern (regex supported)" className="flex-1 px-3 py-[8px] bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none" style={{ border: '0.5px solid #2A2A30' }} />
        <button onClick={addRule} className="px-4 py-[8px] rounded-[6px] text-[11px] text-accent font-semibold font-sans cursor-pointer" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.15)' }}>+ Add</button>
      </div>
      <div className="text-[10px] text-void-text-ghost leading-relaxed">Rules are matched against terminal output in real-time. Notifications appear as macOS alerts.</div>
    </div>
  );
}

const SCHEDULED_TASKS_KEY = 'void-scheduled-tasks';

function ScheduledTasksSettings() {
  const isPro = useAppStore((s) => s.isPro);
  const [tasks, setTasksState] = useState<{ id: string; name: string; command: string; schedule: string; server: string; enabled: boolean }[]>(() => {
    try { const s = localStorage.getItem(SCHEDULED_TASKS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const setTasks = (t: typeof tasks) => { setTasksState(t); localStorage.setItem(SCHEDULED_TASKS_KEY, JSON.stringify(t)); };
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newSchedule, setNewSchedule] = useState('0 * * * *');
  const [newServer, setNewServer] = useState('All servers');

  if (!isPro) return <div className="max-w-md"><ProActivationFlow initialScreen="license" /></div>;

  const addTask = () => {
    if (!newName.trim() || !newCommand.trim()) return;
    setTasks([...tasks, { id: String(Date.now()), name: newName.trim(), command: newCommand.trim(), schedule: newSchedule, server: newServer, enabled: true }]);
    setNewName(''); setNewCommand(''); setNewSchedule('0 * * * *'); setAdding(false);
  };

  const toggleTask = (id: string) => setTasks(tasks.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  const deleteTask = (id: string) => setTasks(tasks.filter(t => t.id !== id));

  const cronLabels: Record<string, string> = { '0 * * * *': 'Every hour', '*/5 * * * *': 'Every 5 min', '0 0 * * *': 'Daily midnight', '0 */6 * * *': 'Every 6 hours', '0 0 * * 0': 'Weekly Sunday' };

  return (
    <div className="max-w-md space-y-4">
      <div>
        <div className="text-[16px] text-void-text font-semibold font-sans mb-[3px]">Scheduled Tasks</div>
        <div className="text-[11px] text-void-text-dim mb-4">Schedule commands to run on SSH sessions automatically.</div>
      </div>

      {tasks.length === 0 && !adding && (
        <div className="text-center py-8">
          <div className="text-[12px] text-void-text-ghost mb-2">No scheduled tasks yet</div>
          <div className="text-[10px] text-void-text-faint">Automate recurring commands like backups, log rotation, health checks.</div>
        </div>
      )}

      {tasks.map(task => (
        <div key={task.id} className="p-3 bg-void-surface rounded-[8px]" style={{ border: '0.5px solid #1A1A1E' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => toggleTask(task.id)} className={`w-4 h-4 rounded-full border shrink-0 cursor-pointer ${task.enabled ? 'bg-status-online border-status-online' : 'bg-transparent border-void-border'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-void-text font-medium truncate">{task.name}</div>
              <code className="text-[10px] text-void-text-dim font-mono truncate block">{task.command}</code>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] text-accent font-mono">{cronLabels[task.schedule] || task.schedule}</div>
              <div className="text-[9px] text-void-text-ghost">{task.server}</div>
            </div>
            <button onClick={() => deleteTask(task.id)} className="text-[13px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer">×</button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="p-4 bg-void-surface rounded-[8px] space-y-3" style={{ border: '0.5px solid rgba(249,115,22,0.15)' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Task name (e.g. DB Backup)" className="w-full px-3 py-[8px] bg-void-input rounded-[6px] text-[11px] text-void-text font-sans outline-none" style={{ border: '0.5px solid #2A2A30' }} />
          <input value={newCommand} onChange={e => setNewCommand(e.target.value)} placeholder="Command (e.g. pg_dump -U postgres mydb > backup.sql)" className="w-full px-3 py-[8px] bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none" style={{ border: '0.5px solid #2A2A30' }} />
          <div className="flex gap-2">
            <select value={newSchedule} onChange={e => setNewSchedule(e.target.value)} className="flex-1 px-3 py-[8px] bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none appearance-none" style={{ border: '0.5px solid #2A2A30' }}>
              <option value="*/5 * * * *">Every 5 minutes</option>
              <option value="0 * * * *">Every hour</option>
              <option value="0 */6 * * *">Every 6 hours</option>
              <option value="0 0 * * *">Daily at midnight</option>
              <option value="0 0 * * 0">Weekly (Sunday)</option>
            </select>
            <select value={newServer} onChange={e => setNewServer(e.target.value)} className="flex-1 px-3 py-[8px] bg-void-input rounded-[6px] text-[11px] text-void-text font-sans outline-none appearance-none" style={{ border: '0.5px solid #2A2A30' }}>
              <option>All servers</option>
              <option>Active server only</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-4 py-[6px] rounded-[6px] text-[11px] text-void-text-dim font-sans cursor-pointer" style={{ border: '0.5px solid #2A2A30', background: 'transparent' }}>Cancel</button>
            <button onClick={addTask} className="px-4 py-[6px] rounded-[6px] text-[11px] text-void-base font-semibold font-sans cursor-pointer border-none" style={{ background: '#F97316' }}>Add task</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-[11px] text-accent hover:text-accent-hover bg-transparent border-none cursor-pointer font-sans">+ Add task</button>
      )}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-void-text">{label}</div>
        <div className="text-2xs text-void-text-ghost">{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-accent' : 'bg-void-border'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
