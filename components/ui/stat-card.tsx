import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'up' 
}) => (
  <div className="panel-card rounded-[2rem] p-6">
    <div className="flex justify-between items-start mb-4">
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <Icon size={24} />
      </div>
      {trend && (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            trendDirection === 'up'
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-rose-500/10 text-rose-600'
          }`}
        >
          {trend}
        </span>
      )}
    </div>
    <div className="mb-1 text-3xl font-bold tracking-tight text-[var(--text)]">{value}</div>
    <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</div>
  </div>
);
