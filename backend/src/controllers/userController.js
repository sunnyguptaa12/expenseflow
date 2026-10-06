import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/respond.js';
import { userDir, hasValidSignature } from '../middleware/upload.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  if (req.body.email && req.body.email !== user.email && (await User.exists({ email: req.body.email }))) throw new ApiError(409, 'An account with this email already exists.');
  Object.assign(user, req.body);
  await user.save();
  sendSuccess(res, { user }, 'Profile updated.');
});

const removeFile = (userId, filename) => filename && fs.promises.unlink(path.join(userDir(userId), path.basename(filename))).catch(() => {});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please choose an image to upload.');
  if (!hasValidSignature(req.file.path, req.file.mimetype)) {
    await removeFile(req.user._id, req.file.filename);
    throw new ApiError(415, 'The uploaded file is not a valid image.');
  }
  await removeFile(req.user._id, req.user.profileImage);
  req.user.profileImage = req.file.filename;
  await req.user.save();
  sendSuccess(res, { user: req.user }, 'Profile image updated.');
});

export const removeAvatar = asyncHandler(async (req, res) => {
  await removeFile(req.user._id, req.user.profileImage);
  req.user.profileImage = null;
  await req.user.save();
  sendSuccess(res, { user: req.user }, 'Profile image removed.');
});

export const getAvatar = asyncHandler(async (req, res) => {
  if (!req.user.profileImage) throw new ApiError(404, 'No profile image.');
  const file = path.join(userDir(req.user._id), path.basename(req.user.profileImage));
  if (!fs.existsSync(file)) throw new ApiError(404, 'No profile image.');
  res.sendFile(file);
});

export const logoutAllDevices = asyncHandler(async (req, res) => {
  req.user.tokenVersion += 1;
  await req.user.save();
  sendSuccess(res, null, 'Logged out from all devices.');
});
