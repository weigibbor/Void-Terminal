import { useState, useEffect } from 'react';

type Step = 'tcp' | 'handshake' | 'auth' | 'shell';
type StepState = 'pending' | 'active' | 'done' | 'failed';

interface ConnectionProgressProps {
  host: string;
  port: number;
  username: string;
  onCancel: () => void;
  onConnected: () => void;
  onFailed: (error: string) => void;
  sessionId?: string;
  error?: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'tcp', label: 'TCP connected' },
  { id: 'handshake', label: 'SSH handshake' },
  { id: 'auth', label: 'Authenticating key...' },
  { id: 'shell', label: 'Opening shell' },
];

export function ConnectionProgress({
  host, port, username, onCancel, onConnected, onFailed, sessionId, error,
}: ConnectionProgressProps) {
  const [stepStates, setStepStates] = useState<Record<Step, StepState>>({
    tcp: 'active', handshake: 'pending', auth: 'pending', shell: 'pending',
  });
  const [progress, setProgress] = useState(10);

  // Simulate step progression based on connection state
  useEffect(() => {
    if (error) {
      // Find the active step and mark it failed
      setStepStates((prev) => {
        const next = { ...prev };
        for (const step of STEPS) {
          if (next[step.id] === 'active') {
            next[step.id] = 'failed';
            break;
          }
        }
        return next;
      });
      return;
    }

    // Simulate progress steps
    const timers = [
      setTimeout(() => {
        setStepStates((s) => ({ ...s, tcp: 'done', handshake: 'active' }));
        setProgress(35);
      }, 400),
      setTimeout(() => {
        setStepStates((s) => ({ ...s, handshake: 'done', auth: 'active' }));
        setProgress(60);
      }, 800),
      setTimeout(() => {
        if (sessionId) {
          setStepStates((s) => ({ ...s, auth: 'done', shell: 'active' }));
          setProgress(85);
        }
      }, 1200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [error, sessionId]);

  // On sessionId received, complete
  useEffect(() => {
    if (sessionId && !error) {
      const t = setTimeout(() => {
        setStepStates({ tcp: 'done', handshake: 'done', auth: 'done', shell: 'done' });
        setProgress(100);
        setTimeout(onConnected, 300);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [sessionId, error, onConnected]);

  // Error full pane
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-void-elevated p-8">
        <div className="text-center max-w-[340px]">
          <div className="w-11 h-11 rounded-[11px] mx-auto mb-[14px] flex items-center justify-center"
            style={{ background: 'rgba(255,95,87,0.06)', border: '0.5px solid rgba(255,95,87,0.12)' }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#FF5F57" strokeWidth="1.3" />
              <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-[14px] text-void-text font-semibold font-sans mb-1">Connection failed</div>
          <div className="text-[10px] text-status-error mb-1">{error}</div>
          <div className="text-[9px] text-void-text-dim mb-4 leading-relaxed">
            {error.includes('ECONNREFUSED') ? 'The server refused the connection. Make sure SSH is running.' :
             error.includes('ETIMEDOUT') || error.includes('timeout') ? 'Host unreachable. Check network or firewall.' :
             error.includes('auth') || error.includes('permission') || error.includes('denied') ? 'Wrong key or password.' :
             'Check your connection settings and try again.'}
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={onCancel} className="px-5 py-2 bg-accent rounded-[6px] text-[11px] text-void-base font-semibold hover:bg-accent-hover transition-colors">
              Retry
            </button>
            <button onClick={onCancel} className="px-4 py-2 rounded-[6px] text-[11px] text-void-text-dim" style={{ border: '0.5px solid var(--border)' }}>
              Edit connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-void-elevated p-10">
      {/* Spinner icon */}
      <div className="w-[52px] h-[52px] rounded-[13px] flex items-center justify-center mb-[18px]"
        style={{ background: 'rgba(254,188,46,0.06)', border: '0.5px solid rgba(254,188,46,0.12)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ animationDuration: '1.2s' }}>
          <circle cx="12" cy="12" r="9" stroke="#2A2A30" strokeWidth="2" />
          <path d="M12 3a9 9 0 019 9" stroke="#FEBC2E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="text-[15px] text-void-text font-semibold font-sans mb-1">Establishing connection</div>
      <div className="text-[10px] text-void-text-dim mb-[18px]">{username}@{host}:{port}</div>

      {/* Progress bar */}
      <div className="w-[220px] h-[3px] bg-[#1A1A1E] rounded-[2px] overflow-hidden mb-4">
        <div
          className="h-full bg-status-warning rounded-[2px]"
          style={{ width: `${progress}%`, transition: 'width 300ms ease' }}
        />
      </div>

      {/* Step checklist */}
      <div className="flex flex-col gap-[6px] items-start min-w-[180px] text-[9px]">
        {STEPS.map((step) => {
          const state = stepStates[step.id];
          return (
            <div
              key={step.id}
              className={`flex items-center gap-[6px] ${
                state === 'done' ? 'text-status-online' :
                state === 'active' ? 'text-status-warning' :
                state === 'failed' ? 'text-status-error' :
                'text-void-text-ghost'
              }`}
              style={{ animation: state !== 'pending' ? 'fadeIn 200ms ease' : undefined }}
            >
              {state === 'done' && (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.3" />
                  <path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {state === 'active' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ animationDuration: '1s' }}>
                  <circle cx="12" cy="12" r="8" stroke="#333" strokeWidth="2" />
                  <path d="M12 4a8 8 0 018 8" stroke="#FEBC2E" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {state === 'failed' && (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#FF5F57" strokeWidth="1.3" />
                  <line x1="6" y1="6" x2="10" y2="10" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              )}
              {state === 'pending' && (
                <div className="w-[10px] h-[10px] rounded-full" style={{ border: '1.2px solid #333' }} />
              )}
              <span style={state === 'active' ? { animation: 'pulse 1.5s ease-in-out infinite' } : undefined}>
                {state === 'done' && step.id === 'auth' ? 'Authenticated' : step.label}
              </span>
            </div>
          );
        })}
      </div>

      <button onClick={onCancel} className="mt-[18px] text-[9px] text-void-text-ghost hover:text-void-text-muted cursor-pointer">
        Cancel
      </button>
    </div>
  );
}
