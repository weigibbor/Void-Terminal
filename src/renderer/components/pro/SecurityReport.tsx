import { ProGate } from '../ProGate';
import { useAppStore } from "../../stores/app-store";
interface SecurityIssue {
  severity: 'high' | 'medium' | 'low';
  issue: string;
  recommendation: string;
}

interface SecurityReportProps {
  issues: SecurityIssue[];
  server: string;
  onClose: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  high: 'text-status-error bg-status-error/10 border-status-error/20',
  medium: 'text-status-warning bg-status-warning/10 border-status-warning/20',
  low: 'text-status-info bg-status-info/10 border-status-info/20',
};

export function SecurityReport({ issues, server, onClose }: SecurityReportProps) {
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const medCount = issues.filter((i) => i.severity === 'medium').length;
  const lowCount = issues.filter((i) => i.severity === 'low').length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[80vh] bg-void-base border border-void-border rounded-void-2xl shadow-2xl flex flex-col animate-palette-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
          <div>
            <h2 className="text-lg text-void-text font-medium">Security Scan</h2>
            <span className="text-2xs text-void-text-ghost">{server}</span>
          </div>
          <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted">x</button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-void-border/50">
          <span className="text-2xs text-status-error">{highCount} high</span>
          <span className="text-2xs text-status-warning">{medCount} medium</span>
          <span className="text-2xs text-status-info">{lowCount} low</span>
        </div>

        {/* Issues */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {issues.map((issue, i) => (
            <div key={i} className={`p-3 rounded-void-lg border ${SEVERITY_STYLES[issue.severity]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xs font-semibold uppercase">{issue.severity}</span>
              </div>
              <p className="text-sm mb-2">{issue.issue}</p>
              <p className="text-2xs opacity-80">{issue.recommendation}</p>
            </div>
          ))}
          {issues.length === 0 && (
            <div className="text-center py-12 text-sm text-status-online">
              No security issues found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
