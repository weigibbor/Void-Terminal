import { ProGate } from '../ProGate';
import { useAppStore } from "../stores/app-store";
import { useState, useMemo } from 'react';

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
}

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const parts = value.split(' ');
  const [minute, setMinute] = useState(parts[0] || '*');
  const [hour, setHour] = useState(parts[1] || '*');
  const [dayOfMonth, setDayOfMonth] = useState(parts[2] || '*');
  const [month, setMonth] = useState(parts[3] || '*');
  const [dayOfWeek, setDayOfWeek] = useState(parts[4] || '*');

  const cronString = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;

  const humanReadable = useMemo(() => {
    if (cronString === '* * * * *') return 'Every minute';
    if (cronString === '0 * * * *') return 'Every hour';
    if (cronString === '0 0 * * *') return 'Every day at midnight';
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*') {
      return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    if (minute === '0' && hour === '*/6') return 'Every 6 hours';
    return cronString;
  }, [cronString, minute, hour, dayOfMonth, month]);

  const update = (setter: (v: string) => void, v: string) => {
    setter(v);
    setTimeout(() => {
      const cron = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
      onChange(cron);
    }, 0);
  };

  const fields = [
    { label: 'Minute', value: minute, setter: setMinute, options: ['*', '0', '15', '30', '45'] },
    { label: 'Hour', value: hour, setter: setHour, options: ['*', '0', '6', '12', '18', '*/6'] },
    { label: 'Day', value: dayOfMonth, setter: setDayOfMonth, options: ['*', '1', '15'] },
    { label: 'Month', value: month, setter: setMonth, options: ['*', '1', '6'] },
    { label: 'Weekday', value: dayOfWeek, setter: setDayOfWeek, options: ['*', '0', '1', '5'] },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {fields.map((f) => (
          <div key={f.label} className="flex-1">
            <label className="block text-2xs text-void-text-ghost mb-1">{f.label}</label>
            <select
              value={f.value}
              onChange={(e) => update(f.setter, e.target.value)}
              className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-1.5 py-1"
            >
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <code className="text-sm text-void-text font-mono">{cronString}</code>
        <span className="text-2xs text-void-text-ghost">{humanReadable}</span>
      </div>
    </div>
  );
}
