import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader, EmptyState, Skeleton } from '../components/ui.jsx';
import { useNotifications, NotificationItem } from '../components/NotificationBell.jsx';

export default function Notifications() {
  const [onlyUnread, setOnlyUnread] = useState(false);
  const { items, unread, loading, markRead, markAll, remove } = useNotifications(100);
  const shown = onlyUnread ? items.filter((n) => !n.isRead) : items;
  return (
    <>
      <PageHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'You are all caught up.'} actions={<>
        <div className="inline-flex rounded-xl border border-ink-200 p-1 dark:border-ink-700">
          {[['All', false], ['Unread', true]].map(([l, v]) => <button key={l} onClick={() => setOnlyUnread(v)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${onlyUnread === v ? 'bg-brand-600 text-white' : 'text-ink-600 dark:text-ink-300'}`}>{l}</button>)}
        </div>
        <button className="btn-secondary" onClick={markAll} disabled={!unread}><CheckCheck className="h-4 w-4" />Mark all as read</button>
      </>} />
      <div className="card overflow-hidden p-0">
        {loading ? <div className="space-y-3 p-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          : shown.length === 0 ? <EmptyState icon={Bell} title="No notifications." message="Budget alerts, recurring payment reminders and monthly reports will show up here." />
          : <div className="divide-y divide-ink-100 dark:divide-ink-800">{shown.map((n) => <NotificationItem key={n._id} n={n} onRead={markRead} onDelete={remove} />)}</div>}
      </div>
    </>
  );
}
