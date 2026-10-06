import { Expense } from '../models/Expense.js';
import { Income } from '../models/Income.js';
import { Budget } from '../models/Budget.js';
import { fetchAllTransactions } from './transactionService.js';
import { getBudgetsWithSpent } from './budgetService.js';
import { addMonths, startOfMonth, endOfMonth, monthKey, pctChange, round2 } from '../utils/helpers.js';

const dateMatch = (userId, from, to) => ({ userId, date: { $gte: from, $lte: to } });

async function sum(Model, userId, from, to) {
  const [r] = await Model.aggregate([{ $match: dateMatch(userId, from, to) }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
  return { total: r?.total || 0, count: r?.count || 0 };
}

export async function totals(userId, from, to) {
  const [income, expense] = await Promise.all([sum(Income, userId, from, to), sum(Expense, userId, from, to)]);
  return { income: round2(income.total), expense: round2(expense.total), savings: round2(income.total - expense.total), count: income.count + expense.count };
}

export async function categoryBreakdown(userId, from, to, kind = 'expense') {
  const Model = kind === 'income' ? Income : Expense;
  const field = kind === 'income' ? '$source' : '$category';
  const rows = await Model.aggregate([
    { $match: dateMatch(userId, from, to) },
    { $group: { _id: field, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  const grand = rows.reduce((s, r) => s + r.total, 0);
  return rows.map((r) => ({ category: r._id, total: round2(r.total), count: r.count, percent: grand ? round2((r.total / grand) * 100) : 0 }));
}

export async function paymentMethodBreakdown(userId, from, to) {
  const rows = await Expense.aggregate([{ $match: dateMatch(userId, from, to) }, { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]);
  return rows.map((r) => ({ method: r._id, total: round2(r.total), count: r.count }));
}

function bucketKeys(from, to, granularity) {
  const keys = [];
  if (granularity === 'day') {
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) keys.push(d.toISOString().slice(0, 10));
  } else {
    for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) keys.push(monthKey(d));
  }
  return keys;
}

export async function timeSeries(userId, from, to, granularity = 'auto') {
  const days = (to - from) / 86400000;
  const mode = granularity === 'auto' ? (days <= 62 ? 'day' : 'month') : granularity;
  const format = mode === 'day' ? '%Y-%m-%d' : '%Y-%m';
  const group = (Model) => Model.aggregate([{ $match: dateMatch(userId, from, to) }, { $group: { _id: { $dateToString: { format, date: '$date' } }, total: { $sum: '$amount' } } }]);
  const [inc, exp] = await Promise.all([group(Income), group(Expense)]);
  const incMap = new Map(inc.map((r) => [r._id, r.total]));
  const expMap = new Map(exp.map((r) => [r._id, r.total]));
  const series = bucketKeys(from, to, mode).map((key) => {
    const income = round2(incMap.get(key) || 0); const expense = round2(expMap.get(key) || 0);
    return { period: key, income, expense, savings: round2(income - expense) };
  });
  return { granularity: mode, series };
}

export async function spendingTrend(userId, now = new Date()) {
  const thisMonth = startOfMonth(now);
  const months = [-3, -2, -1].map((n) => addMonths(thisMonth, n));
  const values = await Promise.all(months.map((m) => sum(Expense, userId, m, endOfMonth(m)).then((r) => ({ month: monthKey(m), total: round2(r.total) }))));
  const first = values[0].total; const last = values[2].total;
  const change = pctChange(last, first);
  let direction = 'stable';
  if (change !== null && change > 10) direction = 'increasing';
  else if (change !== null && change < -10) direction = 'decreasing';
  else if (change === null && last > 0) direction = 'increasing';
  return { direction, changePercent: change === null ? null : round2(change), months: values };
}

export async function summary(userId, range, now = new Date()) {
  const month = { from: startOfMonth(now), to: endOfMonth(now) };
  const forever = { from: new Date(0), to: new Date('2999-12-31') };
  const [period, thisMonth, allTime, budget, recent] = await Promise.all([
    totals(userId, range.from, range.to),
    totals(userId, month.from, month.to),
    totals(userId, forever.from, forever.to),
    getBudgetsWithSpent(userId, monthKey(now)),
    fetchAllTransactions(userId, { type: 'all', sort: 'newest' }, 6),
  ]);
  return {
    range,
    balance: allTime.savings,
    period,
    month: { income: thisMonth.income, expense: thisMonth.expense },
    budget: { monthlyBudget: budget.totalBudget, spent: budget.totalSpent, remaining: budget.remaining, percent: budget.percent },
    recent,
  };
}

export async function insights(userId, now = new Date()) {
  const cur = { from: startOfMonth(now), to: endOfMonth(now) };
  const prevStart = addMonths(cur.from, -1);
  const prev = { from: prevStart, to: endOfMonth(prevStart) };
  const [curTotals, prevTotals, curCats, prevCats, budget] = await Promise.all([
    totals(userId, cur.from, cur.to), totals(userId, prev.from, prev.to),
    categoryBreakdown(userId, cur.from, cur.to), categoryBreakdown(userId, prev.from, prev.to),
    getBudgetsWithSpent(userId, monthKey(now)),
  ]);
  const list = [];

  if (curCats[0]) list.push({ type: 'info', text: `You spent the most on ${curCats[0].category} this month (${curCats[0].percent}% of your expenses).` });

  const changes = curCats.map((c) => ({ category: c.category, change: pctChange(c.total, prevCats.find((p) => p.category === c.category)?.total || 0) })).filter((c) => c.change !== null);
  const up = changes.filter((c) => c.change >= 10).sort((a, b) => b.change - a.change)[0];
  const down = changes.filter((c) => c.change <= -10).sort((a, b) => a.change - b.change)[0];
  if (up) list.push({ type: 'warning', text: `Your ${up.category.toLowerCase()} expenses increased by ${Math.round(up.change)}% compared to last month.` });
  if (down) list.push({ type: 'positive', text: `Your ${down.category.toLowerCase()} expenses dropped by ${Math.abs(Math.round(down.change))}% compared to last month.` });

  const expenseChange = pctChange(curTotals.expense, prevTotals.expense);
  if (expenseChange !== null && !up && !down) list.push({ type: expenseChange > 0 ? 'warning' : 'positive', text: `Your total spending is ${Math.abs(Math.round(expenseChange))}% ${expenseChange > 0 ? 'higher' : 'lower'} than last month.` });

  if (budget.totalBudget) {
    const p = Math.round(budget.percent);
    list.push({ type: p >= 100 ? 'warning' : p >= 80 ? 'warning' : 'info', text: p >= 100 ? `You have exceeded your monthly budget (${p}% used).` : `You are currently using ${p}% of your monthly budget.` });
  }
  const savingsChange = prevTotals.savings > 0 ? pctChange(curTotals.savings, prevTotals.savings) : null;
  if (savingsChange !== null) list.push({ type: savingsChange >= 0 ? 'positive' : 'warning', text: `Your savings ${savingsChange >= 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(savingsChange))}% compared to last month.` });
  if (curTotals.income > 0 && curTotals.savings < 0) list.push({ type: 'warning', text: 'You have spent more than you earned this month.' });
  return list;
}

export async function hasBudget(userId, month) {
  return Boolean(await Budget.exists({ userId, month }));
}
