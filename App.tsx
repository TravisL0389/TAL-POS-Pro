import React, { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
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

const App: React.FC = () => {
  return (
    <StoreProvider>
      <HashRouter>
        <ThemeWrapper>
          <div className="app-shell relative flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),linear-gradient(180deg,var(--shell),color-mix(in_srgb,var(--shell)_88%,white_12%))]">
            <GlobalSidebar />
            <main className="content-stage min-h-screen flex-1 overflow-auto px-4 pb-4 pt-20 sm:px-6 lg:px-8">
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
