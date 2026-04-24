
import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700',
    warning: 'border-amber-200/80 bg-amber-500/10 text-amber-700',
    error: 'border-rose-200/80 bg-rose-500/10 text-rose-700',
    info: 'border-sky-200/80 bg-sky-500/10 text-sky-700',
    neutral: 'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
