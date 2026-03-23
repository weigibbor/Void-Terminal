import type { ITheme } from '@xterm/xterm';

export const TERMINAL_THEME: ITheme = {
  background: '#141418',
  foreground: '#E8E6E0',
  cursor: '#F97316',
  cursorAccent: '#141418',
  selectionBackground: '#F9731630',
  black: '#0A0A0D',
  red: '#FF5F57',
  green: '#28C840',
  yellow: '#FEBC2E',
  blue: '#5B9BD5',
  magenta: '#C586C0',
  cyan: '#56B6C2',
  white: '#E8E6E0',
  brightBlack: '#555555',
  brightRed: '#FF7B72',
  brightGreen: '#56D364',
  brightYellow: '#FFC940',
  brightBlue: '#79C0FF',
  brightMagenta: '#D2A8FF',
  brightCyan: '#76E4F7',
  brightWhite: '#FFFFFF',
};

export const TERMINAL_OPTIONS = {
  fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  fontSize: 13,
  lineHeight: 1.2,
  letterSpacing: 0,
  cursorStyle: 'bar' as const,
  cursorBlink: true,
  cursorWidth: 2,
  scrollback: 10000,
  allowProposedApi: true,
  drawBoldTextInBrightColors: true,
  minimumContrastRatio: 1,
  smoothScrollDuration: 125,
  scrollSensitivity: 3,
  fastScrollSensitivity: 7,
  fastScrollModifier: 'alt' as const,
  overviewRulerWidth: 0,
};

export const DEFAULT_SSH_PORT = 22;
export const DEFAULT_KEEPALIVE_INTERVAL = 30;
export const MAX_RECONNECT_ATTEMPTS = 10;

export const SPLIT_MIN_WIDTH = 150;
export const SPLIT_MIN_HEIGHT = 100;
