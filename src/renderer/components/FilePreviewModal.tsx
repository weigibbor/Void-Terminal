import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface FilePreviewModalProps {
  open: boolean;
  sessionId: string;
  filePath: string;
  fileName: string;
  onClose: () => void;
  onEdit?: (content: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TEXT_EXTS = new Set(['.txt', '.sh', '.bash', '.zsh', '.env', '.log', '.md', '.yml', '.yaml', '.json', '.conf', '.cfg', '.ini', '.toml', '.xml', '.html', '.css', '.js', '.ts', '.py', '.rb', '.go', '.rs', '.c', '.h', '.cpp', '.java', '.sql', '.dockerfile', '.gitignore', '.editorconfig']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function FilePreviewModal({ open, sessionId, filePath, fileName, onClose, onEdit }: FilePreviewModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ext = getExt(fileName);
  const isImage = IMAGE_EXTS.has(ext);
  const isText = TEXT_EXTS.has(ext) || fileName.startsWith('.');

  useEffect(() => {
    if (!open || !sessionId || !filePath) return;
    setLoading(true);
    setError('');
    setContent(null);

    (window as any).void.sftp.readFile(sessionId, filePath).then((result: any) => {
      setLoading(false);
      if (result.success) {
        setContent(result.content);
      } else {
        setError(result.error || 'Failed to read file');
      }
    }).catch(() => {
      setLoading(false);
      setError('Failed to read file');
    });
  }, [open, sessionId, filePath]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col"
            style={{ maxWidth: '640px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
              <div className="flex items-center gap-[8px]">
                <span className="text-[13px] text-void-text font-mono font-medium truncate">{fileName}</span>
                <span className="text-[10px] text-void-text-ghost font-mono">{filePath}</span>
              </div>
              <div className="flex items-center gap-[6px]">
                {onEdit && content && isText && (
                  <button onClick={() => onEdit(content)} className="text-[10px] text-accent bg-transparent border-none cursor-pointer font-sans">Edit</button>
                )}
                <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer p-1 leading-none">×</button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-[12px] text-void-text-ghost font-mono">Loading...</div>
              ) : error ? (
                <div className="flex items-center justify-center py-16 text-[12px] text-status-error font-mono">{error}</div>
              ) : isImage && content ? (
                <div className="flex items-center justify-center p-4">
                  <img src={`data:image/${ext.slice(1)};base64,${btoa(content)}`} alt={fileName}
                    style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '4px' }} />
                </div>
              ) : content !== null ? (
                <pre className="text-[11px] font-mono text-void-text-muted p-4 whitespace-pre-wrap break-words leading-[1.6]">{content}</pre>
              ) : (
                <div className="flex items-center justify-center py-16 text-[12px] text-void-text-ghost font-mono">Binary file — download to view</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
