import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowDownCircle, ArrowUpCircle, PiggyBank, CalendarDays, Target, Gauge, Hash, TrendingUp } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { endpoints } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { monthNow } from '../utils/format.js';
import { PageHeader, StatCard, EmptyState, Skeleton, ProgressBar } from '../components/ui.jsx';
import RangeFilter, { rangeParams } from '../components/RangeFilter.jsx';
import { IncomeExpenseBars, TrendLine, Breakdown, SavingsBars } from '../components/Charts.jsx';
import Insights from '../components/Insights.jsx';

export const TxRow = ({ t, money, date }) => (
  <li className="flex items-center justify-between gap-3 py-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className={`rounded-xl p-2 ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'bg-amber-50 text-amber-600 dark:bg-amber-950'}`}>{t.type === 'income' ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}</div>
      <div className="min-w-0"><p className="truncate text-sm font-semibold">{t.description}</p><p className="text-xs text-ink-500">{t.category} · {date(t.date)}</p></div>
    </div>
    <p className={`shrink-0 text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : ''}`}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</p>
  </li>
);

export default function Dashboard() {
  const { money, date } = useAuth();
  const [range, setRange] = useState({ range: 'thisMonth' });
  const params = rangeParams(range);

  const { data, loading } = useFetch(async () => {
    if (!params) return null;
    const [summary, monthly, categories, budgets, insights] = await Promise.all([
      endpoints.list('/analytics/summary', params), endpoints.list('/analytics/monthly', params), endpoints.list('/analytics/categories', params),
      endpoints.list('/budgets', { month: monthNow() }), endpoints.list('/analytics/insights'),
    ]);
    return { summary: summary.data, series: monthly.data.series, categories: categories.data.expense, budgets: budgets.data, insights: insights.data };
  }, [JSON.stringify(params)]);

  const s = data?.summary;
  const cards = [
    { label: 'Total balance', value: s && money(s.balance), icon: Wallet, tone: 'brand', sub: 'All-time income minus expenses' },
    { label: 'Income', value: s && money(s.period.income), icon: ArrowDownCircle, tone: 'brand', sub: 'Selected period' },
    { label: 'Expenses', value: s && money(s.period.expense), icon: ArrowUpCircle, tone: 'amber', sub: 'Selected period' },
    { label: 'Savings', value: s && money(s.period.savings), icon: PiggyBank, tone: s?.period.savings < 0 ? 'rose' : 'brand', sub: 'Income minus expenses' },
    { label: 'This month income', value: s && money(s.month.income), icon: TrendingUp, tone: 'indigo' },
    { label: 'This month expenses', value: s && money(s.month.expense), icon: CalendarDays, tone: 'amber' },
    { label: 'Monthly budget', value: s && (s.budget.monthlyBudget ? money(s.budget.monthlyBudget) : 'Not set'), icon: Target, tone: 'indigo', sub: s && `${money(s.budget.spent)} spent` },
    { label: 'Remaining budget', value: s && (s.budget.monthlyBudget ? money(s.budget.remaining) : '–'), icon: Gauge, tone: s?.budget.remaining < 0 ? 'rose' : 'brand', sub: s?.budget.monthlyBudget ? `${Math.round(s.budget.percent)}% used` : undefined },
    { label: 'Transactions', value: s && s.period.count, icon: Hash, tone: 'indigo', sub: 'Selected period' },
  ];
  const hasData = s && (s.period.count > 0);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your money at a glance." actions={<RangeFilter value={range} onChange={setRange} />} />
      {!params && <p className="mb-4 text-sm text-ink-500">Choose both a start and end date to see your custom range.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((c) => <StatCard key={c.label} {...c} loading={loading || !data} />)}</div>

      {data && !hasData ? (
        <div className="card mt-6"><EmptyState title="No transactions found." message="No transactions were recorded for this period. Add one, or pick a wider date range." action={<Link to="/transactions" className="btn-primary">Add a transaction</Link>} /></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card"><h3 className="mb-4 font-bold">Income vs expenses</h3>{data ? <IncomeExpenseBars series={data.series} /> : <Skeleton className="h-64" />}</div>
          <div className="card"><h3 className="mb-4 font-bold">Expense trend</h3>{data ? <TrendLine series={data.series} /> : <Skeleton className="h-64" />}</div>
          <div className="card"><h3 className="mb-4 font-bold">Spending by category</h3>{!data ? <Skeleton className="h-64" /> : data.categories.length ? <Breakdown data={data.categories} donut /> : <EmptyState title="No expenses recorded for this period." />}</div>
          <div className="card"><h3 className="mb-4 font-bold">Savings</h3>{data ? <SavingsBars series={data.series} /> : <Skeleton className="h-64" />}</div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Budget utilization</h3><Link to="/budgets" className="text-sm font-semibold text-brand-600">Manage</Link></div>
          {!data ? <Skeleton className="h-32" /> : data.budgets.items.length === 0 ? <EmptyState title="No budgets set." message="Create a budget to see how much you have left this month." action={<Link to="/budgets" className="btn-primary">Create budget</Link>} />
            : <div className="space-y-4">{data.budgets.items.map((b) => (
              <div key={b._id}><div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{b.category}</span><span className="text-ink-500">{Math.round(b.percent)}%</span></div><ProgressBar percent={b.percent} status={b.status} /></div>))}</div>}
        </div>
        <div className="card lg:col-span-1">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Recent transactions</h3><Link to="/transactions" className="text-sm font-semibold text-brand-600">View all</Link></div>
          {!data ? <Skeleton className="h-32" /> : s.recent.length === 0 ? <EmptyState title="No transactions found." /> : <ul className="divide-y divide-ink-100 dark:divide-ink-800">{s.recent.map((t) => <TxRow key={t._id} t={t} money={money} date={date} />)}</ul>}
        </div>
        <div className="lg:col-span-1"><Insights items={data?.insights} loading={!data} /></div>
      </div>
    </>
  );
}
