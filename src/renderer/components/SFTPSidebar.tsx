import { useState } from 'react';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export function SFTPSidebar() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  };

  return (
    <div className="w-[240px] bg-void-input border-r border-void-border flex flex-col animate-slide-in-left shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-void-border/50">
        <span className="text-sm text-void-text font-medium">Files</span>
        <div className="flex items-center gap-1">
          <button className="text-void-text-ghost hover:text-void-text-muted text-xs p-1" title="Upload">
            &#8593;
          </button>
          <button className="text-void-text-ghost hover:text-void-text-muted text-xs p-1" title="New folder">
            +
          </button>
        </div>
      </div>

      {/* Path breadcrumb */}
      <div className="px-3 py-1.5 border-b border-void-border/30">
        <span className="text-2xs text-void-text-ghost font-mono truncate block">{currentPath}</span>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 && (
          <div className="text-center py-8 text-2xs text-void-text-ghost">
            Connect to a server to browse files
          </div>
        )}
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-2 px-3 py-1 hover:bg-void-surface/30 cursor-pointer group"
            onClick={() => {
              if (file.isDirectory) {
                setCurrentPath(file.path);
                setExpandedDirs((prev) => {
                  const next = new Set(prev);
                  if (next.has(file.path)) next.delete(file.path);
                  else next.add(file.path);
                  return next;
                });
              }
            }}
          >
            <span className="text-2xs text-void-text-ghost w-3">
              {file.isDirectory ? (expandedDirs.has(file.path) ? '&#9660;' : '&#9654;') : ' '}
            </span>
            <span className={`text-sm truncate flex-1 ${file.isDirectory ? 'text-status-info' : 'text-void-text-muted'}`}>
              {file.name}
            </span>
            {!file.isDirectory && (
              <span className="text-2xs text-void-text-faint">{formatSize(file.size)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
