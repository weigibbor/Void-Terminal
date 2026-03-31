import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/app-store';

/**
 * Auto-opens editor tabs when Claude Code on SSH edits files.
 * Listens for 'ssh:file-edited' events, reads the file via SFTP,
 * and opens/updates an editor tab in real-time.
 */
export function useAutoEditor() {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handler = (window.void.ssh as any).onFileEdited?.((sessionId: string, filePath: string) => {
      handleFileEdited(sessionId, filePath);
    });

    cleanupRef.current = handler;
    return () => { cleanupRef.current?.(); };
  }, []);
}

async function handleFileEdited(sessionId: string, filePath: string) {
  const store = useAppStore.getState();

  // Read the file content via SFTP
  const result = await window.void.sftp.readFile(sessionId, filePath);
  if (!result.success || result.content === undefined) return;

  const fileName = filePath.split('/').pop() || filePath;

  // Check if an editor tab for this file already exists
  const existingTab = store.tabs.find(
    (t) => t.type === 'editor' && t.filePath === filePath && t.sftpSessionId === sessionId,
  );

  if (existingTab) {
    // Update existing tab content (real-time update)
    store.updateTab(existingTab.id, {
      fileContent: result.content,
      unsaved: false,
    });
  } else {
    // Open new editor tab
    const tabId = store.addTab('editor', {
      title: fileName,
      filePath,
      fileContent: result.content,
      sftpSessionId: sessionId,
      connected: true,
    });

    // Switch to the new editor tab
    store.setActiveTab(tabId);
  }
}
