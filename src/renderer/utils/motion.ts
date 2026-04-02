// ═══════════════════════════════════════════
// VOID TERMINAL — PLATFORM-AWARE ANIMATION CONSTANTS
// macOS: slower, spring-like (matches system animations)
// Windows: faster, snappy (matches Fluent Motion)
// ═══════════════════════════════════════════

const isMac = navigator.userAgent.includes('Macintosh');

export const easing = {
  // Standard — most transitions
  standard: (isMac
    ? [0.2, 0, 0, 1]
    : [0.1, 0.9, 0.2, 1]  // Fluent "FastIn"
  ) as [number, number, number, number],

  // Enter — things appearing
  enter: (isMac
    ? [0, 0, 0.2, 1]
    : [0.1, 0.9, 0.2, 1]
  ) as [number, number, number, number],

  // Exit — things disappearing
  exit: (isMac
    ? [0.4, 0, 1, 1]
    : [0.2, 0, 0.7, 0.1]  // Fluent "FastOut"
  ) as [number, number, number, number],

  // Spring — bouncy (toggles, success checkmarks)
  spring: isMac
    ? { type: "spring" as const, stiffness: 350, damping: 20 }  // macOS: softer bounce
    : { type: "spring" as const, stiffness: 500, damping: 25 },  // Windows: snappier

  // Gentle spring
  gentleSpring: isMac
    ? { type: "spring" as const, stiffness: 280, damping: 22 }
    : { type: "spring" as const, stiffness: 400, damping: 28 },
};

// Duration presets (seconds) — macOS slightly longer for natural feel
export const duration = {
  instant: isMac ? 0.12 : 0.08,
  fast: isMac ? 0.18 : 0.12,
  normal: isMac ? 0.25 : 0.15,
  smooth: isMac ? 0.3 : 0.2,
  slow: isMac ? 0.4 : 0.25,
  emphasis: isMac ? 0.6 : 0.4,
};

// Stagger delay for lists
export const stagger = {
  fast: isMac ? 0.03 : 0.02,
  normal: isMac ? 0.05 : 0.03,
  slow: isMac ? 0.1 : 0.06,
};

// Reusable Framer Motion variants
export const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const fadeRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideFromRight = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};

export const slideFromLeft = {
  initial: { x: "-100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "-100%", opacity: 0 },
};
