/**
 * Design Tokens - Pay Lobster Design System
 * Single source of truth for all design values
 */

export const tokens = {
  // Colors
  colors: {
    background: {
      primary: '#0a0a0f',     // gray-950 (near-black with blue tint)
      secondary: '#111827',   // gray-900 (card bg)
      tertiary: '#1e293b',    // gray-800 (card border)
    },
    foreground: {
      primary: '#f8fafc',     // gray-50
      secondary: '#d1d5db',   // gray-300
      tertiary: '#9ca3af',    // gray-400
      muted: '#94a3b8',       // gray-400 (muted)
    },
    border: {
      default: '#1e293b',     // gray-800 (card border)
      hover: '#374151',       // gray-700
      focus: '#4b5563',       // gray-600
    },
    brand: {
      blue: {
        primary: '#2563eb',   // blue-600 (trust blue)
        hover: '#3b82f6',     // blue-500 (primary hover)
        active: '#1d4ed8',    // blue-700 (deep blue)
        light: '#60a5fa',     // blue-400
        dark: '#1e40af',      // blue-800
        glow: 'rgba(37, 99, 235, 0.15)',
      },
    },
    semantic: {
      success: {
        primary: '#22c55e',   // green-500
        light: '#4ade80',     // green-400
        bg: 'rgba(34, 197, 94, 0.2)',
      },
      warning: {
        primary: '#2563eb',   // blue-600 (now trust blue)
        bg: 'rgba(37, 99, 235, 0.2)',
      },
      error: {
        primary: '#ef4444',   // red-500
        bg: 'rgba(239, 68, 68, 0.2)',
      },
      info: {
        primary: '#3b82f6',   // blue-500
        bg: 'rgba(59, 130, 246, 0.2)',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(', '),
      mono: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'monospace'].join(', '),
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },

  // Spacing (4px grid system)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },

  // Border Radius
  radii: {
    none: '0',
    sm: '0.25rem',    // 4px
    base: '0.5rem',   // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    full: '9999px',
  },

  // Shadows (elevation system)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(37, 99, 235, 0.15)',
    glowLg: '0 0 30px rgba(37, 99, 235, 0.3)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
    bounce: '200ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  // Component-specific tokens
  components: {
    button: {
      minHeight: {
        sm: '36px',
        md: '44px',  // Touch target
        lg: '52px',
      },
      padding: {
        sm: '0.5rem 0.75rem',
        md: '0.625rem 1rem',
        lg: '0.75rem 1.5rem',
      },
    },
    input: {
      minHeight: '44px',  // Touch target
      padding: '0.625rem 1rem',
    },
    card: {
      padding: {
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
      },
    },
  },
} as const;

// Type-safe token access
export type Tokens = typeof tokens;
export type ColorToken = keyof typeof tokens.colors;
export type SpacingToken = keyof typeof tokens.spacing;
export type RadiusToken = keyof typeof tokens.radii;
