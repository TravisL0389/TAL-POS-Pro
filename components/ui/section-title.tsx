
import React from 'react';

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-8">
    <h1 className="text-3xl font-bold text-[var(--text)]">{title}</h1>
    {subtitle && <p className="text-[var(--muted)] font-medium">{subtitle}</p>}
  </div>
);
