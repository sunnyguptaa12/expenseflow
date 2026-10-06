import { useRef, useState } from 'react';
import { ScanLine, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { endpoints } from '../services/api.js';
import { Modal, Spinner } from './ui.jsx';
import TransactionForm from './TransactionForm.jsx';
import { validateReceiptFile } from './ReceiptField.jsx';

export default function ReceiptScanModal({ open, onClose, onSaved }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(null);

  const close = () => { setScan(null); onClose(); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const problem = validateReceiptFile(file);
    if (problem) return toast.error(problem);
    setBusy(true);
    try { const res = await endpoints.files.extract(file); setScan({ ...res.data, message: res.message }); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const ex = scan?.extracted;
  const initial = scan && { description: ex?.merchant || '', amount: ex?.amount ?? '', date: ex?.date || undefined, category: ex?.category || 'Other', paymentMethod: ex?.paymentMethod || 'UPI', receipt: scan.file };

  return (
    <Modal open={open} onClose={close} title="Scan a receipt" size="max-w-xl">
      {!scan ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-ink-300">Upload a PDF receipt or invoice. ExpenseFlow reads the merchant, amount, date and category, and you review everything before it is saved. Images (JPG, PNG, WebP) can be attached, but their details must be entered manually.</p>
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFile} />
          <button onClick={() => inputRef.current.click()} disabled={busy} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-10 font-semibold text-ink-500 hover:border-brand-500 hover:text-brand-600 dark:border-ink-700">
            {busy ? <Spinner className="h-7 w-7" /> : <ScanLine className="h-7 w-7" />}{busy ? 'Reading receipt…' : 'Choose a receipt'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`flex gap-3 rounded-xl p-3 text-sm ${ex ? 'bg-brand-50 text-brand-900 dark:bg-brand-900/20 dark:text-brand-100' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'}`}>
            <Info className="mt-0.5 h-4 w-4 shrink-0" /><p>{scan.message}{ex && ex.confidence !== 'high' && ' Some fields could not be found, so please complete them.'}</p>
          </div>
          <TransactionForm type="expense" initial={initial} onSaved={(d) => { onSaved(d); close(); }} onCancel={close} />
        </div>
      )}
    </Modal>
  );
}
