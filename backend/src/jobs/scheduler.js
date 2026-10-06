import cron from 'node-cron';
import { User } from '../models/User.js';
import { processDueRecurring, notifyUpcomingRecurring } from '../services/recurringService.js';
import { notifyOnce } from '../services/notificationService.js';
import { addMonths, startOfMonth, monthKey, monthLabel } from '../utils/helpers.js';

const safe = (name, fn) => async () => {
  try { await fn(); } catch (err) { console.error(`[job:${name}] failed:`, err.message); }
};

export function startScheduler() {
  const runRecurring = safe('recurring', async () => { await processDueRecurring(); await notifyUpcomingRecurring(); });
  runRecurring(); // catch up immediately after a restart
  cron.schedule('5 0 * * *', runRecurring);
  cron.schedule('0 6 1 * *', safe('monthly-report', async () => {
    const prev = monthKey(addMonths(startOfMonth(new Date()), -1));
    for await (const user of User.find().select('_id').cursor()) {
      await notifyOnce(user._id, { type: 'report_available', title: 'Monthly report ready', message: `Your ${monthLabel(prev)} financial report is ready. Open Reports to download it.`, dedupeKey: `report:${prev}` });
    }
  }));
}
