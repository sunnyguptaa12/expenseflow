import { useState } from 'react';
import { Plus, Pencil, Trash2, Repeat, Pause, Play } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch.js';
import { endpoints } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EXPENSE_CATEGORIES, INCOME_SOURCES, FREQUENCIES, PAYMENT_METHODS } from '../utils/constants.js';
import { toInputDate } from '../utils/format.js';
import { PageHeader, Modal, ConfirmDialog, EmptyState, Field, Select, Spinner, Skeleton } from '../components/ui.jsx';

function RecurringForm({ initial, onSaved, onCancel }) {
  const [type, setType] = useState(initial?.type || 'expense');
  const [category, setCategory] = useState(initial?.category || 'Bills');
  const [frequency, setFrequency] = useState(initial?.frequency || 'Monthly');
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || 'Bank Transfer');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { amount: initial?.amount || '', description: initial?.description || '', startDate: toInputDate(initial?.startDate || new Date()), endDate: initial?.endDate ? toInputDate(initial.endDate) : '' },
  });
  const onSubmit = async (v) => {
    const body = { ...v, type, category, frequency, paymentMethod, amount: Number(v.amount), endDate: v.endDate || null, isActive: initial?.isActive ?? true };
    try { const res = initial ? await endpoints.update(`/recurring/${initial._id}`, body) : await endpoints.create('/recurring', body); toast.success(res.message); onSaved(); } catch (e) { toast.error(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field label="Type"><Select options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} value={type} onChange={(e) => { const nextType = e.target.value; setType(nextType); setCategory(nextType === 'income' ? 'Salary' : 'Bills'); }} /></Field>
      <Field label="Description" error={errors.description?.message}><input className="input" placeholder="e.g. Netflix subscription" {...register('description', { required: 'Description is required.' })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" error={errors.amount?.message}><input type="number" step="0.01" className="input" {...register('amount', { required: 'Amount is required.', validate: (v) => Number(v) > 0 || 'Amount must be greater than zero.' })} /></Field>
        <Field label={type === 'income' ? 'Source' : 'Category'}><Select options={type === 'income' ? INCOME_SOURCES : EXPENSE_CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
        <Field label="Frequency"><Select options={FREQUENCIES} value={frequency} onChange={(e) => setFrequency(e.target.value)} /></Field>
        <Field label="Payment method"><Select options={PAYMENT_METHODS} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} /></Field>
        <Field label="Start date" error={errors.startDate?.message}><input type="date" className="input" {...register('startDate', { required: 'Start date is required.' })} /></Field>
        <Field label="End date (optional)" error={errors.endDate?.message}><input type="date" className="input" {...register('endDate', { validate: (v) => !v || v >= watch('startDate') || 'End date must be after the start date.' })} /></Field>
      </div>
      <div className="flex justify-end gap-3 pt-2"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}{initial ? 'Save changes' : 'Save recurring payment'}</button></div>
    </form>
  );
}

export default function Recurring() {
  const { money, date } = useAuth();
  const [form, setForm] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { data, loading, reload } = useFetch(() => endpoints.list('/recurring'), []);
  const items = data?.data || [];

  const toggle = async (r) => {
    try { await endpoints.update(`/recurring/${r._id}`, { ...r, endDate: r.endDate || null, isActive: !r.isActive }); toast.success(r.isActive ? 'Payment paused' : 'Payment resumed'); reload(); } catch (e) { toast.error(e.message); }
  };
  const remove = async () => {
    try { const res = await endpoints.remove(`/recurring/${toDelete._id}`); toast.success(res.message); setToDelete(null); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Recurring payments" subtitle="Subscriptions, rent, EMIs and bills are added automatically when they fall due." actions={<button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add recurring payment</button>} />
      {loading && !data ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        : items.length === 0 ? <div className="card"><EmptyState icon={Repeat} title="No recurring payments yet." message="Add rent, subscriptions or salary once and ExpenseFlow records them on schedule." action={<button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add recurring payment</button>} /></div>
        : <div className="grid gap-4 md:grid-cols-2">{items.map((r) => (
          <div key={r._id} className={`card ${r.isActive ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="truncate font-bold">{r.description}</h3><p className="mt-0.5 text-sm text-ink-500">{r.category} · {r.frequency} · {r.paymentMethod}</p></div>
              <p className={`shrink-0 text-lg font-extrabold ${r.type === 'income' ? 'text-emerald-600' : ''}`}>{r.type === 'income' ? '+' : ''}{money(r.amount)}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-500">{r.isActive ? <>Next: <span className="font-semibold text-ink-800 dark:text-ink-100">{date(r.nextRunDate)}</span></> : <span className="badge bg-ink-100 dark:bg-ink-800">{r.endDate && r.nextRunDate > r.endDate ? 'Completed' : 'Paused'}</span>}</p>
              <div className="flex gap-1">
                <button className="btn-ghost p-2" onClick={() => toggle(r)} aria-label={r.isActive ? 'Pause' : 'Resume'}>{r.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
                <button className="btn-ghost p-2" onClick={() => setForm(r)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                <button className="btn-ghost p-2 hover:text-rose-600" onClick={() => setToDelete(r)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>))}</div>}
      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?._id ? 'Edit recurring payment' : 'Add recurring payment'}>
        {form && <RecurringForm initial={form._id ? form : null} onSaved={() => { setForm(null); reload(); }} onCancel={() => setForm(null)} />}
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete recurring payment?" message={`"${toDelete?.description}" will stop being added automatically. Transactions already created are kept.`} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
