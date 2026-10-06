import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { endpoints } from '../services/api.js';
import { EXPENSE_CATEGORIES, INCOME_SOURCES, PAYMENT_METHODS } from '../utils/constants.js';
import { toInputDate } from '../utils/format.js';
import { Field, Select, Spinner } from './ui.jsx';
import ReceiptField from './ReceiptField.jsx';

export default function TransactionForm({ type, initial, onSaved, onCancel }) {
  const isExpense = type === 'expense';
  const editing = Boolean(initial?._id);
  const [receipt, setReceipt] = useState(initial?.receipt || null);
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || 'UPI');
  const [categoryValue, setCategoryValue] = useState((isExpense ? initial?.category : initial?.source) || (isExpense ? 'Food' : 'Salary'));
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      amount: initial?.amount ?? '', description: initial?.description ?? '', date: toInputDate(initial?.date || new Date()),
      notes: initial?.notes || '', tags: (initial?.tags || []).join(', '),
    },
  });

  const onSubmit = async (v) => {
    const body = { amount: Number(v.amount), description: v.description, date: v.date, paymentMethod, notes: v.notes };
    if (isExpense) Object.assign(body, { category: categoryValue, tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean), receipt });
    else body.source = categoryValue;
    const path = isExpense ? '/expenses' : '/income';
    try {
      const res = editing ? await endpoints.update(`${path}/${initial._id}`, body) : await endpoints.create(path, body);
      toast.success(res.message);
      onSaved(res.data);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" error={errors.amount?.message}><input type="number" step="0.01" min="0" inputMode="decimal" className="input" placeholder="0.00" {...register('amount', { required: 'Amount is required.', validate: (v) => Number(v) > 0 || 'Amount must be greater than zero.' })} /></Field>
        <Field label="Date" error={errors.date?.message}><input type="date" className="input" {...register('date', { required: 'Date is required.' })} /></Field>
      </div>
      <Field label="Description" error={errors.description?.message}><input className="input" maxLength={200} placeholder={isExpense ? 'e.g. Dinner at Barbeque Nation' : 'e.g. September salary'} {...register('description', { required: 'Description is required.', validate: (v) => v.trim().length > 0 || 'Description is required.' })} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={isExpense ? 'Category' : 'Source'}><Select options={isExpense ? EXPENSE_CATEGORIES : INCOME_SOURCES} value={categoryValue} onChange={(e) => setCategoryValue(e.target.value)} /></Field>
        <Field label="Payment method"><Select options={PAYMENT_METHODS} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} /></Field>
      </div>
      {isExpense && <Field label="Tags" hint="Separate tags with commas, e.g. work, reimbursable"><input className="input" {...register('tags')} /></Field>}
      <Field label="Notes" error={errors.notes?.message}><textarea rows={2} className="input" maxLength={1000} {...register('notes')} /></Field>
      {isExpense && <ReceiptField value={receipt} onChange={setReceipt} />}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="h-4 w-4" />}{editing ? 'Save changes' : isExpense ? 'Add expense' : 'Add income'}</button>
      </div>
    </form>
  );
}
