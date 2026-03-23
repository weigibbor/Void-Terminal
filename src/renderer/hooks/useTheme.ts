import { TERMINAL_THEME, TERMINAL_OPTIONS } from '../utils/constants';

export function useTheme() {
  // Dark theme only for v1
  return {
    terminal: {
      theme: TERMINAL_THEME,
      ...TERMINAL_OPTIONS,
    },
  };
}
