import type { ITheme } from '@xterm/xterm';

export interface AppTheme {
  name: string;
  terminal: ITheme;
  ui: {
    base: string;
    surface: string;
    elevated: string;
    input: string;
    border: string;
    text: string;
    textMuted: string;
    textDim: string;
    textGhost: string;
    accent: string;
  };
}

export const THEMES: Record<string, AppTheme> = {
  dark: {
    name: 'Dark',
    terminal: {
      background: '#141418', foreground: '#E8E6E0', cursor: '#F97316', cursorAccent: '#141418',
      selectionBackground: '#F9731630',
      black: '#0A0A0D', red: '#FF5F57', green: '#28C840', yellow: '#FEBC2E',
      blue: '#5B9BD5', magenta: '#C586C0', cyan: '#56B6C2', white: '#E8E6E0',
      brightBlack: '#555555', brightRed: '#FF7B72', brightGreen: '#56D364', brightYellow: '#FFC940',
      brightBlue: '#79C0FF', brightMagenta: '#D2A8FF', brightCyan: '#76E4F7', brightWhite: '#FFFFFF',
    },
    ui: { base: '#0A0A0D', surface: '#111115', elevated: '#141418', input: '#111115', border: '#2A2A30', text: '#E8E6E0', textMuted: '#888', textDim: '#666', textGhost: '#444', accent: '#F97316' },
  },
  light: {
    name: 'Light',
    terminal: {
      background: '#FAFAFA', foreground: '#1A1A1A', cursor: '#F97316', cursorAccent: '#FAFAFA',
      selectionBackground: '#F9731630',
      black: '#1A1A1A', red: '#D32F2F', green: '#388E3C', yellow: '#F9A825',
      blue: '#1976D2', magenta: '#7B1FA2', cyan: '#0097A7', white: '#FAFAFA',
      brightBlack: '#666666', brightRed: '#EF5350', brightGreen: '#66BB6A', brightYellow: '#FDD835',
      brightBlue: '#42A5F5', brightMagenta: '#AB47BC', brightCyan: '#26C6DA', brightWhite: '#FFFFFF',
    },
    ui: { base: '#FFFFFF', surface: '#F5F5F5', elevated: '#FAFAFA', input: '#F0F0F0', border: '#E0E0E0', text: '#1A1A1A', textMuted: '#555', textDim: '#888', textGhost: '#BBB', accent: '#F97316' },
  },
  midnight: {
    name: 'Midnight',
    terminal: {
      background: '#0D1117', foreground: '#C9D1D9', cursor: '#58A6FF', cursorAccent: '#0D1117',
      selectionBackground: '#58A6FF30',
      black: '#0D1117', red: '#FF7B72', green: '#3FB950', yellow: '#D29922',
      blue: '#58A6FF', magenta: '#BC8CFF', cyan: '#39D2C0', white: '#C9D1D9',
      brightBlack: '#484F58', brightRed: '#FFA198', brightGreen: '#56D364', brightYellow: '#E3B341',
      brightBlue: '#79C0FF', brightMagenta: '#D2A8FF', brightCyan: '#56D4DD', brightWhite: '#F0F6FC',
    },
    ui: { base: '#0D1117', surface: '#161B22', elevated: '#1C2128', input: '#161B22', border: '#30363D', text: '#C9D1D9', textMuted: '#8B949E', textDim: '#6E7681', textGhost: '#484F58', accent: '#58A6FF' },
  },
};

export const TERMINAL_THEME: ITheme = THEMES.dark.terminal;

export const TERMINAL_OPTIONS = {
  fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  fontSize: 13,
  lineHeight: 1.2,
  letterSpacing: 0,
  cursorStyle: 'block' as const,
  cursorBlink: false,
  cursorWidth: 2,
  scrollback: 10000,
  allowProposedApi: true,
  drawBoldTextInBrightColors: true,
  minimumContrastRatio: 1,
  smoothScrollDuration: 0,
  scrollSensitivity: 1,
  fastScrollSensitivity: 5,
  fastScrollModifier: 'alt' as const,
  overviewRulerWidth: 0,
};

export const DEFAULT_SSH_PORT = 22;
export const DEFAULT_KEEPALIVE_INTERVAL = 30;
export const MAX_RECONNECT_ATTEMPTS = 10;

export const SPLIT_MIN_WIDTH = 150;
export const SPLIT_MIN_HEIGHT = 100;
