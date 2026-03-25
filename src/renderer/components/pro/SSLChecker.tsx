import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';

interface CertInfo { domain: string; issuer: string; expires: string; daysLeft: number; valid: boolean; }

export function SSLChecker({ onClose }: { onClose: () => void }) {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<CertInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const checkCert = async () => {
    if (!sessionId || !domain.trim()) return;
    setLoading(true);
    const result = await (window as any).void.ssh.exec(sessionId,
      `echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | openssl x509 -noout -dates -issuer 2>/dev/null`
    );
    const output = result.stdout || '';
    const notAfterMatch = output.match(/notAfter=(.+)/);
    const issuerMatch = output.match(/issuer.*?CN\s*=\s*(.+)/);
    const expires = notAfterMatch ? notAfterMatch[1].trim() : 'unknown';
    const expiryDate = new Date(expires);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);

    setResults(prev => [...prev, {
      domain: domain.trim(),
      issuer: issuerMatch ? issuerMatch[1].trim() : 'unknown',
      expires,
      daysLeft: isNaN(daysLeft) ? -1 : daysLeft,
      valid: daysLeft > 0,
    }]);
    setDomain('');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '520px', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">SSL Certificate Checker</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="px-5 py-3">
          <div className="flex gap-2 mb-3">
            <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') checkCert(); }}
              placeholder="domain.com" className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none" style={{ border: '0.5px solid #2A2A30' }} />
            <button onClick={checkCert} disabled={loading} className="px-4 py-2 rounded-[6px] text-[10px] font-semibold cursor-pointer border-none"
              style={{ background: '#F97316', color: 'var(--base)' }}>{loading ? '...' : 'Check'}</button>
          </div>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[8px] bg-void-surface" style={{ border: `0.5px solid ${r.daysLeft > 30 ? 'rgba(40,200,64,0.15)' : r.daysLeft > 7 ? 'rgba(254,188,46,0.15)' : 'rgba(255,95,87,0.15)'}` }}>
                <span className={`w-[8px] h-[8px] rounded-full ${r.daysLeft > 30 ? 'bg-status-online' : r.daysLeft > 7 ? 'bg-status-warning' : 'bg-status-error'}`} />
                <div className="flex-1">
                  <div className="text-[11px] text-void-text font-mono font-medium">{r.domain}</div>
                  <div className="text-[9px] text-void-text-dim font-mono">Issuer: {r.issuer} · Expires: {r.expires}</div>
                </div>
                <span className={`text-[11px] font-mono font-bold ${r.daysLeft > 30 ? 'text-status-online' : r.daysLeft > 7 ? 'text-status-warning' : 'text-status-error'}`}>
                  {r.daysLeft > 0 ? `${r.daysLeft}d` : 'EXPIRED'}
                </span>
              </div>
            ))}
            {results.length === 0 && <div className="text-[10px] text-void-text-ghost font-mono text-center py-4">Enter a domain to check SSL certificate</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
