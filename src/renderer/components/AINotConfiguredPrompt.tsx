import { useAppStore } from '../stores/app-store';

export function AINotConfiguredPrompt() {
  return (
    <div className="mx-3 my-2 p-3 rounded-[6px]"
      style={{ background: 'rgba(249,115,22,0.05)', border: '0.5px solid rgba(249,115,22,0.1)' }}>
      <div className="flex items-center gap-[6px] mb-1">
        <div className="w-[14px] h-[14px] rounded-[4px] flex items-center justify-center"
          style={{ background: 'rgba(249,115,22,0.1)' }}>
          <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#F97316" strokeWidth="1.5" />
            <path d="M5 7V5a3 3 0 016 0v2" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[10px] text-accent font-medium font-sans">AI not configured</span>
      </div>
      <div className="text-[9px] text-void-text-muted leading-relaxed mb-2 font-sans">
        Add your API key in Settings {'>'} AI to enable error explanations, autocomplete, and all AI features.
      </div>
      <div className="flex gap-[6px]">
        <button
          onClick={() => useAppStore.getState().openSettings('ai')}
          className="px-3 py-[5px] rounded-[4px] text-[9px] text-accent font-sans"
          style={{ background: 'rgba(249,115,22,0.1)', border: '0.5px solid rgba(249,115,22,0.2)' }}
        >
          Open Settings
        </button>
        <button className="px-3 py-[5px] rounded-[4px] text-[9px] text-void-text-dim font-sans"
          style={{ border: '0.5px solid #2A2A30' }}>
          Learn more
        </button>
      </div>
    </div>
  );
}
