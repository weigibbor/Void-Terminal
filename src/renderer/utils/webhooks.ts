interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
}

export function fireWebhook(eventType: string, data: Record<string, any>) {
  try {
    const webhooks: Webhook[] = JSON.parse(localStorage.getItem('void-webhooks') || '[]');
    const matching = webhooks.filter(w => w.enabled && w.events.includes(eventType));
    for (const wh of matching) {
      fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventType, ...data, timestamp: Date.now(), source: 'void-terminal' }),
      }).catch(() => {}); // fire and forget
    }
  } catch { /* no webhooks configured */ }
}

export function logTeamActivity(action: string, server?: string, detail?: string) {
  const teamId = localStorage.getItem('void-team-id');
  const userId = localStorage.getItem('void-user-id') || 'local';
  const userName = localStorage.getItem('void-user-name') || 'User';
  if (!teamId) return; // not in a team

  fetch('/api/team/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, userId, userName, action, server, detail }),
  }).catch(() => {});
}

export function logAnalytics(eventType: string, server?: string, durationMs?: number, commandCount?: number) {
  const teamId = localStorage.getItem('void-team-id');
  const userId = localStorage.getItem('void-user-id') || 'local';
  if (!teamId) return;

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId, userId, eventType, server, durationMs, commandCount }),
  }).catch(() => {});
}
