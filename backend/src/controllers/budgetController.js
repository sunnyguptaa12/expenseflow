import { Budget } from '../models/Budget.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { monthKey } from '../utils/helpers.js';
import { getBudgetsWithSpent } from '../services/budgetService.js';
import { checkBudgetAlerts } from '../services/notificationService.js';

const validMonth = (m) => (typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : monthKey(new Date()));

export const listBudgets = asyncHandler(async (req, res) => {
  const month = validMonth(req.query.month);
  sendSuccess(res, { month, ...(await getBudgetsWithSpent(req.user._id, month)) }, 'Budgets fetched.');
});

export const createBudget = asyncHandler(async (req, res) => {
  const exists = await Budget.exists({ userId: req.user._id, month: req.body.month, category: req.body.category });
  if (exists) throw new ApiError(409, `A ${req.body.category} budget already exists for this month. Edit it instead.`);
  const budget = await Budget.create({ ...req.body, userId: req.user._id });
  await checkBudgetAlerts(req.user, budget.month, [budget.category]);
  sendSuccess(res, budget, 'Budget created.', 201);
});

export const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  const clash = await Budget.exists({ userId: req.user._id, month: req.body.month, category: req.body.category, _id: { $ne: budget._id } });
  if (clash) throw new ApiError(409, 'A budget for that category and month already exists.');
  budget.set(req.body);
  await budget.save();
  await checkBudgetAlerts(req.user, budget.month, [budget.category]);
  sendSuccess(res, budget, 'Budget updated.');
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  sendSuccess(res, null, 'Budget deleted.');
});
