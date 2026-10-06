import { useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch.js';
import { endpoints, downloadBlob } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { monthNow } from '../utils/format.js';
import { PageHeader, Select, Field, Spinner, StatCard, Skeleton } from '../components/ui.jsx';
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from 'lucide-react';

const TYPES = [{ value: 'monthly', label: 'Monthly financial report' }, { value: 'yearly', label: 'Yearly financial report' }, { value: 'income', label: 'Income report' }, { value: 'expense', label: 'Expense report' }, { value: 'budget', label: 'Budget report' }, { value: 'complete', label: 'Complete financial report' }];
const PERIODS = [{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }, { value: 'custom', label: 'Custom dates' }];

function resolvePeriod(mode, month, year, from, to) {
  if (mode === 'month') { const [y, m] = month.split('-').map(Number); return { from: `${month}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) }; }
  if (mode === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };
  return { from, to };
}

export default function Reports() {
  const { money } = useAuth();
  const [type, setType] = useState('monthly');
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(monthNow());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(null);

  const period = resolvePeriod(mode, month, year, from, to);
  const valid = Boolean(period.from && period.to && period.from <= period.to && /^\d{4}/.test(period.from));
  const { data, loading } = useFetch(() => (valid ? endpoints.list('/analytics/summary', { range: 'custom', ...period }) : null), [period.from, period.to, valid], { silent: true });
  const totals = data?.data?.period;

  const run = async (kind) => {
    if (!valid) return toast.error('Please choose a valid start and end date.');
    setBusy(kind);
    try {
      if (kind === 'pdf') { downloadBlob(await endpoints.files.blob('/files/report-pdf', { type, ...period }), `ExpenseFlow-${type}-report.pdf`); toast.success('Your PDF report is ready.'); }
      else { downloadBlob(await endpoints.files.blob('/files/export-csv', { ...period, sort: 'newest', ...(type === 'income' ? { type: 'income' } : type === 'expense' ? { type: 'expense' } : {}) }), 'expenses.csv'); toast.success('Export ready: expenses.csv'); }
    } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Download a polished PDF or export the underlying transactions." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card space-y-5">
          <Field label="Report type"><Select options={TYPES} value={type} onChange={(e) => setType(e.target.value)} /></Field>
          <Field label="Period"><Select options={PERIODS} value={mode} onChange={(e) => setMode(e.target.value)} /></Field>
          {mode === 'month' && <Field label="Month"><input type="month" className="input" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></Field>}
          {mode === 'year' && <Field label="Year"><input type="number" min="2000" max="2100" className="input" value={year} onChange={(e) => setYear(e.target.value)} /></Field>}
          {mode === 'custom' && <div className="grid gap-4 sm:grid-cols-2"><Field label="Start date"><input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="End date"><input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></Field></div>}
          <div className="flex flex-wrap gap-3 pt-1">
            <button className="btn-primary" onClick={() => run('pdf')} disabled={Boolean(busy) || !valid}>{busy === 'pdf' ? <Spinner className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}Generate PDF</button>
            <button className="btn-secondary" onClick={() => run('csv')} disabled={Boolean(busy) || !valid}>{busy === 'csv' ? <Spinner className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}Export CSV</button>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold">What this report covers</h3>
          {!valid ? <p className="text-sm text-ink-500">Choose a valid period to preview the totals.</p> : (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Income" value={totals && money(totals.income)} icon={ArrowDownCircle} loading={loading || !totals} />
              <StatCard label="Expenses" value={totals && money(totals.expense)} icon={ArrowUpCircle} tone="amber" loading={loading || !totals} />
              <StatCard label="Savings" value={totals && money(totals.savings)} icon={PiggyBank} tone={totals?.savings < 0 ? 'rose' : 'brand'} loading={loading || !totals} />
            </div>)}
          {totals && totals.count === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">No transactions were recorded for this period, so the report will be mostly empty.</p>}
          <p className="text-sm text-ink-500">PDF reports include your summary, category breakdown, charts, budget summary and the latest transactions. CSV exports include every transaction in the selected period.</p>
        </div>
      </div>
    </>
  );
}
