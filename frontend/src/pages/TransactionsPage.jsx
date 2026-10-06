import { useEffect, useRef, useState } from 'react';
import { Plus, Search, SlidersHorizontal, Download, Upload, ScanLine, Eye, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Paperclip, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { endpoints, downloadBlob } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EXPENSE_CATEGORIES, INCOME_SOURCES, PAYMENT_METHODS } from '../utils/constants.js';
import { PageHeader, Modal, ConfirmDialog, EmptyState, Pagination, Select, Skeleton } from '../components/ui.jsx';
import TransactionForm from '../components/TransactionForm.jsx';
import ImportCsvModal from '../components/ImportCsvModal.jsx';
import ReceiptScanModal from '../components/ReceiptScanModal.jsx';
import { ReceiptViewer, useReceiptDownload } from '../components/ReceiptField.jsx';

const CONFIG = {
  all: { title: 'Transactions', subtitle: 'Every income and expense in one place.', path: '/transactions', empty: 'No transactions found.' },
  expense: { title: 'Expenses', subtitle: 'Track and categorise what you spend.', path: '/expenses', empty: 'No expenses found.' },
  income: { title: 'Income', subtitle: 'Your income history.', path: '/income', empty: 'No income found.' },
};
const SORTS = [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'highest', label: 'Highest amount' }, { value: 'lowest', label: 'Lowest amount' }];
const INITIAL = { search: '', type: '', category: '', paymentMethod: '', from: '', to: '', minAmount: '', maxAmount: '', tags: '', sort: 'newest' };

