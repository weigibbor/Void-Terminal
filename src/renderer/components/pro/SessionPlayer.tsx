import { useState, useRef, useCallback, useEffect } from 'react';

interface RecordedSession {
  version: number;
  startTime: number;
  events: { t: number; type: string; data: string }[];
}

interface SessionPlayerProps {
  session: RecordedSession;
  onOutput: (data: string) => void;
  onClose: () => void;
}

export function SessionPlayer({ session, onOutput, onClose }: SessionPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  const totalDuration = session.events.length > 0
    ? session.events[session.events.length - 1].t
    : 0;

  const play = useCallback(() => {
    setPlaying(true);
    const playNext = () => {
      if (indexRef.current >= session.events.length) {
        setPlaying(false);
        return;
      }

      const event = session.events[indexRef.current];
      if (event.type === 'o') {
        onOutput(event.data);
      }

      setProgress(event.t / totalDuration);
      indexRef.current++;

      if (indexRef.current < session.events.length) {
        const nextEvent = session.events[indexRef.current];
        const delay = (nextEvent.t - event.t) / speed;
        timerRef.current = setTimeout(playNext, Math.max(delay, 1));
      } else {
        setPlaying(false);
      }
    };

    playNext();
  }, [session, speed, totalDuration, onOutput]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    pause();
    indexRef.current = 0;
    setProgress(0);
  }, [pause]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-void-surface border-t border-void-border">
      <button
        onClick={playing ? pause : play}
        className="text-accent hover:text-accent-hover text-sm"
      >
        {playing ? '&#9646;&#9646;' : '&#9654;'}
      </button>
      <button onClick={reset} className="text-void-text-ghost hover:text-void-text-muted text-xs">
        &#8634;
      </button>

      {/* Progress bar */}
      <div className="flex-1 h-1 bg-void-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Speed */}
      <div className="flex items-center gap-1">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`text-2xs px-1.5 py-0.5 rounded ${
              speed === s ? 'bg-accent text-void-base' : 'text-void-text-ghost'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted text-xs">
        x
      </button>
    </div>
  );
}
