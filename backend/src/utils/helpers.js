export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const monthKey = (date) => new Date(date).toISOString().slice(0, 7);
export const pctChange = (current, previous) => (previous ? ((current - previous) / previous) * 100 : null);
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// All dates are handled as UTC calendar dates so a transaction never shifts day with the server timezone.
const utc = (y, m, d = 1, h = 0, mi = 0, s = 0, ms = 0) => new Date(Date.UTC(y, m, d, h, mi, s, ms));
export const startOfMonth = (date) => utc(date.getUTCFullYear(), date.getUTCMonth(), 1);
export const endOfMonth = (date) => utc(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999);
export const endOfDay = (date) => utc(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999);
export const addMonths = (date, n) => utc(date.getUTCFullYear(), date.getUTCMonth() + n, 1);

export function resolveRange({ range = 'thisMonth', from, to } = {}, now = new Date()) {
  const thisMonth = startOfMonth(now);
  switch (range) {
    case 'lastMonth': return { from: addMonths(thisMonth, -1), to: endOfMonth(addMonths(thisMonth, -1)) };
    case 'last3': return { from: addMonths(thisMonth, -2), to: endOfMonth(now) };
    case 'last6': return { from: addMonths(thisMonth, -5), to: endOfMonth(now) };
    case 'thisYear': return { from: utc(now.getUTCFullYear(), 0, 1), to: utc(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999) };
    case 'custom': {
      const f = new Date(from), t = new Date(to);
      if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return null;
      return { from: f, to: endOfDay(t) };
    }
    default: return { from: thisMonth, to: endOfMonth(now) };
  }
}

export function addInterval(date, frequency) {
  const d = new Date(date);
  if (frequency === 'Daily') return utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  if (frequency === 'Weekly') return utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7);
  const months = frequency === 'Yearly' ? 12 : 1;
  const target = utc(d.getUTCFullYear(), d.getUTCMonth() + months, 1);
  const lastDay = endOfMonth(target).getUTCDate();
  return utc(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d.getUTCDate(), lastDay));
}

export const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
