import { Notification } from '../models/Notification.js';
import { Expense } from '../models/Expense.js';
import { Budget } from '../models/Budget.js';
import { env } from '../config/env.js';
import { monthKey, monthLabel } from '../utils/helpers.js';
import { spentByCategory } from './budgetService.js';

// dedupeKey + the unique index guarantee each alert is created only once.
export async function notifyOnce(userId, { type, title, message, dedupeKey }) {
  try {
    return await Notification.create({ userId, type, title, message, dedupeKey });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }
}

export async function checkBudgetAlerts(user, month, categories) {
  const budgets = await Budget.find({ userId: user._id, month, category: { $in: ['Overall', ...categories] } }).lean();
  if (!budgets.length) return;
  const spentMap = await spentByCategory(user._id, month);
  const totalSpent = Object.values(spentMap).reduce((a, b) => a + b, 0);

  for (const b of budgets) {
    const spent = b.category === 'Overall' ? totalSpent : spentMap[b.category] || 0;
    const percent = Math.round((spent / b.amount) * 100);
    const label = b.category === 'Overall' ? 'monthly budget' : `${b.category} budget`;
    if (percent >= 100) {
      await notifyOnce(user._id, { type: 'budget_exceeded', title: 'Budget exceeded', message: `You have exceeded your ${label} for ${monthLabel(month)} (${percent}% used).`, dedupeKey: `exceeded:${month}:${b.category}` });
    } else if (percent >= 80) {
      await notifyOnce(user._id, { type: 'budget_warning', title: 'Budget almost used', message: `You have used ${percent}% of your ${label} for ${monthLabel(month)}.`, dedupeKey: `warn:${month}:${b.category}` });
    }
  }
}

export async function checkExpenseAnomalies(user, expense) {
  if (expense.amount >= env.largeTransactionThreshold) {
    await notifyOnce(user._id, { type: 'large_transaction', title: 'Large transaction', message: `${expense.description}: ${expense.amount.toLocaleString('en-IN')} ${user.currency} is a large expense.`, dedupeKey: `large:${expense._id}` });
  }
  const since = new Date(expense.date.getTime() - 90 * 86400000);
  const [stats] = await Expense.aggregate([
    { $match: { userId: user._id, category: expense.category, date: { $gte: since, $lt: expense.date }, _id: { $ne: expense._id } } },
    { $group: { _id: null, avg: { $avg: '$amount' }, count: { $sum: 1 } } },
  ]);
  if (stats && stats.count >= 5 && expense.amount > stats.avg * 3) {
    await notifyOnce(user._id, { type: 'unusual_spending', title: 'Unusual spending', message: `${expense.description} (${expense.category}) is over 3x your usual ${expense.category} spend.`, dedupeKey: `unusual:${expense._id}` });
  }
}

export async function runExpenseChecks(user, expense) {
  try {
    await Promise.all([checkBudgetAlerts(user, monthKey(expense.date), [expense.category]), checkExpenseAnomalies(user, expense)]);
  } catch (err) {
    console.error('Notification check failed:', err.message); // never block the main request
  }
}
