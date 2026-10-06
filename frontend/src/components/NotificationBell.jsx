import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, CalendarClock, FileText, TrendingUp, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { endpoints } from '../services/api.js';
import { timeAgo } from '../utils/format.js';

export const NOTIFICATION_ICONS = { budget_warning: AlertTriangle, budget_exceeded: AlertTriangle, recurring_due: CalendarClock, recurring_processed: Repeat, report_available: FileText, unusual_spending: TrendingUp, large_transaction: TrendingUp };
export const NOTIFICATION_TONE = { budget_exceeded: 'text-rose-600 bg-rose-50 dark:bg-rose-950', budget_warning: 'text-amber-600 bg-amber-50 dark:bg-amber-950', unusual_spending: 'text-amber-600 bg-amber-50 dark:bg-amber-950', large_transaction: 'text-amber-600 bg-amber-50 dark:bg-amber-950' };

export function useNotifications(limit = 30) {
  const [state, setState] = useState({ items: [], unread: 0, loading: true });
  const load = useCallback(async () => {
    try {
      const res = await endpoints.list('/notifications', { limit });
      setState({ items: res.data, unread: res.meta.unreadCount, loading: false });
    } catch { setState((s) => ({ ...s, loading: false })); }
  }, [limit]);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast.success(okMsg); await load(); } catch (e) { toast.error(e.message); } };
  return {
    ...state, reload: load,
    markRead: (id) => act(() => endpoints.patch(`/notifications/${id}/read`)),
    markAll: () => act(() => endpoints.patch('/notifications/read-all'), 'All notifications marked as read'),
    remove: (id) => act(() => endpoints.remove(`/notifications/${id}`)),
  };
}

export function NotificationItem({ n, onRead, onDelete }) {
  const Icon = NOTIFICATION_ICONS[n.type] || Bell;
  return (
    <div className={`flex gap-3 px-4 py-3 ${n.isRead ? '' : 'bg-brand-50/60 dark:bg-brand-900/10'}`}>
      <div className={`h-fit rounded-xl p-2 ${NOTIFICATION_TONE[n.type] || 'text-brand-700 bg-brand-50 dark:bg-brand-900/40'}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{n.title}</p>
        <p className="text-sm text-ink-600 dark:text-ink-300">{n.message}</p>
        <p className="mt-1 text-xs text-ink-400">{timeAgo(n.createdAt)}</p>
      </div>
      <div className="flex flex-col gap-1">
        {!n.isRead && <button className="btn-ghost p-1.5" onClick={() => onRead(n._id)} aria-label="Mark as read"><Check className="h-4 w-4" /></button>}
        <button className="btn-ghost p-1.5 hover:text-rose-600" onClick={() => onDelete(n._id)} aria-label="Delete notification"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { items, unread, markRead, markAll, remove } = useNotifications(8);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-40 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <h3 className="font-bold">Notifications</h3>
            <button className="flex items-center gap-1 text-xs font-semibold text-brand-600 disabled:opacity-40" onClick={markAll} disabled={!unread}><CheckCheck className="h-4 w-4" />Mark all as read</button>
          </div>
          <div className="max-h-96 divide-y divide-ink-100 overflow-y-auto dark:divide-ink-800">
            {items.length === 0 ? <p className="px-4 py-10 text-center text-sm text-ink-500">You're all caught up.</p> : items.map((n) => <NotificationItem key={n._id} n={n} onRead={markRead} onDelete={remove} />)}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-ink-100 px-4 py-3 text-center text-sm font-semibold text-brand-600 dark:border-ink-800">View all notifications</Link>
        </div>
      )}
    </div>
  );
}
