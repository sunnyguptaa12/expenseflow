// Heuristic receipt text parser. Works best on text-based PDF invoices.
const MERCHANTS = ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Uber', 'Ola', 'Netflix', 'Spotify', 'BigBasket', 'Myntra', 'Reliance', 'Starbucks', 'McDonald', 'Domino', 'Apollo', 'Airtel', 'Jio', 'Vodafone', 'IRCTC', 'MakeMyTrip', 'Zepto', 'Blinkit', 'Paytm', 'PhonePe', 'Walmart', 'Target', 'Costco'];
const CATEGORY_KEYWORDS = {
  Food: ['restaurant', 'cafe', 'swiggy', 'zomato', 'food', 'pizza', 'burger', 'dining', 'bigbasket', 'zepto', 'blinkit', 'grocery', 'starbucks', 'mcdonald', 'domino', 'bakery'],
  Transport: ['uber', 'ola', 'fuel', 'petrol', 'diesel', 'cab', 'metro', 'taxi', 'parking', 'toll'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'order', 'shopping', 'mall', 'store', 'retail', 'walmart', 'target'],
  Bills: ['electricity', 'water bill', 'broadband', 'internet', 'airtel', 'jio', 'vodafone', 'recharge', 'gas bill', 'utility'],
  Subscriptions: ['netflix', 'spotify', 'subscription', 'prime membership', 'renewal'],
  Healthcare: ['pharmacy', 'hospital', 'clinic', 'medical', 'apollo', 'diagnostic', 'doctor'],
  Education: ['tuition', 'course', 'udemy', 'coursera', 'school', 'college', 'exam fee'],
  Travel: ['flight', 'hotel', 'airline', 'irctc', 'makemytrip', 'booking', 'ticket', 'boarding'],
  Entertainment: ['movie', 'cinema', 'pvr', 'inox', 'concert', 'game'],
  Rent: ['rent receipt', 'house rent', 'lease'],
};
const PAYMENT_KEYWORDS = [
  ['UPI', /\bupi\b|google ?pay|gpay|phonepe|paytm/i],
  ['Credit Card', /credit card|visa credit|mastercard credit/i],
  ['Debit Card', /debit card|rupay/i],
  ['Bank Transfer', /net ?banking|neft|imps|bank transfer|rtgs/i],
  ['Wallet', /wallet|amazon pay/i],
  ['Cash', /cash on delivery|\bcod\b|paid in cash|\bcash\b/i],
];
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

const toNumber = (s) => Number(s.replace(/,/g, ''));
const AMOUNT_RX = /(?:₹|rs\.?|inr|\$|usd|€|£)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;

function findAmount(lines) {
  const keyed = /(grand\s*total|total\s*amount|amount\s*paid|amount\s*due|net\s*payable|total\s*payable|invoice\s*total|order\s*total|total)/i;
  const candidates = [];
  for (const [i, line] of lines.entries()) {
    if (!keyed.test(line) || /sub\s*total|tax|gst|discount/i.test(line)) continue;
    const window = [line, lines[i + 1] || ''].join(' ');
    for (const m of window.matchAll(AMOUNT_RX)) {
      const n = toNumber(m[1]);
      if (n > 0 && n < 1e8) candidates.push(n);
    }
  }
  if (candidates.length) return candidates[candidates.length - 1];
  const currencyOnly = [...lines.join('\n').matchAll(/(?:₹|rs\.?|inr|\$)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi)].map((m) => toNumber(m[1])).filter((n) => n > 0 && n < 1e8);
  return currencyOnly.length ? Math.max(...currencyOnly) : null;
}

function findDate(text) {
  let m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/); // DD/MM/YYYY (Indian convention)
  if (m && +m[2] <= 12) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})[\s,.-]+(\d{4})\b/);
  if (m && MONTHS[m[2].slice(0, 4).toLowerCase()] !== undefined) return new Date(Date.UTC(+m[3], MONTHS[m[2].slice(0, 4).toLowerCase()], +m[1]));
  m = text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m && MONTHS[m[1].slice(0, 4).toLowerCase()] !== undefined) return new Date(Date.UTC(+m[3], MONTHS[m[1].slice(0, 4).toLowerCase()], +m[2]));
  return null;
}

function findMerchant(text, lines) {
  const known = MERCHANTS.find((name) => new RegExp(`\\b${name}`, 'i').test(text));
  if (known) return known;
  const first = lines.find((l) => /[A-Za-z]{3,}/.test(l) && !/invoice|receipt|tax|bill|order|date|gstin|page/i.test(l));
  return first ? first.slice(0, 60) : null;
}

export function parseReceiptText(rawText) {
  const text = rawText.replace(/\u00a0/g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const lower = text.toLowerCase();
  const merchant = findMerchant(text, lines);
  const haystack = `${merchant || ''} ${lower}`.toLowerCase();
  let category = 'Other'; let bestScore = 0;
  for (const [name, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; category = name; }
  }
  const paymentMethod = PAYMENT_KEYWORDS.find(([, rx]) => rx.test(text))?.[0] || null;
  const amount = findAmount(lines);
  const date = findDate(text);

  const found = [merchant, amount, date].filter(Boolean).length;
  return { merchant, amount, date: date ? date.toISOString().slice(0, 10) : null, category, paymentMethod, confidence: found === 3 ? 'high' : found === 2 ? 'medium' : 'low' };
}
