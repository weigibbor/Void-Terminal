import { ProGate } from '../ProGate';
import { useAppStore } from "../stores/app-store";
import { useState } from 'react';

interface WatchRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  action: string;
  enabled: boolean;
}

export function WatchRulesPanel() {
  const [rules, setRules] = useState<WatchRule[]>([
    { id: '1', pattern: 'ERROR', isRegex: false, action: 'notification', enabled: true },
    { id: '2', pattern: 'deploy complete', isRegex: false, action: 'notification', enabled: true },
    { id: '3', pattern: 'OOM|Out of memory', isRegex: true, action: 'notification', enabled: true },
  ]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm text-void-text font-medium">Watch Rules</h3>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 p-2.5 bg-void-input rounded-void-lg">
            <button
              onClick={() =>
                setRules(rules.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
              }
              className={`w-3 h-3 rounded-full border transition-colors ${
                rule.enabled ? 'bg-status-online border-status-online' : 'border-void-border'
              }`}
            />
            <code className="text-sm text-void-text-muted font-mono flex-1 truncate">{rule.pattern}</code>
            {rule.isRegex && <span className="text-2xs text-void-text-ghost">regex</span>}
            <span className="text-2xs text-void-text-ghost">{rule.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
