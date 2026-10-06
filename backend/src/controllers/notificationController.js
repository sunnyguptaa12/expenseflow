import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
  const filter = { userId: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;
  const [items, unreadCount] = await Promise.all([Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(), Notification.countDocuments({ userId: req.user._id, isRead: false })]);
  sendSuccess(res, items, 'Notifications fetched.', 200, { unreadCount });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
  if (!n) throw new ApiError(404, 'Notification not found.');
  sendSuccess(res, n);
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  sendSuccess(res, null, 'All notifications marked as read.');
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!n) throw new ApiError(404, 'Notification not found.');
  sendSuccess(res, null, 'Notification deleted.');
});
