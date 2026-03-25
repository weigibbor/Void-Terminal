import { useAppStore } from '../stores/app-store';

export function WelcomeScreen() {
  const addTab = useAppStore((s) => s.addTab);

  return (
    <div className="flex-1 flex items-center justify-center bg-void-elevated" style={{ borderTop: '0.5px solid var(--border)' }}>
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-[6px]">
          <div className="w-6 h-6 rounded-[5px] border-2 border-accent flex items-center justify-center">
            <div className="w-[10px] h-[10px] rounded-[3px] bg-accent-glow border border-accent-dim" />
          </div>
        </div>

        <div className="text-[22px] font-bold text-void-text tracking-[-0.5px] mb-1 font-sans">
          VOID TERMINAL
        </div>
        <div className="text-[12px] text-void-text-dim mb-7">
          AI-powered SSH client
        </div>

        {/* Actions */}
        <div className="flex gap-[10px] justify-center">
          <button
            onClick={() => addTab('new-connection')}
            className="px-7 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold font-mono hover:bg-accent-hover transition-colors"
          >
            New connection
          </button>
          <button
            onClick={() => {
              const id = addTab('local');
              window.void.pty.create().then((r) => {
                if (r.success && r.sessionId) {
                  useAppStore.getState().updateTab(id, {
                    sessionId: r.sessionId,
                    connected: true,
                    lastActivity: Date.now(),
                  });
                }
              });
            }}
            className="px-5 py-[10px] border-[0.5px] border-void-border rounded-[8px] text-[12px] text-void-text-dim font-mono hover:border-void-border-hover transition-colors"
          >
            Local shell
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex gap-5 justify-center mt-6 text-[10px] text-void-text-ghost font-mono">
          <span>&#8984;+T new tab</span>
          <span>&#8984;+K palette</span>
          <span>&#8984;+D split</span>
        </div>
      </div>
    </div>
  );
}
