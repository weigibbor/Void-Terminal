import os from 'os';

export function getDefaultShell(): string {
  if (os.platform() === 'win32') return 'powershell.exe';
  return process.env.SHELL || '/bin/zsh';
}

export function isMac(): boolean {
  return os.platform() === 'darwin';
}

export function isWindows(): boolean {
  return os.platform() === 'win32';
}
