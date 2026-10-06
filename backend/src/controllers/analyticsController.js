import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveRange } from '../utils/helpers.js';
import * as analytics from '../services/analyticsService.js';

const rangeFrom = (query) => {
  const range = resolveRange(query);
  if (!range) throw new ApiError(400, 'Please provide a valid start and end date.');
  if (range.from > range.to) throw new ApiError(400, 'Start date must be before the end date.');
  return range;
};

export const summary = asyncHandler(async (req, res) => sendSuccess(res, await analytics.summary(req.user._id, rangeFrom(req.query))));

export const categories = asyncHandler(async (req, res) => {
  const { from, to } = rangeFrom(req.query);
  const [expense, income, paymentMethods] = await Promise.all([
    analytics.categoryBreakdown(req.user._id, from, to, 'expense'), analytics.categoryBreakdown(req.user._id, from, to, 'income'), analytics.paymentMethodBreakdown(req.user._id, from, to),
  ]);
  sendSuccess(res, { expense, income, paymentMethods });
});

export const monthly = asyncHandler(async (req, res) => {
  const { from, to } = rangeFrom(req.query);
  const granularity = ['day', 'month'].includes(req.query.granularity) ? req.query.granularity : 'auto';
  const [series, trend] = await Promise.all([analytics.timeSeries(req.user._id, from, to, granularity), analytics.spendingTrend(req.user._id)]);
  sendSuccess(res, { ...series, trend });
});

export const insights = asyncHandler(async (req, res) => sendSuccess(res, await analytics.insights(req.user._id)));
