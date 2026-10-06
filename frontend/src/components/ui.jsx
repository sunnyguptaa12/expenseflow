import { useEffect } from 'react';
import { X, Loader2, Inbox, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`${className} animate-spin`} aria-label="Loading" />;
export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={`skeleton ${className}`} />;

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-ink-100 p-4 text-ink-500 dark:bg-ink-800"><Icon className="h-7 w-7" /></div>
      <h3 className="text-base font-bold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-ink-900 sm:rounded-3xl ${size}`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4 dark:border-ink-800">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="max-w-md">
      <div className="flex gap-3">
        <div className="mt-0.5 h-fit rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-950"><AlertTriangle className="h-5 w-5" /></div>
        <p className="text-sm text-ink-600 dark:text-ink-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function Pagination({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-sm dark:border-ink-800">
      <span className="text-ink-500">{total} result{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-secondary px-2.5 py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-[5rem] text-center font-semibold">Page {page} of {pages}</span>
        <button className="btn-secondary px-2.5 py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', sub, loading }) {
  const tones = { brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' };
  return (
    <div className="card flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{label}</p>
        {loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-1 truncate text-2xl font-extrabold tracking-tight">{value}</p>}
        {sub && !loading && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{sub}</p>}
      </div>
      {Icon && <div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>}
    </div>
  );
}

export const ProgressBar = ({ percent, status }) => {
  const color = status === 'exceeded' ? 'bg-rose-500' : status === 'warning' ? 'bg-amber-500' : 'bg-brand-500';
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Select = ({ options, placeholder, ...props }) => (
  <select className="input" {...props}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
  </select>
);
