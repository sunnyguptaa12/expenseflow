export function formatMoney(amount, currency = 'INR', compact = false) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: compact || Number.isInteger(value) ? 0 : 2, notation: compact ? 'compact' : 'standard',
  }).format(value);
}

// Dates are stored as UTC calendar days, so they are always rendered in UTC.
export function formatDate(value, pattern = 'DD/MM/YYYY') {
  if (!value) return '';
  const iso = new Date(value).toISOString().slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (pattern === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (pattern === 'YYYY-MM-DD') return iso;
  return `${d}/${m}/${y}`;
}

export const toInputDate = (value = new Date()) => new Date(value).toISOString().slice(0, 10);
export const monthNow = () => new Date().toISOString().slice(0, 7);
export const periodLabel = (p) => {
  if (/^\d{4}-\d{2}$/.test(p)) return new Date(`${p}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return new Date(`${p}T00:00:00Z`).toLocaleString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
export const timeAgo = (value) => {
  const s = Math.floor((Date.now() - new Date(value)) / 1000);
  if (s < 60) return 'just now';
  const units = [[86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  return 'just now';
};
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
