import { Budget } from '../models/Budget.js';
import { Expense } from '../models/Expense.js';
import { round2 } from '../utils/helpers.js';

export const monthBounds = (month) => {
  const [y, m] = month.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)) };
};

export async function spentByCategory(userId, month) {
  const { from, to } = monthBounds(month);
  const rows = await Expense.aggregate([
    { $match: { userId, date: { $gte: from, $lte: to } } },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.spent]));
}

export function budgetStatus(percent) {
  if (percent >= 100) return 'exceeded';
  if (percent >= 80) return 'warning';
  return 'ok';
}

export async function getBudgetsWithSpent(userId, month) {
  const [budgets, spentMap] = await Promise.all([Budget.find({ userId, month }).sort({ category: 1 }).lean(), spentByCategory(userId, month)]);
  const totalSpent = Object.values(spentMap).reduce((a, b) => a + b, 0);
  const items = budgets.map((b) => {
    const spent = b.category === 'Overall' ? totalSpent : spentMap[b.category] || 0;
    const percent = round2((spent / b.amount) * 100);
    return { ...b, spent: round2(spent), remaining: round2(b.amount - spent), percent, status: budgetStatus(percent) };
  });
  const overall = items.find((b) => b.category === 'Overall');
  const categoryBudgets = items.filter((b) => b.category !== 'Overall');
  const totalBudget = overall ? overall.amount : categoryBudgets.reduce((s, b) => s + b.amount, 0);
  return { items, totalBudget, totalSpent: round2(totalSpent), remaining: round2(totalBudget - totalSpent), percent: totalBudget ? round2((totalSpent / totalBudget) * 100) : 0 };
}
