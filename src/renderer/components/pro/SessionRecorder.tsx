import { ProGate } from '../ProGate';
import { useAppStore } from "../stores/app-store";
import { useState, useRef, useCallback } from 'react';

interface RecordedEvent {
  t: number;
  type: 'i' | 'o';
  data: string;
}

export function useSessionRecorder() {
  const [recording, setRecording] = useState(false);
  const eventsRef = useRef<RecordedEvent[]>([]);
  const startTimeRef = useRef(0);

  const startRecording = useCallback(() => {
    eventsRef.current = [];
    startTimeRef.current = Date.now();
    setRecording(true);
  }, []);

  const recordEvent = useCallback(
    (type: 'i' | 'o', data: string) => {
      if (!recording) return;
      eventsRef.current.push({
        t: Date.now() - startTimeRef.current,
        type,
        data,
      });
    },
    [recording],
  );

  const stopRecording = useCallback(() => {
    setRecording(false);
    return {
      version: 1,
      startTime: startTimeRef.current,
      events: eventsRef.current,
    };
  }, []);

  return { recording, startRecording, recordEvent, stopRecording };
}

export function RecordingIndicator({ recording }: { recording: boolean }) {
  if (!recording) return null;

  return (
    <span className="flex items-center gap-1.5 text-2xs text-status-error">
      <span className="w-2 h-2 rounded-full bg-status-error animate-pulse" />
      REC
    </span>
  );
}
