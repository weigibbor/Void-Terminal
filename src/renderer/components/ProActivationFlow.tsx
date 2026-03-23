import { useState } from 'react';
import { useAppStore } from '../stores/app-store';

type Screen = 'license' | 'activating' | 'error' | 'success' | 'welcome' | 'provider' | 'apikey' | 'features' | 'celebration';
type Provider = 'anthropic' | 'openai' | 'gemini' | 'ollama';

const PROVIDERS: { id: Provider; name: string; desc: string; color: string; bg: string }[] = [
  { id: 'anthropic', name: 'Anthropic (Claude)', desc: 'Claude Sonnet 4 — recommended for best results', color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
  { id: 'openai', name: 'OpenAI (GPT-4o)', desc: 'GPT-4o — fast and capable', color: '#5B9BD5', bg: 'rgba(91,155,213,0.08)' },
  { id: 'gemini', name: 'Google (Gemini)', desc: 'Gemini 2.0 Flash — fast and affordable', color: '#28C840', bg: 'rgba(40,200,64,0.08)' },
  { id: 'ollama', name: 'Ollama (Local)', desc: 'Run AI locally — free, fully offline, private', color: '#C586C0', bg: 'rgba(197,134,192,0.08)' },
];

const AI_FEATURES = [
  { key: 'autoNotes', name: 'AI auto-notes & memory', desc: 'Watches terminal, takes notes, remembers everything', color: '#F97316' },
  { key: 'errorExplainer', name: 'Error explainer', desc: 'Auto-explain errors with fix commands', color: '#28C840' },
  { key: 'dangerDetection', name: 'Danger detection', desc: 'Block destructive commands on production', color: '#FF5F57' },
  { key: 'autocomplete', name: 'Command autocomplete', desc: 'Tab to accept predicted commands', color: '#5B9BD5' },
  { key: 'naturalLanguage', name: 'Natural language commands', desc: 'Type ? to convert English into terminal commands', color: '#C586C0' },
  { key: 'securityScanner', name: 'Security scanner, anomaly, deploy copilot', desc: 'Advanced protection and guidance', color: '#FEBC2E' },
];

export function ProActivationFlow({ initialScreen = 'license', onComplete }: { initialScreen?: Screen; onComplete?: () => void }) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [key, setKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'invalid' | 'used' | 'network'>('invalid');
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(AI_FEATURES.map((f) => [f.key, true])),
  );

  const isPro = useAppStore((s) => s.isPro);
  const loadLicense = useAppStore((s) => s.loadLicense);

  const handleActivate = async () => {
    if (!key) return;
    setScreen('activating');
    const result = await window.void.license.activate(key, '');
    if (result.success) {
      await loadLicense();
      setScreen('success');
    } else {
      setErrorMsg(result.error || 'Activation failed');
      setErrorType(result.error?.includes('already') ? 'used' : result.error?.includes('network') || result.error?.includes('reach') ? 'network' : 'invalid');
      setScreen('error');
    }
  };

  const handleRestart = () => {
    localStorage.setItem('void-first-pro-launch', '1');
    window.void.app.relaunch();
  };

  const handleFinishSetup = async () => {
    await window.void.ai.setConfig({ provider, apiKey, features });
    setScreen('celebration');
    setTimeout(() => onComplete ? onComplete() : useAppStore.getState().toggleSettings(), 4500);
  };

  // Screen 1: License — PRO ACTIVE (subscription details)
  if (screen === 'license' && isPro) {
    const info = useAppStore.getState().licenseInfo;
    return (
      <div className="max-w-md">
        <div className="text-[16px] text-void-text font-semibold font-sans mb-[3px]">License</div>
        <div className="text-[10px] text-void-text-dim mb-5">Manage your Void Terminal Pro subscription.</div>

        {/* Plan card */}
        <div className="p-4 bg-void-surface rounded-[8px] mb-[18px]" style={{ border: '0.5px solid rgba(40,200,64,0.12)' }}>
          <div className="flex items-center gap-[10px] mb-3">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(40,200,64,0.06)', border: '0.5px solid rgba(40,200,64,0.1)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4l6-2 6 2v5c0 3-3 5-6 6-3-1-6-3-6-6V4z" stroke="#28C840" strokeWidth="1.2"/><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-[11px] text-void-text-muted">Current plan</div>
              <div className="flex items-center gap-[6px]">
                <span className="text-[16px] text-void-text font-bold">Pro</span>
                <span className="text-[8px] text-status-online px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.12)' }}>Active</span>
              </div>
            </div>
          </div>
          <div className="flex gap-[5px] flex-wrap">
            <span className="text-[8px] text-accent px-2 py-[3px] rounded-[4px]" style={{ background: 'rgba(249,115,22,0.06)' }}>8 AI features</span>
            <span className="text-[8px] text-status-online px-2 py-[3px] rounded-[4px]" style={{ background: 'rgba(40,200,64,0.06)' }}>Unlimited connections</span>
            <span className="text-[8px] text-status-info px-2 py-[3px] rounded-[4px]" style={{ background: 'rgba(91,155,213,0.06)' }}>Workspaces</span>
            <span className="text-[8px] text-status-ai px-2 py-[3px] rounded-[4px]" style={{ background: 'rgba(197,134,192,0.06)' }}>Broadcast</span>
          </div>
        </div>

        {/* License details table */}
        <div className="text-[10px] text-void-text-muted uppercase tracking-wider mb-2">License details</div>
        <div className="bg-void-surface rounded-[8px] overflow-hidden mb-[18px] text-[10px]" style={{ border: '0.5px solid #1A1A1E' }}>
          {[
            ['License key', `VOID-•••••-•••••-•••••-${key?.slice(-4) || '????'}`],
            ['Email', info?.email || 'N/A'],
            ['Plan', 'Pro · $12/month'],
            ['Activated', info?.activatedAt ? new Date(info.activatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'],
            ['Machine', `${navigator.platform} · ${navigator.hardwareConcurrency} cores`],
          ].map(([label, value], i) => (
            <div key={label} className="flex justify-between px-[14px] py-[10px]" style={{ borderBottom: i < 4 ? '0.5px solid #1A1A1E' : 'none' }}>
              <span className="text-void-text-dim">{label}</span>
              <span className="text-void-text-muted font-mono">{value}</span>
            </div>
          ))}
        </div>

        {/* Manage buttons */}
        <div className="flex gap-2 mb-[18px]">
          <button className="px-4 py-2 rounded-[6px] text-[10px] text-void-text-muted" style={{ border: '0.5px solid #2A2A30' }}>Manage subscription</button>
          <button className="px-4 py-2 rounded-[6px] text-[10px] text-void-text-dim" style={{ border: '0.5px solid #2A2A30' }}>Switch to annual ($120/yr)</button>
        </div>

        {/* Deactivate */}
        <div className="p-3 rounded-[8px]" style={{ background: 'rgba(255,95,87,0.02)', border: '0.5px solid rgba(255,95,87,0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-status-error font-medium">Deactivate license</div>
              <div className="text-[9px] text-void-text-dim mt-[2px]">Remove license from this machine.</div>
            </div>
            <button onClick={async () => {
              await window.void.license.deactivate();
              await loadLicense();
              window.void.app.relaunch();
            }} className="px-[14px] py-[6px] rounded-[5px] text-[9px] text-status-error" style={{ border: '0.5px solid rgba(255,95,87,0.2)' }}>
              Deactivate
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 1: License (Free)
  if (screen === 'license') {
    return (
      <div className="max-w-md">
        <div className="text-[16px] text-void-text font-semibold font-sans mb-[3px]">License</div>
        <div className="text-[10px] text-void-text-dim mb-5">Activate Void Terminal Pro to unlock AI features, unlimited connections, workspaces, and more.</div>

        {/* Current plan card */}
        <div className="p-[14px] bg-void-surface rounded-[8px] mb-[18px]" style={{ border: '0.5px solid #1A1A1E' }}>
          <div className="flex items-center gap-2 mb-[10px]">
            <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(85,85,85,0.1)', border: '0.5px solid #2A2A30' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="#555" strokeWidth="1.5"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div className="text-[11px] text-void-text-muted">Current plan</div>
              <div className="text-[14px] text-void-text font-semibold">{isPro ? 'Pro' : 'Free'}</div>
            </div>
          </div>
          <div className="flex gap-[5px] flex-wrap">
            <span className="text-[8px] text-[#666] px-2 py-[3px] bg-void-input rounded-[4px]">10 saved connections</span>
            <span className="text-[8px] text-[#666] px-2 py-[3px] bg-void-input rounded-[4px]">20 snippets</span>
            <span className="text-[8px] text-[#666] px-2 py-[3px] bg-void-input rounded-[4px]">No AI features</span>
          </div>
        </div>

        {/* License key input */}
        <div className="text-[10px] text-void-text-muted mb-[7px]">License key</div>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="VOID-XXXX-XXXX-XXXX-XXXX"
            className="flex-1 px-[14px] py-[10px] bg-void-input rounded-[6px] text-[12px] text-void-text-muted font-mono outline-none"
            style={{ border: '0.5px solid #2A2A30' }}
          />
          <button onClick={handleActivate} className="px-5 py-[10px] bg-accent rounded-[6px] text-[11px] text-void-base font-semibold hover:bg-accent-hover transition-colors">
            Activate
          </button>
        </div>
        <div className="text-[9px] text-void-text-ghost mb-[18px]">
          Don't have a key? <span className="text-accent cursor-pointer">Get one at voidterminal.dev/pricing</span>
        </div>

        {/* Upgrade CTA */}
        <div className="p-[14px] rounded-[8px]" style={{ background: 'rgba(249,115,22,0.04)', border: '0.5px solid rgba(249,115,22,0.1)' }}>
          <div className="text-[12px] text-accent font-semibold font-sans mb-[5px]">Upgrade to Pro</div>
          <div className="text-[9px] text-[#666] leading-relaxed mb-[10px]">Unlock 8 AI features, unlimited connections, workspaces, broadcast mode, audit log, and more.</div>
          <div className="flex gap-3">
            <div className="text-center"><div className="text-[18px] text-void-text font-bold">$12</div><div className="text-[9px] text-void-text-dim">/month</div></div>
            <div style={{ width: '0.5px', background: '#2A2A30' }} />
            <div className="text-center"><div className="text-[18px] text-void-text font-bold">$120</div><div className="text-[9px] text-void-text-dim">/year (save 17%)</div></div>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Activating
  if (screen === 'activating') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-[12px] mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="9" stroke="#2A2A30" strokeWidth="2"/><path d="M12 3a9 9 0 019 9" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div className="text-[16px] text-void-text font-semibold font-sans mb-1">Activating your license...</div>
          <div className="text-[11px] text-void-text-dim">Validating with license server</div>
        </div>
      </div>
    );
  }

  // Screen 2b: Error
  if (screen === 'error') {
    const isNetwork = errorType === 'network';
    const iconColor = isNetwork ? '#FEBC2E' : '#FF5F57';
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center max-w-[260px]">
          <div className="w-10 h-10 rounded-[10px] mx-auto mb-3 flex items-center justify-center"
            style={{ background: isNetwork ? 'rgba(254,188,46,0.08)' : 'rgba(255,95,87,0.08)', border: `0.5px solid ${isNetwork ? 'rgba(254,188,46,0.15)' : 'rgba(255,95,87,0.15)'}` }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={iconColor} strokeWidth="1.5"/><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="5.5" x2="5.5" y2="10.5" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div className="text-[13px] text-void-text font-semibold font-sans mb-[3px]">Activation failed</div>
          <div className={`text-[9px] mb-3 ${isNetwork ? 'text-status-warning' : 'text-status-error'}`}>{errorMsg}</div>
          <button onClick={() => setScreen('license')} className="px-4 py-[7px] bg-accent rounded-[6px] text-[10px] text-void-base font-semibold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Screen 3: Success + Restart
  if (screen === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-[380px]">
          <div className="w-14 h-14 rounded-[14px] mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#28C840" strokeWidth="1.5"/><path d="M8 12.5l3 3 5.5-6" stroke="#28C840" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="text-[20px] text-void-text font-bold font-sans mb-1">License activated</div>
          <div className="text-[12px] text-void-text-muted mb-[6px]">Void Terminal Pro is ready.</div>
          <div className="flex justify-center gap-[5px] mb-[18px]">
            <span className="text-[8px] font-mono font-semibold text-accent px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.12)' }}>PRO</span>
            <span className="text-[8px] font-mono font-semibold text-status-online px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.12)' }}>8 AI features</span>
            <span className="text-[8px] font-mono font-semibold text-status-info px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(91,155,213,0.08)', border: '0.5px solid rgba(91,155,213,0.12)' }}>Unlimited</span>
          </div>

          <div className="p-[14px] bg-void-surface rounded-[8px] mb-[18px] text-left" style={{ border: '0.5px solid #1A1A1E' }}>
            <div className="text-[11px] text-status-warning font-medium mb-1">Restart required</div>
            <div className="text-[10px] text-[#666] leading-relaxed">Void Terminal needs to restart to activate Pro features. Your open sessions will be saved and restored automatically.</div>
          </div>

          <div className="flex gap-2 justify-center">
            <button onClick={handleRestart} className="px-7 py-[10px] bg-accent rounded-[8px] text-[13px] text-void-base font-semibold hover:bg-accent-hover transition-colors">
              Restart now
            </button>
            <button onClick={() => { useAppStore.getState().setPendingRestart(true); onComplete ? onComplete() : useAppStore.getState().toggleSettings(); }} className="px-5 py-[10px] rounded-[8px] text-[13px] text-void-text-dim" style={{ border: '0.5px solid #2A2A30' }}>
              Later
            </button>
          </div>
          <div className="text-[9px] text-void-text-ghost mt-3">Your sessions and tabs will be restored after restart.</div>
        </div>
      </div>
    );
  }

  // Screen 5: Choose Provider
  if (screen === 'provider') {
    return (
      <div className="max-w-[460px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[18px] text-void-text font-bold font-sans">Set up Void AI</div>
            <div className="text-[11px] text-void-text-dim mt-[2px]">Step 1 of 3 — Choose your AI provider</div>
          </div>
          <div className="flex gap-1">
            <div className="w-6 h-[3px] bg-accent rounded-full" />
            <div className="w-6 h-[3px] bg-void-border rounded-full" />
            <div className="w-6 h-[3px] bg-void-border rounded-full" />
          </div>
        </div>
        <div className="text-[10px] text-void-text-muted leading-relaxed mb-3">Void AI runs on your own API key. Choose a provider below. We recommend Claude for the best experience.</div>
        <div className="flex flex-col gap-[7px] mb-[18px]">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              onClick={() => setProvider(p.id)}
              className="flex items-center gap-3 p-[14px] bg-void-surface rounded-[8px] cursor-pointer transition-colors"
              style={{ border: provider === p.id ? `1px solid ${p.color}` : '0.5px solid #1A1A1E' }}
            >
              <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: p.bg }}>
                <div className="w-3 h-3 rounded-full" style={{ background: p.color, opacity: 0.6 }} />
              </div>
              <div className="flex-1">
                <div className={`text-[13px] font-semibold ${provider === p.id ? 'text-void-text' : 'text-void-text-muted'}`}>{p.name}</div>
                <div className="text-[10px] text-void-text-ghost mt-[1px]">{p.desc}</div>
              </div>
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: provider === p.id ? `2px solid ${p.color}` : '1.5px solid #2A2A30' }}>
                {provider === p.id && <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-[9px] text-void-text-ghost">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 4l6-2 6 2v5c0 3-3 5-6 6-3-1-6-3-6-6V4z" stroke="#28C840" strokeWidth="1.2"/></svg>
            Your API key stays on your machine.
          </div>
          <button onClick={() => setScreen('apikey')} className="px-6 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold hover:bg-accent-hover transition-colors">Next</button>
        </div>
      </div>
    );
  }

  // Screen 6: API Key
  if (screen === 'apikey') {
    const selectedProvider = PROVIDERS.find((p) => p.id === provider)!;
    return (
      <div className="max-w-[460px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[18px] text-void-text font-bold font-sans">Set up Void AI</div>
            <div className="text-[11px] text-void-text-dim mt-[2px]">Step 2 of 3 — Enter your API key</div>
          </div>
          <div className="flex gap-1">
            <div className="w-6 h-[3px] bg-accent rounded-full" />
            <div className="w-6 h-[3px] bg-accent rounded-full" />
            <div className="w-6 h-[3px] bg-void-border rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-[10px] p-3 bg-void-surface rounded-[8px] mb-[18px]" style={{ border: '0.5px solid #1A1A1E' }}>
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: selectedProvider.bg }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedProvider.color, opacity: 0.6 }} />
          </div>
          <div>
            <div className="text-[12px] text-void-text font-medium">{selectedProvider.name}</div>
            <div className="text-[9px] text-void-text-dim">{selectedProvider.desc.split('—')[0]}</div>
          </div>
          <span onClick={() => setScreen('provider')} className="text-[9px] text-accent ml-auto cursor-pointer">Change</span>
        </div>

        <div className="mb-[14px]">
          <div className="text-[10px] text-void-text-muted uppercase tracking-wider mb-[6px]">API key</div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === 'anthropic' ? 'sk-ant-api03-...' : provider === 'openai' ? 'sk-...' : 'API key'}
            className="w-full px-[14px] py-[10px] bg-void-input rounded-[6px] text-[12px] text-void-text-muted font-mono outline-none"
            style={{ border: '0.5px solid #2A2A30' }}
          />
          <div className="text-[9px] text-void-text-ghost mt-[5px]">
            Get your key at <span className="text-accent">{provider === 'anthropic' ? 'console.anthropic.com' : provider === 'openai' ? 'platform.openai.com' : 'your provider'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-[10px] rounded-[6px] mb-[18px]" style={{ background: 'rgba(40,200,64,0.04)', border: '0.5px solid rgba(40,200,64,0.12)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4l6-2 6 2v5c0 3-3 5-6 6-3-1-6-3-6-6V4z" stroke="#28C840" strokeWidth="1.2"/><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="text-[9px] text-void-text-muted leading-relaxed">Your key is stored <span className="text-status-online">encrypted locally</span>. It never leaves your machine.</div>
        </div>

        <div className="flex justify-between items-center">
          <span onClick={() => setScreen('provider')} className="text-[11px] text-void-text-dim cursor-pointer">Back</span>
          <button onClick={() => setScreen('features')} className="px-6 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold hover:bg-accent-hover transition-colors">Verify & continue</button>
        </div>
      </div>
    );
  }

  // Screen 7: Features
  if (screen === 'features') {
    return (
      <div className="max-w-[460px] mx-auto">
        <div className="flex items-center justify-between mb-[18px]">
          <div>
            <div className="text-[18px] text-void-text font-bold font-sans">Set up Void AI</div>
            <div className="text-[11px] text-void-text-dim mt-[2px]">Step 3 of 3 — Choose which AI features to enable</div>
          </div>
          <div className="flex gap-1">
            <div className="w-6 h-[3px] bg-accent rounded-full" />
            <div className="w-6 h-[3px] bg-accent rounded-full" />
            <div className="w-6 h-[3px] bg-accent rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-[6px] p-2 rounded-[5px] mb-[14px]" style={{ background: 'rgba(40,200,64,0.04)', border: '0.5px solid rgba(40,200,64,0.12)' }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.2"/><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[9px] text-status-online">API key verified</span>
          <span className="text-[9px] text-void-text-dim">— {PROVIDERS.find((p) => p.id === provider)?.name} connected</span>
        </div>

        <div className="text-[9px] text-void-text-muted mb-[10px]">All features enabled by default. You can turn any off later in Settings.</div>

        <div className="flex flex-col gap-[5px] mb-[18px]">
          {AI_FEATURES.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-[9px] bg-void-surface rounded-[6px]" style={{ border: '0.5px solid #1A1A1E' }}>
              <div className="flex items-center gap-[7px]">
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: f.color }} />
                <div>
                  <div className="text-[10px] text-[#CCC]">{f.name}</div>
                  <div className="text-[8px] text-void-text-dim mt-[1px]">{f.desc}</div>
                </div>
              </div>
              <button
                onClick={() => setFeatures({ ...features, [f.key]: !features[f.key] })}
                className={`relative w-[30px] h-4 rounded-full shrink-0 ${features[f.key] ? 'bg-accent' : 'bg-void-border'}`}
                style={{ transition: 'background-color 200ms ease' }}
              >
                <span className={`absolute top-[2px] w-3 h-3 bg-white rounded-full ${features[f.key] ? 'right-[2px]' : 'left-[2px]'}`}
                  style={{ transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center">
          <span onClick={() => setScreen('apikey')} className="text-[11px] text-void-text-dim cursor-pointer">Back</span>
          <button onClick={handleFinishSetup} className="px-7 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold font-sans hover:bg-accent-hover transition-colors">Finish setup</button>
        </div>
      </div>
    );
  }

  // Screen 8: Celebration
  if (screen === 'celebration') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-[420px]">
          <div className="w-16 h-16 rounded-[16px] mx-auto mb-[18px] flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.2)' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="11" stroke="#F97316" strokeWidth="1.5"/><path d="M9 14.5l4 4 7-8" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="text-[26px] text-void-text font-bold font-sans tracking-tight mb-[5px]">You're all set</div>
          <div className="text-[13px] text-void-text-muted mb-5">Void AI is active and watching. Start working — it'll take it from here.</div>

          <div className="flex justify-center gap-[5px] mb-5 flex-wrap">
            <span className="text-[8px] font-mono font-semibold text-accent px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.12)' }}>PRO active</span>
            <span className="text-[8px] font-mono font-semibold text-status-online px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.12)' }}>Claude connected</span>
            <span className="text-[8px] font-mono font-semibold text-status-info px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(91,155,213,0.08)', border: '0.5px solid rgba(91,155,213,0.12)' }}>8 AI features on</span>
            <span className="text-[8px] font-mono font-semibold text-status-ai px-2 py-[2px] rounded-[4px]" style={{ background: 'rgba(197,134,192,0.08)', border: '0.5px solid rgba(197,134,192,0.12)' }}>Memory recording</span>
          </div>

          <div className="grid grid-cols-3 gap-[7px] mb-5">
            <div className="p-[10px] bg-void-surface rounded-[7px] text-left" style={{ border: '0.5px solid #1A1A1E' }}>
              <div className="text-[8px] text-void-text-dim mb-[3px]">Quick tip</div>
              <div className="text-[9px] text-[#CCC]">Type <span className="text-status-ai">?</span> before any natural language</div>
            </div>
            <div className="p-[10px] bg-void-surface rounded-[7px] text-left" style={{ border: '0.5px solid #1A1A1E' }}>
              <div className="text-[8px] text-void-text-dim mb-[3px]">AI chat</div>
              <div className="text-[9px] text-[#CCC]">Press <span className="text-accent">Cmd+L</span> to ask anything</div>
            </div>
            <div className="p-[10px] bg-void-surface rounded-[7px] text-left" style={{ border: '0.5px solid #1A1A1E' }}>
              <div className="text-[8px] text-void-text-dim mb-[3px]">Memory</div>
              <div className="text-[9px] text-[#CCC]">Press <span className="text-accent">Cmd+Shift+M</span> for timeline</div>
            </div>
          </div>

          <button onClick={() => onComplete ? onComplete() : useAppStore.getState().toggleSettings()} className="px-8 py-3 bg-accent rounded-[8px] text-[14px] text-void-base font-semibold font-sans hover:bg-accent-hover transition-colors">
            Start using Void Pro
          </button>
          <div className="text-[9px] text-void-text-faint mt-[10px]">This screen auto-dismisses in 4 seconds</div>
        </div>
      </div>
    );
  }

  // Screen 4: Welcome to Pro (after restart)
  return (
    <div className="flex items-center justify-center min-h-[480px]">
      <div className="text-center max-w-[440px]">
        <div className="flex items-center justify-center mb-[18px]">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ border: '2px solid #F97316' }}>
            <div className="w-4 h-4 rounded-[4px]" style={{ background: 'rgba(249,115,22,0.15)', border: '1.5px solid rgba(249,115,22,0.4)' }} />
          </div>
        </div>
        <div className="text-[24px] text-void-text font-bold font-sans tracking-tight mb-1">Welcome to Void Pro</div>
        <div className="text-[13px] text-void-text-dim mb-6">Your terminal just got a whole lot smarter.</div>

        <div className="grid grid-cols-2 gap-2 text-left mb-6">
          {[
            { dot: '#F97316', name: 'AI memory', desc: 'Watches everything, remembers everything. Ask it anything.' },
            { dot: '#28C840', name: 'Error explainer', desc: 'Auto-explains errors with one-click fix commands.' },
            { dot: '#FF5F57', name: 'Danger detection', desc: "Blocks rm -rf on production before it's too late." },
            { dot: '#C586C0', name: '+ 5 more AI features', desc: 'Autocomplete, NLP, security scan, anomaly, deploy copilot.' },
          ].map((f) => (
            <div key={f.name} className="p-3 bg-void-surface rounded-[8px]" style={{ border: '0.5px solid #1A1A1E' }}>
              <div className="flex items-center gap-[6px] mb-[5px]">
                <div className="w-[6px] h-[6px] rounded-full" style={{ background: f.dot }} />
                <span className="text-[11px] text-[#CCC] font-medium">{f.name}</span>
              </div>
              <div className="text-[9px] text-void-text-dim leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-[8px] mb-[18px] text-left" style={{ background: 'rgba(249,115,22,0.04)', border: '0.5px solid rgba(249,115,22,0.12)' }}>
          <div className="text-[11px] text-status-warning font-medium font-sans mb-[3px]">One more step</div>
          <div className="text-[9px] text-[#666] leading-relaxed">To power Void AI, you'll need to connect an AI provider. We use your own API key — your data never leaves your machine.</div>
        </div>

        <div className="flex gap-2 justify-center">
          <button onClick={() => setScreen('provider')} className="px-7 py-3 bg-accent rounded-[8px] text-[13px] text-void-base font-semibold font-sans hover:bg-accent-hover transition-colors">Set up AI now</button>
          <button onClick={() => onComplete ? onComplete() : useAppStore.getState().toggleSettings()} className="px-5 py-3 rounded-[8px] text-[13px] text-void-text-dim font-sans" style={{ border: '0.5px solid #2A2A30' }}>Skip for now</button>
        </div>
        <div className="text-[9px] text-void-text-ghost mt-[10px]">You can always set up AI later in Settings {'>'} AI</div>
      </div>
    </div>
  );
}
