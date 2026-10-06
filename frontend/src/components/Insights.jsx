import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Skeleton } from './ui.jsx';

const STYLE = { positive: ['text-emerald-600 bg-emerald-50 dark:bg-emerald-950', TrendingDown], warning: ['text-amber-600 bg-amber-50 dark:bg-amber-950', AlertTriangle], info: ['text-brand-700 bg-brand-50 dark:bg-brand-900/40', Lightbulb] };

export default function Insights({ items, loading }) {
  return (
    <div className="card">
      <h3 className="mb-4 font-bold">Financial insights</h3>
      {loading ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        : !items?.length ? <p className="text-sm text-ink-500">Add a few transactions this month and ExpenseFlow will start spotting patterns for you.</p>
        : <ul className="space-y-3">{items.map((i, idx) => { const [tone, Icon] = STYLE[i.type] || STYLE.info; return (
            <li key={idx} className="flex gap-3 text-sm"><span className={`h-fit rounded-lg p-1.5 ${tone}`}>{i.type === 'positive' && /increased/.test(i.text) ? <TrendingUp className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="pt-0.5">{i.text}</span></li>); })}</ul>}
    </div>
  );
}
