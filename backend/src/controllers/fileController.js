import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { Expense } from '../models/Expense.js';
import { Income } from '../models/Income.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { resolveRange, monthKey } from '../utils/helpers.js';
import { userDir, hasValidSignature } from '../middleware/upload.js';
import { parseTransactionsCsv, transactionsToCsv } from '../services/csvService.js';
import { parseReceiptText } from '../services/receiptParser.js';
import { parseFilters, fetchAllTransactions } from '../services/transactionService.js';
import { buildReport, REPORT_TYPES } from '../services/pdfService.js';
import { checkBudgetAlerts } from '../services/notificationService.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // direct path avoids the package's debug entrypoint
const FILENAME_RX = /^[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/i;
const MIME_BY_EXT = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const discard = (file) => file && fs.promises.unlink(file.path).catch(() => {});
const receiptMeta = (file) => ({ filename: file.filename, originalName: file.originalname.slice(0, 255), mimeType: file.mimetype, size: file.size });

async function acceptUpload(req) {
  if (!req.file) throw new ApiError(400, 'Please choose a file to upload.');
  if (!hasValidSignature(req.file.path, req.file.mimetype)) {
    await discard(req.file);
    throw new ApiError(415, 'The file contents do not match its type.');
  }
  return receiptMeta(req.file);
}

export const uploadReceipt = asyncHandler(async (req, res) => sendSuccess(res, await acceptUpload(req), 'Receipt uploaded.', 201));

export const extractPdf = asyncHandler(async (req, res) => {
  const file = await acceptUpload(req);
  if (file.mimeType !== 'application/pdf') {
    return sendSuccess(res, { file, extracted: null }, 'Automatic extraction works for PDF receipts. Please enter the details manually.', 201);
  }
  let extracted = null;
  try {
    const { text } = await pdfParse(await fs.promises.readFile(path.join(userDir(req.user._id), file.filename)));
    extracted = parseReceiptText(text || '');
  } catch {
    extracted = null;
  }
  const message = extracted ? 'Receipt read. Please review the details before saving.' : 'We could not read this PDF. Please enter the details manually.';
  sendSuccess(res, { file, extracted }, message, 201);
});

export const getReceipt = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  if (!FILENAME_RX.test(filename)) throw new ApiError(400, 'Invalid file name.');
  const file = path.join(userDir(req.user._id), filename); // scoped to the caller's own folder
  if (!fs.existsSync(file)) throw new ApiError(404, 'File not found.');
  const asDownload = req.query.download === '1';
  res.setHeader('Content-Type', MIME_BY_EXT[path.extname(filename).toLowerCase()]);
  res.setHeader('Content-Disposition', `${asDownload ? 'attachment' : 'inline'}; filename="${req.query.name ? path.basename(String(req.query.name)).replace(/["\r\n]/g, '') : filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(file).pipe(res);
});

export const deleteReceipt = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  if (!FILENAME_RX.test(filename)) throw new ApiError(400, 'Invalid file name.');
  await Expense.updateMany({ userId: req.user._id, 'receipt.filename': filename }, { $set: { receipt: null } });
  await fs.promises.unlink(path.join(userDir(req.user._id), filename)).catch(() => {});
  sendSuccess(res, null, 'Receipt deleted.');
});

export const importCsv = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please choose a CSV file.');
  const { total, valid, invalid } = parseTransactionsCsv(req.file.buffer);

  if (req.body.confirm !== 'true') {
    return sendSuccess(res, { total, validCount: valid.length, invalidCount: invalid.length, preview: valid.slice(0, 20), invalid: invalid.slice(0, 100) }, 'CSV validated. Review the preview and confirm to import.');
  }

  const userId = req.user._id;
  const expenses = valid.filter((r) => r.type === 'expense').map((r) => ({ userId, amount: r.amount, category: r.category, description: r.description, date: r.date, paymentMethod: r.paymentMethod, notes: r.notes, tags: ['imported'] }));
  const incomes = valid.filter((r) => r.type === 'income').map((r) => ({ userId, amount: r.amount, source: r.category, description: r.description, date: r.date, paymentMethod: r.paymentMethod, notes: r.notes }));
  if (expenses.length) await Expense.insertMany(expenses);
  if (incomes.length) await Income.insertMany(incomes);

  const touched = new Map();
  expenses.forEach((e) => { const m = monthKey(e.date); touched.set(m, [...(touched.get(m) || []), e.category]); });
  for (const [month, cats] of touched) await checkBudgetAlerts(req.user, month, [...new Set(cats)]);

  sendSuccess(res, { total, imported: valid.length, failed: invalid.length, invalid: invalid.slice(0, 100) }, `Imported ${valid.length} of ${total} rows.`, 201);
});

export const exportCsv = asyncHandler(async (req, res) => {
  const rows = await fetchAllTransactions(req.user._id, parseFilters(req.query), 50000);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
  res.send(transactionsToCsv(rows));
});

export const reportPdf = asyncHandler(async (req, res) => {
  const type = REPORT_TYPES.includes(req.query.type) ? req.query.type : 'monthly';
  const range = resolveRange({ range: 'custom', from: req.query.from, to: req.query.to });
  if (!range) throw new ApiError(400, 'Please choose a valid start and end date.');
  if (range.from > range.to) throw new ApiError(400, 'Start date must be before the end date.');
  if ((range.to - range.from) / 86400000 > 3660) throw new ApiError(400, 'Report period cannot exceed 10 years.');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ExpenseFlow-${type}-report.pdf"`);
  await buildReport(req.user, { type, ...range }, res);
});
