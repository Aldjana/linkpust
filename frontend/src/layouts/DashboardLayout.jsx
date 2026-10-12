import { useCallback, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { Icon, Logo } from '../components/icons.jsx';
import { Button, PlanBadge } from '../components/ui.jsx';
import { publicLabel, publicUrl } from '../lib/format.js';

const NAV = [
  { to: '/app/links', label: 'Mes liens', icon: 'link' },
  { to: '/app/analytics', label: 'Statistiques', icon: 'chart' },
  { to: '/app/profile', label: 'Ma page', icon: 'user' },
  { to: '/app/billing', label: 'Abonnement', icon: 'card' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [upgrade, setUpgrade] = useState({ open: false, reason: '' });

  const openUpgrade = useCallback((reason = '') => setUpgrade({ open: true, reason }), []);
  const closeUpgrade = useCallback(() => setUpgrade((u) => ({ ...u, open: false })), []);
  const context = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  const desktopLink = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
    }`;
  const mobileLink = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
      isActive ? 'text-brand-700' : 'text-slate-500'
    }`;

  return (
    <div className="min-h-screen">
      {/* Barre latérale (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <Link to="/app/links" className="flex items-center gap-2 px-2 py-1 text-lg font-extrabold tracking-tight">
          <Logo /> LinkPulse
        </Link>

        <nav className="mt-8 flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={desktopLink}>
              <Icon name={item.icon} className="h-[18px] w-[18px]" /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          {user.plan === 'free' && (
            <div className="rounded-xl bg-slate-900 p-4 text-white">
              <p className="text-sm font-semibold">Passez à Pro</p>
              <p className="mt-1 text-xs text-slate-300">Liens illimités, 90 jours de stats, thèmes, sans badge.</p>
              <Button className="mt-3 w-full" onClick={() => openUpgrade()}>
                Découvrir Pro
              </Button>
            </div>
          )}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-2 px-2">
              <p className="truncate text-sm font-semibold">@{user.username}</p>
              <PlanBadge plan={user.plan} />
            </div>
            <a
              href={publicUrl(user.username)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate px-2 text-xs text-slate-500 hover:text-brand-700"
            >
              {publicLabel(user.username)}
            </a>
            <button
              onClick={logout}
              className="mt-3 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Barre supérieure (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link to="/app/links" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Logo className="h-7 w-7" /> LinkPulse
        </Link>
        <div className="flex items-center gap-3">
          <PlanBadge plan={user.plan} />
          <button onClick={logout} className="text-slate-500" aria-label="Déconnexion">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 md:ml-64 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-4xl">
          <Outlet context={context} />
        </div>
      </main>

      {/* Navigation (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden"
        aria-label="Navigation principale"
      >
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={mobileLink}>
            <Icon name={item.icon} className="h-5 w-5" /> {item.label}
          </NavLink>
        ))}
      </nav>

      <UpgradeModal open={upgrade.open} onClose={closeUpgrade} reason={upgrade.reason} />
    </div>
  );
}
