import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GlobalSidebar } from './components/layout/global-sidebar';
import { ThemeWrapper } from './components/layout/theme-wrapper';
import { StoreProvider } from './store/StoreContext';

const AdminDashboard = lazy(() =>
  import('./features/admin/admin-dashboard').then((module) => ({ default: module.AdminDashboard })),
);
const KioskSurface = lazy(() =>
  import('./features/kiosk/kiosk-surface').then((module) => ({ default: module.KioskSurface })),
);
const KDSSurface = lazy(() =>
  import('./features/kds/kds-surface').then((module) => ({ default: module.KDSSurface })),
);
const MobileOrdering = lazy(() =>
  import('./features/ordering/mobile-ordering').then((module) => ({ default: module.MobileOrdering })),
);

const ScrollManager: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return null;
};

const SurfaceQuickRail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const surfaces: Record<string, { label: string; hint: string }> = {
    '/kiosk': {
      label: 'Kiosk demo',
      hint: 'Jump back to the admin side or swap this client brand before your next food truck, restaurant, or pop-up walkthrough.',
    },
    '/kds': {
      label: 'Kitchen display',
      hint: 'Move back to the control center fast or open brand, photo, and pricing settings for a different concept.',
    },
    '/mobile': {
      label: 'Guest ordering',
      hint: 'Return to the dashboard or update photos, pricing, and presentation details for this client.',
    },
  };

  const surface = surfaces[location.pathname];
  if (!surface) {
    return null;
  }

  return (
    <div className="pointer-events-none sticky top-4 z-30 mb-5 flex justify-end">
      <div className="surface-rail panel-card pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-[28px] bg-white/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--muted)]">{surface.label}</div>
          <div className="mt-1 text-sm font-medium leading-6 text-slate-600">
            {surface.hint}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="touch-button touch-button-lg justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm"
          >
            Back to admin
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/settings')}
            className="touch-button touch-button-lg justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm"
          >
            Change brand, photos, and pricing
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <HashRouter>
        <ThemeWrapper>
          <ScrollManager />
          <div className="app-shell relative flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),linear-gradient(180deg,var(--shell),color-mix(in_srgb,var(--shell)_88%,white_12%))]">
            <GlobalSidebar />
            <main className="content-stage precise-scroll min-h-screen flex-1 overflow-auto px-4 pb-4 pt-20 sm:px-6 lg:px-8">
              <SurfaceQuickRail />
              <Suspense
                fallback={
                  <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
                    <div className="panel-card-strong rounded-[28px] px-8 py-6 text-center">
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">Loading surface</div>
                      <div className="mt-2 text-2xl font-bold text-[var(--text)]">Preparing your POS workspace…</div>
                    </div>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/settings" element={<AdminDashboard />} />
                  <Route path="/kiosk" element={<KioskSurface />} />
                  <Route path="/kds" element={<KDSSurface />} />
                  <Route path="/mobile" element={<MobileOrdering />} />
                  <Route path="*" element={<AdminDashboard />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </ThemeWrapper>
      </HashRouter>
    </StoreProvider>
  );
};

export default App;
