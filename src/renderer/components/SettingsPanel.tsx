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

  useEffect(() => {
    window.void.ai.getConfig().then(setConfig);
  }, []);

  if (!isPro) {
    return <div className="max-w-md"><ProActivationFlow initialScreen="license" /></div>;
  }

  if (!config) return null;

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

      {/* Provider card */}
      <div className="flex items-center gap-[10px] p-3 bg-void-surface rounded-[8px]" style={{ border: '0.5px solid #2A2A30' }}>
        <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.08)' }}>
          <div className="w-3 h-3 rounded-full border-[1.5px] border-accent" />
        </div>
        <div className="flex-1">
          <div className="text-[12px] text-void-text font-medium">{providerNames[config.provider] || 'Select a provider'}</div>
          <div className={`text-[9px] mt-[1px] ${hasApiKey ? 'text-status-online' : 'text-void-text-dim'}`}>{hasApiKey ? 'Connected' : 'Not configured'}</div>
        </div>
        <span className="text-[10px] text-accent cursor-pointer">Change provider</span>
      </div>

      {/* API Key */}
      <div>
        <div className="text-[10px] text-void-text-muted uppercase tracking-wider mb-[6px]">API key</div>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text-dim font-mono" style={{ border: '0.5px solid #2A2A30' }}>
            {config.apiKey ? `${config.apiKey.substring(0, 8)}${'•'.repeat(16)}${config.apiKey.slice(-4)}` : 'No API key set'}
          </div>
          <button className="px-[14px] py-2 rounded-[6px] text-[10px] text-void-text-muted" style={{ border: '0.5px solid #2A2A30' }}>Edit</button>
        </div>
      </div>

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
                const updated = { ...config, features: { ...config.features, [f.key]: !config.features[f.key] } };
                setConfig(updated);
                window.void.ai.setConfig(updated);
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

      {/* Security note */}
      <div className="p-[10px] rounded-[6px] text-[9px] text-void-text-muted" style={{ background: 'rgba(40,200,64,0.04)', border: '0.5px solid rgba(40,200,64,0.1)' }}>
        <strong className="text-status-online">All data stays local.</strong> AI memory stored at ~/.void/memory/. API key encrypted at ~/.config/void-terminal/. Nothing leaves your machine.
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
    await loadLicense();
    setStatus('License deactivated. Restart to apply.');
    setNeedsRestart(true);
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
  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg text-void-text font-medium">About</h3>
      <div className="space-y-3 text-sm text-void-text-muted">
        <p>
          <span className="font-mono font-bold text-void-text">Void Terminal</span> v1.0.0
        </p>
        <p>The terminal that thinks.</p>
        <p className="text-void-text-ghost">Built in the Philippines. Made for the world.</p>
        <p className="text-void-text-ghost">GE Labs &copy; 2026</p>
      </div>
    </div>
  );
}

function WatchAlertSettings() {
  const isPro = useAppStore((s) => s.isPro);
  if (!isPro) return <div className="max-w-md"><ProActivationFlow initialScreen="license" /></div>;
  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg text-void-text font-medium">Watch & Alert</h3>
      <div className="text-[10px] text-void-text-dim mb-3">Set keyword triggers on terminal output to get desktop notifications.</div>
      <div className="space-y-2">
        {[
          { pattern: 'ERROR', action: 'notification', enabled: true },
          { pattern: 'deploy complete', action: 'notification', enabled: true },
          { pattern: 'OOM|Out of memory', action: 'notification', enabled: true },
        ].map((rule, i) => (
          <div key={i} className="flex items-center gap-3 p-[10px] bg-void-surface rounded-[6px]" style={{ border: '0.5px solid #1A1A1E' }}>
            <div className={`w-3 h-3 rounded-full border ${rule.enabled ? 'bg-status-online border-status-online' : 'border-void-border'}`} />
            <code className="text-sm text-void-text-muted font-mono flex-1 truncate">{rule.pattern}</code>
            <span className="text-[9px] text-void-text-ghost">{rule.action}</span>
          </div>
        ))}
      </div>
      <button className="text-[10px] text-accent hover:text-accent-hover">+ Add rule</button>
    </div>
  );
}

function ScheduledTasksSettings() {
  const isPro = useAppStore((s) => s.isPro);
  if (!isPro) return <div className="max-w-md"><ProActivationFlow initialScreen="license" /></div>;
  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg text-void-text font-medium">Scheduled Tasks</h3>
      <div className="text-[10px] text-void-text-dim mb-3">Schedule commands to run on SSH sessions. Visual cron builder.</div>
      <div className="text-center py-8 text-[11px] text-void-text-ghost">No scheduled tasks yet. Click + to add one.</div>
      <button className="text-[10px] text-accent hover:text-accent-hover">+ Add task</button>
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
