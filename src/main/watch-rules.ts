import { Notification } from 'electron';

interface WatchRule {
  id: string;
  pattern: string;
  isRegex: boolean;
  action: 'notification' | 'sound' | 'flash';
  scope: string;
  enabled: boolean;
}

export class WatchRulesEngine {
  private rules: WatchRule[] = [
    { id: 'default-error', pattern: 'ERROR', isRegex: false, action: 'notification', scope: 'all', enabled: true },
    { id: 'default-deploy', pattern: 'deploy complete', isRegex: false, action: 'notification', scope: 'all', enabled: true },
    { id: 'default-oom', pattern: 'OOM|Out of memory', isRegex: true, action: 'notification', scope: 'all', enabled: true },
  ];

  check(data: string, server: string): WatchRule | null {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.scope !== 'all' && rule.scope !== server) continue;

      let matches = false;
      if (rule.isRegex) {
        try {
          matches = new RegExp(rule.pattern, 'i').test(data);
        } catch {
          continue;
        }
      } else {
        matches = data.includes(rule.pattern);
      }

      if (matches) return rule;
    }
    return null;
  }

  triggerAction(rule: WatchRule, detail: string): void {
    if (rule.action === 'notification') {
      new Notification({
        title: 'Void Terminal Alert',
        body: `Pattern "${rule.pattern}" matched: ${detail.substring(0, 100)}`,
      }).show();
    }
  }

  getRules(): WatchRule[] {
    return this.rules;
  }

  addRule(rule: Omit<WatchRule, 'id'>): WatchRule {
    const newRule = { ...rule, id: Math.random().toString(36).substring(2, 10) };
    this.rules.push(newRule);
    return newRule;
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  toggleRule(id: string): void {
    const rule = this.rules.find((r) => r.id === id);
    if (rule) rule.enabled = !rule.enabled;
  }
}
