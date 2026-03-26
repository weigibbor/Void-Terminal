import { useAppStore } from '../stores/app-store';

export interface AgentAction {
  type: 'exec' | 'live_exec' | 'write' | 'read_terminal' | 'read_file' | 'write_file' | 'browse' | 'done' | 'ask_user';
  id?: string;
  command?: string;
  path?: string;
  content?: string;
  url?: string;
  summary?: string;
  question?: string;
}

export interface AgentResult {
  success: boolean;
  output: string;
  error?: string;
}

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf?\s+\//,
  /\bdd\s+if=/,
  /\bmkfs\b/,
  /\bformat\b/,
  /DROP\s+(TABLE|DATABASE)/i,
  /TRUNCATE\s+TABLE/i,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bkill\s+-9\s+1\b/,
  /\b>\s*\/dev\/sd/,
];

export function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some(p => p.test(command));
}

export async function executeAction(action: AgentAction): Promise<AgentResult> {
  const store = useAppStore.getState();
  const activeTab = store.tabs.find(t => t.id === store.activeTabId);
  const sessionId = activeTab?.sessionId;

  if (!sessionId) {
    return { success: false, output: '', error: 'No active SSH session' };
  }

  switch (action.type) {
    case 'exec': {
      if (!action.command) return { success: false, output: '', error: 'No command provided' };
      const result = await (window as any).void.ssh.exec(sessionId, action.command);
      return {
        success: result.code === 0,
        output: (result.stdout || '') + (result.stderr ? '\nSTDERR: ' + result.stderr : ''),
        error: result.code !== 0 ? `Exit code: ${result.code}` : undefined,
      };
    }

    case 'live_exec': {
      if (!action.command) return { success: false, output: '', error: 'No command provided' };
      // Type command into terminal — user sees it live
      if (activeTab?.type === 'ssh') {
        window.void.ssh.write(sessionId, action.command + '\r');
      } else {
        window.void.pty.write(sessionId, action.command + '\r');
      }
      // Wait for output — poll terminal context until prompt returns
      const startLen = ((window as any).__voidTerminalContext || '').length;
      let liveOutput = '';
      for (let i = 0; i < 60; i++) { // max 30 seconds
        await new Promise(r => setTimeout(r, 500));
        const current = (window as any).__voidTerminalContext || '';
        const newContent = current.slice(startLen);
        if (newContent.length > 5 && /[\$#>]\s*$/.test(newContent.trim())) {
          liveOutput = newContent;
          break;
        }
        if (i === 59) liveOutput = newContent || '(timed out waiting for output)';
      }
      return { success: true, output: liveOutput };
    }

    case 'write': {
      if (!action.command) return { success: false, output: '', error: 'No text to write' };
      if (activeTab?.type === 'ssh') {
        window.void.ssh.write(sessionId, action.command);
      } else {
        window.void.pty.write(sessionId, action.command);
      }
      return { success: true, output: `Sent to terminal: ${action.command}` };
    }

    case 'read_terminal': {
      const context = (window as any).__voidTerminalContext || '';
      return { success: true, output: context || '(no terminal output captured)' };
    }

    case 'read_file': {
      if (!action.path) return { success: false, output: '', error: 'No path provided' };
      const result = await (window as any).void.sftp.readFile(sessionId, action.path);
      if (result.success) return { success: true, output: result.content };
      return { success: false, output: '', error: result.error || 'Failed to read file' };
    }

    case 'write_file': {
      if (!action.path || !action.content) return { success: false, output: '', error: 'Path and content required' };
      const result = await (window as any).void.sftp.writeFile(sessionId, action.path, action.content);
      if (result.success) return { success: true, output: `File written: ${action.path}` };
      return { success: false, output: '', error: result.error || 'Failed to write file' };
    }

    case 'browse': {
      if (action.url) window.open(action.url, '_blank');
      return { success: true, output: `Opened: ${action.url}` };
    }

    case 'done': {
      return { success: true, output: action.summary || 'Task complete.' };
    }

    case 'ask_user': {
      return { success: true, output: action.question || 'Waiting for user input...' };
    }

    default:
      return { success: false, output: '', error: `Unknown action type: ${action.type}` };
  }
}