function ExportMenu({ kind, filters }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const c = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', c); return () => document.removeEventListener('mousedown', c); }, []);

  const run = async (scope) => {
    const now = new Date(); const y = now.getUTCFullYear(); const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const base = kind === 'all' ? {} : { type: kind };
    const params = { all: base, filtered: { ...filters, ...base }, month: { ...base, from: `${y}-${m}-01`, to: new Date(Date.UTC(y, now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10) }, year: { ...base, from: `${y}-01-01`, to: `${y}-12-31` } }[scope];
    setOpen(false); setBusy(true);
    try { downloadBlob(await endpoints.files.blob('/files/export-csv', { ...params, sort: 'newest' }), 'expenses.csv'); toast.success('Export ready: expenses.csv'); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="relative" ref={ref}>
      <button className="btn-secondary" onClick={() => setOpen((o) => !o)} disabled={busy} aria-expanded={open}><Download className="h-4 w-4" />{busy ? 'Exporting…' : 'Export CSV'}<ChevronDown className="h-4 w-4" /></button>
      {open && <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-xl dark:border-ink-800 dark:bg-ink-900">
        {[['all', 'All transactions'], ['filtered', 'Current filtered results'], ['month', 'This month'], ['year', 'This year']].map(([k, l]) => <button key={k} className="block w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800" onClick={() => run(k)}>{l}</button>)}
      </div>}
    </div>
  );
}

function Detail({ item, onClose, onEdit, onDelete }) {
  const { money, date } = useAuth();
  const [viewing, setViewing] = useState(false);
  const download = useReceiptDownload();
  if (!item) return null;
  const rows = [['Amount', `${item.type === 'income' ? '+' : '-'}${money(item.amount)}`], ['Date', date(item.date)], [item.type === 'income' ? 'Source' : 'Category', item.category], ['Payment method', item.paymentMethod], ['Notes', item.notes || '–']];
  return (
    <Modal open onClose={onClose} title={item.description}>
      <dl className="grid grid-cols-3 gap-y-3 text-sm">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-500">{k}</dt><dd className="col-span-2 font-semibold">{v}</dd></div>)}
        {item.tags?.length > 0 && <><dt className="text-ink-500">Tags</dt><dd className="col-span-2 flex flex-wrap gap-1.5">{item.tags.map((t) => <span key={t} className="badge bg-ink-100 dark:bg-ink-800">#{t}</span>)}</dd></>}
        {item.receipt && <><dt className="text-ink-500">Receipt</dt><dd className="col-span-2 flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{item.receipt.originalName}</span><button className="btn-secondary px-3 py-1.5" onClick={() => setViewing(true)}>Preview</button><button className="btn-secondary px-3 py-1.5" onClick={() => download(item.receipt)}>Download</button></dd></>}
      </dl>
      <div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" />Delete</button><button className="btn-primary" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" />Edit</button></div>
      <ReceiptViewer receipt={viewing ? item.receipt : null} onClose={() => setViewing(false)} />
    </Modal>
  );
}

export default function TransactionsPage({ kind }) {
  const cfg = CONFIG[kind];
  const { money, date } = useAuth();
  const [filters, setFilters] = useState(INITIAL);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // { type, item }
  const [detail, setDetail] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => { setFilters(INITIAL); setPage(1); setShowFilters(false); }, [kind]);
  const debounced = useDebounce(filters, 350);
  useEffect(() => setPage(1), [debounced]);

  const { data, loading, reload } = useFetch(() => endpoints.list(cfg.path, { ...debounced, page, limit: 10 }), [cfg.path, debounced, page]);
  const items = data?.data || []; const meta = data?.meta;
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const activeCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'search').length;
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : kind === 'income' ? INCOME_SOURCES : [...new Set([...EXPENSE_CATEGORIES, ...INCOME_SOURCES])];
  const showTags = kind === 'expense' || (kind === 'all' && filters.type !== 'income');

  const confirmDelete = async () => {
    setDeleting(true);
    try { const res = await endpoints.remove(`/${toDelete.type === 'income' ? 'income' : 'expenses'}/${toDelete._id}`); toast.success(res.message); setToDelete(null); setDetail(null); reload(); } catch (e) { toast.error(e.message); } finally { setDeleting(false); }
  };
  const openEdit = (item) => { setDetail(null); setForm({ type: item.type, item }); };
  const saved = () => { setForm(null); reload(); };

  const Actions = ({ t }) => (
    <div className="flex justify-end gap-1">
      <button className="btn-ghost p-2" onClick={() => setDetail(t)} aria-label="View details"><Eye className="h-4 w-4" /></button>
      <button className="btn-ghost p-2" onClick={() => openEdit(t)} aria-label="Edit"><Pencil className="h-4 w-4" /></button>
      <button className="btn-ghost p-2 hover:text-rose-600" onClick={() => setToDelete(t)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} actions={<>
        {kind !== 'income' && <button className="btn-secondary" onClick={() => setScanOpen(true)}><ScanLine className="h-4 w-4" />Scan receipt</button>}
        {kind === 'all' && <button className="btn-secondary" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import CSV</button>}
        <ExportMenu kind={kind} filters={filters} />
        {kind !== 'income' && <button className="btn-primary" onClick={() => setForm({ type: 'expense' })}><Plus className="h-4 w-4" />Add expense</button>}
        {kind !== 'expense' && <button className={kind === 'all' ? 'btn-secondary' : 'btn-primary'} onClick={() => setForm({ type: 'income' })}><Plus className="h-4 w-4" />Add income</button>}
      </>} />

      <div className="card mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[14rem] flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input className="input pl-10" placeholder="Search description, category or notes" value={filters.search} onChange={set('search')} aria-label="Search" /></div>
          <div className="w-44"><Select aria-label="Sort" options={SORTS} value={filters.sort} onChange={set('sort')} /></div>
          <button className="btn-secondary" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}><SlidersHorizontal className="h-4 w-4" />Filters{activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-xs text-white">{activeCount}</span>}</button>
        </div>
        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-ink-100 pt-4 dark:border-ink-800 sm:grid-cols-2 lg:grid-cols-4">
            {kind === 'all' && <Select aria-label="Type" placeholder="All types" options={[{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]} value={filters.type} onChange={set('type')} />}
            <Select aria-label="Category" placeholder={kind === 'income' ? 'All sources' : 'All categories'} options={categories} value={filters.category} onChange={set('category')} />
            <Select aria-label="Payment method" placeholder="All payment methods" options={PAYMENT_METHODS} value={filters.paymentMethod} onChange={set('paymentMethod')} />
            <input type="date" className="input" aria-label="From date" value={filters.from} onChange={set('from')} />
            <input type="date" className="input" aria-label="To date" value={filters.to} onChange={set('to')} />
            <input type="number" min="0" className="input" placeholder="Min amount" aria-label="Minimum amount" value={filters.minAmount} onChange={set('minAmount')} />
            <input type="number" min="0" className="input" placeholder="Max amount" aria-label="Maximum amount" value={filters.maxAmount} onChange={set('maxAmount')} />
            {showTags && <input className="input" placeholder="Tags (comma separated)" aria-label="Tags" value={filters.tags} onChange={set('tags')} />}
            <button className="btn-ghost justify-start text-rose-600" onClick={() => setFilters({ ...INITIAL, sort: filters.sort, search: filters.search })}><X className="h-4 w-4" />Clear filters</button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        {loading && !data ? <div className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : items.length === 0 ? <EmptyState title={cfg.empty} message={activeCount || filters.search ? 'Try changing or clearing your search and filters.' : 'Add your first entry to start tracking.'} action={!activeCount && !filters.search && <button className="btn-primary" onClick={() => setForm({ type: kind === 'income' ? 'income' : 'expense' })}><Plus className="h-4 w-4" />Add {kind === 'income' ? 'income' : 'expense'}</button>} />
          : <>
            <div className={`hidden overflow-x-auto md:block ${loading ? 'opacity-60' : ''}`}>
              <table className="w-full"><thead className="border-b border-ink-100 dark:border-ink-800"><tr><th className="th">Date</th><th className="th">Description</th><th className="th">Category</th><th className="th">Payment</th><th className="th text-right">Amount</th><th className="th" /></tr></thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">{items.map((t) => (
                  <tr key={`${t.type}-${t._id}`} className="hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                    <td className="td whitespace-nowrap text-ink-500">{date(t.date)}</td>
                    <td className="td"><button className="text-left font-semibold hover:text-brand-600" onClick={() => setDetail(t)}>{t.description}</button>{t.receipt && <Paperclip className="ml-2 inline h-3.5 w-3.5 text-ink-400" aria-label="Has receipt" />}{t.tags?.length > 0 && <div className="mt-1 flex gap-1">{t.tags.slice(0, 3).map((g) => <span key={g} className="badge bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">#{g}</span>)}</div>}</td>
                    <td className="td"><span className={`badge ${t.type === 'income' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>{t.category}</span></td>
                    <td className="td text-ink-500">{t.paymentMethod}</td>
                    <td className={`td whitespace-nowrap text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : ''}`}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</td>
                    <td className="td"><Actions t={t} /></td>
                  </tr>))}</tbody></table>
            </div>
            <ul className="divide-y divide-ink-100 dark:divide-ink-800 md:hidden">{items.map((t) => (
              <li key={`${t.type}-${t._id}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button className="flex min-w-0 items-start gap-3 text-left" onClick={() => setDetail(t)}>
                    <div className={`rounded-xl p-2 ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950' : 'bg-amber-50 text-amber-600 dark:bg-amber-950'}`}>{t.type === 'income' ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}</div>
                    <div className="min-w-0"><p className="truncate font-semibold">{t.description}</p><p className="text-xs text-ink-500">{t.category} · {t.paymentMethod} · {date(t.date)}</p></div>
                  </button>
                  <p className={`shrink-0 font-bold ${t.type === 'income' ? 'text-emerald-600' : ''}`}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</p>
                </div>
                <div className="mt-2"><Actions t={t} /></div>
              </li>))}</ul>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />
          </>}
      </div>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={`${form?.item ? 'Edit' : 'Add'} ${form?.type === 'income' ? 'income' : 'expense'}`}>
        {form && <TransactionForm key={form.item?._id || 'new'} type={form.type} initial={form.item} onSaved={saved} onCancel={() => setForm(null)} />}
      </Modal>
      <Detail item={detail} onClose={() => setDetail(null)} onEdit={openEdit} onDelete={setToDelete} />
      <ConfirmDialog open={Boolean(toDelete)} title={`Delete ${toDelete?.type === 'income' ? 'income' : 'expense'}?`} message={`"${toDelete?.description}" will be permanently removed${toDelete?.receipt ? ' along with its receipt' : ''}. This cannot be undone.`} busy={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} onImported={reload} />
      <ReceiptScanModal open={scanOpen} onClose={() => setScanOpen(false)} onSaved={reload} />
    </>
  );
}
