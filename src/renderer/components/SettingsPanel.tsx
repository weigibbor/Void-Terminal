import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import type { AIConfig } from '../types';

type SettingsSection = 'general' | 'connections' | 'ai' | 'shortcuts' | 'license' | 'about';

export function SettingsPanel() {
  const storeSection = useAppStore((s) => s.settingsSection) as SettingsSection;
  const [section, setSection] = useState<SettingsSection>(storeSection || 'general');
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  const sections: { id: SettingsSection; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'connections', label: 'Connections' },
    { id: 'ai', label: 'AI' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'license', label: 'License' },
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
                ? 'bg-void-surface text-void-text'
                : 'text-void-text-muted hover:text-void-text hover:bg-void-surface/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {section === 'general' && <GeneralSettings />}
        {section === 'connections' && <ConnectionSettings />}
        {section === 'ai' && <AISettings />}
        {section === 'shortcuts' && <ShortcutSettings />}
        {section === 'license' && <LicenseSettings />}
        {section === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg text-void-text font-medium">General</h3>
      <SettingRow label="Theme" description="Dark theme only for v1">
        <span className="text-sm text-void-text-ghost">Dark</span>
      </SettingRow>
      <SettingRow label="Font Size" description="Terminal font size in pixels">
        <input
          type="number"
          defaultValue={13}
          className="w-20 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        />
      </SettingRow>
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
  const [config, setConfig] = useState<AIConfig | null>(null);

  useEffect(() => {
    window.void.ai.getConfig().then(setConfig);
  }, []);

  if (!config) return null;

  const features: { key: keyof AIConfig['features']; label: string; desc: string }[] = [
    { key: 'autoNotes', label: 'Auto-notes', desc: 'AI watches output and takes notes on important events' },
    { key: 'errorExplainer', label: 'Error explainer', desc: 'Auto-explain errors and suggest fixes' },
    { key: 'dangerDetection', label: 'Danger detection', desc: 'Intercept destructive commands before execution' },
    { key: 'autocomplete', label: 'Autocomplete', desc: 'Predict the next command based on context' },
    { key: 'naturalLanguage', label: 'Natural language', desc: 'Convert plain English to terminal commands' },
    { key: 'securityScanner', label: 'Security scanner', desc: 'Scan configs for security issues' },
    { key: 'anomalyDetection', label: 'Anomaly detection', desc: 'Alert on unusual server behavior' },
  ];

  return (
    <div className="max-w-md space-y-6">
      <h3 className="text-lg text-void-text font-medium">AI Settings</h3>

      <SettingRow label="Provider" description="AI inference provider">
        <select
          value={config.provider}
          onChange={(e) => setConfig({ ...config, provider: e.target.value as AIConfig['provider'] })}
          className="bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT-4o)</option>
          <option value="gemini">Google (Gemini)</option>
          <option value="ollama">Ollama (Local)</option>
        </select>
      </SettingRow>

      <SettingRow label="API Key" description="Your API key (stored locally)">
        <input
          type="password"
          value={config.apiKey || ''}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          placeholder="sk-..."
          className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
        />
      </SettingRow>

      <div className="border-t border-void-border pt-4 space-y-3">
        <h4 className="text-sm text-void-text-dim uppercase tracking-wider">Features</h4>
        {features.map((f) => (
          <div key={f.key} className="flex items-center justify-between py-2 border-b border-void-border/30">
            <div>
              <div className="text-sm text-void-text">{f.label}</div>
              <div className="text-2xs text-void-text-ghost">{f.desc}</div>
            </div>
            <ToggleSwitch
              checked={config.features[f.key]}
              onChange={(v) =>
                setConfig({ ...config, features: { ...config.features, [f.key]: v } })
              }
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => window.void.ai.setConfig(config)}
        className="bg-accent text-void-base font-semibold text-sm px-4 py-2 rounded-void-lg hover:bg-accent-hover transition-colors"
      >
        Save AI Settings
      </button>
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

  const handleActivate = async () => {
    if (!key || !email) { setStatus('Enter license key and email.'); return; }
    setLoading(true);
    const result = await window.void.license.activate(key, email);
    setLoading(false);
    if (result.success) {
      setStatus('License activated! Pro features unlocked.');
      await loadLicense();
    } else {
      setStatus(result.error || 'Activation failed.');
    }
  };

  const handleDeactivate = async () => {
    await window.void.license.deactivate();
    await loadLicense();
    setStatus('License deactivated.');
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
          status.includes('activated!') || status.includes('unlocked')
            ? 'text-status-online bg-status-online/10 border-[0.5px] border-status-online/20'
            : 'text-status-error bg-status-error/5 border-[0.5px] border-status-error/15'
        }`}>
          {status}
        </div>
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
