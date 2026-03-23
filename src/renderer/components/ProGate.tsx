import { useAppStore } from '../stores/app-store';

interface ProGateProps {
  feature: string;
  description?: string;
  children?: React.ReactNode;
}

export function ProGate({ feature, description, children }: ProGateProps) {
  const isPro = useAppStore((s) => s.isPro);

  if (isPro) return <>{children}</>;

  return (
    <div className="flex-1 flex items-center justify-center bg-void-elevated p-8">
      <div className="text-center max-w-sm">
        {/* Lock icon */}
        <div className="w-12 h-12 rounded-[10px] bg-accent-glow border-[0.5px] border-accent-dim flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="9" width="14" height="9" rx="2" stroke="#F97316" strokeWidth="1.5" />
            <path d="M6 9V6a4 4 0 018 0v3" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Feature name */}
        <h3 className="text-[13px] font-semibold text-void-text mb-1">{feature}</h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-void-text-dim mb-5 leading-relaxed">{description}</p>
        )}

        {/* PRO badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-[0.5px] border-accent-dim bg-accent-glow mb-5">
          <span className="text-2xs font-semibold text-accent font-mono">PRO</span>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => useAppStore.getState().openSettings('license')}
            className="px-6 py-2.5 bg-accent text-void-base text-[12px] font-semibold rounded-[8px] hover:bg-accent-hover transition-colors font-mono"
          >
            Enter License Key
          </button>
          <button
            className="text-xs text-void-text-dim hover:text-void-text-muted transition-colors"
            onClick={() => {
              // Opens pricing page — for now just open settings
              useAppStore.getState().openSettings('license');
            }}
          >
            Learn more about Pro
          </button>
        </div>

        <p className="text-2xs text-void-text-faint mt-4 font-mono">
          $12/mo · All AI features · Cancel anytime
        </p>
      </div>
    </div>
  );
}

export function ProBadge({ onClick }: { onClick?: () => void }) {
  const isPro = useAppStore((s) => s.isPro);
  if (isPro) return null;

  return (
    <button
      onClick={onClick || (() => useAppStore.getState().openSettings('license'))}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border-[0.5px] border-accent-dim
                 bg-accent-glow text-[8px] font-mono font-bold text-accent hover:bg-accent/15 transition-colors"
    >
      <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="7" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      PRO
    </button>
  );
}
