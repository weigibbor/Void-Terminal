interface ParsedSSH {
  username?: string;
  host: string;
  port?: number;
  keyPath?: string;
}

export function parseSSHString(input: string): ParsedSSH | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ssh user@host -p port -i keypath
  const sshMatch = trimmed.match(
    /^ssh\s+(?:-i\s+(\S+)\s+)?(?:(\w[\w.-]*)@)?(\S+?)(?:\s+-p\s+(\d+))?(?:\s+-i\s+(\S+))?$/,
  );
  if (sshMatch) {
    return {
      keyPath: sshMatch[1] || sshMatch[5],
      username: sshMatch[2],
      host: sshMatch[3],
      port: sshMatch[4] ? parseInt(sshMatch[4]) : undefined,
    };
  }

  // user@host:port
  const userHostPort = trimmed.match(/^(\w[\w.-]*)@(\S+?):(\d+)$/);
  if (userHostPort) {
    return {
      username: userHostPort[1],
      host: userHostPort[2],
      port: parseInt(userHostPort[3]),
    };
  }

  // user@host
  const userHost = trimmed.match(/^(\w[\w.-]*)@(\S+)$/);
  if (userHost) {
    return {
      username: userHost[1],
      host: userHost[2],
    };
  }

  // Just a hostname
  if (/^[\w.-]+$/.test(trimmed)) {
    return { host: trimmed };
  }

  return null;
}
