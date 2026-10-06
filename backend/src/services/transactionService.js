import { Expense } from '../models/Expense.js';
import { Income } from '../models/Income.js';
import { escapeRegex } from '../utils/helpers.js';

const SORTS = {
  newest: { date: -1, createdAt: -1, _id: -1 },
  oldest: { date: 1, createdAt: 1, _id: 1 },
  highest: { amount: -1, _id: -1 },
  lowest: { amount: 1, _id: 1 },
};

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v) => (str(v) !== undefined && Number.isFinite(Number(v)) ? Number(v) : undefined);
const date = (v) => (str(v) && !Number.isNaN(new Date(v).getTime()) ? new Date(v) : undefined);

export function parseFilters(query = {}) {
  const type = ['expense', 'income'].includes(query.type) ? query.type : 'all';
  const toDate = date(query.to);
  if (toDate) toDate.setUTCHours(23, 59, 59, 999);
  return {
    type,
    search: str(query.search),
    category: str(query.category),
    paymentMethod: str(query.paymentMethod),
    minAmount: num(query.minAmount),
    maxAmount: num(query.maxAmount),
    from: date(query.from),
    to: toDate,
    tags: str(query.tags)?.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    sort: SORTS[query.sort] ? query.sort : 'newest',
    page: Math.max(1, parseInt(query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10)),
  };
}

// Every query is scoped to userId — this is the single place that enforces data isolation for listings.
export function buildMatch(userId, f, kind) {
  const categoryField = kind === 'expense' ? 'category' : 'source';
  const match = { userId };
  if (f.category) match[categoryField] = f.category;
  if (f.paymentMethod) match.paymentMethod = f.paymentMethod;
  if (f.minAmount !== undefined || f.maxAmount !== undefined) {
    match.amount = {};
    if (f.minAmount !== undefined) match.amount.$gte = f.minAmount;
    if (f.maxAmount !== undefined) match.amount.$lte = f.maxAmount;
  }
  if (f.from || f.to) {
    match.date = {};
    if (f.from) match.date.$gte = f.from;
    if (f.to) match.date.$lte = f.to;
  }
  if (f.tags?.length) {
    if (kind === 'expense') match.tags = { $in: f.tags };
    else match._id = { $exists: false }; // income has no tags, so a tag filter matches nothing
  }
  if (f.search) {
    const rx = new RegExp(escapeRegex(f.search), 'i');
    match.$or = [{ description: rx }, { notes: rx }, { [categoryField]: rx }];
  }
  return match;
}

const asExpense = (doc) => ({ ...doc, type: 'expense' });
const asIncome = (doc) => ({ ...doc, type: 'income', category: doc.source });

function unionPipeline(userId, f) {
  return [
    { $match: buildMatch(userId, f, 'expense') },
    { $addFields: { type: 'expense' } },
    {
      $unionWith: {
        coll: Income.collection.name,
        pipeline: [{ $match: buildMatch(userId, f, 'income') }, { $addFields: { type: 'income', category: '$source' } }],
      },
    },
    { $sort: SORTS[f.sort] },
  ];
}

export async function listTransactions(userId, f) {
  const skip = (f.page - 1) * f.limit;
  let items; let total;

  if (f.type === 'all') {
    const [result] = await Expense.aggregate([...unionPipeline(userId, f), { $facet: { items: [{ $skip: skip }, { $limit: f.limit }], total: [{ $count: 'n' }] } }]);
    items = result.items; total = result.total[0]?.n || 0;
  } else {
    const Model = f.type === 'expense' ? Expense : Income;
    const match = buildMatch(userId, f, f.type);
    const [docs, count] = await Promise.all([Model.find(match).sort(SORTS[f.sort]).skip(skip).limit(f.limit).lean(), Model.countDocuments(match)]);
    items = docs.map(f.type === 'expense' ? asExpense : asIncome); total = count;
  }
  return { items, total, page: f.page, limit: f.limit, pages: Math.max(1, Math.ceil(total / f.limit)) };
}

export async function fetchAllTransactions(userId, f, cap = 20000) {
  if (f.type === 'all') return Expense.aggregate([...unionPipeline(userId, f), { $limit: cap }]);
  const Model = f.type === 'expense' ? Expense : Income;
  const docs = await Model.find(buildMatch(userId, f, f.type)).sort(SORTS[f.sort]).limit(cap).lean();
  return docs.map(f.type === 'expense' ? asExpense : asIncome);
}
export { asExpense, asIncome };
