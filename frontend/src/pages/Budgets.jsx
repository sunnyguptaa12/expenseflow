import { useState } from 'react';
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch.js';
import { endpoints } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { monthNow } from '../utils/format.js';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';
import { PageHeader, Modal, ConfirmDialog, EmptyState, ProgressBar, Field, Select, Spinner, Skeleton } from '../components/ui.jsx';

function BudgetForm({ month, initial, onSaved, onCancel }) {
  const [category, setCategory] = useState(initial?.category || 'Overall');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { amount: initial?.amount || '' } });
  const onSubmit = async (v) => {
    const body = { month, category, amount: Number(v.amount) };
    try { const res = initial ? await endpoints.update(`/budgets/${initial._id}`, body) : await endpoints.create('/budgets', body); toast.success(res.message); onSaved(); } catch (e) { toast.error(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Category" hint="'Overall' is your total monthly limit."><Select options={['Overall', ...EXPENSE_CATEGORIES]} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
      <Field label="Budget amount" error={errors.amount?.message}><input type="number" min="1" step="1" className="input" {...register('amount', { required: 'Budget amount is required.', validate: (v) => Number(v) >= 1 || 'Budget must be at least 1.' })} /></Field>
      <div className="flex justify-end gap-3 pt-2"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}{initial ? 'Save changes' : 'Create budget'}</button></div>
    </form>
  );
}

export default function Budgets() {
  const { money } = useAuth();
  const [month, setMonth] = useState(monthNow());
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { data, loading, reload } = useFetch(() => endpoints.list('/budgets', { month }), [month]);
  const b = data?.data;

  const remove = async () => {
    try { const res = await endpoints.remove(`/budgets/${toDelete._id}`); toast.success(res.message); setToDelete(null); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Budgets" subtitle="Set monthly limits and stay on track." actions={<>
        <input type="month" className="input w-44" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Budget month" />
        <button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Create budget</button>
      </>} />
      {loading && !b ? <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        : !b?.items.length ? <div className="card"><EmptyState icon={PiggyBank} title="No budgets set for this month." message="Create an overall budget or set limits for individual categories like Food or Transport." action={<button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Create budget</button>} /></div>
        : <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            {[['Total budget', money(b.totalBudget)], ['Spent', money(b.totalSpent)], ['Remaining', money(b.remaining)]].map(([l, v]) => <div key={l} className="card"><p className="text-sm text-ink-500">{l}</p><p className={`mt-1 text-2xl font-extrabold ${l === 'Remaining' && b.remaining < 0 ? 'text-rose-600' : ''}`}>{v}</p></div>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">{b.items.map((i) => (
            <div key={i._id} className="card">
              <div className="mb-4 flex items-start justify-between"><div><h3 className="font-bold">{i.category === 'Overall' ? 'Overall monthly budget' : i.category}</h3><p className="text-xs text-ink-500">{Math.round(i.percent)}% used</p></div>
                <div className="flex gap-1"><button className="btn-ghost p-2" onClick={() => setForm(i)} aria-label={`Edit ${i.category} budget`}><Pencil className="h-4 w-4" /></button><button className="btn-ghost p-2 hover:text-rose-600" onClick={() => setToDelete(i)} aria-label={`Delete ${i.category} budget`}><Trash2 className="h-4 w-4" /></button></div></div>
              <dl className="mb-3 grid grid-cols-3 text-sm"><div><dt className="text-ink-500">Budget</dt><dd className="font-bold">{money(i.amount)}</dd></div><div><dt className="text-ink-500">Spent</dt><dd className="font-bold">{money(i.spent)}</dd></div><div><dt className="text-ink-500">Remaining</dt><dd className={`font-bold ${i.remaining < 0 ? 'text-rose-600' : ''}`}>{money(i.remaining)}</dd></div></dl>
              <ProgressBar percent={i.percent} status={i.status} />
              {i.status === 'warning' && <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />You've used {Math.round(i.percent)}% of this budget.</p>}
              {i.status === 'exceeded' && <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"><AlertOctagon className="h-4 w-4" />Over budget by {money(Math.abs(i.remaining))}.</p>}
            </div>))}</div>
        </>}
      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?._id ? 'Edit budget' : 'Create budget'} size="max-w-md">
        {form && <BudgetForm month={month} initial={form._id ? form : null} onSaved={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />}
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete budget?" message={`The ${toDelete?.category} budget for this month will be removed. Your transactions are not affected.`} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
