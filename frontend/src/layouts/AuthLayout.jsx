import { Outlet } from 'react-router-dom';
import { Logo } from './AppLayout.jsx';

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="[&_span]:text-white"><Logo /></div>
        <div>
          <svg viewBox="0 0 400 120" className="mb-8 w-full max-w-md opacity-90" fill="none" aria-hidden="true">
            <path d="M0 80C40 80 40 30 80 30s40 60 80 60 40-70 80-70 40 80 80 80 40-40 80-40" stroke="#72d2bd" strokeWidth="5" strokeLinecap="round" />
            <path d="M0 100C50 100 50 60 100 60s50 40 100 40 50-50 100-50 50 30 100 30" stroke="#d97706" strokeWidth="3" strokeLinecap="round" opacity=".8" />
          </svg>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Know where every rupee goes.</h2>
          <p className="mt-4 max-w-md text-brand-100">Track spending, set budgets, scan receipts and get clear monthly reports, all in one place.</p>
        </div>
        <p className="text-sm text-brand-200">Your data stays private and is only visible to you.</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md"><div className="mb-8 lg:hidden"><Logo /></div><Outlet /></div>
      </div>
    </div>
  );
}
