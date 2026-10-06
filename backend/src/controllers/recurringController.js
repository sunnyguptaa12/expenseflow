import { RecurringTransaction } from '../models/RecurringTransaction.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { processDueRecurring } from '../services/recurringService.js';

export const listRecurring = asyncHandler(async (req, res) => {
  await processDueRecurring(req.user._id); // lazily catch up so the list is always current, even if the cron job was down
  sendSuccess(res, await RecurringTransaction.find({ userId: req.user._id }).sort({ isActive: -1, nextRunDate: 1 }).lean());
});

export const createRecurring = asyncHandler(async (req, res) => {
  const item = await RecurringTransaction.create({ ...req.body, userId: req.user._id, nextRunDate: req.body.startDate });
  await processDueRecurring(req.user._id);
  sendSuccess(res, await RecurringTransaction.findById(item._id), 'Recurring payment saved.', 201);
});

export const updateRecurring = asyncHandler(async (req, res) => {
  const item = await RecurringTransaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!item) throw new ApiError(404, 'Recurring payment not found.');
  const startChanged = req.body.startDate.getTime() !== item.startDate.getTime() && !item.lastRunDate;
  item.set(req.body);
  if (startChanged) item.nextRunDate = req.body.startDate;
  await item.save();
  sendSuccess(res, item, 'Recurring payment updated.');
});

export const deleteRecurring = asyncHandler(async (req, res) => {
  const item = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!item) throw new ApiError(404, 'Recurring payment not found.');
  sendSuccess(res, null, 'Recurring payment deleted.');
});
