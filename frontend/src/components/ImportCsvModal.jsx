import { useRef, useState } from 'react';
import { Upload, CheckCircle2, XCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { endpoints, downloadBlob } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal, Spinner } from './ui.jsx';

const TEMPLATE = 'date,description,category,amount,type,paymentMethod\n2026-09-01,Monthly salary,Salary,60000,income,Bank Transfer\n2026-09-03,Swiggy dinner,Food,540,expense,UPI\n';

export default function ImportCsvModal({ open, onClose, onImported }) {
  const { money } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setFile(null); setPreview(null); setResult(null); };
  const close = () => { if (result) onImported(); reset(); onClose(); };

  const validate = async (f) => {
    setFile(f); setPreview(null); setBusy(true);
    try { setPreview((await endpoints.files.importCsv(f, false)).data); } catch (e) { toast.error(e.message); setFile(null); } finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try { const res = await endpoints.files.importCsv(file, true); setResult(res.data); toast.success(res.message); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={close} title="Import transactions from CSV" size="max-w-3xl">
      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Total rows', result.total], ['Imported', result.imported], ['Failed', result.failed]].map(([l, v]) => <div key={l} className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-800"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-ink-500">{l}</p></div>)}
          </div>
          {result.invalid.length > 0 && <InvalidRows rows={result.invalid} />}
          <div className="flex justify-end"><button className="btn-primary" onClick={close}>Done</button></div>
        </div>
      ) : !preview ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-ink-300">Upload a CSV with the columns <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs dark:bg-ink-800">date, description, category, amount, type, paymentMethod</code>. Type must be <em>expense</em> or <em>income</em>. You will see a preview before anything is saved.</p>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 2 * 1024 * 1024) return toast.error('File size exceeds the allowed limit.'); validate(f); }} />
          <button onClick={() => inputRef.current.click()} disabled={busy} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-10 font-semibold text-ink-500 hover:border-brand-500 hover:text-brand-600 dark:border-ink-700">
            {busy ? <Spinner className="h-7 w-7" /> : <Upload className="h-7 w-7" />}{busy ? 'Validating…' : 'Choose a CSV file'}
          </button>
          <button className="btn-ghost text-brand-600" onClick={() => downloadBlob(new Blob([TEMPLATE], { type: 'text/csv' }), 'expenseflow-template.csv')}><Download className="h-4 w-4" />Download template</button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['Total rows', preview.total, ''], ['Valid', preview.validCount, 'text-emerald-600'], ['Invalid', preview.invalidCount, preview.invalidCount ? 'text-rose-600' : '']].map(([l, v, c]) => <div key={l} className="rounded-2xl bg-ink-50 p-4 dark:bg-ink-800"><p className={`text-2xl font-extrabold ${c}`}>{v}</p><p className="text-xs text-ink-500">{l}</p></div>)}
          </div>
          {preview.preview.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Preview (first {preview.preview.length} valid rows)</h4>
              <div className="max-h-56 overflow-auto rounded-xl border border-ink-100 dark:border-ink-800">
                <table className="w-full text-sm"><thead className="bg-ink-50 dark:bg-ink-800"><tr><th className="th">Date</th><th className="th">Description</th><th className="th">Category</th><th className="th">Type</th><th className="th text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">{preview.preview.map((r) => <tr key={r.row}><td className="td">{r.date.slice(0, 10)}</td><td className="td">{r.description}</td><td className="td">{r.category}</td><td className="td capitalize">{r.type}</td><td className="td text-right font-semibold">{money(r.amount)}</td></tr>)}</tbody></table>
              </div>
            </div>
          )}
          {preview.invalid.length > 0 && <InvalidRows rows={preview.invalid} />}
          <div className="flex justify-between gap-3">
            <button className="btn-secondary" onClick={reset}>Choose another file</button>
            <button className="btn-primary" onClick={confirm} disabled={busy || !preview.validCount}>{busy && <Spinner className="h-4 w-4" />}Import {preview.validCount} valid row{preview.validCount === 1 ? '' : 's'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InvalidRows({ rows }) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><XCircle className="h-4 w-4 text-rose-600" />Rows that will be skipped</h4>
      <ul className="max-h-40 space-y-1 overflow-auto rounded-xl bg-rose-50 p-3 text-sm dark:bg-rose-950/40">{rows.map((r) => <li key={r.row}><span className="font-bold">Row {r.row}:</span> {r.reason}</li>)}</ul>
    </div>
  );
}
