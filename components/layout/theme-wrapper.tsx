import React from 'react';
import { useStore } from '../../store/StoreContext';
import { THEMES } from '../../config/constants';

export const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTheme } = useStore();
  const theme = THEMES[currentTheme];

  const cssVariables = {
    '--primary': theme.primary,
    '--primary-hover': theme.primaryHover,
    '--accent': theme.accent,
    '--bg': theme.bg,
    '--surface': theme.surface,
    '--border': theme.border,
    '--text': theme.text,
    '--body': theme.body,
    '--muted': theme.muted,
    '--shell': `color-mix(in srgb, ${theme.bg} 86%, white 14%)`,
    '--surface-soft': `color-mix(in srgb, ${theme.surface} 82%, white 18%)`,
    '--surface-strong': `color-mix(in srgb, ${theme.surface} 92%, white 8%)`,
    '--border-strong': `color-mix(in srgb, ${theme.border} 84%, ${theme.text} 16%)`,
    '--hero-start': `color-mix(in srgb, ${theme.primary} 15%, white 85%)`,
    '--hero-end': `color-mix(in srgb, ${theme.accent} 12%, ${theme.surface} 88%)`,
    '--success': '#047857',
    '--warning': '#b45309',
    '--danger': '#b91c1c',
  } as React.CSSProperties;

  return (
    <div
      style={cssVariables}
      className="min-h-screen bg-[var(--shell)] text-[var(--text)] transition-colors duration-300"
    >
      {children}
    </div>
  );
};
