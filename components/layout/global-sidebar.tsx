import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChefHat,
  LayoutDashboard,
  Menu,
  Monitor,
  MoveRight,
  Palette,
  Settings,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { THEMES } from '../../config/constants';
import { ThemeName } from '../../types';

export const GlobalSidebar: React.FC = () => {
  const location = useLocation();
  const { activeStaff, currentTheme, menu, orders, setTheme, tenantConfig } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const openOrders = orders.filter((order) => ['received', 'preparing', 'ready'].includes(order.status)).length;

  const navItems = [
    { label: 'Admin', icon: LayoutDashboard, path: '/admin', description: 'Business hub' },
    { label: 'Kiosk', icon: Monitor, path: '/kiosk', description: 'Touch checkout' },
    { label: 'Kitchen', icon: ChefHat, path: '/kds', description: 'Prep queue' },
    { label: 'Mobile', icon: Smartphone, path: '/mobile', description: 'Guest ordering' },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed left-4 top-4 z-[80] flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)]/95 text-[var(--text)] shadow-[var(--shadow-soft)] backdrop-blur ${
          isOpen ? 'pointer-events-none opacity-0' : ''
        }`}
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[75] flex h-screen w-[340px] max-w-[88vw] flex-col border-r border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface)_88%,white_12%)] shadow-[var(--shadow-strong)] backdrop-blur-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="grid-accent relative overflow-hidden border-b border-[var(--border)] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={tenantConfig.logo}
                alt={tenantConfig.name}
                className="h-16 w-16 rounded-[24px] object-cover shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
              />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--muted)]">LocalPOS Pro</div>
                <div className="text-lg font-bold text-[var(--text)]">{tenantConfig.name}</div>
                <div className="text-sm text-[var(--body)]">AI-assisted counter operations</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="glass-panel relative overflow-hidden rounded-[28px] p-4"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.3)), url(${tenantConfig.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Current brand</div>
            <div className="mt-2 text-xl font-bold text-[var(--text)]">{tenantConfig.name}</div>
            <div className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--body)]">{tenantConfig.story}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="metric-chip rounded-2xl px-3 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Open Orders</div>
                <div className="mt-1 text-xl font-bold text-[var(--text)]">{openOrders}</div>
              </div>
              <div className="metric-chip rounded-2xl px-3 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">Live Menu</div>
                <div className="mt-1 text-xl font-bold text-[var(--text)]">{menu.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-b border-[var(--border)] p-6">
          <div className="panel-card rounded-[24px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Active Terminal User</div>
              <Users size={16} className="text-[var(--primary)]" />
            </div>
            <div className="text-lg font-bold text-[var(--text)]">{activeStaff.name}</div>
            <div className="mt-1 text-sm capitalize text-[var(--body)]">{activeStaff.role}</div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--bg)] px-3 py-2 text-xs font-semibold text-[var(--body)]">
              Ready to switch surfaces
              <MoveRight size={14} className="text-[var(--primary)]" />
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/' || location.pathname.startsWith(item.path)
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 rounded-[24px] border px-4 py-4 ${
                  isActive
                    ? 'border-[var(--primary)] bg-[linear-gradient(135deg,var(--primary),color-mix(in_srgb,var(--primary)_78%,black_22%))] text-white shadow-[0_18px_34px_rgba(15,23,42,0.18)]'
                    : 'border-transparent bg-transparent text-[var(--body)] hover:border-[var(--border)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]'
                }`}
              >
                <item.icon size={22} />
                <div className="flex-1">
                  <div className="font-bold">{item.label}</div>
                  <div className={`text-sm ${isActive ? 'text-white/80' : 'text-[var(--muted)]'}`}>{item.description}</div>
                </div>
                <MoveRight size={16} className={isActive ? 'text-white/70' : 'text-[var(--muted)]'} />
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
            <Palette size={14} />
            Quick Theme Switch
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
              const theme = THEMES[themeName];
              const isSelected = currentTheme === themeName;

              return (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={`rounded-[20px] border px-3 py-3 text-left ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--surface-soft)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <div className="mb-2 flex gap-1">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: theme.bg }} />
                  </div>
                  <div className="text-xs font-bold text-[var(--text)]">{themeName}</div>
                </button>
              );
            })}
          </div>

          <Link
            to="/admin/settings"
            onClick={() => setIsOpen(false)}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--body)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
};
