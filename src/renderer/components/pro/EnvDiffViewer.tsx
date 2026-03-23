import { ProGate } from '../ProGate';
import { useAppStore } from "../stores/app-store";
interface EnvDiffViewerProps {
  left: { label: string; content: string };
  right: { label: string; content: string };
  onClose: () => void;
}

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      result[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
    }
  }
  return result;
}

export function EnvDiffViewer({ left, right, onClose }: EnvDiffViewerProps) {
  const leftVars = parseEnv(left.content);
  const rightVars = parseEnv(right.content);
  const allKeys = [...new Set([...Object.keys(leftVars), ...Object.keys(rightVars)])].sort();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[80vh] bg-void-base border border-void-border rounded-void-2xl shadow-2xl flex flex-col animate-palette-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
          <h2 className="text-lg text-void-text font-medium">Env Diff</h2>
          <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted">x</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm font-mono">
            <thead className="sticky top-0 bg-void-surface">
              <tr className="text-2xs text-void-text-ghost uppercase">
                <th className="text-left px-4 py-2 w-1/4">Key</th>
                <th className="text-left px-4 py-2 w-3/8">{left.label}</th>
                <th className="text-left px-4 py-2 w-3/8">{right.label}</th>
              </tr>
            </thead>
            <tbody>
              {allKeys.map((key) => {
                const lVal = leftVars[key];
                const rVal = rightVars[key];
                const missing = !lVal || !rVal;
                const mismatch = lVal && rVal && lVal !== rVal;

                return (
                  <tr
                    key={key}
                    className={`border-b border-void-border/20 ${
                      missing ? 'bg-status-error/5' : mismatch ? 'bg-status-warning/5' : ''
                    }`}
                  >
                    <td className="px-4 py-1.5 text-void-text">{key}</td>
                    <td className={`px-4 py-1.5 ${lVal ? 'text-void-text-muted' : 'text-status-error/50'}`}>
                      {lVal || '(missing)'}
                    </td>
                    <td className={`px-4 py-1.5 ${rVal ? 'text-void-text-muted' : 'text-status-error/50'}`}>
                      {rVal || '(missing)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
