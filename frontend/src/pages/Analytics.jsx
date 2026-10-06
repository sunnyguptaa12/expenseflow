import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { endpoints } from '../services/api.js';
import { PageHeader, EmptyState, Skeleton } from '../components/ui.jsx';
import RangeFilter, { rangeParams } from '../components/RangeFilter.jsx';
import { IncomeExpenseBars, TrendLine, Breakdown, TopCategoriesBar } from '../components/Charts.jsx';
import Insights from '../components/Insights.jsx';

const TREND = {
  increasing: { icon: TrendingUp, label: 'Increasing', tone: 'text-rose-600 bg-rose-50 dark:bg-rose-950', note: 'Your spending has been rising over the last three months.' },
  decreasing: { icon: TrendingDown, label: 'Decreasing', tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', note: 'Your spending has been falling over the last three months.' },
  stable: { icon: Minus, label: 'Stable', tone: 'text-brand-700 bg-brand-50 dark:bg-brand-900/40', note: 'Your spending has stayed steady over the last three months.' },
};

export default function Analytics() {
  const [range, setRange] = useState({ range: 'last6' });
  const params = rangeParams(range);
  const { data, loading } = useFetch(async () => {
    if (!params) return null;
    const [monthly, cats, insights] = await Promise.all([endpoints.list('/analytics/monthly', params), endpoints.list('/analytics/categories', params), endpoints.list('/analytics/insights')]);
    return { ...monthly.data, ...cats.data, insights: insights.data };
  }, [JSON.stringify(params)]);

  const empty = data && !data.expense.length && !data.income.length;
  const trend = data && TREND[data.trend.direction];
  const Box = ({ title, children }) => <div className="card"><h3 className="mb-4 font-bold">{title}</h3>{!data || loading ? <Skeleton className="h-64" /> : children}</div>;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Understand where your money goes." actions={<RangeFilter value={range} onChange={setRange} />} />
      {empty ? <div className="card"><EmptyState icon={BarChart3} title="No analytics yet." message="There is no data for this period. Add transactions or choose a wider date range." /></div> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Box title="Expense by category">{data?.expense.length ? <Breakdown data={data.expense} /> : <EmptyState title="No expenses recorded for this period." />}</Box>
          <Box title={`${data?.granularity === 'day' ? 'Daily' : 'Monthly'} expenses`}><TrendLine series={data?.series || []} /></Box>
          <Box title="Income vs expense"><IncomeExpenseBars series={data?.series || []} /></Box>
          <Box title="Payment methods">{data?.paymentMethods.length ? <Breakdown data={data.paymentMethods} nameKey="method" donut /> : <EmptyState title="No expenses recorded for this period." />}</Box>
          <Box title="Top spending categories">{data?.expense.length ? <TopCategoriesBar data={data.expense} /> : <EmptyState title="No expenses recorded for this period." />}</Box>
          <div className="space-y-6">
            <div className="card">
              <h3 className="mb-4 font-bold">Spending trend</h3>
              {!data ? <Skeleton className="h-24" /> : (
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl p-3 ${trend.tone}`}><trend.icon className="h-7 w-7" /></div>
                  <div><p className="text-xl font-extrabold">{trend.label}{data.trend.changePercent !== null && <span className="ml-2 text-sm font-semibold text-ink-500">{data.trend.changePercent > 0 ? '+' : ''}{Math.round(data.trend.changePercent)}%</span>}</p><p className="mt-1 text-sm text-ink-500">{trend.note}</p></div>
                </div>)}
            </div>
            <Insights items={data?.insights} loading={!data} />
          </div>
        </div>
      )}
    </>
  );
}
