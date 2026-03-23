import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../stores/app-store';
import { easing, duration } from '../../utils/motion';

interface DeployStep {
  name: string;
  status: 'done' | 'current' | 'pending';
  command?: string;
}

// Common deploy patterns — detected from watcher events
const DEPLOY_PATTERNS: { trigger: RegExp; steps: DeployStep[] }[] = [
  {
    trigger: /git\s+pull/i,
    steps: [
      { name: 'Pull latest code', status: 'done', command: 'git pull' },
      { name: 'Install dependencies', status: 'current', command: 'npm install' },
      { name: 'Run migrations', status: 'pending', command: 'npm run migrate' },
      { name: 'Build project', status: 'pending', command: 'npm run build' },
      { name: 'Restart service', status: 'pending', command: 'pm2 restart all' },
      { name: 'Verify health', status: 'pending', command: 'curl -s localhost:3000/health' },
    ],
  },
  {
    trigger: /docker.compose\s+up|docker\s+build/i,
    steps: [
      { name: 'Build containers', status: 'done', command: 'docker-compose build' },
      { name: 'Stop old containers', status: 'current', command: 'docker-compose down' },
      { name: 'Start new containers', status: 'pending', command: 'docker-compose up -d' },
      { name: 'Check container status', status: 'pending', command: 'docker ps' },
      { name: 'View logs', status: 'pending', command: 'docker-compose logs -f --tail=50' },
    ],
  },
  {
    trigger: /npm\s+run\s+(?:build|deploy)/i,
    steps: [
      { name: 'Build project', status: 'done', command: 'npm run build' },
      { name: 'Run tests', status: 'current', command: 'npm test' },
      { name: 'Deploy', status: 'pending', command: 'npm run deploy' },
      { name: 'Verify deployment', status: 'pending' },
    ],
  },
];

interface DeployCopilotProps {
  onRunCommand: (command: string) => void;
}

export function DeployCopilot({ onRunCommand }: DeployCopilotProps) {
  const [visible, setVisible] = useState(false);
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [deployName, setDeployName] = useState('');
  const isPro = useAppStore((s) => s.isPro);

  useEffect(() => {
    if (!isPro) return;
    const unsub = window.void.ai.onWatcherEvent?.((event: any) => {
      if (event.type !== 'deploy' && event.type !== 'git') return;
      for (const pattern of DEPLOY_PATTERNS) {
        if (pattern.trigger.test(event.detail)) {
          setSteps(pattern.steps.map((s) => ({ ...s })));
          setDeployName(event.detail.split(':')[0] || 'Deploy');
          setVisible(true);
          break;
        }
      }
    });
    return unsub;
  }, [isPro]);

  const advanceStep = (index: number) => {
    setSteps((prev) =>
      prev.map((s, i) => ({
        ...s,
        status: i < index ? 'done' : i === index ? 'current' : 'pending',
      })),
    );
  };

  if (!visible || !isPro) return null;

  const completedCount = steps.filter((s) => s.status === 'done').length;

  return (
    <motion.div
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }}
      transition={{ duration: duration.normal, ease: easing.enter }}
      className="absolute bottom-12 right-3 z-20"
      style={{
        width: '220px',
        background: 'rgba(16,16,20,0.98)',
        border: '0.5px solid #2A2A30',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '0.5px solid #2A2A30' }}>
        <span className="w-[5px] h-[5px] rounded-full bg-accent void-pulse-slow" />
        <span className="text-[9px] text-accent font-medium font-sans flex-1">Deploy Copilot</span>
        <span className="text-[7px] text-void-text-ghost font-mono">{completedCount}/{steps.length}</span>
        <button onClick={() => setVisible(false)} className="text-[9px] text-void-text-ghost hover:text-void-text-dim">✕</button>
      </div>

      {/* Progress bar */}
      <div className="mx-3 mt-2 h-[2px] bg-void-surface rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
      </div>

      {/* Steps */}
      <div className="px-3 py-2 space-y-[6px]">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Status icon */}
            {step.status === 'done' ? (
              <span className="w-3 h-3 rounded-full bg-status-online/20 flex items-center justify-center shrink-0">
                <svg width="6" height="6" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 5-5" stroke="#28C840" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            ) : step.status === 'current' ? (
              <span className="w-3 h-3 rounded-full border border-accent flex items-center justify-center shrink-0">
                <span className="w-[4px] h-[4px] rounded-full bg-accent" />
              </span>
            ) : (
              <span className="w-3 h-3 rounded-full border border-void-border shrink-0" />
            )}

            {/* Step name */}
            <span className={`text-[9px] font-sans flex-1 ${
              step.status === 'done' ? 'text-void-text-ghost line-through' :
              step.status === 'current' ? 'text-void-text' : 'text-void-text-dim'
            }`}>
              {step.name}
            </span>

            {/* Run button for current step */}
            {step.status === 'current' && step.command && (
              <button
                onClick={() => { onRunCommand(step.command!); advanceStep(i + 1); }}
                className="text-[7px] text-accent px-[5px] py-[1px] rounded-[3px]"
                style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.2)' }}
              >
                Run
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 text-[7px] text-void-text-ghost font-sans" style={{ borderTop: '0.5px solid #1A1A1E' }}>
        Based on common deploy patterns
      </div>
    </motion.div>
  );
}
