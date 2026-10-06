import { RecurringTransaction } from '../models/RecurringTransaction.js';
import { Expense } from '../models/Expense.js';
import { Income } from '../models/Income.js';
import { User } from '../models/User.js';
import { addInterval } from '../utils/helpers.js';
import { notifyOnce, runExpenseChecks } from './notificationService.js';

const MAX_CATCH_UP = 366;

// Creates every transaction that is due, catching up on missed runs, and advances nextRunDate.
export async function processDueRecurring(userId) {
  const now = new Date();
  const filter = { isActive: true, nextRunDate: { $lte: now } };
  if (userId) filter.userId = userId;
  const due = await RecurringTransaction.find(filter);
  let created = 0;

  for (const item of due) {
    const user = await User.findById(item.userId);
    if (!user) continue;
    let runs = 0;
    while (item.nextRunDate <= now && (!item.endDate || item.nextRunDate <= item.endDate) && runs < MAX_CATCH_UP) {
      const base = { userId: item.userId, amount: item.amount, description: item.description, date: item.nextRunDate, paymentMethod: item.paymentMethod, notes: `Auto-created from recurring ${item.frequency.toLowerCase()} payment`, recurringId: item._id };
      if (item.type === 'income') {
        await Income.create({ ...base, source: item.category });
      } else {
        const expense = await Expense.create({ ...base, category: item.category, tags: ['recurring'] });
        await runExpenseChecks(user, expense);
      }
      item.lastRunDate = item.nextRunDate;
      item.nextRunDate = addInterval(item.nextRunDate, item.frequency);
      runs += 1; created += 1;
    }
    if (item.endDate && item.nextRunDate > item.endDate) item.isActive = false;
    await item.save();
    if (runs) {
      await notifyOnce(item.userId, { type: 'recurring_processed', title: 'Recurring payment processed', message: `${item.description} was added to your ${item.type === 'income' ? 'income' : 'expenses'}.`, dedupeKey: `processed:${item._id}:${item.lastRunDate.toISOString().slice(0, 10)}` });
    }
  }
  return created;
}

export async function notifyUpcomingRecurring() {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 86400000);
  const upcoming = await RecurringTransaction.find({ isActive: true, type: 'expense', nextRunDate: { $gt: now, $lte: soon } });
  for (const item of upcoming) {
    const dueOn = item.nextRunDate.toISOString().slice(0, 10);
    await notifyOnce(item.userId, { type: 'recurring_due', title: 'Payment due soon', message: `${item.description} (${item.amount.toLocaleString('en-IN')}) is due on ${dueOn}.`, dedupeKey: `due:${item._id}:${dueOn}` });
  }
}
