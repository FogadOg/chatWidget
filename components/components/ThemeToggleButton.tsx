import React from 'react';

type ThemeToggleButtonProps = {
  /** Whether the widget is currently rendering in dark mode. */
  isDark: boolean;
  /** Called with the mode to switch TO (the opposite of the current one). */
  onToggle: (next: 'light' | 'dark') => void;
  /** Accessible label / tooltip. */
  label: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * A visitor-facing light/dark toggle for the widget header. Shows a sun when the
 * widget is dark (click → switch to light) and a moon when light (click → dark).
 * Styling is supplied by the caller so it matches each shell's header controls.
 */
export function ThemeToggleButton({ isDark, onToggle, label, className, style }: ThemeToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(isDark ? 'light' : 'dark')}
      className={className}
      style={style}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        // Sun — switch to light
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon — switch to dark
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default ThemeToggleButton;
