import PDFDocument from 'pdfkit';
import { totals, categoryBreakdown, timeSeries, paymentMethodBreakdown } from './analyticsService.js';
import { fetchAllTransactions } from './transactionService.js';
import { getBudgetsWithSpent } from './budgetService.js';
import { monthLabel, addMonths, startOfMonth, monthKey } from '../utils/helpers.js';

const C = { brand: '#0f766e', brandSoft: '#ccfbf1', ink: '#0f172a', muted: '#64748b', line: '#e2e8f0', head: '#f1f5f9', amber: '#d97706', red: '#dc2626' };
const SYMBOLS = { INR: 'Rs. ', USD: '$', EUR: '€', GBP: '£', AED: 'AED ', AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥' };
const TITLES = { monthly: 'Monthly Financial Report', yearly: 'Yearly Financial Report', income: 'Income Report', expense: 'Expense Report', budget: 'Budget Report', complete: 'Complete Financial Report' };
export const REPORT_TYPES = Object.keys(TITLES);

const money = (n, cur) => `${n < 0 ? '-' : ''}${SYMBOLS[cur] || ''}${Math.abs(n).toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d) => new Date(d).toISOString().slice(0, 10);
const LEFT = 50; const WIDTH = 495;

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - 70) doc.addPage();
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 60);
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).fillColor(C.ink).text(text, LEFT, doc.y);
  doc.moveTo(LEFT, doc.y + 3).lineTo(LEFT + WIDTH, doc.y + 3).strokeColor(C.brand).lineWidth(1.5).stroke();
  doc.moveDown(0.8);
}

function statBoxes(doc, items, cur) {
  const gap = 10; const w = (WIDTH - gap * (items.length - 1)) / items.length; const y = doc.y;
  items.forEach((item, i) => {
    const x = LEFT + i * (w + gap);
    doc.roundedRect(x, y, w, 54, 6).fillColor(C.head).fill();
    doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(item.label, x + 10, y + 10, { width: w - 20 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor(item.color || C.ink).text(money(item.value, cur), x + 10, y + 26, { width: w - 20 });
  });
  doc.y = y + 66;
}

function table(doc, columns, rows) {
  const drawHead = () => {
    const y = doc.y;
    doc.rect(LEFT, y, WIDTH, 20).fillColor(C.head).fill();
    let x = LEFT;
    columns.forEach((c) => { doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted).text(c.label, x + 6, y + 6, { width: c.width - 12, align: c.align || 'left', lineBreak: false }); x += c.width; });
    doc.y = y + 22;
  };
  ensureSpace(doc, 60);
  drawHead();
  rows.forEach((row) => {
    if (doc.y + 20 > doc.page.height - 70) { doc.addPage(); drawHead(); }
    const y = doc.y; let x = LEFT;
    columns.forEach((c) => {
      doc.font('Helvetica').fontSize(8.5).fillColor(c.color?.(row) || C.ink).text(String(c.value(row)), x + 6, y + 4, { width: c.width - 12, align: c.align || 'left', height: 12, ellipsis: true, lineBreak: false });
      x += c.width;
    });
    doc.moveTo(LEFT, y + 18).lineTo(LEFT + WIDTH, y + 18).strokeColor(C.line).lineWidth(0.5).stroke();
    doc.y = y + 20;
  });
}

function barList(doc, items, cur, color) {
  const max = Math.max(...items.map((i) => i.total), 1);
  items.forEach((item) => {
    ensureSpace(doc, 22);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(C.ink).text(item.category, LEFT, y + 2, { width: 90, lineBreak: false });
    doc.roundedRect(LEFT + 95, y + 2, 230, 9, 3).fillColor(C.head).fill();
    doc.roundedRect(LEFT + 95, y + 2, Math.max(3, (item.total / max) * 230), 9, 3).fillColor(color).fill();
    doc.fillColor(C.ink).text(`${money(item.total, cur)}  (${item.percent}%)`, LEFT + 335, y + 2, { width: 160, align: 'right', lineBreak: false });
    doc.y = y + 20;
  });
}

function groupedBars(doc, series, showIncome, showExpense) {
  const data = series.slice(-12);
  const h = 110; const baseY = doc.y + h + 10; ensureSpace(doc, h + 50);
  const top = doc.y; const base = top + h;
  const max = Math.max(...data.flatMap((d) => [showIncome ? d.income : 0, showExpense ? d.expense : 0]), 1);
  const slot = WIDTH / data.length; const barW = Math.min(18, slot / 3);
  doc.moveTo(LEFT, base).lineTo(LEFT + WIDTH, base).strokeColor(C.line).stroke();
  data.forEach((d, i) => {
    const cx = LEFT + i * slot + slot / 2;
    if (showIncome) doc.rect(cx - barW - 1, base - (d.income / max) * h, barW, (d.income / max) * h).fillColor(C.brand).fill();
    if (showExpense) doc.rect(cx + 1, base - (d.expense / max) * h, barW, (d.expense / max) * h).fillColor(C.amber).fill();
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted).text(d.period.length > 7 ? d.period.slice(5) : d.period.slice(2), cx - slot / 2, base + 4, { width: slot, align: 'center', lineBreak: false });
  });
  doc.y = base + 22;
  const ly = doc.y;
  if (showIncome) { doc.rect(LEFT, ly, 8, 8).fillColor(C.brand).fill(); doc.fillColor(C.muted).fontSize(8).text('Income', LEFT + 12, ly, { lineBreak: false }); }
  if (showExpense) { doc.rect(LEFT + 70, ly, 8, 8).fillColor(C.amber).fill(); doc.fillColor(C.muted).fontSize(8).text('Expenses', LEFT + 82, ly, { lineBreak: false }); }
  doc.y = ly + 16;
}

function monthsInRange(from, to) {
  const out = [];
  for (let d = startOfMonth(from); d <= to && out.length < 12; d = addMonths(d, 1)) out.push(monthKey(d));
  return out;
}

export async function buildReport(user, { type, from, to }, res) {
  const userId = user._id; const cur = user.currency;
  const [tot, expenseCats, incomeSources, methods, ts] = await Promise.all([
    totals(userId, from, to), categoryBreakdown(userId, from, to, 'expense'), categoryBreakdown(userId, from, to, 'income'),
    paymentMethodBreakdown(userId, from, to), timeSeries(userId, from, to, 'auto'),
  ]);
  const txType = type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'all';
  const transactions = type === 'budget' ? [] : await fetchAllTransactions(userId, { type: txType, from, to, sort: 'newest' }, 40);
  const budgets = ['budget', 'monthly', 'yearly', 'complete'].includes(type) ? await Promise.all(monthsInRange(from, to).map(async (m) => ({ month: m, ...(await getBudgetsWithSpent(userId, m)) }))) : [];

  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: 50, right: 50 }, bufferPages: true, info: { Title: TITLES[type], Author: 'ExpenseFlow' } });
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, doc.page.width, 110).fillColor(C.brand).fill();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.brandSoft).text('ExpenseFlow', LEFT, 32);
  doc.fontSize(22).fillColor('#ffffff').text(TITLES[type], LEFT, 50);
  const sameMonth = monthKey(from) === monthKey(to);
  const period = type === 'monthly' && sameMonth ? monthLabel(monthKey(from)) : `${day(from)} to ${day(to)}`;
  doc.font('Helvetica').fontSize(11).fillColor(C.brandSoft).text(period, LEFT, 80);
  doc.y = 130;
  doc.font('Helvetica').fontSize(9.5).fillColor(C.muted).text(`Prepared for ${user.name} (${user.email})  |  Generated on ${day(new Date())}  |  Currency: ${cur}`, LEFT, doc.y);
  doc.y += 22;

  const boxes = type === 'income' ? [{ label: 'Total Income', value: tot.income, color: C.brand }]
    : type === 'expense' ? [{ label: 'Total Expenses', value: tot.expense, color: C.amber }]
    : [{ label: 'Total Income', value: tot.income, color: C.brand }, { label: 'Total Expenses', value: tot.expense, color: C.amber }, { label: 'Savings', value: tot.savings, color: tot.savings < 0 ? C.red : C.brand }];
  sectionTitle(doc, 'Summary');
  statBoxes(doc, boxes, cur);
  doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(`${tot.count} transaction${tot.count === 1 ? '' : 's'} in this period.`, LEFT, doc.y - 4);

  if (['monthly', 'yearly', 'complete', 'income', 'expense'].includes(type) && ts.series.length > 1) {
    sectionTitle(doc, type === 'income' ? 'Income Trend' : type === 'expense' ? 'Expense Trend' : 'Income vs Expenses');
    groupedBars(doc, ts.series, type !== 'expense', type !== 'income');
  }
  if (['monthly', 'yearly', 'complete', 'expense', 'budget'].includes(type)) {
    sectionTitle(doc, 'Category Breakdown');
    expenseCats.length ? barList(doc, expenseCats, cur, C.brand) : doc.font('Helvetica').fontSize(10).fillColor(C.muted).text('No expenses recorded for this period.', LEFT);
  }
  if (['income', 'complete'].includes(type)) {
    sectionTitle(doc, 'Income by Source');
    incomeSources.length ? barList(doc, incomeSources, cur, C.brand) : doc.font('Helvetica').fontSize(10).fillColor(C.muted).text('No income recorded for this period.', LEFT);
  }
  if (['expense', 'complete'].includes(type) && methods.length) {
    sectionTitle(doc, 'Payment Methods');
    barList(doc, methods.map((m) => ({ category: m.method, total: m.total, percent: tot.expense ? Math.round((m.total / tot.expense) * 100) : 0 })), cur, C.amber);
  }
  if (budgets.length) {
    sectionTitle(doc, 'Budget Summary');
    const rows = budgets.flatMap((b) => b.items.map((i) => ({ month: b.month, ...i })));
    if (!rows.length) doc.font('Helvetica').fontSize(10).fillColor(C.muted).text('No budgets were set for this period.', LEFT);
    else table(doc, [
      { label: 'Month', width: 70, value: (r) => r.month },
      { label: 'Category', width: 95, value: (r) => r.category },
      { label: 'Budget', width: 90, align: 'right', value: (r) => money(r.amount, cur) },
      { label: 'Spent', width: 90, align: 'right', value: (r) => money(r.spent, cur) },
      { label: 'Remaining', width: 90, align: 'right', value: (r) => money(r.remaining, cur) },
      { label: 'Used', width: 60, align: 'right', value: (r) => `${Math.round(r.percent)}%`, color: (r) => (r.status === 'exceeded' ? C.red : r.status === 'warning' ? C.amber : C.ink) },
    ], rows);
  }
  if (transactions.length) {
    sectionTitle(doc, tot.count > transactions.length ? `Transaction Summary (latest ${transactions.length} of ${tot.count})` : 'Transaction Summary');
    table(doc, [
      { label: 'Date', width: 65, value: (t) => day(t.date) },
      { label: 'Description', width: 170, value: (t) => t.description },
      { label: 'Category', width: 85, value: (t) => t.category },
      { label: 'Method', width: 75, value: (t) => t.paymentMethod },
      { label: 'Amount', width: 100, align: 'right', value: (t) => `${t.type === 'income' ? '+' : '-'}${money(t.amount, cur)}`, color: (t) => (t.type === 'income' ? C.brand : C.ink) },
    ], transactions);
  }

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(`ExpenseFlow  |  ${TITLES[type]}  |  Page ${i + 1} of ${pages.count}`, LEFT, doc.page.height - 36, { width: WIDTH, align: 'center', lineBreak: false });
  }
  doc.end();
  return `ExpenseFlow-${type}-report-${day(from)}-to-${day(to)}.pdf`;
}
