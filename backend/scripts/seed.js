// Development seed data. Refuses to run in production.
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Expense } from '../src/models/Expense.js';
import { Income } from '../src/models/Income.js';
import { Budget } from '../src/models/Budget.js';
import { RecurringTransaction } from '../src/models/RecurringTransaction.js';
import { Notification } from '../src/models/Notification.js';
import { addMonths, startOfMonth, monthKey } from '../src/utils/helpers.js';

if (env.isProd) { console.error('Refusing to seed demo data in production.'); process.exit(1); }

const DEMO = { name: 'Aarav Sharma', email: 'demo@expenseflow.dev', password: 'Demo@1234' };
let seedState = 42;
const rand = () => { seedState = (seedState * 1664525 + 1013904223) % 4294967296; return seedState / 4294967296; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.round(min + rand() * (max - min));
const utc = (y, m, d) => new Date(Date.UTC(y, m, d));

const SPEND = [
  ['Food', ['Swiggy order', 'Zomato dinner', 'Grocery - BigBasket', 'Cafe coffee', 'Lunch with team'], 150, 1200],
  ['Transport', ['Uber ride', 'Petrol', 'Metro recharge', 'Ola cab'], 80, 1500],
  ['Shopping', ['Amazon order', 'Myntra clothes', 'Flipkart gadget', 'Home essentials'], 400, 4500],
  ['Entertainment', ['Movie tickets', 'Gaming top-up', 'Concert pass'], 250, 1800],
  ['Healthcare', ['Pharmacy', 'Doctor consultation'], 200, 1500],
  ['Education', ['Udemy course', 'Technical books'], 450, 3000],
  ['Travel', ['Weekend trip', 'Train tickets'], 800, 6000],
];
const METHODS = ['UPI', 'UPI', 'Credit Card', 'Debit Card', 'Cash', 'Wallet'];

async function destroy() {
  const user = await User.findOne({ email: DEMO.email });
  if (!user) return;
  await Promise.all([Expense, Income, Budget, RecurringTransaction, Notification].map((M) => M.deleteMany({ userId: user._id })));
  await user.deleteOne();
}

async function seed() {
  await mongoose.connect(env.mongoUri);
  await destroy();
  if (process.argv.includes('--destroy')) { console.log('Demo data removed.'); return; }

  const user = await User.create({ ...DEMO, currency: 'INR', timezone: 'Asia/Kolkata' });
  const userId = user._id;
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const expenses = []; const incomes = [];

  for (let back = 5; back >= 0; back -= 1) {
    const m = addMonths(thisMonth, -back); const y = m.getUTCFullYear(); const mo = m.getUTCMonth();
    const isCurrent = back === 0;
    const valid = (d) => utc(y, mo, d) <= now;
    if (valid(1)) incomes.push({ userId, amount: 85000, source: 'Salary', description: 'Monthly salary', date: utc(y, mo, 1), paymentMethod: 'Bank Transfer' });
    if (rand() > 0.5 && valid(14)) incomes.push({ userId, amount: between(8000, 20000), source: 'Freelancing', description: 'Freelance web project', date: utc(y, mo, 14), paymentMethod: 'UPI' });
    if (valid(20)) incomes.push({ userId, amount: between(600, 1400), source: 'Interest', description: 'Savings account interest', date: utc(y, mo, 20), paymentMethod: 'Bank Transfer' });
    if (valid(2)) expenses.push({ userId, amount: 22000, category: 'Rent', description: 'House rent', date: utc(y, mo, 2), paymentMethod: 'Bank Transfer', tags: ['recurring'] });
    if (valid(5)) expenses.push({ userId, amount: 649, category: 'Subscriptions', description: 'Netflix subscription', date: utc(y, mo, 5), paymentMethod: 'Credit Card', tags: ['recurring'] });
    if (valid(8)) expenses.push({ userId, amount: 999, category: 'Bills', description: 'Broadband bill', date: utc(y, mo, 8), paymentMethod: 'UPI', tags: ['recurring'] });
    if (valid(12)) expenses.push({ userId, amount: between(1400, 3200), category: 'Bills', description: 'Electricity bill', date: utc(y, mo, 12), paymentMethod: 'UPI' });
    const lastDay = isCurrent ? Math.max(1, now.getUTCDate()) : 28;
    const count = isCurrent ? Math.max(6, Math.round(lastDay * 0.9)) : 30;
    for (let i = 0; i < count; i += 1) {
      const [category, names, min, max] = rand() < 0.4 ? SPEND[0] : pick(SPEND);
      expenses.push({ userId, amount: between(min, max), category, description: pick(names), date: utc(y, mo, between(1, lastDay)), paymentMethod: pick(METHODS), tags: rand() > 0.8 ? ['personal'] : [] });
    }
  }
  await Expense.insertMany(expenses);
  await Income.insertMany(incomes);

  const month = monthKey(now);
  await Budget.insertMany([['Overall', 65000], ['Food', 8000], ['Transport', 4000], ['Shopping', 7000], ['Entertainment', 3000]].map(([category, amount]) => ({ userId, month, category, amount })));

  const next = (day) => { const d = utc(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth(), day); return d > now ? d : addMonths(d, 1); };
  await RecurringTransaction.insertMany([
    { type: 'income', amount: 85000, category: 'Salary', description: 'Monthly salary', frequency: 'Monthly', paymentMethod: 'Bank Transfer', startDate: utc(2026, 0, 1), nextRunDate: next(1) },
    { amount: 22000, category: 'Rent', description: 'House rent', frequency: 'Monthly', paymentMethod: 'Bank Transfer', startDate: utc(2026, 0, 2), nextRunDate: next(2) },
    { amount: 649, category: 'Subscriptions', description: 'Netflix subscription', frequency: 'Monthly', paymentMethod: 'Credit Card', startDate: utc(2026, 0, 5), nextRunDate: next(5) },
    { amount: 999, category: 'Bills', description: 'Broadband bill', frequency: 'Monthly', paymentMethod: 'UPI', startDate: utc(2026, 0, 8), nextRunDate: next(8) },
    { amount: 14500, category: 'Bills', description: 'Health insurance premium', frequency: 'Yearly', paymentMethod: 'Debit Card', startDate: utc(2026, 0, 15), nextRunDate: utc(2027, 0, 15) },
  ].map((r) => ({ ...r, userId })));

  await Notification.insertMany([
    { userId, type: 'report_available', title: 'Monthly report ready', message: 'Your monthly financial report is ready. Open Reports to download it.' },
    { userId, type: 'recurring_due', title: 'Payment due soon', message: 'Netflix subscription is due in the next few days.' },
  ]);

  console.log(`Seeded ${expenses.length} expenses, ${incomes.length} income records.\nLogin: ${DEMO.email} / ${DEMO.password}`);
}

seed().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => mongoose.disconnect());
