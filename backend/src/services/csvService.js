import { parse } from 'csv-parse/sync';
import { EXPENSE_CATEGORIES, INCOME_SOURCES, PAYMENT_METHODS } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';

const REQUIRED = ['date', 'description', 'category', 'amount', 'type'];
const MAX_ROWS = 5000;
const ci = (list, value) => list.find((item) => item.toLowerCase() === String(value).trim().toLowerCase());

function parseDate(raw) {
  const v = String(raw).trim();
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let y; let mo; let d;
  if (m) [, y, mo, d] = m;
  else if ((m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) [, d, mo, y] = m; // DD/MM/YYYY
  else return null;
  const date = new Date(Date.UTC(+y, +mo - 1, +d));
  return date.getUTCMonth() === +mo - 1 && date.getUTCDate() === +d ? date : null;
}

export function parseTransactionsCsv(buffer) {
  let records;
  try {
    records = parse(buffer, { columns: (h) => h.map((c) => String(c).trim().toLowerCase().replace(/\s+/g, '')), skip_empty_lines: true, trim: true, bom: true, relax_column_count: false });
  } catch {
    throw new ApiError(400, 'CSV format is invalid.');
  }
  if (!records.length) throw new ApiError(400, 'CSV file has no data rows.');
  if (records.length > MAX_ROWS) throw new ApiError(400, `CSV has too many rows. The limit is ${MAX_ROWS}.`);

  const headers = Object.keys(records[0]);
  const missing = REQUIRED.filter((h) => !headers.includes(h));
  if (missing.length) throw new ApiError(400, `CSV format is invalid. Missing column(s): ${missing.join(', ')}.`);

  const valid = []; const invalid = [];
  records.forEach((r, i) => {
    const rowNumber = i + 2; // header is row 1
    const errors = [];
    const date = parseDate(r.date);
    if (!date) errors.push('invalid date (use YYYY-MM-DD or DD/MM/YYYY)');
    const amount = Number(String(r.amount).replace(/[,₹$€£\s]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) errors.push('amount must be a positive number');
    const type = ci(['expense', 'income'], r.type);
    if (!type) errors.push('type must be expense or income');
    if (!r.description) errors.push('description is required');
    const category = type ? ci(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES, r.category) : null;
    if (type && !category) errors.push(`unknown ${type === 'expense' ? 'category' : 'source'} "${r.category}"`);
    let paymentMethod = 'Cash';
    if (r.paymentmethod) {
      paymentMethod = ci(PAYMENT_METHODS, r.paymentmethod);
      if (!paymentMethod) errors.push(`unknown payment method "${r.paymentmethod}"`);
    }
    if (errors.length) invalid.push({ row: rowNumber, data: r, reason: errors.join('; ') });
    else valid.push({ row: rowNumber, type, date, description: r.description.slice(0, 200), category, amount, paymentMethod, notes: (r.notes || '').slice(0, 1000) });
  });
  return { total: records.length, valid, invalid };
}

// Prefixing risky leading characters stops spreadsheet apps from executing cell contents as formulas.
const cell = (value) => {
  let s = value === undefined || value === null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function transactionsToCsv(rows) {
  const header = ['Date', 'Description', 'Category', 'Amount', 'Type', 'Payment Method', 'Notes'];
  const lines = rows.map((t) => [new Date(t.date).toISOString().slice(0, 10), t.description, t.category, t.amount.toFixed(2), t.type, t.paymentMethod, t.notes || ''].map(cell).join(','));
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`;
}
