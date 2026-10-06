import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Receipt, PiggyBank, Repeat, BarChart3, FileText, Bell, Settings, LogOut, Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import Avatar from '../components/Avatar.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/income', label: 'Income', icon: TrendingUp }, { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank }, { to: '/recurring', label: 'Recurring Payments', icon: Repeat },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 }, { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell }, { to: '/settings', label: 'Settings', icon: Settings },
];

export const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600">
      <svg viewBox="0 0 32 32" className="h-6 w-6"><path d="M7 21c4.5 0 4.5-10 9-10s4.5 10 9 10" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" /></svg>
    </div>
    <span className="text-lg font-extrabold tracking-tight">ExpenseFlow</span>
  </div>
);

function SidebarContent({ onNavigate }) {
  const { logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Logo /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
            <Icon className="h-5 w-5" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-rose-50 hover:text-rose-600 dark:text-ink-300 dark:hover:bg-rose-950"><LogOut className="h-5 w-5" />Logout</button>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = { light: 'dark', dark: 'system', system: 'light' }[theme];
  const Icon = { light: Sun, dark: Moon, system: Monitor }[theme];
  return <button className="btn-ghost" onClick={() => setTheme(next)} aria-label={`Theme: ${theme}. Switch to ${next}`} title={`Theme: ${theme}`}><Icon className="h-5 w-5" /></button>;
}

export default function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  useEffect(() => setDrawer(false), [pathname]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900 lg:block"><SidebarContent /></aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl dark:bg-ink-900" aria-label="Navigation drawer">
            <button className="btn-ghost absolute right-3 top-4" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/85 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/85 sm:px-6">
          <button className="btn-ghost lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <div className="hidden text-sm text-ink-500 lg:block">Welcome back, <span className="font-bold text-ink-900 dark:text-ink-100">{user.name.split(' ')[0]}</span></div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
            <NavLink to="/settings" className="ml-1 rounded-full" aria-label="Profile settings"><Avatar user={user} /></NavLink>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Outlet /></main>
      </div>
    </div>
  );
}
