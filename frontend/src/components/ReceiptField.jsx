import { useRef, useState } from 'react';
import { Paperclip, Eye, Download, Trash2, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { endpoints } from '../services/api.js';
import { useBlobUrl } from '../hooks/useBlobUrl.js';
import { Modal, Spinner } from './ui.jsx';

const MAX_MB = 5;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

export function validateReceiptFile(file) {
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) return 'Unsupported file type. Upload a PDF, JPG, PNG or WebP file.';
  if (file.size > MAX_MB * 1024 * 1024) return 'File size exceeds the allowed limit.';
  return null;
}

export function ReceiptViewer({ receipt, onClose }) {
  const { url, type, loading, error } = useBlobUrl(receipt ? `/files/receipts/${receipt.filename}` : null);
  return (
    <Modal open={Boolean(receipt)} onClose={onClose} title={receipt?.originalName || 'Receipt'} size="max-w-3xl">
      {loading && <div className="grid h-64 place-items-center text-brand-600"><Spinner className="h-8 w-8" /></div>}
      {error && <p className="py-10 text-center text-sm text-rose-600">Could not load this receipt.</p>}
      {url && (type === 'application/pdf'
        ? <iframe src={url} title="Receipt preview" className="h-[60vh] w-full rounded-xl border border-ink-100 dark:border-ink-800" />
        : <img src={url} alt="Receipt" className="mx-auto max-h-[60vh] rounded-xl" />)}
      {url && <div className="mt-4 flex justify-end"><a href={url} download={receipt.originalName} className="btn-primary"><Download className="h-4 w-4" />Download</a></div>}
    </Modal>
  );
}

export function useReceiptDownload() {
  return async (receipt) => {
    try {
      const blob = await endpoints.files.blob(`/files/receipts/${receipt.filename}`, { download: 1 });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: receipt.originalName }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { toast.error(e.message); }
  };
}

export default function ReceiptField({ value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const download = useReceiptDownload();

  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const problem = validateReceiptFile(file);
    if (problem) return toast.error(problem);
    setBusy(true);
    try { const res = await endpoints.files.upload(file); onChange(res.data); toast.success(value ? 'Receipt replaced' : 'Receipt uploaded'); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <label className="label">Receipt</label>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={pick} />
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
          <FileText className="h-5 w-5 text-brand-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{value.originalName}</span>
          <button type="button" className="btn-ghost" onClick={() => setPreview(true)} aria-label="Preview receipt"><Eye className="h-4 w-4" /></button>
          <button type="button" className="btn-ghost" onClick={() => download(value)} aria-label="Download receipt"><Download className="h-4 w-4" /></button>
          <button type="button" className="btn-ghost" onClick={() => inputRef.current.click()} disabled={busy} aria-label="Replace receipt">{busy ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}</button>
          <button type="button" className="btn-ghost hover:text-rose-600" onClick={() => onChange(null)} aria-label="Remove receipt"><Trash2 className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current.click()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 py-4 text-sm font-semibold text-ink-500 transition hover:border-brand-500 hover:text-brand-600 dark:border-ink-700">
          {busy ? <Spinner className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}Attach receipt (PDF, JPG, PNG, WebP up to {MAX_MB} MB)
        </button>
      )}
      <ReceiptViewer receipt={preview ? value : null} onClose={() => setPreview(false)} />
    </div>
  );
}
