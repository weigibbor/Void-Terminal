// ═══════════════════════════════════════════
// VOID TERMINAL — ANIMATION CONSTANTS
// Import this in every component that animates
// ═══════════════════════════════════════════

export const easing = {
  // Standard — most transitions (panels, tabs, content)
  standard: [0.2, 0, 0, 1] as [number, number, number, number],

  // Enter — things appearing (overlays, modals, new elements)
  enter: [0, 0, 0.2, 1] as [number, number, number, number],

  // Exit — things disappearing
  exit: [0.4, 0, 1, 1] as [number, number, number, number],

  // Spring — bouncy (toggles, success checkmarks, badges)
  spring: { type: "spring" as const, stiffness: 400, damping: 17 },

  // Gentle spring — less bounce (wizard steps, cards)
  gentleSpring: { type: "spring" as const, stiffness: 300, damping: 24 },
};

// Duration presets (seconds)
export const duration = {
  instant: 0.1,    // 100ms — button press, ghost text dismiss
  fast: 0.15,      // 150ms — hover states, tab highlight, divider
  normal: 0.2,     // 200ms — most transitions
  smooth: 0.25,    // 250ms — panels sliding, overlays
  slow: 0.3,       // 300ms — layout changes, split resize
  emphasis: 0.5,   // 500ms — celebration, auto-dismiss fade
};

// Stagger delay for lists (seconds per item)
export const stagger = {
  fast: 0.03,     // 30ms — command palette rows, quick lists
  normal: 0.05,   // 50ms — feature cards, badges, timeline events
  slow: 0.1,      // 100ms — wizard steps, workspace restore tabs
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
